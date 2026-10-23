import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ documentId: string; versionId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const error = (message: string, status = 400) => NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, context: Context) {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return error("Please sign in first.", 401);
    const { documentId, versionId } = await context.params;
    if (!uuid.test(documentId) || !uuid.test(versionId)) return error("Invalid document or version ID.");
    const { data: doc } = await supabaseAdmin.from("documents").select("id, owner_id, organization_id").eq("id", documentId).maybeSingle();
    const { data: version, error: versionError } = await supabaseAdmin.from("document_versions").select("id, document_id, storage_path, original_filename, mime_type").eq("id", versionId).eq("document_id", documentId).maybeSingle();
    if (versionError || !doc || !version) return error("Version not found.", 404);
    const cookieStore = await cookies();
    let refreshedViewerToken: string | null = null;
    let refreshedViewerExpiry: Date | null = null;
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (doc.owner_id === user.id) {
      const token = cookieStore.get("tv_owner_document_session")?.value;
      if (!token || !secret) return error("Verify the document password before opening a previous version.", 403);
      const [payload, signature, extra] = token.split(".");
      if (!payload || !signature || extra !== undefined) return error("Document verification expired. Verify again.", 403);
      const expected = createHmac("sha256", secret).update(payload).digest();
      const supplied = Buffer.from(signature, "base64url");
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return error("Document verification expired. Verify again.", 403);
      let session: { userId?: string; documentId?: string; expiresAt?: number };
      try { session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return error("Document verification expired. Verify again.", 403); }
      if (session.userId !== user.id || session.documentId !== documentId || !session.expiresAt || session.expiresAt <= Date.now()) return error("Document verification expired. Verify again.", 403);
    } else {
      if (!doc.organization_id) return error("You do not have access to this version.", 403);
      const { data: member } = await supabaseAdmin.from("organization_members").select("id").eq("organization_id", doc.organization_id).eq("user_id", user.id).maybeSingle();
      const token = cookieStore.get("tv_view_session")?.value;
      if (!member || !token || token.length > 128) return error("Verify the document password and organization access first.", 403);
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const now = new Date().toISOString();
      const { data: session } = await supabaseAdmin.from("document_view_sessions").select("id, grant_id, last_activity_at, expires_at").eq("token_hash", tokenHash).eq("viewer_id", user.id).eq("document_id", documentId).is("revoked_at", null).gt("expires_at", now).maybeSingle();
      if (!session || Date.now() - new Date(session.last_activity_at).getTime() >= 10 * 60 * 1000) return error("Viewing session expired. Verify the document password again.", 403);
      const { data: grant } = await supabaseAdmin.from("document_access_grants").select("id, can_view, can_edit, permission, expires_at, revoked_at").eq("id", session.grant_id).eq("viewer_id", user.id).eq("owner_id", doc.owner_id).eq("document_id", documentId).is("revoked_at", null).gt("expires_at", now).maybeSingle();
      if (!grant || grant.can_view === false || !(grant.can_edit === true || grant.permission === "modify")) return error("Your access permission has expired or been revoked.", 403);
      const nextExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await supabaseAdmin.from("document_view_sessions").update({ last_activity_at: now, expires_at: nextExpiry.toISOString() }).eq("id", session.id);
      refreshedViewerToken = token;
      refreshedViewerExpiry = nextExpiry;
    }

    const { data: file, error: storageError } = await supabaseAdmin.storage.from("trustvault-documents").download(version.storage_path);
    if (storageError || !file) return error("Could not retrieve this previous version.", 500);
    const filename = (version.original_filename || "document").replace(/["\\\r\n]/g, "_");
    const response = new NextResponse(await file.arrayBuffer(), { headers: { "Content-Type": version.mime_type || "application/octet-stream", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; sandbox" } });
    if (refreshedViewerToken && refreshedViewerExpiry) response.cookies.set("tv_view_session", refreshedViewerToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api", expires: refreshedViewerExpiry });
    return response;
  } catch (e) {
    console.error("Previous version delivery failed:", e);
    return error("Unexpected error while opening the previous version.", 500);
  }
}
