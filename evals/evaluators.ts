import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import type {
  EvalTarget,
  SingleTurnResult,
  MultiTurnTarget,
  MultiTurnResult,
} from "./types.ts";

export function toolsSelected(
  output: SingleTurnResult | MultiTurnResult,
  target: EvalTarget | MultiTurnTarget,
): number {
  const expectedTools =
    "expectedTools" in target
      ? target.expectedTools
      : "expectedToolOrder" in target
        ? target.expectedToolOrder
        : undefined;

  if (!expectedTools?.length) return 1;

  const selected = new Set(
    "toolNames" in output ? output.toolNames : output.toolsUsed,
  );

  return expectedTools.every((t) => selected.has(t)) ? 1 : 0;
}

export function toolsAvoided(
  output: SingleTurnResult | MultiTurnResult,
  target: EvalTarget | MultiTurnTarget,
): number {
  if (!target.forbiddenTools?.length) return 1;

  const selected = new Set(
    "toolNames" in output ? output.toolNames : output.toolsUsed,
  );

  return target.forbiddenTools.some((t) => selected.has(t)) ? 0 : 1;
}

export function toolSelectionScore(
  output: SingleTurnResult,
  target: EvalTarget,
): number {
  if (!target.expectedTools?.length) {
    return output.selectedAny ? 0.5 : 1;
  }

  const expected = new Set(target.expectedTools);
  const selected = new Set(output.toolNames);

  const hits = output.toolNames.filter((t) => expected.has(t)).length;
  const precision = selected.size > 0 ? hits / selected.size : 0;
  const recall = expected.size > 0 ? hits / expected.size : 0;

  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function toolOrderCorrect(
  output: MultiTurnResult,
  target: MultiTurnTarget,
): number {
  if (!target.expectedToolOrder?.length) return 1;

  const actualOrder = output.toolCallOrder;

  let expectedIdx = 0;
  for (const toolName of actualOrder) {
    if (toolName === target.expectedToolOrder[expectedIdx]) {
      expectedIdx++;
      if (expectedIdx === target.expectedToolOrder.length) break;
    }
  }

  return expectedIdx / target.expectedToolOrder.length;
}

const judgeSchema = z.object({
  score: z
    .number()
    .min(1)
    .max(10)
    .describe("Score from 1-10 where 10 is perfect"),
  reason: z.string().describe("Brief explanation for the score"),
});

export async function llmJudge(
  output: MultiTurnResult,
  target: MultiTurnTarget,
): Promise<number> {
  const result = await generateObject({
    model: openai("gpt-5.1"),
    schema: judgeSchema,
    schemaName: "evaluation",
    providerOptions: {
      openai: {
        reasoningEffort: "high",
      },
    },
    schemaDescription: "Evaluation of an AI agent response",
    messages: [
      {
        role: "system",
        content: `You are an evaluation judge. Score the agent's response on a scale of 1-10.

Scoring criteria:
- 9-10: Response directly answers the task, references specific information from tool results, and is accurate
- 7-8: Response answers the task using tool results but misses some details or adds unnecessary filler
- 4-6: Response is vague, only partially uses tool results, or adds information not from the tools
- 1-3: Response ignores tool results or is wrong

Important: The agent SHOULD use information from the tool results in its answer. A good response incorporates the key facts returned by tools. Do NOT penalize for being concise or for minor phrasing differences.`,
      },
      {
        role: "user",
        content: `Task: "${target.originalTask}"

Tools the agent called (in order): ${output.toolCallOrder.join(" → ")}

Data returned by those tools:
${Object.entries(target.mockToolResults)
  .map(([tool, result]) => `${tool}: ${result}`)
  .join("\n\n")}

Agent's final response:
"${output.text}"

Score how well the agent used the tool data to answer the task.`,
      },
    ],
  });

  return result.object.score / 10;
}

export async function llmJudgeNegative(
  output: MultiTurnResult,
  target: MultiTurnTarget,
): Promise<number> {
  const result = await generateObject({
    model: openai("gpt-5.1"),
    schema: judgeSchema,
    schemaName: "evaluation",
    schemaDescription: "Evaluation of an AI agent response",
    messages: [
      {
        role: "system",
        content: `You are an evaluation judge. Score the agent's response on a scale of 1-10.

The agent was asked a simple question that does NOT require any tools. Score based on:
- 9-10: Correct answer, no unnecessary tool usage
- 7-8: Correct answer but slightly verbose or hedging
- 4-6: Partially correct or unnecessarily complicated
- 1-3: Wrong answer or tried to use tools when it shouldn't have`,
      },
      {
        role: "user",
        content: `Task: "${target.originalTask}"

Tools called: ${output.toolCallOrder.length === 0 ? "none" : output.toolCallOrder.join(" → ")}

Agent's response:
"${output.text}"

Score the response.`,
      },
    ],
  });

  return result.object.score / 10;
}
