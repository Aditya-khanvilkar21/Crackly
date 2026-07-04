import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_tests",
  title: "List tests",
  description:
    "List Crackly tests available to the signed-in user. Optionally filter by exam_type (jee, neet, cet), subject, or chapter.",
  inputSchema: {
    exam_type: z.enum(["jee", "neet", "cet"]).optional().describe("Filter by exam type"),
    subject: z.string().optional().describe("Filter by subject name"),
    chapter: z.string().optional().describe("Filter by chapter name"),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ exam_type, subject, chapter, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = sb(ctx)
      .from("tests")
      .select("id, title, exam_type, subject, chapter, test_type, duration_minutes, difficulty, is_active")
      .eq("is_active", true)
      .limit(limit ?? 25);
    if (exam_type) q = q.eq("exam_type", exam_type);
    if (subject) q = q.eq("subject", subject);
    if (chapter) q = q.eq("chapter", chapter);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tests: data ?? [] },
    };
  },
});
