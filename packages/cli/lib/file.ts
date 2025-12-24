import { writeFile, readFile } from "node:fs/promises";

export async function saveJSON(path: string, data: any) {
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

export async function loadJSON(path: string) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text);
}
