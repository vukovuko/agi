import type { ModelMessage } from "ai";

export const filterCompatibleMessages = (
  messages: ModelMessage[],
): ModelMessage[] => {
  return messages.filter((msg) => {
    if (msg.role === "system") return false;
    if (msg.role === "user") return true;
    if (msg.role === "assistant") return true;
    if (msg.role === "tool") return true;
    return false;
  });
};
