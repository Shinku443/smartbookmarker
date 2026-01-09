"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VITE_DEBUG_SYNC = exports.GROQ_API_KEY = exports.ANTHROPIC_API_KEY = exports.OPENAI_API_KEY = exports.SCRAPFLY_KEY = exports.config = void 0;
require("dotenv/config");
exports.config = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    SCRAPFLY_KEY: process.env.SCRAPFLY_KEY || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || ""
};
exports.SCRAPFLY_KEY = exports.config.SCRAPFLY_KEY, exports.OPENAI_API_KEY = exports.config.OPENAI_API_KEY, exports.ANTHROPIC_API_KEY = exports.config.ANTHROPIC_API_KEY, exports.GROQ_API_KEY = exports.config.GROQ_API_KEY;
exports.VITE_DEBUG_SYNC = process.env.VITE_DEBUG_SYNC === "true";
