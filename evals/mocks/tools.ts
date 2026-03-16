import { tool } from "ai";
import { z } from "zod";

export const createMockReadFile = (mockContent: string) =>
  tool({
    description:
      "Read the contents of a file at the specified path. Use this to examine file contents.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to read"),
    }),
    execute: async ({ path }: { path: string }) => mockContent,
  });

export const createMockWriteFile = (mockResponse?: string) =>
  tool({
    description:
      "Write content to a file at the specified path. Creates the file if it doesn't exist.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
    execute: async ({ path, content }: { path: string; content: string }) =>
      mockResponse ??
      `Successfully wrote ${content.length} characters to ${path}`,
  });

export const createMockListFiles = (mockFiles: string[]) =>
  tool({
    description:
      "List all files and directories in the specified directory path.",
    inputSchema: z.object({
      directory: z
        .string()
        .describe("The directory path to list contents of")
        .default("."),
    }),
    execute: async ({ directory }: { directory: string }) =>
      mockFiles.join("\n"),
  });

export const createMockDeleteFile = (mockResponse?: string) =>
  tool({
    description:
      "Delete a file at the specified path. Use with caution as this is irreversible.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to delete"),
    }),
    execute: async ({ path }: { path: string }) =>
      mockResponse ?? `Successfully deleted ${path}`,
  });

export const createMockShell = (mockOutput: string) =>
  tool({
    description:
      "Execute a shell command and return its output. Use this for system operations.",
    inputSchema: z.object({
      command: z.string().describe("The shell command to execute"),
    }),
    execute: async ({ command }: { command: string }) => mockOutput,
  });

export const createMockIngestDocuments = (mockResponse?: string) =>
  tool({
    description:
      "Ingest PDF documents into the knowledge base. Accepts a path to a single PDF file or a directory containing PDFs.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("Path to a PDF file or directory containing PDFs"),
      recursive: z
        .boolean()
        .default(false)
        .describe("Whether to scan subdirectories"),
    }),
    execute: async ({
      path,
      recursive,
    }: {
      path: string;
      recursive: boolean;
    }) => mockResponse ?? `Ingested documents from ${path}`,
  });

export const createMockQueryKnowledge = (mockResults?: string) =>
  tool({
    description:
      "Search the knowledge base for information relevant to a query. Returns the most relevant document chunks.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      topK: z.number().default(5).describe("Number of results to return"),
    }),
    execute: async ({ query, topK }: { query: string; topK: number }) =>
      mockResults ??
      `[1] Source: doc.pdf (chunk 0, score: 0.95)\nRelevant content for: ${query}`,
  });

export const createMockRecallConversations = (mockMemories?: string) =>
  tool({
    description:
      "Search past conversation history for relevant context from previous sessions.",
    inputSchema: z.object({
      query: z.string().describe("What to search for in past conversations"),
      topK: z.number().default(3).describe("Number of conversations to recall"),
    }),
    execute: async ({ query, topK }: { query: string; topK: number }) =>
      mockMemories ??
      `[1] 2024-01-15 (score: 0.92)\nPrevious conversation about: ${query}`,
  });
