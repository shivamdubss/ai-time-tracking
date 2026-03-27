import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.52.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("TIMETRACK_MODEL") || "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are an AI assistant that analyzes work sessions for a legal time tracking application. Given a chronological log of window activity and optional screenshots, produce a structured JSON summary.

Return ONLY valid JSON with this exact schema:
{
  "summary": "High-level 1-2 sentence overview of the session.",
  "categories": [
    { "name": "Legal Research", "minutes": 45, "percentage": 38 },
    { "name": "Document Drafting", "minutes": 30, "percentage": 25 }
  ],
  "activities": [
    {
      "app": "Microsoft Word",
      "context": "Drafting motion to compel",
      "minutes": 40,
      "start_time": "2026-03-26T09:15:00",
      "end_time": "2026-03-26T09:55:00",
      "narrative": "Drafted and revised motion to compel discovery responses in Smith v. Jones",
      "category": "Document Drafting",
      "activity_code": "L160"
    }
  ]
}

Rules:
- Categories must be one of: Legal Research, Document Drafting, Client Communication, Court & Hearings, Case Review, Administrative
- Percentages must sum to 100
- Minutes should be approximate based on the time spent in each app
- start_time and end_time must be ISO 8601 timestamps derived from the window activity timeline
- Narratives should follow legal billing format: action verb + what + why/for whom
- Context should briefly describe the work being performed
- Group related activities by app
- Summary should be 1-2 sentences, specific about what was accomplished
- Each activity MUST include a category and activity_code (UTBMS Litigation Code Set)`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      window_entries,
      screenshots_base64,
      start_time,
      end_time,
      elapsed_seconds,
      matters_context,
    } = body;

    // Build the Claude API message content
    const content: Array<Record<string, unknown>> = [];

    let activeTimeLine = "";
    if (elapsed_seconds > 0) {
      const activeMinutes = Math.floor(elapsed_seconds / 60);
      activeTimeLine = `\nActive work time: ${activeMinutes} minutes (excludes idle/sleep pauses)\n`;
    }

    content.push({
      type: "text",
      text: `Session: ${start_time} to ${end_time}${activeTimeLine}\nWindow Activity Timeline:\n${window_entries}${matters_context || ""}`,
    });

    // Add screenshots (already base64-encoded by the client)
    if (screenshots_base64 && Array.isArray(screenshots_base64)) {
      for (const img of screenshots_base64) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: img,
          },
        });
      }

      content.push({
        type: "text",
        text: `I've included ${screenshots_base64.length} screenshots from this session chunk. Use them to add context to your analysis.`,
      });
    }

    // Call Anthropic API
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    // Parse response
    let responseText = (message.content[0] as { type: string; text: string }).text.trim();
    if (responseText.startsWith("```")) {
      const lines = responseText.split("\n");
      responseText = lines.slice(1, -1).join("\n");
    }

    const result = JSON.parse(responseText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summarize error:", error);
    return new Response(
      JSON.stringify({ error: "Summarization failed", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
