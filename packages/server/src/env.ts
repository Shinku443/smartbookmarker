import "dotenv/config";

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  SCRAPFLY_KEY: process.env.SCRAPFLY_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  GROQ_API_KEY: process.env.GROQ_API_KEY || ""
};

export const { SCRAPFLY_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY } = config;

export const VITE_DEBUG_SYNC = process.env.VITE_DEBUG_SYNC === "true";
