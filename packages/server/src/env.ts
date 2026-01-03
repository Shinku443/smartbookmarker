import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  SCRAPFLY_KEY: process.env.SCRAPFLY_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || ""
};
