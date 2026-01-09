export function heuristicTags(title: string, url: string): string[] {
  const tags = new Set<string>();
  const t = (title || "").toLowerCase();
  const u = (url || "").toLowerCase();

  if (u.includes("youtube.com")) tags.add("video");
  if (u.includes("github.com")) tags.add("code");

  return Array.from(tags);
}