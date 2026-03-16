import {
  streamText,
  stepCountIs,
  type ModelMessage,
  type ToolSet,
  tool,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({});
import { getTracer } from "@lmnr-ai/lmnr";
import { tools as rawTools } from "./tools/index.ts";
import { buildSystemPrompt } from "./system/prompt.ts";
import { getDb } from "../db/index.ts";
import { documents } from "../db/schema.ts";
import { sql } from "drizzle-orm";
import { Laminar } from "@lmnr-ai/lmnr";
import type { AgentCallbacks } from "../types.ts";
import {
  estimateMessagesTokens,
  getModelLimits,
  isOverThreshold,
  calculateUsagePercentage,
  compactConversation,
  DEFAULT_THRESHOLD,
} from "./context/index.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";
import {
  saveConversationMemory,
  recallRelevantMemories,
} from "./memory/conversationMemory.ts";

if (process.env.LMNR_PROJECT_API_KEY) {
  Laminar.initialize({
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
  });
}

const MODEL_NAME = "gpt-5-mini";

function wrapToolsWithApproval(
  originalTools: ToolSet,
  callbacks: AgentCallbacks,
): ToolSet {
  const wrapped: ToolSet = {};

  for (const [name, t] of Object.entries(originalTools)) {
    if (!("execute" in t) || !t.execute) {
      wrapped[name] = t;
      continue;
    }

    const originalExecute = t.execute;
    wrapped[name] = tool({
      description: t.description ?? "",
      inputSchema: t.inputSchema,
      execute: async (args: unknown, context: unknown) => {
        callbacks.onToolCallStart(name, args);

        const approved = await callbacks.onToolApproval(
          name,
          args as Record<string, unknown>,
        );
        if (!approved) {
          return "Tool execution was rejected by the user.";
        }

        const result = await (originalExecute as Function)(args, context);
        const resultStr = String(result);
        callbacks.onToolCallEnd(name, resultStr);
        return resultStr;
      },
    });
  }

  return wrapped;
}

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<ModelMessage[]> {
  const conversationStartedAt = new Date();
  const modelLimits = getModelLimits(MODEL_NAME);

  let documentCount = 0;
  try {
    const db = getDb();
    if (db) {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents);
      documentCount = result[0]?.count ?? 0;
    }
  } catch {}

  const baseSystemPrompt = buildSystemPrompt(documentCount);

  let workingHistory = filterCompatibleMessages(conversationHistory);
  const preCheckTokens = estimateMessagesTokens([
    { role: "system", content: baseSystemPrompt },
    ...workingHistory,
    { role: "user", content: userMessage },
  ]);

  if (isOverThreshold(preCheckTokens.total, modelLimits.contextWindow)) {
    workingHistory = await compactConversation(workingHistory, MODEL_NAME);
  }

  let systemContent = baseSystemPrompt;
  try {
    const memories = await recallRelevantMemories(userMessage, 3);
    if (memories.length > 0) {
      const memorySummaries = memories.map((m) => m.summary).join("\n---\n");
      systemContent += `\n\n## Relevant past conversations:\n${memorySummaries}`;
    }
  } catch {}

  const messages: ModelMessage[] = [
    { role: "system", content: systemContent },
    ...workingHistory,
    { role: "user", content: userMessage },
  ];

  let fullResponse = "";

  const reportTokenUsage = () => {
    if (callbacks.onTokenUsage) {
      const usage = estimateMessagesTokens(messages);
      callbacks.onTokenUsage({
        inputTokens: usage.input,
        outputTokens: usage.output,
        totalTokens: usage.total,
        contextWindow: modelLimits.contextWindow,
        threshold: DEFAULT_THRESHOLD,
        percentage: calculateUsagePercentage(
          usage.total,
          modelLimits.contextWindow,
        ),
      });
    }
  };

  reportTokenUsage();

  const approvedTools = wrapToolsWithApproval(rawTools, callbacks);

  const result = streamText({
    model: openai.chat(MODEL_NAME),
    messages,
    tools: approvedTools,
    stopWhen: stepCountIs(20),
    ...(process.env.LMNR_PROJECT_API_KEY && {
      experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer(),
      },
    }),
  });

  for await (const chunk of result.textStream) {
    fullResponse += chunk;
    callbacks.onToken(chunk);
  }

  const response = await result.response;
  messages.push(...response.messages);
  reportTokenUsage();

  callbacks.onComplete(fullResponse);

  saveConversationMemory(messages, conversationStartedAt).catch(() => {});

  return messages;
}
