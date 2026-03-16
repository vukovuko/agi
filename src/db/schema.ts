import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  vector,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  filePath: text("file_path").notNull().unique(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  pageCount: integer("page_count"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    summary: text("summary").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    messageCount: integer("message_count"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at").defaultNow(),
  },
  (table) => [
    index("conversations_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
