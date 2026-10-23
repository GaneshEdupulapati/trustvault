import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    // 1. Verify the signed-in user.
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in before deleting a document." },
        { status: 401 }
      );
    }

    const { documentId } = await context.params;

    // 2. Validate the document ID.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID." },
        { status: 400 }
      );
    }

    // 3. Find the document and verify ownership.
    const { data: document, error: lookupError } =
      await supabaseAdmin
        .from("documents")
        .select("id, owner_id, storage_path, original_filename")
        .eq("id", documentId)
        .maybeSingle();

    if (lookupError) {
      console.error("Document lookup failed:", lookupError);

      return NextResponse.json(
        { error: "Unable to retrieve the document." },
        { status: 500 }
      );
    }

    if (!document || document.owner_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Document not found or you do not have permission to delete it.",
        },
        { status: 404 }
      );
    }

    // 4. Remove dependent database records first.
    // If any operation fails, stop and log the exact error.
    const cleanupSteps = [
      {
        table: "document_view_sessions",
        run: () =>
          supabaseAdmin
            .from("document_view_sessions")
            .delete()
            .eq("document_id", documentId),
      },
      {
        table: "document_versions",
        run: () =>
          supabaseAdmin
            .from("document_versions")
            .delete()
            .eq("document_id", documentId),
      },
      {
        table: "document_access_requests",
        run: () =>
          supabaseAdmin
            .from("document_access_requests")
            .delete()
            .eq("document_id", documentId),
      },
      {
        table: "document_access_grants",
        run: () =>
          supabaseAdmin
            .from("document_access_grants")
            .delete()
            .eq("document_id", documentId),
      },
    ];

    for (const step of cleanupSteps) {
      const { error } = await step.run();

      if (error) {
        console.error(
          `Cleanup failed for ${step.table}:`,
          error
        );

        return NextResponse.json(
          {
            error: `Could not clean up ${step.table}. Check the VS Code terminal for the database error.`,
          },
          { status: 500 }
        );
      }
    }

    // 5. Preserve historical audit records but detach the document FK.
    const { error: auditDetachError } = await supabaseAdmin
      .from("audit_logs")
      .update({ document_id: null })
      .eq("document_id", documentId);

    if (auditDetachError) {
      console.error(
        "Could not detach audit records:",
        auditDetachError
      );

      return NextResponse.json(
        {
          error:
            "Could not prepare the audit history for deletion. Check the VS Code terminal.",
        },
        { status: 500 }
      );
    }

    // 6. Delete the file from private Supabase Storage.
    const { error: storageError } = await supabaseAdmin.storage
      .from("trustvault-documents")
      .remove([document.storage_path]);

    if (storageError) {
      console.error("Storage deletion failed:", storageError);

      return NextResponse.json(
        {
          error:
            "Could not delete the stored file. The document record has been kept. Check the VS Code terminal.",
        },
        { status: 500 }
      );
    }

    // 7. Delete the database record.
    const { data: deletedRows, error: deleteError } =
      await supabaseAdmin
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("owner_id", user.id)
        .select("id");

    if (deleteError || !deletedRows || deletedRows.length === 0) {
      console.error(
        "Document database deletion failed:",
        deleteError ?? "No document row was deleted."
      );

      return NextResponse.json(
        {
          error:
            "The stored file was removed, but the database record could not be deleted. Check the VS Code terminal for the exact error.",
        },
        { status: 500 }
      );
    }

    // 8. Record the deletion in the audit trail.
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        document_id: null,
        action: "document_deleted",
        details: {
          document_id: documentId,
          original_filename: document.original_filename,
          deleted_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      // The deletion has already succeeded.
      console.error("Deletion audit logging failed:", auditError);
    }

    // 9. Return success only after the database record is deleted.
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Unexpected document deletion error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while deleting the document." },
      { status: 500 }
    );
  }
}