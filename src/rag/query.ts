import { sql } from "drizzle-orm";
import { requireDb } from "../db/index.ts";
import { embed } from "./embeddings.ts";
import { rerank } from "./reranker.ts";

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
  const embeddingStr = JSON.stringify(queryEmbedding);
  const fetchLimit = topK * 4;

  const results = await db.execute(sql`
    WITH semantic AS (
      SELECT c.id, c.content, c.chunk_index, d.file_name, d.file_path,
        1 - (c.embedding <=> ${embeddingStr}::vector) AS score,
        ROW_NUMBER() OVER (ORDER BY c.embedding <=> ${embeddingStr}::vector) AS rank
      FROM chunks c
      INNER JOIN documents d ON c.document_id = d.id
      ORDER BY c.embedding <=> ${embeddingStr}::vector
      LIMIT ${fetchLimit}
    ),
    keyword AS (
      SELECT c.id, c.content, c.chunk_index, d.file_name, d.file_path,
        ts_rank(c.search_vector, websearch_to_tsquery('simple', ${queryText})) AS score,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(c.search_vector, websearch_to_tsquery('simple', ${queryText})) DESC
        ) AS rank
      FROM chunks c
      INNER JOIN documents d ON c.document_id = d.id
      WHERE c.search_vector @@ websearch_to_tsquery('simple', ${queryText})
      ORDER BY score DESC
      LIMIT ${fetchLimit}
    )
    SELECT
      COALESCE(s.content, k.content) AS content,
      COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
      COALESCE(s.file_name, k.file_name) AS file_name,
      COALESCE(s.file_path, k.file_path) AS file_path,
      COALESCE(s.score, 0) AS semantic_score,
      COALESCE(k.score, 0) AS keyword_score,
      (COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0)) AS rrf_score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
    ORDER BY rrf_score DESC
    LIMIT ${topK * 2}
  `);

  const candidates = results.rows.map((r: Record<string, unknown>) => ({
    content: r.content as string,
    fileName: r.file_name as string,
    filePath: r.file_path as string,
    chunkIndex: r.chunk_index as number,
    score: Number(r.rrf_score),
  }));

  if (candidates.length <= 1) return candidates;

  try {
    const rankedIndices = await rerank(queryText, candidates);
    return rankedIndices.slice(0, topK).map((i) => candidates[i]);
  } catch {
    return candidates.slice(0, topK);
  }
}
