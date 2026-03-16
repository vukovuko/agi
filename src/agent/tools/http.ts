import { tool } from "ai";
import { z } from "zod";

export const httpRequest = tool({
  description:
    "Make an HTTP request to a URL. Use this to fetch web pages, call APIs, download data, or interact with any HTTP endpoint.",
  inputSchema: z.object({
    url: z.string().describe("The URL to request"),
    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .default("GET")
      .describe("HTTP method"),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe("Request headers as key-value pairs"),
    body: z.string().optional().describe("Request body (for POST/PUT/PATCH)"),
  }),
  execute: async ({
    url,
    method,
    headers,
    body,
  }: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }) => {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== "GET" && method !== "DELETE" ? body : undefined,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const status = `${response.status} ${response.statusText}`;

      let responseBody: string;
      if (contentType.includes("application/json")) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await response.text();
      }

      if (responseBody.length > 10000) {
        responseBody = responseBody.slice(0, 10000) + "\n... (truncated)";
      }

      return `${status}\n\n${responseBody}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
