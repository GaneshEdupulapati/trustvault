import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const jsonError = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return jsonError("Please sign in first.", 401);
    const { data: owned } = await supabaseAdmin.from("documents").select("id").eq("owner_id", user.id);
    const ownedIds = (owned ?? []).map(d => d.id);
    const { data: memberRows } = await supabaseAdmin.from("organization_members").select("organization_id").eq("user_id", user.id);
    const orgIds = (memberRows ?? []).map(m => m.organization_id);
    let orgDocIds: string[] = [];
    if (orgIds.length) {
      const { data } = await supabaseAdmin.from("documents").select("id").in("organization_id", orgIds);
      orgDocIds = (data ?? []).map(d => d.id);
    }
    const visibleIds = [...new Set([...ownedIds, ...orgDocIds])];
    const { data: logs, error } = await supabaseAdmin.from("audit_logs").select("id, actor_id, action, document_id, target_user_id, details, created_at").order("created_at", { ascending: false }).limit(200);
    if (error) return jsonError("Could not load audit activity.", 500);
    const filtered = (logs ?? []).filter(log => log.actor_id === user.id || log.target_user_id === user.id || (!!log.document_id && visibleIds.includes(log.document_id)));
    return NextResponse.json({ success: true, logs: filtered.slice(0, 100) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Audit log retrieval failed:", e);
    return jsonError("Unexpected error loading audit activity.", 500);
  }
}
