
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ documentId: string }>;
};

const scrypt = promisify(scryptCallback);

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jsonError = (error: string, status = 400) =>
  NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );

async function hashAccessPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

function generateAccessPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  const bytes = randomBytes(16);

  return Array.from(
    bytes,
    (byte) => alphabet[byte % alphabet.length]
  ).join("");
}

async function currentUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error || !user ? null : user;
}

/**
 * GET
 * Loads document permissions.
 * Only the document owner can view permission details.
 */
export async function GET(_request: Request, context: Context) {
  try {
    const user = await currentUser();

    if (!user) {
      return jsonError("Please sign in first.", 401);
    }

    const { documentId } = await context.params;

    if (!uuid.test(documentId)) {
      return jsonError("Invalid document ID.");
    }

    const { data: doc, error } = await supabaseAdmin
      .from("documents")
      .select("id, owner_id, organization_id, title")
      .eq("id", documentId)
      .maybeSingle();

    if (error || !doc) {
      return jsonError("Document not found.", 404);
    }

    if (doc.owner_id !== user.id) {
      return jsonError(
        "Only the document owner can manage permissions.",
        403
      );
    }

    const { data: grants, error: grantError } = await supabaseAdmin
      .from("document_access_grants")
      .select(
        "id, viewer_id, permission, can_view, can_edit, can_download, expires_at, revoked_at, created_at"
      )
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (grantError) {
      return jsonError("Could not load document permissions.", 500);
    }

    const { data: members, error: membersError } = doc.organization_id
      ? await supabaseAdmin
          .from("organization_members")
          .select("user_id, role, joined_at")
          .eq("organization_id", doc.organization_id)
      : { data: [], error: null };

    if (membersError) {
      return jsonError("Could not load organization members.", 500);
    }

    const ids = [
      ...new Set([
        ...(grants ?? []).map((grant) => grant.viewer_id),
        ...(members ?? []).map((member) => member.user_id),
      ]),
    ];

    const userMap = new Map<
      string,
      { email: string; displayName: string }
    >();

    for (const id of ids) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);

      if (data.user) {
        userMap.set(id, {
          email: data.user.email ?? "",
          displayName: String(
            data.user.user_metadata?.full_name ??
              data.user.email ??
              "Member"
          ),
        });
      }
    }

    const now = Date.now();

    const activeGrants = (grants ?? []).filter(
      (grant) =>
        !grant.revoked_at &&
        new Date(grant.expires_at).getTime() > now
    );

    return NextResponse.json(
      {
        success: true,
        document: doc,

        grants: (grants ?? []).map((grant) => ({
          ...grant,
          email: userMap.get(grant.viewer_id)?.email ?? "Unknown user",
        })),

        members: (members ?? []).map((member) => ({
          ...member,

          email: userMap.get(member.user_id)?.email ?? "",

          displayName:
            userMap.get(member.user_id)?.displayName ?? "Member",

          grant:
            activeGrants.find(
              (grant) => grant.viewer_id === member.user_id
            ) ?? null,
        })),
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Permission GET failed:", error);

    return jsonError(
      "Unexpected error while loading permissions.",
      500
    );
  }
}

/**
 * POST
 * Grants, updates, or revokes document access.
 *
 * Viewing, editing, and downloading are separate permissions.
 * Selecting MODIFY does not automatically allow downloads.
 */
