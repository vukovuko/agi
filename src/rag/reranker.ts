import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const rerankSchema = z.object({
  scores: z.array(
    z.object({
      index: z.number(),
      relevance: z.number().min(0).max(10),
    }),
  ),
});

export async function rerank(
  query: string,
  chunks: { content: string; [key: string]: unknown }[],
): Promise<number[]> {
  const numbered = chunks
    .map((c, i) => `[${i}] ${c.content.slice(0, 500)}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: openai("gpt-5-mini"),
    schema: rerankSchema,
    schemaName: "rerank",
    messages: [
      {
        role: "system",
        content:
          "Score each chunk's relevance to the query (0=irrelevant, 10=directly answers). Return scores for all chunks.",
      },
      {
        role: "user",
        content: `Query: ${query}\n\nChunks:\n${numbered}`,
      },
    ],
  });

  const sorted = object.scores.sort((a, b) => b.relevance - a.relevance);
  return sorted.map((s) => s.index);
}
