import { heuristicTags } from "./heuristics";
import { aiGenerateTags } from "./aiTagger";

export async function generateTags(
  title: string,
  url: string,
  content?: string
): Promise<string[]> {
  const aiTags = await aiGenerateTags(title, url, content);
  if (aiTags && aiTags.length > 0) return aiTags;

  return heuristicTags(title, url);
}