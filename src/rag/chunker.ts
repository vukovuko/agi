function calculateChunkParams(textLength: number): {
  maxChunkSize: number;
  overlap: number;
} {
  if (textLength < 2_000) {
    return { maxChunkSize: 400, overlap: 100 };
  } else if (textLength < 10_000) {
    return { maxChunkSize: 600, overlap: 150 };
  } else if (textLength < 50_000) {
    return { maxChunkSize: 1000, overlap: 200 };
  } else {
    return { maxChunkSize: 1500, overlap: 300 };
  }
}

export function chunkText(
  text: string,
  maxChunkSize?: number,
  overlap?: number,
): string[] {
  const params = calculateChunkParams(text.length);
  maxChunkSize = maxChunkSize ?? params.maxChunkSize;
  overlap = overlap ?? params.overlap;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (
      current.length + trimmed.length + 1 > maxChunkSize &&
      current.length > 0
    ) {
      chunks.push(current.trim());
      // Keep overlap from the end of current chunk
      const words = current.split(/\s+/);
      const overlapWords: string[] = [];
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0 && overlapLen < overlap; i--) {
        overlapWords.unshift(words[i]);
        overlapLen += words[i].length + 1;
      }
      current = overlapWords.join(" ") + "\n\n" + trimmed;
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}
