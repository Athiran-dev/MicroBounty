import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Cleanup Cron Edge Function
 * ---
 * Processes scheduled deletions for bounties that have been
 * in 'paid' or 'refunded' status for 24+ hours.
 *
 * Deploy with a cron schedule:
 *   supabase functions deploy cleanup-cron --schedule "0 * * * *"
 *
 * Or call manually via:
 *   POST /functions/v1/cleanup-cron
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call the PostgreSQL function that processes all expired deletions
    const { data, error } = await supabase.rpc("process_scheduled_deletions");

    if (error) {
      console.error("Cleanup error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deletedCount = data as number;
    console.log(`Cleanup complete: ${deletedCount} bounties deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        processed_at: new Date().toISOString(),
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
