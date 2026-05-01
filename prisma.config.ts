import "dotenv/config";
import { defineConfig } from "prisma/config";

// We intentionally don't define a `datasource` here. The schema's own
// `datasource db { url = env("DATABASE_URL") ... }` block handles things
// at runtime / migration time. Declaring it here too would force
// `prisma/config`'s strict `env()` helper to throw at *every* prisma
// invocation — including `prisma generate`, which doesn't need a real
// DB URL and runs during docker build, before runtime env vars exist.
export default defineConfig({
  schema: "prisma/schema.prisma",
});
