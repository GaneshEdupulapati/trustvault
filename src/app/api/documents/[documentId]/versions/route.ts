import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ documentId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jsonError = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });

async function signedIn() {
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user ? null : user;
}

async function canViewDocument(document: { id: string; owner_id: string; organization_id: string | null }, userId: string) {
  if (document.owner_id === userId) return true;
  if (!document.organization_id) return false;
  const { data: member } = await supabaseAdmin.from("organization_members").select("id").eq("organization_id", document.organization_id).eq("user_id", userId).maybeSingle();
  if (!member) return false;
  const { data: grant } = await supabaseAdmin.from("document_access_grants").select("id, can_view, can_edit, permission, expires_at, revoked_at").eq("document_id", document.id).eq("viewer_id", userId).eq("owner_id", document.owner_id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return !!grant && grant.can_view !== false && (grant.can_edit === true || grant.permission === "modify");
}

export async function GET(_request: Request, context: Context) {
  try {
    const user = await signedIn();
    if (!user) return jsonError("Please sign in first.", 401);
    const { documentId } = await context.params;
    if (!uuid.test(documentId)) return jsonError("Invalid document ID.");
    const { data: document, error } = await supabaseAdmin.from("documents").select("id, owner_id, organization_id, title").eq("id", documentId).maybeSingle();
    if (error || !document) return jsonError("Document not found.", 404);
    if (!(await canViewDocument(document, user.id))) return jsonError("You do not have permission to view this document's history.", 403);
    const { data: versions, error: versionsError } = await supabaseAdmin.from("document_versions").select("id, version_number, original_filename, mime_type, file_size, changed_by, change_note, created_at").eq("document_id", documentId).order("version_number", { ascending: false });
    if (versionsError) return jsonError("Could not load version history. Apply the latest migration.", 500);
    return NextResponse.json({ success: true, versions: versions ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Version history GET failed:", e);
    return jsonError("Unexpected error loading version history.", 500);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await signedIn();
    if (!user) return jsonError("Please sign in first.", 401);
    const { documentId } = await context.params;
    if (!uuid.test(documentId)) return jsonError("Invalid document ID.");
    const { data: document, error } = await supabaseAdmin.from("documents").select("id, owner_id, organization_id, storage_path, original_filename, mime_type, file_size, version_number, title").eq("id", documentId).maybeSingle();
    if (error || !document) return jsonError("Document not found.", 404);
    let refreshedViewerToken: string | null = null;
    let refreshedViewerExpiry: Date | null = null;

    let permission = document.owner_id === user.id ? "modify" : "view";
    if (document.owner_id !== user.id) {
      if (!document.organization_id) return jsonError("You cannot modify this document.", 403);
      const { data: member } = await supabaseAdmin.from("organization_members").select("id").eq("organization_id", document.organization_id).eq("user_id", user.id).maybeSingle();
      if (!member) return jsonError("Join the organization before modifying this document.", 403);
      const { data: grant } = await supabaseAdmin.from("document_access_grants").select("permission, can_edit, expires_at, revoked_at").eq("document_id", documentId).eq("owner_id", document.owner_id).eq("viewer_id", user.id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!grant || !(grant.can_edit === true || grant.permission === "modify")) return jsonError("The owner has not granted you modify permission.", 403);
      permission = grant.permission;
    }

    // Replacing a file requires a recently verified document password, not just a login.
    const cookieStore = await cookies();
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (document.owner_id === user.id) {
      const token = cookieStore.get("tv_owner_document_session")?.value;
      if (!token || !secret) return jsonError("Enter the document password before modifying it.", 403);
      const [payload, signature, extra] = token.split(".");
      if (!payload || !signature || extra !== undefined) return jsonError("Document verification expired. Verify again.", 403);
      const expected = createHmac("sha256", secret).update(payload).digest();
      const supplied = Buffer.from(signature, "base64url");
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return jsonError("Document verification expired. Verify again.", 403);
      let ownerSession: { userId?: string; documentId?: string; expiresAt?: number };
      try { ownerSession = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return jsonError("Document verification expired. Verify again.", 403); }
      if (ownerSession.userId !== user.id || ownerSession.documentId !== documentId || !ownerSession.expiresAt || ownerSession.expiresAt <= Date.now()) return jsonError("Document verification expired. Verify again.", 403);
    } else {
      const token = cookieStore.get("tv_view_session")?.value;
      if (!token || token.length > 128) return jsonError("Enter the document password before modifying it.", 403);
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const now = new Date().toISOString();
      const { data: session } = await supabaseAdmin.from("document_view_sessions").select("id, grant_id, last_activity_at, expires_at").eq("token_hash", tokenHash).eq("viewer_id", user.id).eq("document_id", documentId).is("revoked_at", null).gt("expires_at", now).maybeSingle();
      if (!session || Date.now() - new Date(session.last_activity_at).getTime() >= 10 * 60 * 1000) return jsonError("Your document session expired. Verify the password again.", 403);
      const { data: activeGrant } = await supabaseAdmin.from("document_access_grants").select("id, can_edit, permission, expires_at, revoked_at").eq("id", session.grant_id).eq("document_id", documentId).eq("viewer_id", user.id).is("revoked_at", null).gt("expires_at", now).maybeSingle();
      if (!activeGrant || !(activeGrant.can_edit === true || activeGrant.permission === "modify")) return jsonError("Modify permission is missing, revoked, or expired.", 403);
      const nextExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await supabaseAdmin.from("document_view_sessions").update({ last_activity_at: now, expires_at: nextExpiry.toISOString() }).eq("id", session.id);
      refreshedViewerToken = token;
      refreshedViewerExpiry = nextExpiry;
    }

    const form = await request.formData();
    const file = form.get("file");
    const noteRaw = form.get("note");
    const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 300) : "Updated document";
    if (!(file instanceof File)) return jsonError("Choose a replacement file.");
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) return jsonError("Only PDF, PNG, JPEG, and WebP files are supported.");
    if (file.size < 1 || file.size > 50 * 1024 * 1024) return jsonError("The replacement file must be smaller than 50 MB.");

    const { data: oldFile, error: downloadError } = await supabaseAdmin.storage.from("trustvault-documents").download(document.storage_path);
    if (downloadError || !oldFile) return jsonError("Could not preserve the current version. No changes were made.", 500);
    const currentVersion = Number(document.version_number ?? 1);
    const safeOldName = (document.original_filename || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    const snapshotPath = `versions/${document.id}/v${currentVersion}-${Date.now()}-${safeOldName}`;
    const snapshotBlob = new File([oldFile], safeOldName, { type: document.mime_type || "application/octet-stream" });
    const { error: snapshotError } = await supabaseAdmin.storage.from("trustvault-documents").upload(snapshotPath, snapshotBlob, { contentType: document.mime_type || "application/octet-stream", upsert: false });
    if (snapshotError) return jsonError("Could not preserve the current version. No changes were made.", 500);

    const { error: replaceError } = await supabaseAdmin.storage.from("trustvault-documents").upload(document.storage_path, file, { contentType: file.type, upsert: true });
    if (replaceError) {
      await supabaseAdmin.storage.from("trustvault-documents").remove([snapshotPath]);
      return jsonError("Could not replace the file. The current version was not changed.", 500);
    }

    const { error: historyError } = await supabaseAdmin.from("document_versions").insert({ document_id: document.id, version_number: currentVersion, storage_path: snapshotPath, original_filename: document.original_filename, mime_type: document.mime_type, file_size: document.file_size, changed_by: user.id, change_note: note || "Updated document" });
    if (historyError) {
      // Do not lose the snapshot if the history row failed; log for manual recovery.
      console.error("Version snapshot stored but history row failed:", historyError.message, snapshotPath);
      return jsonError("The file was replaced, but version history could not be recorded. Contact the project owner before further edits.", 500);
    }

    const nextVersion = currentVersion + 1;
    const { error: updateError } = await supabaseAdmin.from("documents").update({ original_filename: file.name, mime_type: file.type, file_size: file.size, title: file.name.replace(/\.[^.]+$/, "") || file.name, version_number: nextVersion, updated_at: new Date().toISOString() }).eq("id", documentId);
    if (updateError) return jsonError("The file was replaced, but its metadata could not be updated. Contact the project owner.", 500);
    await supabaseAdmin.from("audit_logs").insert({ actor_id: user.id, document_id: documentId, target_user_id: document.owner_id, action: "document_version_created", details: { old_version: currentVersion, new_version: nextVersion, note, permission } });
    const response = NextResponse.json({ success: true, message: `Saved as version ${nextVersion}. The previous version is preserved in history.`, version: nextVersion }, { headers: { "Cache-Control": "no-store" } });
    if (refreshedViewerToken && refreshedViewerExpiry) response.cookies.set("tv_view_session", refreshedViewerToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api", expires: refreshedViewerExpiry });
    return response;
  } catch (e) {
    console.error("Document replacement failed:", e);
    return jsonError("Unexpected error while replacing the document.", 500);
  }
}
