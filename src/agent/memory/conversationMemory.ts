import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { conversations } from "../../db/schema.ts";
import { embed } from "../../rag/embeddings.ts";

export async function saveConversationMemory(
  messages: ModelMessage[],
  startedAt?: Date,
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const relevant = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );
  if (relevant.length < 2) return;

  const transcript = relevant
    .map((m) => {
      const content =
        typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return `${m.role}: ${content}`;
    })
    .join("\n");

  const { text: summary } = await generateText({
    model: openai("gpt-5-mini"),
    messages: [
      {
        role: "system",
        content:
          "Summarize this conversation in 2-4 sentences. Focus on what was discussed, what was accomplished, and any key decisions. Be concise.",
      },
      { role: "user", content: transcript },
    ],
  });

  const embedding = await embed(summary);

  const conversationStart = startedAt ?? new Date();
  const endedAt = new Date();

  await db.insert(conversations).values({
    summary,
    embedding,
    messageCount: relevant.length,
    startedAt: conversationStart,
    endedAt,
  });
}

export interface MemoryResult {
  summary: string;
  endedAt: Date | null;
  score: number;
}

export async function recallRelevantMemories(
  query: string,
  topK = 3,
): Promise<MemoryResult[]> {
  const db = getDb();
  if (!db) return [];

  const queryEmbedding = await embed(query);

  const results = await db
    .select({
      summary: conversations.summary,
      endedAt: conversations.endedAt,
      score: sql<number>`1 - (${conversations.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(conversations)
    .orderBy(
      sql`${conversations.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`,
    )
    .limit(topK);

  return results.map((r) => ({
    summary: r.summary,
    endedAt: r.endedAt,
    score: r.score,
  }));
}
