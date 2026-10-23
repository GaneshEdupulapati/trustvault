import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BUCKET_NAME = "trustvault-documents";

function jsonError(error: string, status = 400) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function reportError(operation: string, error: unknown) {
  console.error(`[TrustVault] ${operation} failed:`, error);
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    // Authenticate the caller using their own session.
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Please sign in first.", 401);
    }

    const { organizationId } = await context.params;
    if (!UUID_PATTERN.test(organizationId)) {
      return jsonError("Invalid organization ID.");
    }

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, created_by")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError) {
      reportError("Organization lookup", organizationError);
      return jsonError("Could not verify this organization.", 500);
    }

    if (!organization) {
      return jsonError("Organization not found.", 404);
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      reportError("Organization role lookup", membershipError);
      return jsonError("Could not verify your organization permissions.", 500);
    }

    const isCreator = organization.created_by === user.id;
    const isAdmin = membership?.role?.toLowerCase() === "admin";

    if (!isCreator && !isAdmin) {
      return jsonError(
        "Only this organization's owner or an organization admin can delete it.",
        403
      );
    }

    // Find only this organization's documents. Personal documents and documents
    // in other organizations are never selected by this cleanup.
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from("documents")
      .select("id, storage_path")
      .eq("organization_id", organizationId);

    if (documentsError) {
      reportError("Organization document lookup", documentsError);
      return jsonError("Could not prepare the organization's documents for deletion.", 500);
    }

    const documentRows = documents ?? [];
    const documentIds = documentRows.map((document) => document.id);
    const storagePaths = new Set<string>();

    for (const document of documentRows) {
      if (typeof document.storage_path === "string" && document.storage_path.length > 0) {
        storagePaths.add(document.storage_path);
      }
    }

    // Read version paths before removing any files or records.
    if (documentIds.length > 0) {
      const { data: versions, error: versionsError } = await supabaseAdmin
        .from("document_versions")
        .select("storage_path")
        .in("document_id", documentIds);

      if (versionsError) {
        reportError("Document version lookup", versionsError);
        return jsonError(
          "Could not read document version history. No Storage files were removed.",
          500
        );
      }

      for (const version of versions ?? []) {
        if (typeof version.storage_path === "string" && version.storage_path.length > 0) {
          storagePaths.add(version.storage_path);
        }
      }
    }

    // IMPORTANT: Remove organization invitations before Storage deletion. This
    // catches missing table privileges/constraints before deleting file objects.
    const { error: invitationsError } = await supabaseAdmin
      .from("organization_invitations")
      .delete()
      .eq("organization_id", organizationId);

    if (invitationsError) {
      reportError("Organization invitation cleanup", invitationsError);
      return jsonError(
        "Could not remove organization invitations. No Storage files were removed. Check service_role permissions on organization_invitations.",
        500
      );
    }

    // Delete document-dependent rows before deleting the documents themselves.
    // Each delete is scoped to this organization's document IDs only.
    if (documentIds.length > 0) {
      const dependentDeletes = [
        {
          table: "document_view_sessions",
          label: "document viewing sessions",
        },
        {
          table: "document_access_grants",
          label: "document access permissions",
        },
        {
          table: "document_access_requests",
          label: "document access requests",
        },
        {
          table: "document_versions",
          label: "document versions",
        },
        {
          table: "audit_logs",
          label: "document audit records",
        },
      ] as const;

      for (const item of dependentDeletes) {
        const { error } = await supabaseAdmin
          .from(item.table)
          .delete()
          .in("document_id", documentIds);

        if (error) {
          reportError(`Deleting ${item.label}`, error);
          return jsonError(
            `Could not clean up ${item.label}. No Storage files were removed. Check the server log for the exact database error.`,
            500
          );
        }
      }

      const { error: organizationRequestsError } = await supabaseAdmin
        .from("document_access_requests")
        .delete()
        .eq("organization_id", organizationId);

      // Some schemas have only document_id on this table. PostgreSQL error
      // 42703 means organization_id does not exist; that is safe to skip.
      if (organizationRequestsError && organizationRequestsError.code !== "42703") {
        reportError("Organization-scoped access request cleanup", organizationRequestsError);
        return jsonError(
          "Could not clean up organization access requests. No Storage files were removed.",
          500
        );
      }

      const { error: documentsDeleteError } = await supabaseAdmin
        .from("documents")
        .delete()
        .eq("organization_id", organizationId);

      if (documentsDeleteError) {
        reportError("Organization document deletion", documentsDeleteError);
        return jsonError(
          "Could not delete the organization's document records. No Storage files were removed. Check the server log for the exact database error.",
          500
        );
      }
    }

    const { error: membersError } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId);

    if (membersError) {
      reportError("Organization membership cleanup", membersError);
      return jsonError(
        "Could not remove organization memberships. No Storage files were removed. Check the server log for the exact database error.",
        500
      );
    }

    const { data: deletedOrganization, error: organizationDeleteError } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organizationId)
      .eq("created_by", organization.created_by)
      .select("id")
      .maybeSingle();

    if (organizationDeleteError) {
      reportError("Organization deletion", organizationDeleteError);
      return jsonError(
        "Could not delete the organization record. No Storage files were removed. Check the server log for the exact database error.",
        500
      );
    }

    if (!deletedOrganization) {
      return jsonError(
        "The organization was not deleted. It may have changed while this request was running.",
        409
      );
    }

    // The database records have now been removed. Delete the associated private
    // Storage objects afterward so a database permission error does not remove
    // files first. If Storage cleanup fails, log the paths for recovery.
    const paths = [...storagePaths];
    if (paths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove(paths);

      if (storageError) {
        reportError("Organization Storage cleanup after database deletion", storageError);
        console.error("[TrustVault] Storage paths needing cleanup:", paths);
        // The organization is already deleted from the database; do not report
        // that the database deletion failed. Alert the caller about leftover files.
        return NextResponse.json(
          {
            success: true,
            warning:
              "The organization and database records were deleted, but some Storage files may remain. Check the server log for the paths requiring cleanup.",
            deletedDocuments: documentIds.length,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      action: "organization_deleted",
      details: {
        organization_id: organizationId,
        organization_name: organization.name,
        documents_deleted: documentIds.length,
      },
    });

    if (auditError) {
      reportError("Organization deletion audit log", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Organization "${organization.name}" and its documents were deleted.`,
        deletedDocuments: documentIds.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    reportError("Unexpected organization deletion error", error);
    return jsonError("Unexpected server error while deleting the organization.", 500);
  }
}
