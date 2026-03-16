import { openai } from "@ai-sdk/openai";
import { embedMany, embed as embedOne } from "ai";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

export async function embed(text: string): Promise<number[]> {
  const { embedding } = await embedOne({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  return embeddings;
}
