#!/usr/bin/env bun

import { runSync } from "./commands/sync";
import { runExport } from "./commands/export";
import { runImport } from "./commands/import";
import { runStats } from "./commands/stats";

const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  switch (cmd) {
    case "sync":
      await runSync();
      break;

    case "export":
      await runExport();
      break;

    case "import":
      await runImport(args[1]);
      break;

    case "stats":
      await runStats();
      break;

    default:
      console.log(\
Emperor CLI

Usage:
  emperor sync          Sync local bookmarks with server
  emperor export        Export bookmarks to JSON
  emperor import <file> Import bookmarks from JSON
  emperor stats         Show bookmark statistics
\);
  }
}

main();
