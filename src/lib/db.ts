import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query"] : [],
    });
  } catch (err) {
    console.error("Failed to initialize PrismaClient:", err);
    // Return a minimal mock that will show errors clearly
    return null as unknown as PrismaClient;
  }
}

export const db =
  globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;