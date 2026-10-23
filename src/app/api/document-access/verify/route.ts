import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const scrypt = promisify(scryptCallback);
const SESSION_MS = 10 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt" || !/^[0-9a-f]{32}$/i.test(parts[1]) || !/^[0-9a-f]{128}$/i.test(parts[2])) return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, expected);
}

function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return error("Please sign in first.", 401);

    const body = await request.json().catch(() => null) as null | { documentId?: unknown; password?: unknown };
    if (!body || typeof body.documentId !== "string" || !uuidPattern.test(body.documentId) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
      return error("Enter a valid document ID and password of 8–128 characters.");
    }

    const { data: document, error: documentError } = await supabaseAdmin.from("documents")
      .select("id, owner_id, organization_id, title, password_hash")
      .eq("id", body.documentId).maybeSingle();
    if (documentError) {
      console.error("Document lookup failed:", documentError.message);
      return error("Could not verify the document.", 500);
    }
    if (!document || !document.password_hash) return error("Document not found or the owner has not set its document password.", 404);

    const signingSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!signingSecret) return error("Secure document verification is not configured on the server.", 500);

    if (document.owner_id === user.id) {
      const valid = await verifyPassword(body.password, document.password_hash);
      if (!valid) {
        await supabaseAdmin.from("audit_logs").insert({ actor_id: user.id, document_id: document.id, target_user_id: document.owner_id, action: "owner_document_password_failed", details: {} });
        return error("Incorrect document password.", 403);
      }
      const expiresAt = Date.now() + SESSION_MS;
      const payload = Buffer.from(JSON.stringify({ userId: user.id, documentId: document.id, expiresAt })).toString("base64url");
      const signature = createHmac("sha256", signingSecret).update(payload).digest("base64url");
      await supabaseAdmin.from("audit_logs").insert({ actor_id: user.id, document_id: document.id, target_user_id: document.owner_id, action: "owner_document_password_verified", details: { expires_at: new Date(expiresAt).toISOString() } });
      const response = NextResponse.json({ success: true, document: { id: document.id, title: document.title }, message: "Document password verified." }, { headers: { "Cache-Control": "no-store" } });
      response.cookies.set("tv_owner_document_session", `${payload}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api", expires: new Date(expiresAt) });
      return response;
    }

    if (document.organization_id) {
      const { data: membership, error: membershipError } = await supabaseAdmin.from("organization_members").select("id")
        .eq("organization_id", document.organization_id).eq("user_id", user.id).maybeSingle();
      if (membershipError) return error("Could not verify organization membership.", 500);
      if (!membership) return error("Join this document's organization before requesting access.", 403);
    }

    const now = new Date().toISOString();
    const { data: grants, error: grantError } = await supabaseAdmin.from("document_access_grants")
      .select("id, password_hash, permission, can_view, can_edit, can_download, expires_at, revoked_at")
      .eq("document_id", document.id).eq("viewer_id", user.id).eq("owner_id", document.owner_id)
      .is("revoked_at", null).gt("expires_at", now).order("created_at", { ascending: false }).limit(10);
    if (grantError) {
      console.error("Grant lookup failed:", grantError.message);
      return error("Could not verify document permissions.", 500);
    }
    const grant = (grants ?? []).find(g => g.can_view !== false && (g.can_view === true || g.permission === "view" || g.permission === "modify"));
    if (!grant) return error("You need an active view permission from the document owner before opening this file.", 403);

    const valid = await verifyPassword(body.password, grant.password_hash);
    if (!valid) {
      await supabaseAdmin.from("audit_logs").insert({ actor_id: user.id, document_id: document.id, target_user_id: document.owner_id, action: "document_access_password_failed", details: { grant_id: grant.id } });
      return error("Incorrect access password. Use the random password provided when the owner approved your access.", 403);
    }

    const expiresAt = new Date(Math.min(Date.now() + SESSION_MS, new Date(grant.expires_at).getTime()));
    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
    const { error: sessionError } = await supabaseAdmin.from("document_view_sessions").insert({ grant_id: grant.id, document_id: document.id, viewer_id: user.id, token_hash: tokenHash, expires_at: expiresAt.toISOString() });
    if (sessionError) {
      console.error("Viewing session creation failed:", sessionError.message);
      return error("Could not create a secure viewing session.", 500);
    }
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({ actor_id: user.id, document_id: document.id, target_user_id: document.owner_id, action: "document_access_session_created", details: { grant_id: grant.id, permission: grant.permission, expires_at: expiresAt.toISOString() } });
    if (auditError) {
      await supabaseAdmin.from("document_view_sessions").update({ revoked_at: new Date().toISOString() }).eq("token_hash", tokenHash);
      return error("Could not record the access event.", 500);
    }
    const response = NextResponse.json({ success: true, document: { id: document.id, title: document.title }, grant: { id: grant.id, permission: grant.permission, canDownload: grant.can_download === true, expiresAt: expiresAt.toISOString() }, message: "Access password verified. Your viewing session expires after 10 minutes of inactivity." }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set("tv_view_session", sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api", expires: expiresAt });
    return response;
  } catch (e) {
    console.error("Document password verification failed:", e);
    return error("An unexpected server error occurred.", 500);
  }
}
