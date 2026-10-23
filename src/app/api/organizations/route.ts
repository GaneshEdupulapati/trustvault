
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Organization = {
  id: string;
  name: string;
  organization_code: string;
};

type OrganizationMembership = {
  organization_id: string;
  role: string;
};

function jsonError(
  error: string,
  status = 400,
  details?: string,
  code?: string | null
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
      ...(code ? { code } : {}),
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function jsonSuccess(data: Record<string, unknown>) {
  return NextResponse.json(
    { success: true, ...data },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

async function getSignedInUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

function reportDatabaseError(
  operation: string,
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  }
) {
  console.error(`[TrustVault] ${operation} failed`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

/* ---------------------------------------------------------
   GET: Load organizations and documents for the signed-in user
--------------------------------------------------------- */

export async function GET() {
  try {
    const user = await getSignedInUser();

    if (!user) {
      return jsonError("Please sign in first.", 401);
    }

    const { data: memberships, error: membershipError } =
      await supabaseAdmin
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id);

    if (membershipError) {
      reportDatabaseError(
        "Organization membership lookup",
        membershipError
      );

      return jsonError(
        "Could not load organizations.",
        500,
        membershipError.message,
        membershipError.code
      );
    }

    const memberRows =
      (memberships ?? []) as OrganizationMembership[];

    const organizationIds = memberRows.map(
      (membership) => membership.organization_id
    );

    let organizations: Array<Organization & { role: string }> = [];

    if (organizationIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("organizations")
        .select("id, name, organization_code")
        .in("id", organizationIds)
        .order("created_at", { ascending: false });

      if (error) {
        reportDatabaseError("Organization lookup", error);

        return jsonError(
          "Could not load organization details.",
          500,
          error.message,
          error.code
        );
      }

      organizations = ((data ?? []) as Organization[]).map(
        (organization) => ({
          ...organization,
          role:
            memberRows.find(
              (membership) =>
                membership.organization_id === organization.id
            )?.role ?? "member",
        })
      );
    }

    type OrganizationDocument = {
      id: string;
      owner_id: string;
      organization_id: string | null;
      title: string;
      original_filename: string;
      mime_type: string;
      file_size: number;
      created_at: string;
      storage_path: string;
      version_number?: number;
      can_view?: boolean;
      can_edit?: boolean;
      can_download?: boolean;
    };

    // Load documents owned by the signed-in user.
    const { data: ownedDocuments, error: ownedError } =
      await supabaseAdmin
        .from("documents")
        .select(
          "id, owner_id, organization_id, title, original_filename, mime_type, file_size, created_at, storage_path, version_number"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

    if (ownedError) {
      reportDatabaseError("Owned document lookup", ownedError);

      return jsonError(
        "Could not load your documents.",
        500,
        ownedError.message,
        ownedError.code
      );
    }

    // Load documents belonging to the user's organizations.
    let sharedDocuments: OrganizationDocument[] = [];

    if (organizationIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("documents")
        .select(
          "id, owner_id, organization_id, title, original_filename, mime_type, file_size, created_at, storage_path, version_number"
        )
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false });

      if (error) {
        reportDatabaseError(
          "Organization document lookup",
          error
        );

        return jsonError(
          "Could not load organization documents.",
          500,
          error.message,
          error.code
        );
      }

      sharedDocuments = (data ?? []) as OrganizationDocument[];
    }

    // Initially, only document owners receive access.
    const documentMap = new Map<string, OrganizationDocument>();

    const allDocuments = [
      ...((ownedDocuments ?? []) as OrganizationDocument[]),
      ...sharedDocuments,
    ];

    for (const document of allDocuments) {
      const isOwner = document.owner_id === user.id;

      documentMap.set(document.id, {
        ...document,
        can_view: isOwner,
        can_edit: isOwner,
        can_download: isOwner,
      });
    }

    // Load only active grants and sort newest first.
    const { data: grants, error: grantsError } =
      await supabaseAdmin
        .from("document_access_grants")
        .select(
          "document_id, can_view, can_edit, can_download, permission, expires_at, revoked_at, created_at"
        )
        .eq("viewer_id", user.id)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

    if (grantsError) {
      reportDatabaseError(
        "Document permission lookup",
        grantsError
      );

      return jsonError(
        "Could not load document permissions.",
        500,
        grantsError.message,
        grantsError.code
      );
    }

    // Use the newest active grant for each non-owned document.
    for (const [documentId, document] of documentMap) {
      if (document.owner_id === user.id) {
        continue;
      }

      const grant = (grants ?? []).find(
        (item) => item.document_id === documentId
      );

      documentMap.set(documentId, {
        ...document,

        can_view: Boolean(
          grant &&
            (grant.can_view === true ||
              grant.permission === "view" ||
              grant.permission === "modify")
        ),

        can_edit: Boolean(
          grant &&
            (grant.can_edit === true ||
              grant.permission === "modify")
        ),

        // Download requires an explicit true value.
        // VIEW and MODIFY do not automatically enable downloads.
        can_download: grant?.can_download === true,
      });
    }

    return jsonSuccess({
      organizations,
      documents: [...documentMap.values()].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    });
  } catch (error) {
    console.error(
      "[TrustVault] Organization GET failed",
      error
    );

    return jsonError(
      "Unexpected server error while loading organizations.",
      500
    );
  }
}

/* ---------------------------------------------------------
   POST: Create an organization or join an existing one
--------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const user = await getSignedInUser();

    if (!user) {
      return jsonError("Please sign in first.", 401);
    }

    let body: {
      action?: unknown;
      name?: unknown;
      code?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.");
    }

    /* CREATE ORGANIZATION */

    if (body.action === "create") {
      if (
        typeof body.name !== "string" ||
        body.name.trim().length < 2 ||
        body.name.trim().length > 120
      ) {
        return jsonError(
          "Organization name must be between 2 and 120 characters."
        );
      }

      const organizationCode =
        `TV-${randomBytes(8).toString("hex").toUpperCase()}`;

      const { data: organization, error: createError } =
        await supabaseAdmin
          .from("organizations")
          .insert({
            name: body.name.trim(),
            organization_code: organizationCode,
            created_by: user.id,
          })
          .select("id, name, organization_code")
          .single();

      if (createError || !organization) {
        if (createError) {
          reportDatabaseError(
            "Organization creation",
            createError
          );
        }

        if (process.env.NODE_ENV !== "production") {
          return jsonError(
            "Could not create organization.",
            500,
            createError?.message ??
              "No organization record was returned.",
            createError?.code ?? null
          );
        }

        return jsonError(
          "Could not create organization. Please try again.",
          500
        );
      }

      const { error: memberError } = await supabaseAdmin
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) {
        reportDatabaseError(
          "Organization owner membership creation",
          memberError
        );

        const { error: cleanupError } = await supabaseAdmin
          .from("organizations")
          .delete()
          .eq("id", organization.id)
          .eq("created_by", user.id);

        if (cleanupError) {
          reportDatabaseError(
            "Organization cleanup after membership failure",
            cleanupError
          );
        }

        if (process.env.NODE_ENV !== "production") {
          return jsonError(
            "Organization membership setup failed.",
            500,
            memberError.message,
            memberError.code
          );
        }

        return jsonError(
          "Organization setup failed. Please try again.",
          500
        );
      }

      const { error: auditError } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action: "organization_created",
          details: {
            organization_id: organization.id,
            name: organization.name,
          },
        });

      if (auditError) {
        reportDatabaseError(
          "Organization creation audit log",
          auditError
        );
      }

      return jsonSuccess({
        organization,
        message:
          "Organization created. Share the join code only with trusted people.",
      });
    }

    /* JOIN ORGANIZATION */

    if (body.action === "join") {
      if (
        typeof body.code !== "string" ||
        body.code.trim().length < 8 ||
        body.code.trim().length > 40
      ) {
        return jsonError("Enter a valid organization join code.");
      }

      const code = body.code.trim().toUpperCase();

      const { data: organization, error: lookupError } =
        await supabaseAdmin
          .from("organizations")
          .select("id, name, organization_code")
          .eq("organization_code", code)
          .maybeSingle();

      if (lookupError) {
        reportDatabaseError(
          "Organization join-code lookup",
          lookupError
        );

        return jsonError(
          "Could not verify the organization code.",
          500,
          process.env.NODE_ENV !== "production"
            ? lookupError.message
            : undefined,
          process.env.NODE_ENV !== "production"
            ? lookupError.code
            : undefined
        );
      }

      if (!organization) {
        return jsonError(
          "That organization code is invalid. Check it and try again.",
          404
        );
      }

      const { data: existing, error: existingError } =
        await supabaseAdmin
          .from("organization_members")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (existingError) {
        reportDatabaseError(
          "Existing organization membership lookup",
          existingError
        );

        return jsonError(
          "Could not check your organization membership.",
          500
        );
      }

      if (!existing) {
        const { error: joinError } = await supabaseAdmin
          .from("organization_members")
          .insert({
            organization_id: organization.id,
            user_id: user.id,
            role: "member",
          });

        if (joinError) {
          reportDatabaseError("Organization join", joinError);

          return jsonError(
            "Could not join the organization.",
            500,
            process.env.NODE_ENV !== "production"
              ? joinError.message
              : undefined,
            process.env.NODE_ENV !== "production"
              ? joinError.code
              : undefined
          );
        }
      }

      const { error: auditError } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action: "organization_joined",
          details: {
            organization_id: organization.id,
          },
        });

      if (auditError) {
        reportDatabaseError(
          "Organization join audit log",
          auditError
        );
      }

      return jsonSuccess({
        organization,
        message: existing
          ? "You are already a member of this organization."
          : `You joined ${organization.name}.`,
      });
    }

    return jsonError("Choose either create or join.");
  } catch (error) {
    console.error(
      "[TrustVault] Organization POST failed",
      error
    );

    return jsonError(
      "Unexpected server error while updating organization membership.",
      500
    );
  }
}
