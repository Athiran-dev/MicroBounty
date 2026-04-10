import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wallet-address",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateBountyRequest {
  bounty_id: number;
  creator_wallet: string;
  title: string;
  description: string;
  tags?: string[];
  reward_algo: number;
  max_applicants: number;
  payout_split: number[];
  deadline: string; // ISO 8601
}

serve(async (req: Request) => {
  // Handle CORS preflight
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

    const body: CreateBountyRequest = await req.json();

    // ── Validate required fields ──
    const required = [
      "bounty_id",
      "creator_wallet",
      "title",
      "description",
      "reward_algo",
      "max_applicants",
      "payout_split",
      "deadline",
    ] as const;

    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return new Response(
          JSON.stringify({ success: false, error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Validate payout_split sums to 100 ──
    const splitSum = body.payout_split.reduce((a, b) => a + b, 0);
    if (splitSum !== 100) {
      return new Response(
        JSON.stringify({ success: false, error: `payout_split must sum to 100, got ${splitSum}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.payout_split.length > 3) {
      return new Response(
        JSON.stringify({ success: false, error: "payout_split max length is 3" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Insert bounty ──
    const { data: bounty, error: bountyError } = await supabase
      .from("bounties")
      .insert({
        bounty_id: body.bounty_id,
        creator_wallet: body.creator_wallet,
        title: body.title,
        description: body.description,
        tags: body.tags || [],
        reward_algo: body.reward_algo,
        max_applicants: body.max_applicants,
        payout_split: body.payout_split,
        deadline: body.deadline,
        status: "open",
      })
      .select("bounty_id")
      .single();

    if (bountyError) {
      console.error("Bounty insert error:", bountyError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create bounty: ${bountyError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Auto-create bounty room ──
    const { data: room, error: roomError } = await supabase
      .from("bounty_rooms")
      .insert({
        bounty_id: body.bounty_id,
        creator_wallet: body.creator_wallet,
        hunter_wallets: [],
        status: "active",
      })
      .select("id")
      .single();

    if (roomError) {
      console.error("Room insert error:", roomError);
      // Rollback bounty if room creation fails
      await supabase.from("bounties").delete().eq("bounty_id", body.bounty_id);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create room: ${roomError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bounty_id: bounty.bounty_id,
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
