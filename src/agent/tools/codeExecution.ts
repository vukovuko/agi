import { tool } from "ai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import shell from "shelljs";

export const executeCode = tool({
  description:
    "Execute code for anything you need compute for. Supports JavaScript (Node.js), Python, and TypeScript. Returns the output of the execution.",
  inputSchema: z.object({
    code: z.string().describe("The code to execute"),
    language: z
      .enum(["javascript", "python", "typescript"])
      .describe("The programming language of the code")
      .default("javascript"),
  }),
  execute: async ({
    code,
    language,
  }: {
    code: string;
    language: "javascript" | "python" | "typescript";
  }) => {
    const extensions: Record<string, string> = {
      javascript: ".js",
      python: ".py",
      typescript: ".ts",
    };

    const commands: Record<string, (file: string) => string> = {
      javascript: (file) => `node ${file}`,
      python: (file) => `python3 ${file}`,
      typescript: (file) => `npx tsx ${file}`,
    };

    const ext = extensions[language];
    const getCommand = commands[language];
    const tmpFile = path.join(os.tmpdir(), `code-exec-${Date.now()}${ext}`);

    try {
      await fs.writeFile(tmpFile, code, "utf-8");
      const command = getCommand(tmpFile);
      const result = shell.exec(command, { silent: true });

      let output = "";
      if (result.stdout) {
        output += result.stdout;
      }
      if (result.stderr) {
        output += result.stderr;
      }

      if (result.code !== 0) {
        return `Execution failed (exit code ${result.code}):\n${output}`;
      }

      return output || "Code executed successfully (no output)";
    } catch (error) {
      const err = error as Error;
      return `Error executing code: ${err.message}`;
    } finally {
      try {
        await fs.unlink(tmpFile);
      } catch {}
    }
  },
});
