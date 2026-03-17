import "../env.ts";
import React from "react";
import { render } from "ink";
import { App } from "./ui/index.tsx";
import { initDb } from "./db/index.ts";

async function main() {
  try {
    await initDb();
  } catch (error) {
    console.error(
      `\x1b[31m${error instanceof Error ? error.message : "Failed to connect to database"}\x1b[0m`,
    );
    process.exit(1);
  }

  render(React.createElement(App));
}

main().catch((error) => {
  console.error(
    `\x1b[31m${error instanceof Error ? error.message : "Unexpected error"}\x1b[0m`,
  );
  process.exit(1);
});
