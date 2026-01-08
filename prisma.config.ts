import { defineConfig } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
