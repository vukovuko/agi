import { tool } from "ai";
import { z } from "zod";
import { recallRelevantMemories } from "../memory/conversationMemory.ts";

export const recallConversations = tool({
  description:
    "Search past conversation history for relevant context. Use this when the user references something from a previous session or when you need context from earlier conversations.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("What to search for in past conversation history"),
    topK: z
      .number()
      .default(3)
      .describe("Number of past conversations to recall (default: 3)"),
  }),
  execute: async ({ query, topK }: { query: string; topK: number }) => {
    try {
      const memories = await recallRelevantMemories(query, topK);

      if (memories.length === 0) {
        return "No relevant past conversations found.";
      }

      return memories
        .map(
          (m, i) =>
            `[${i + 1}] ${m.endedAt ? new Date(m.endedAt).toLocaleString() : "Unknown date"} (score: ${m.score.toFixed(3)})\n${m.summary}`,
        )
        .join("\n\n---\n\n");
    } catch (error) {
      return `Error recalling conversations: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
