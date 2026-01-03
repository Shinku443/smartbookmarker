Write-Host "=== Generating Emperor CLI (Bun-powered) ===" -ForegroundColor Cyan

$root = "packages/cli"
$commands = "$root/commands"
$lib = "$root/lib"

$folders = @($root, $commands, $lib)

foreach ($f in $folders) {
  if (-not (Test-Path $f)) {
    New-Item -ItemType Directory -Path $f | Out-Null
    Write-Host "Created folder: $f"
  }
}

# -----------------------------
# package.json
# -----------------------------
Set-Content "$root/package.json" @"
{
  "name": "@emperor/cli",
  "version": "0.1.0",
  "bin": {
    "emperor": "index.ts"
  },
  "scripts": {
    "dev": "bun index.ts"
  },
  "dependencies": {}
}
"@

# -----------------------------
# index.ts
# -----------------------------
Set-Content "$root/index.ts" @"
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
      console.log(\`
Emperor CLI

Usage:
  emperor sync          Sync local bookmarks with server
  emperor export        Export bookmarks to JSON
  emperor import <file> Import bookmarks from JSON
  emperor stats         Show bookmark statistics
\`);
  }
}

main();
"@

# -----------------------------
# lib/api.ts
# -----------------------------
Set-Content "$lib/api.ts" @"
export const API_URL = "http://localhost:4000";

export async function apiGet(path: string) {
  const res = await fetch(\`\${API_URL}\${path}\`);
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(\`\${API_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}
"@

# -----------------------------
# lib/file.ts
# -----------------------------
Set-Content "$lib/file.ts" @"
import { writeFile, readFile } from "node:fs/promises";

export async function saveJSON(path: string, data: any) {
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

export async function loadJSON(path: string) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text);
}
"@

# -----------------------------
# commands/sync.ts
# -----------------------------
Set-Content "$commands/sync.ts" @"
import { apiGet, apiPost } from "../lib/api";

export async function runSync() {
  console.log("🔄 Syncing bookmarks...");

  const local = await apiGet("/bookmarks/local");
  const remote = await apiGet("/bookmarks/remote");

  const changes = {
    created: local.created,
    updated: local.updated,
    deleted: local.deleted
  };

  await apiPost("/sync", changes);

  console.log("✅ Sync complete");
}
"@

# -----------------------------
# commands/export.ts
# -----------------------------
Set-Content "$commands/export.ts" @"
import { apiGet } from "../lib/api";
import { saveJSON } from "../lib/file";

export async function runExport() {
  console.log("📤 Exporting bookmarks...");

  const bookmarks = await apiGet("/bookmarks");
  await saveJSON("bookmarks-export.json", bookmarks);

  console.log("✅ Exported to bookmarks-export.json");
}
"@

# -----------------------------
# commands/import.ts
# -----------------------------
Set-Content "$commands/import.ts" @"
import { loadJSON } from "../lib/file";
import { apiPost } from "../lib/api";

export async function runImport(path?: string) {
  if (!path) {
    console.log("❌ Missing file path: emperor import <file>");
    return;
  }

  console.log(\`📥 Importing from \${path}...\`);

  const data = await loadJSON(path);
  await apiPost("/import", { bookmarks: data });

  console.log("✅ Import complete");
}
"@

# -----------------------------
# commands/stats.ts
# -----------------------------
Set-Content "$commands/stats.ts" @"
import { apiGet } from "../lib/api";

export async function runStats() {
  console.log("📊 Bookmark statistics:");

  const bookmarks = await apiGet("/bookmarks");

  const total = bookmarks.length;
  const pinned = bookmarks.filter((b: any) => b.pinned).length;

  const tagCounts = new Map<string, number>();
  for (const b of bookmarks) {
    for (const t of b.tags ?? []) {
      tagCounts.set(t.label, (tagCounts.get(t.label) ?? 0) + 1);
    }
  }

  console.log(\`Total: \${total}\`);
  console.log(\`Pinned: \${pinned}\`);
  console.log("Top tags:");
  [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => console.log(\`  \${tag}: \${count}\`));
}
"@

Write-Host "=== Emperor CLI Generated Successfully ===" -ForegroundColor Green