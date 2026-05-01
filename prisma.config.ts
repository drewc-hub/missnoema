import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // This URL is used by Prisma CLI for migrations/introspection
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
