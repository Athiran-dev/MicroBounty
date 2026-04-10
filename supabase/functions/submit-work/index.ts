import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wallet-address",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SubmitWorkRequest {
  bounty_id: number;
  hunter_wallet: string;
  deploy_link: string;
  github_link: string;
  starter_files_url?: string;
  work_description: string;
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

    const body: SubmitWorkRequest = await req.json();

    // ── Validate required fields ──
    const required = ["bounty_id", "hunter_wallet", "deploy_link", "github_link", "work_description"] as const;
    for (const field of required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ success: false, error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Verify hunter is an applicant ──
    const { data: application, error: appErr } = await supabase
      .from("applications")
      .select("id")
      .eq("bounty_id", body.bounty_id)
      .eq("hunter_wallet", body.hunter_wallet)
      .single();

    if (appErr || !application) {
      return new Response(
        JSON.stringify({ success: false, error: "Not an applicant for this bounty" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify bounty is accepting submissions ──
    const { data: bounty, error: bountyErr } = await supabase
      .from("bounties")
      .select("status")
      .eq("bounty_id", body.bounty_id)
      .single();

    if (bountyErr || !bounty) {
      return new Response(
        JSON.stringify({ success: false, error: "Bounty not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["active", "submitted"].includes(bounty.status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Bounty is not accepting submissions (status: ${bounty.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Insert submission ──
    const { error: subError } = await supabase
      .from("submissions")
      .insert({
        bounty_id: body.bounty_id,
        hunter_wallet: body.hunter_wallet,
        deploy_link: body.deploy_link,
        github_link: body.github_link,
        starter_files_url: body.starter_files_url || null,
        work_description: body.work_description,
      });

    if (subError) {
      if (subError.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: "Already submitted work for this bounty" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Failed to insert submission: ${subError.message}`);
    }

    // ── Update bounty status to 'submitted' ──
    if (bounty.status === "active") {
      const { error: statusErr } = await supabase
        .from("bounties")
        .update({ status: "submitted" })
        .eq("bounty_id", body.bounty_id);

      if (statusErr) {
        console.warn("Failed to update bounty status:", statusErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
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