export async function POST(request: Request, context: Context) {
  try {
    const user = await currentUser();

    if (!user) {
      return jsonError("Please sign in first.", 401);
    }

    const { documentId } = await context.params;

    if (!uuid.test(documentId)) {
      return jsonError("Invalid document ID.");
    }

    const body = (await request
      .json()
      .catch(() => null)) as null | {
      email?: unknown;
      permission?: unknown;
      action?: unknown;
      viewerId?: unknown;
      expiresDays?: unknown;
      canDownload?: unknown;
    };

    if (!body) {
      return jsonError("Invalid request body.");
    }

    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .select("id, owner_id, organization_id, password_hash")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !doc) {
      return jsonError("Document not found.", 404);
    }

    if (doc.owner_id !== user.id) {
      return jsonError(
        "Only the document owner can manage permissions.",
        403
      );
    }

    if (
      typeof body.email !== "string" ||
      !body.email.includes("@")
    ) {
      return jsonError(
        "Enter the exact email address of an existing organization member."
      );
    }

    const email = body.email.trim().toLowerCase();

    const { data: users, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      return jsonError("Could not find that user account.", 500);
    }

    const target = users.users.find(
      (account) => (account.email ?? "").toLowerCase() === email
    );

    if (!target) {
      return jsonError(
        "No account was found with that email. Ask them to register first.",
        404
      );
    }

    /**
     * REVOKE
     * Revoke all active grants for this document and viewer.
     */
    if (body.action === "revoke") {
      const revokedAt = new Date().toISOString();

      const { error } = await supabaseAdmin
        .from("document_access_grants")
        .update({ revoked_at: revokedAt })
        .eq("document_id", documentId)
        .eq("owner_id", user.id)
        .eq("viewer_id", target.id)
        .is("revoked_at", null);

      if (error) {
        return jsonError("Could not revoke access.", 500);
      }

      await supabaseAdmin
        .from("document_view_sessions")
        .update({ revoked_at: revokedAt })
        .eq("document_id", documentId)
        .eq("viewer_id", target.id)
        .is("revoked_at", null);

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: user.id,
        target_user_id: target.id,
        document_id: documentId,
        action: "document_permission_revoked",
        details: {},
      });

      return NextResponse.json(
        {
          success: true,
          message: `Access revoked for ${target.email}.`,
        },
        {
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /**
     * Validate permissions.
     */
    if (
      body.permission !== "view" &&
      body.permission !== "modify"
    ) {
      return jsonError("Permission must be view or modify.");
    }

    if (
      body.canDownload !== undefined &&
      typeof body.canDownload !== "boolean"
    ) {
      return jsonError(
        "Download permission must be explicitly true or false."
      );
    }

    if (!doc.organization_id) {
      return jsonError(
        "Place the document in an organization before sharing it with members."
      );
    }

    if (target.id === user.id) {
      return jsonError("You already own this document.");
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_id", doc.organization_id)
      .eq("user_id", target.id)
      .maybeSingle();

    if (memberError) {
      return jsonError(
        "Could not verify organization membership.",
        500
      );
    }

    if (!member) {
      return jsonError(
        "That user must join this organization before you can grant document access.",
        403
      );
    }

    if (!doc.password_hash) {
      return jsonError(
        "Set a document password before granting access.",
        409
      );
    }

    const expiresDays =
      typeof body.expiresDays === "number" &&
      Number.isFinite(body.expiresDays)
        ? Math.min(90, Math.max(1, body.expiresDays))
        : 30;

    const expiresAt = new Date(
      Date.now() + expiresDays * 86400000
    ).toISOString();

    /**
     * Find an existing active grant.
     */
    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from("document_access_grants")
        .select("id")
        .eq("document_id", documentId)
        .eq("owner_id", user.id)
        .eq("viewer_id", target.id)
        .is("revoked_at", null)
        .maybeSingle();

    if (existingError) {
      return jsonError(
        "Could not check existing permissions.",
        500
      );
    }

    const accessPassword = generateAccessPassword();

    /**
     * IMPORTANT SECURITY FIX:
     * can_download depends only on body.canDownload.
     * MODIFY no longer automatically grants download access.
     */
    const grantValues = {
      password_hash: await hashAccessPassword(accessPassword),

      permission: body.permission,

      can_view: true,

      can_edit: body.permission === "modify",

      can_download: body.canDownload === true,

      expires_at: expiresAt,

      revoked_at: null,
    };

    const result = existing
      ? await supabaseAdmin
          .from("document_access_grants")
          .update(grantValues)
          .eq("id", existing.id)
      : await supabaseAdmin
          .from("document_access_grants")
          .insert({
            ...grantValues,
            document_id: documentId,
            owner_id: user.id,
            viewer_id: target.id,
          });

    if (result.error) {
      console.error("Grant write failed:", result.error.message);

      return jsonError(
        "Could not save the permission. Run the latest SQL migration and try again.",
        500
      );
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      target_user_id: target.id,
      document_id: documentId,
      action: "document_permission_granted",
      details: {
        permission: body.permission,
        can_download: body.canDownload === true,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,

        message: `${
          body.permission === "modify" ? "Modify" : "View-only"
        } access granted to ${target.email}. Download permission: ${
          body.canDownload === true ? "Allowed" : "Not allowed"
        }. Copy the one-time access password below and share it securely.`,

        accessPassword,

        expiresAt,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Permission POST failed:", error);

    return jsonError(
      "Unexpected error while saving permissions.",
      500
    );
  }
}
