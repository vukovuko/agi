import { tool } from "ai";
import { z } from "zod";
import { stat } from "node:fs/promises";
import { ingestFile, ingestDirectory } from "../../rag/ingest.ts";
import { queryChunks } from "../../rag/query.ts";
import { requireDb } from "../../db/index.ts";
import { documents } from "../../db/schema.ts";
import { sql } from "drizzle-orm";

export const ingestDocuments = tool({
  description:
    "Ingest documents into the knowledge base. Supports PDF, TXT, MD, CSV, JSON, XLSX, and XLS files. Accepts a path to a single file or a directory. The documents will be parsed, chunked, embedded, and stored for later retrieval.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Path to a file or directory containing documents"),
    recursive: z
      .boolean()
      .default(false)
      .describe("Whether to scan subdirectories when path is a directory"),
  }),
  execute: async ({
    path,
    recursive,
  }: {
    path: string;
    recursive: boolean;
  }) => {
    try {
      const info = await stat(path);

      if (info.isFile()) {
        const result = await ingestFile(path);
        return `Ingested 1 document (${result.chunks} chunks) from ${path}`;
      }

      if (info.isDirectory()) {
        const result = await ingestDirectory(path, recursive);
        return `Ingested ${result.files} documents (${result.chunks} chunks total) from ${path}`;
      }

      return `Error: ${path} is neither a file nor a directory`;
    } catch (error) {
      return `Error ingesting documents: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

export const queryKnowledge = tool({
  description:
    "Search the knowledge base for information relevant to a query. Returns the most relevant document chunks with source information. Use this when the user asks questions about ingested documents.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The question or search query to find relevant document chunks",
      ),
    topK: z
      .number()
      .default(5)
      .describe("Number of results to return (default: 5)"),
  }),
  execute: async ({ query, topK }: { query: string; topK: number }) => {
    try {
      const results = await queryChunks(query, topK);

      if (results.length === 0) {
        return "No relevant documents found in the knowledge base. Try ingesting documents first.";
      }

      return results
        .map(
          (r, i) =>
            `[${i + 1}] Source: ${r.fileName} (chunk ${r.chunkIndex}, score: ${r.score.toFixed(3)})\n${r.content}`,
        )
        .join("\n\n---\n\n");
    } catch (error) {
      return `Error querying knowledge base: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

export const clearKnowledge = tool({
  description:
    "Delete all documents and chunks from the knowledge base. Use this when the user wants to start over or clear everything.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const db = requireDb();
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents);
      const count = countResult[0]?.count ?? 0;

      if (count === 0) {
        return "Knowledge base is already empty.";
      }

      await db.delete(documents);
      return `Cleared knowledge base: deleted ${count} document(s) and all associated chunks.`;
    } catch (error) {
      return `Error clearing knowledge base: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
