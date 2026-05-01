import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. Create the database connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Initialize the Prisma adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the constructor
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter }); // Must not be empty in v7

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
