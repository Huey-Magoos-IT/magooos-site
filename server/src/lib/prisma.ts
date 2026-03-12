import { PrismaClient } from "@prisma/client";

// Singleton pattern to prevent multiple PrismaClient instances
// Each instance opens its own connection pool (default 5 connections).
// Without this, 10+ instances across controllers/routes = 50+ connections,
// which can exhaust PostgreSQL's connection limit (~100 on RDS).

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
