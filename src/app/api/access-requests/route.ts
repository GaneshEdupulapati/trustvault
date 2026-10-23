import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(error: string, status = 400) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/** List pending requests for documents owned by the signed-in user. */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return jsonError("Please sign in again.", 401);

    const { data: documents, error: documentsError } = await supabaseAdmin
      .from("documents")
      .select("id, title")
      .eq("owner_id", user.id);

    if (documentsError) {
      console.error("[TrustVault] Access-request document lookup failed:", documentsError.message);
      return jsonError("Could not load access requests.", 500);
    }

    const documentRows = documents ?? [];
    const documentIds = documentRows.map((document) => document.id);
    if (documentIds.length === 0) {
      return NextResponse.json(
        { success: true, requests: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("document_access_requests")
      .select("id, document_id, requester_id, can_edit, can_download, created_at")
      .in("document_id", documentIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("[TrustVault] Access-request list failed:", requestsError.message);
      return jsonError("Could not load access requests.", 500);
    }

    const documentTitleById = new Map(
      documentRows.map((document) => [document.id, document.title])
    );

    const enrichedRequests = await Promise.all(
      (requests ?? []).map(async (item) => {
        let requesterEmail = "Unknown user";
        const { data: authResult, error: authUserError } =
          await supabaseAdmin.auth.admin.getUserById(item.requester_id);

        if (!authUserError && authResult.user?.email) {
          requesterEmail = authResult.user.email;
        }

        return {
          ...item,
          document_title: documentTitleById.get(item.document_id) ?? "Document",
          requester_email: requesterEmail,
        };
      })
    );

    return NextResponse.json(
      { success: true, requests: enrichedRequests },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[TrustVault] Unexpected access-request GET error:", error);
    return jsonError("Unexpected error while loading access requests.", 500);
  }
}

/**
 * Create a separate request row on every submission. There is intentionally
 * no "already pending" check, so viewers may request access repeatedly.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return jsonError("Please sign in again.", 401);

    let body: {
      documentId?: unknown;
      canEdit?: unknown;
      canDownload?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid request body.");
    }

    if (typeof body.documentId !== "string" || !uuidPattern.test(body.documentId)) {
      return jsonError("A valid document ID is required.");
    }
    if (
      (body.canEdit !== undefined && typeof body.canEdit !== "boolean") ||
      (body.canDownload !== undefined && typeof body.canDownload !== "boolean")
    ) {
      return jsonError("Invalid permission options.");
    }

    const canEdit = body.canEdit === true;
    const canDownload = body.canDownload === true;

    const { data: document, error: documentError } = await supabaseAdmin
      .from("documents")
      .select("id, owner_id, organization_id")
      .eq("id", body.documentId)
      .maybeSingle();

    if (documentError) {
      console.error("[TrustVault] Access-request document lookup failed:", documentError.message);
      return jsonError("Could not verify the document.", 500);
    }
    if (!document) return jsonError("Document not found.", 404);
    if (document.owner_id === user.id) {
      return jsonError("You already own this document and do not need to request access.");
    }

    // Require current membership for organization-scoped documents.
    if (document.organization_id) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_id", document.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError) {
        console.error("[TrustVault] Organization membership check failed:", membershipError.message);
        return jsonError("Could not verify organization membership.", 500);
      }
      if (!membership) {
        return jsonError("Join this document's organization before requesting access.", 403);
      }
    }

    // Always insert a fresh request. The schema supports separate request IDs,
    // and repeated attempts remain visible to the document owner.
    const { data: createdRequest, error: insertError } = await supabaseAdmin
      .from("document_access_requests")
      .insert({
        document_id: document.id,
        requester_id: user.id,
        status: "pending",
        can_view: true,
        can_edit: canEdit,
        can_download: canDownload,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("[TrustVault] Access-request insert failed:", insertError.message);
      return jsonError("Could not create the access request. Please try again.", 500);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      document_id: document.id,
      target_user_id: document.owner_id,
      action: "document_access_requested",
      details: {
        request_id: createdRequest.id,
        can_view: true,
        can_edit: canEdit,
        can_download: canDownload,
      },
    });

    if (auditError) {
      // Do not report failure after the request was already saved.
      console.error("[TrustVault] Access-request audit insert failed:", auditError.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Access request sent to the document owner.",
        request: createdRequest,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[TrustVault] Unexpected access-request POST error:", error);
    return jsonError("Unexpected error while creating the access request.", 500);
  }
}
