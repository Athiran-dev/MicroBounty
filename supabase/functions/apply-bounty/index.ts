import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wallet-address",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ApplyBountyRequest {
  bounty_id: number;
  hunter_wallet: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: ApplyBountyRequest = await req.json();

    // ── Validate ──
    if (!body.bounty_id || !body.hunter_wallet) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing bounty_id or hunter_wallet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify bounty exists and is accepting applications ──
    const { data: bounty, error: bountyErr } = await supabase
      .from("bounties")
      .select("bounty_id, status, creator_wallet, max_applicants")
      .eq("bounty_id", body.bounty_id)
      .single();

    if (bountyErr || !bounty) {
      return new Response(
        JSON.stringify({ success: false, error: "Bounty not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["open", "active"].includes(bounty.status)) {
      return new Response(
        JSON.stringify({ success: false, error: "Bounty is not accepting applications" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Prevent creator from applying to own bounty ──
    if (bounty.creator_wallet === body.hunter_wallet) {
      return new Response(
        JSON.stringify({ success: false, error: "Creator cannot apply to own bounty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Check max applicants ──
    const { count: currentApplicants } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("bounty_id", body.bounty_id);

    if (currentApplicants !== null && currentApplicants >= bounty.max_applicants) {
      return new Response(
        JSON.stringify({ success: false, error: "Bounty is full" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Insert application ──
    const { error: appError } = await supabase
      .from("applications")
      .insert({
        bounty_id: body.bounty_id,
        hunter_wallet: body.hunter_wallet,
      });

    if (appError) {
      if (appError.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: "Already applied to this bounty" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Failed to insert application: ${appError.message}`);
    }

    // ── Add hunter to bounty room ──
    const { data: room, error: roomFetchErr } = await supabase
      .from("bounty_rooms")
      .select("id, hunter_wallets")
      .eq("bounty_id", body.bounty_id)
      .single();

    if (roomFetchErr || !room) {
      throw new Error(`Room not found: ${roomFetchErr?.message}`);
    }

    const updatedWallets = [...new Set([...(room.hunter_wallets || []), body.hunter_wallet])];

    const { error: roomUpdateErr } = await supabase
      .from("bounty_rooms")
      .update({ hunter_wallets: updatedWallets })
      .eq("id", room.id);

    if (roomUpdateErr) {
      throw new Error(`Failed to update room: ${roomUpdateErr.message}`);
    }

    // ── Update bounty status to 'active' if still 'open' ──
    if (bounty.status === "open") {
      const { error: statusErr } = await supabase
        .from("bounties")
        .update({ status: "active" })
        .eq("bounty_id", body.bounty_id);

      if (statusErr) {
        console.warn("Failed to update bounty status:", statusErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        room_id: room.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
