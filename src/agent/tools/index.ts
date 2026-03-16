import { readFile, writeFile, listFiles, deleteFile } from "./file.ts";
import { runCommand } from "./shell.ts";
import { executeCode } from "./codeExecution.ts";
import {
  ingestDocuments,
  queryKnowledge,
  clearKnowledge,
} from "./knowledge.ts";
import { recallConversations } from "./memory.ts";

export const tools = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
  runCommand,
  executeCode,
  ingestDocuments,
  queryKnowledge,
  clearKnowledge,
  recallConversations,
};

export { readFile, writeFile, listFiles, deleteFile } from "./file.ts";
export { runCommand } from "./shell.ts";
export { executeCode } from "./codeExecution.ts";
export { webSearch } from "./webSearch.ts";

export const fileTools = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};

export const shellTools = {
  runCommand,
};

export const knowledgeTools = {
  ingestDocuments,
  queryKnowledge,
  clearKnowledge,
};

export const memoryTools = {
  recallConversations,
};
