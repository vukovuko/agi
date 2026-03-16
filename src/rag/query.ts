import { sql } from "drizzle-orm";
import { requireDb } from "../db/index.ts";
import { chunks, documents } from "../db/schema.ts";
import { embed } from "./embeddings.ts";

export interface ChunkResult {
  content: string;
  fileName: string;
  filePath: string;
  chunkIndex: number;
  score: number;
}

export async function queryChunks(
  queryText: string,
  topK = 5,
): Promise<ChunkResult[]> {
  const db = requireDb();
  const queryEmbedding = await embed(queryText);

  const results = await db
    .select({
      content: chunks.content,
      chunkIndex: chunks.chunkIndex,
      fileName: documents.fileName,
      filePath: documents.filePath,
      score: sql<number>`1 - (${chunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(chunks)
    .innerJoin(documents, sql`${chunks.documentId} = ${documents.id}`)
    .orderBy(
      sql`${chunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`,
    )
    .limit(topK);

  return results.map((r) => ({
    content: r.content,
    fileName: r.fileName!,
    filePath: r.filePath!,
    chunkIndex: r.chunkIndex,
    score: r.score,
  }));
}
