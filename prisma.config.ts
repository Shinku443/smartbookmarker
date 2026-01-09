import { defineConfig } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./packages/server/prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
