import { readdir, stat } from "node:fs/promises";
import { join, basename, resolve } from "node:path";
import { requireDb } from "../db/index.ts";
import { documents, chunks } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { parseFile, isSupportedFile } from "./fileParser.ts";
import { chunkText } from "./chunker.ts";
import { embedBatch } from "./embeddings.ts";

export async function ingestFile(
  filePath: string,
): Promise<{ chunks: number }> {
  const db = requireDb();
  const absPath = resolve(filePath);
  const fileInfo = await stat(absPath);
  const fileName = basename(absPath);

  const existing = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.filePath, absPath))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(documents).where(eq(documents.id, existing[0].id));
  }

  const { text, pageCount } = await parseFile(absPath);
  const textChunks = chunkText(text);

  if (textChunks.length === 0) {
    return { chunks: 0 };
  }

  const embeddings = await embedBatch(textChunks);

  const [doc] = await db
    .insert(documents)
    .values({
      filePath: absPath,
      fileName,
      fileSize: fileInfo.size,
      pageCount,
    })
    .returning({ id: documents.id });

  await db.insert(chunks).values(
    textChunks.map((content, i) => ({
      documentId: doc.id,
      content,
      chunkIndex: i,
      embedding: embeddings[i],
    })),
  );

  return { chunks: textChunks.length };
}

export async function ingestDirectory(
  dirPath: string,
  recursive = false,
): Promise<{ files: number; chunks: number }> {
  const absPath = resolve(dirPath);
  const entries = await readdir(absPath, { withFileTypes: true });
  let totalFiles = 0;
  let totalChunks = 0;

  for (const entry of entries) {
    const fullPath = join(absPath, entry.name);

    if (entry.isDirectory() && recursive) {
      const result = await ingestDirectory(fullPath, true);
      totalFiles += result.files;
      totalChunks += result.chunks;
    } else if (entry.isFile() && isSupportedFile(entry.name)) {
      const result = await ingestFile(fullPath);
      totalFiles++;
      totalChunks += result.chunks;
    }
  }

  return { files: totalFiles, chunks: totalChunks };
}
