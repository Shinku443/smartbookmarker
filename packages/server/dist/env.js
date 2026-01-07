"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VITE_DEBUG_SYNC = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    SCRAPFLY_KEY: process.env.SCRAPFLY_KEY || "",
    DATABASE_URL: process.env.DATABASE_URL || ""
};
exports.VITE_DEBUG_SYNC = process.env.VITE_DEBUG_SYNC === "true";
