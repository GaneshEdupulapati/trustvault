import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const scrypt = promisify(scryptCallback);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function makePasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function POST(request: Request) {
  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Please sign in again." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let body: { documentId?: unknown; password?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (
      typeof body.documentId !== "string" ||
      !uuidPattern.test(body.documentId) ||
      typeof body.password !== "string" ||
      body.password.length < 8 ||
      body.password.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid document ID and a password of 8–128 characters.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: document, error: documentError } = await supabaseAdmin
      .from("documents")
      .select("id, owner_id")
      .eq("id", body.documentId)
      .maybeSingle();

    if (documentError) {
      console.error("Password route document lookup failed:", documentError.message);
      return NextResponse.json(
        { success: false, error: "Could not find the document." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (document.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the document owner can set its password." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const passwordHash = await makePasswordHash(body.password);

    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({ password_hash: passwordHash })
      .eq("id", document.id)
      .eq("owner_id", user.id);

    if (updateError) {
      console.error("Password hash update failed:", updateError.message);
      return NextResponse.json(
        { success: false, error: "Could not save the document password." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Revoke old viewer sessions for this document after changing its password.
    const { error: revokeError } = await supabaseAdmin
      .from("document_view_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("document_id", document.id)
      .is("revoked_at", null);

    if (revokeError) {
      console.error("Could not revoke old viewing sessions:", revokeError.message);
      // Password has already changed; report success rather than imply it did not.
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      document_id: document.id,
      target_user_id: user.id,
      action: "document_password_reset",
      details: { method: "owner_password_reset" },
    });

    return NextResponse.json(
      { success: true, message: "Document password updated successfully." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Document password update failed:", error);
    return NextResponse.json(
      { success: false, error: "Unexpected server error while updating the password." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
