import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: ["error"],
  });
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const candidate = client as PrismaClient & {
    rpCampaign?: { findUnique?: unknown };
    rpMessage?: { findMany?: unknown };
    rpScene?: { findMany?: unknown };
  };
  return (
    typeof candidate.rpCampaign?.findUnique === "function" &&
    typeof candidate.rpMessage?.findMany === "function" &&
    typeof candidate.rpScene?.findMany === "function"
  );
}

export const prisma = hasCurrentDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
