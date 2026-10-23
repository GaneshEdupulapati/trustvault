import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: Request) {
  await connection();

  try {
    // 1. Verify the signed-in Supabase user.
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Please sign in again.", 401);
    }

    // 2. Validate the requested document ID.
    const url = new URL(request.url);

    const documentId = url.searchParams.get("documentId");
    const downloadMode =
      url.searchParams.get("download") === "1";

    if (!documentId || !uuidPattern.test(documentId)) {
      return jsonError(
        "A valid document ID is required.",
        400
      );
    }

    // 3. Retrieve document metadata using the server-only client.
    const {
      data: document,
      error: documentError,
    } = await supabaseAdmin
      .from("documents")
      .select(
        "id, owner_id, storage_path, original_filename, mime_type"
      )
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) {
      console.error(
        "Document lookup failed:",
        documentError.message
      );

      return jsonError(
        "Could not retrieve the document.",
        500
      );
    }

    if (!document) {
      return jsonError("Document not found.", 404);
    }

    // 4. Determine ownership using the authenticated user's ID.
    const isOwner = document.owner_id === user.id;

    const cookieStore = await cookies();

    let refreshedViewerToken: string | null = null;
    let refreshedViewerExpiry: Date | null = null;

    // =====================================================
    // OWNER ACCESS
    // =====================================================
    if (isOwner) {
      const ownerToken = cookieStore.get(
        "tv_owner_document_session"
      )?.value;

      if (!ownerToken || ownerToken.length > 4096) {
        return jsonError(
          "Verify the document password before opening this document.",
          403
        );
      }

      const [
        payloadPart,
        signaturePart,
        extraPart,
      ] = ownerToken.split(".");

      const signingSecret =
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (
        !payloadPart ||
        !signaturePart ||
        extraPart !== undefined ||
        !signingSecret
      ) {
        return jsonError(
          "The owner verification session is invalid. Verify again.",
          403
        );
      }

      // Verify the signature of the owner session.
      const expectedSignature = createHmac(
        "sha256",
        signingSecret
      )
        .update(payloadPart)
        .digest();

      let suppliedSignature: Buffer;

      try {
        suppliedSignature = Buffer.from(
          signaturePart,
          "base64url"
        );
      } catch {
        return jsonError(
          "The owner verification session is invalid.",
          403
        );
      }

      if (
        suppliedSignature.length !==
          expectedSignature.length ||
        !timingSafeEqual(
          suppliedSignature,
          expectedSignature
        )
      ) {
        return jsonError(
          "The owner verification session is invalid.",
          403
        );
      }

      // Decode the signed session.
      let ownerSession: {
        userId?: string;
        documentId?: string;
        expiresAt?: number;
      };

      try {
        ownerSession = JSON.parse(
          Buffer.from(
            payloadPart,
            "base64url"
          ).toString("utf8")
        );
      } catch {
        return jsonError(
          "The owner verification session is invalid.",
          403
        );
      }

      // The session must belong to THIS user and THIS document.
      if (
        ownerSession.userId !== user.id ||
        ownerSession.documentId !== document.id ||
        typeof ownerSession.expiresAt !== "number" ||
        ownerSession.expiresAt <= Date.now()
      ) {
        return jsonError(
          "The owner session expired or belongs to another document. Verify again.",
          403
        );
      }
    } else {
      // ===================================================
      // NON-OWNER ACCESS
      // ===================================================

      // 5. Non-owners must have a valid viewing-session cookie.
      const sessionToken = cookieStore.get(
        "tv_view_session"
      )?.value;

      if (
        !sessionToken ||
        sessionToken.length > 128
      ) {
        return jsonError(
          "Approved access and a verified viewing session are required.",
          403
        );
      }

      // Never use a document ID or a user's email as a session token.
      // Look up the SHA-256 hash of the random session token.
      const tokenHash = createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      const nowDate = new Date();
      const now = nowDate.toISOString();

      const {
        data: viewSession,
        error: sessionError,
      } = await supabaseAdmin
        .from("document_view_sessions")
        .select(
          "id, grant_id, expires_at, last_activity_at"
        )
        .eq("token_hash", tokenHash)
        .eq("viewer_id", user.id)
        .eq("document_id", document.id)
        .is("revoked_at", null)
        .gt("expires_at", now)
        .maybeSingle();

      if (sessionError) {
        console.error(
          "Viewing session lookup failed:",
          sessionError.message
        );

        return jsonError(
          "Could not verify the viewing session.",
          500
        );
      }

      if (!viewSession) {
        return jsonError(
          "Your viewing session is invalid or expired. Verify access again.",
          403
        );
      }

      // 6. Enforce the ten-minute inactivity timeout.
      const lastActivity = new Date(
        viewSession.last_activity_at ??
          viewSession.expires_at
      ).getTime();

      if (
        !Number.isFinite(lastActivity) ||
        nowDate.getTime() - lastActivity >=
          IDLE_TIMEOUT_MS
      ) {
        await supabaseAdmin
          .from("document_view_sessions")
          .update({
            revoked_at: now,
          })
          .eq("id", viewSession.id)
          .is("revoked_at", null);

        const response = jsonError(
          "Your viewing session expired after ten minutes of inactivity. Verify access again.",
          403
        );

        response.cookies.set(
          "tv_view_session",
          "",
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api",
            expires: new Date(0),
          }
        );

        return response;
      }

      // 7. Recheck the actual access grant on every file request.
      // This prevents continued access after a grant is revoked.
      const {
        data: grant,
        error: grantError,
      } = await supabaseAdmin
        .from("document_access_grants")
        .select(
          "id, permission, can_view, can_download, expires_at"
        )
        .eq("id", viewSession.grant_id)
        .eq("document_id", document.id)
        .eq("owner_id", document.owner_id)
        .eq("viewer_id", user.id)
        .is("revoked_at", null)
        .gt("expires_at", now)
        .maybeSingle();

      if (grantError) {
        console.error(
          "Access grant lookup failed:",
          grantError.message
        );

        return jsonError(
          "Could not verify document permissions.",
          500
        );
      }

      if (!grant) {
        return jsonError(
          "Your access grant is invalid, revoked, or expired.",
          403
        );
      }

      // A viewer must have explicit viewing permission.
      const canView =
        grant.can_view === true ||
        grant.permission === "view" ||
        grant.permission === "modify";

      if (!canView) {
        return jsonError(
          "The document owner has not granted viewing permission.",
          403
        );
      }

      // Download permission is checked separately.
      // A modify grant alone does NOT automatically allow downloading.
      if (
        downloadMode &&
        grant.can_download !== true
      ) {
        return jsonError(
          "The document owner has not granted download permission.",
          403
        );
      }

      // 8. Extend the viewing session, but never beyond the grant expiry.
      const grantExpiry = new Date(
        grant.expires_at
      ).getTime();

      const nextExpiry = new Date(
        Math.min(
          nowDate.getTime() + IDLE_TIMEOUT_MS,
          grantExpiry
        )
      );

      if (nextExpiry.getTime() <= nowDate.getTime()) {
        return jsonError(
          "Your access grant has expired.",
          403
        );
      }

      const {
        error: activityError,
      } = await supabaseAdmin
        .from("document_view_sessions")
        .update({
          last_activity_at: now,
          expires_at: nextExpiry.toISOString(),
        })
        .eq("id", viewSession.id)
        .eq("viewer_id", user.id)
        .eq("document_id", document.id)
        .is("revoked_at", null);

      if (activityError) {
        console.error(
          "Session activity update failed:",
          activityError.message
        );

        return jsonError(
          "Could not update your viewing session.",
          500
        );
      }

      refreshedViewerToken = sessionToken;
      refreshedViewerExpiry = nextExpiry;
    }

    // =====================================================
    // DELIVER THE FILE ONLY AFTER AUTHORIZATION SUCCEEDS
    // =====================================================

    const {
      data: file,
      error: fileError,
    } = await supabaseAdmin.storage
      .from("trustvault-documents")
      .download(document.storage_path);

    if (fileError || !file) {
      console.error(
        "Protected file retrieval failed:",
        fileError?.message
      );

      return jsonError(
        "Could not retrieve the protected document.",
        500
      );
    }

    // 9. Record the access event.
    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          document_id: document.id,
          target_user_id: document.owner_id,
          action: downloadMode
            ? isOwner
              ? "owner_document_downloaded"
              : "shared_document_downloaded"
            : isOwner
              ? "owner_document_viewed"
              : "shared_document_viewed",
          details: {
            original_filename:
              document.original_filename,
            access_type: isOwner
              ? "owner"
              : "approved_viewer",
          },
        });

    if (auditError) {
      // A logging failure should not expose the error details
      // or bypass the document authorization checks.
      console.error(
        "Audit logging failed:",
        auditError.message
      );
    }

    // 10. Safely prepare the response.
    const safeFilename = (
      document.original_filename || "document"
    ).replace(/["\\\r\n]/g, "_");

    const response = new NextResponse(
      await file.arrayBuffer(),
      {
        status: 200,
        headers: {
          "Content-Type":
            document.mime_type ||
            "application/octet-stream",

          "Content-Disposition":
            `${downloadMode ? "attachment" : "inline"}; filename="${safeFilename}"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options": "nosniff",

          "Referrer-Policy": "no-referrer",

          "Content-Security-Policy":
            "default-src 'none'; sandbox",
        },
      }
    );

    // Refresh the cookie only for an approved viewer.
    if (
      refreshedViewerToken &&
      refreshedViewerExpiry
    ) {
      response.cookies.set(
        "tv_view_session",
        refreshedViewerToken,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/api",
          expires: refreshedViewerExpiry,
        }
      );
    }

    return response;
  } catch (error) {
    console.error(
      "Protected file delivery failed:",
      error
    );

    return jsonError(
      "An unexpected server error occurred.",
      500
    );
  }
}