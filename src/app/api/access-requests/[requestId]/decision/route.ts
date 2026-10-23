import { NextResponse } from "next/server";
import { createHash, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const scrypt = promisify(scryptCallback);

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

type DecisionBody = {
  decision?: unknown;
};

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

function makeAccessPassword() {
  // 10 random bytes produce a strong password with a readable alphabet.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const random = randomBytes(12);

  return Array.from(random, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  let createdGrantId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { requestId } = await context.params;
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(requestId)) {
      return NextResponse.json(
        { error: "Invalid request ID." },
        { status: 400 }
      );
    }

    let body: DecisionBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (body.decision !== "approved" && body.decision !== "denied") {
      return NextResponse.json(
        { error: "Decision must be approved or denied." },
        { status: 400 }
      );
    }

    const { data: accessRequest, error: requestError } =
      await supabaseAdmin
        .from("document_access_requests")
        .select(
          "id, document_id, requester_id, status, can_view, can_edit, can_download"
        )
        .eq("id", requestId)
        .maybeSingle();

    if (requestError) {
      console.error("Request lookup failed:", requestError.message);
      return NextResponse.json(
        { error: "Could not retrieve the access request." },
        { status: 500 }
      );
    }

    if (!accessRequest || accessRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Pending access request not found." },
        { status: 404 }
      );
    }

    const { data: document, error: documentError } =
      await supabaseAdmin
        .from("documents")
        .select("id, owner_id")
        .eq("id", accessRequest.document_id)
        .maybeSingle();

    if (documentError) {
      console.error("Document lookup failed:", documentError.message);
      return NextResponse.json(
        { error: "Could not verify document ownership." },
        { status: 500 }
      );
    }

    if (!document || document.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the document owner can decide this request." },
        { status: 403 }
      );
    }

    let accessPassword: string | null = null;
    let expiresAt: string | null = null;

    if (body.decision === "approved") {
      if (!accessRequest.can_view && !accessRequest.can_edit) {
        return NextResponse.json(
          { error: "The request has no view or edit permission to grant." },
          { status: 400 }
        );
      }

      accessPassword = makeAccessPassword();
      const passwordHash = await hashPassword(accessPassword);
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const permission = accessRequest.can_edit ? "modify" : "view";

      const { data: grant, error: grantError } = await supabaseAdmin
        .from("document_access_grants")
        .insert({
          document_id: document.id,
          owner_id: user.id,
          viewer_id: accessRequest.requester_id,
          password_hash: passwordHash,
          permission,
          can_view: accessRequest.can_view === true,
          can_edit: accessRequest.can_edit === true,
          can_download:
  accessRequest.can_edit === true &&
  accessRequest.can_download === true,
          expires_at: expiresAt,
          revoked_at: null,
        })
        .select("id")
        .single();

      if (grantError || !grant) {
        console.error("Grant creation failed:", grantError?.message);
        return NextResponse.json(
          { error: "Could not create the secure access grant." },
          { status: 500 }
        );
      }

      createdGrantId = grant.id;
    }

    const { data: updatedRequest, error: updateError } =
      await supabaseAdmin
        .from("document_access_requests")
        .update({
          status: body.decision === "approved" ? "approved" : "rejected",
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("id, status, document_id, requester_id")
        .maybeSingle();

    if (updateError || !updatedRequest) {
      if (createdGrantId) {
        await supabaseAdmin
          .from("document_access_grants")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", createdGrantId);
      }

      console.error("Request update failed:", updateError?.message);

      return NextResponse.json(
        { error: "The request could not be decided. Refresh and try again." },
        { status: 409 }
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        document_id: document.id,
        target_user_id: accessRequest.requester_id,
        action:
          body.decision === "approved"
            ? "access_request_approved"
            : "access_request_denied",
        details: {
          request_id: requestId,
          permission:
            body.decision === "approved"
              ? accessRequest.can_edit
                ? "modify"
                : "view"
              : null,
          expires_at: expiresAt,
          grant_id: createdGrantId,
        },
      });

    if (auditError) {
      console.error("Audit logging failed:", auditError.message);

      if (createdGrantId) {
        await supabaseAdmin
          .from("document_access_grants")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", createdGrantId);
      }

      return NextResponse.json(
        { error: "Audit logging failed. Any new grant has been revoked; contact the administrator." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      access:
        body.decision === "approved"
          ? {
              password: accessPassword,
              expiresAt,
              permission: accessRequest.can_edit ? "modify" : "view",
              downloadAllowed: accessRequest.can_download,
            }
          : null,
    });
  } catch (error) {
    console.error("Access decision failed:", error);

    if (createdGrantId) {
      await supabaseAdmin
        .from("document_access_grants")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", createdGrantId);
    }

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
