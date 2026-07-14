import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const info: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: process.env.NODE_ENV || "unknown",
    databaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/file:.*/, "file:***")
      : "NOT SET",
    platform: process.platform,
    arch: process.arch,
  };

  // Test Prisma
  try {
    const { PrismaClient } = require("@prisma/client");
    info.prisma = "module_loaded";
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      info.db = "connected";
      const result = await prisma.$queryRaw`SELECT count(*) as c FROM sqlite_master`;
      info.dbTables = String((result as Array<{ c: number }>)[0]?.c ?? "?");
      await prisma.$disconnect();
    } catch (dbErr: unknown) {
      info.db = "FAILED: " + (dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
  } catch (err: unknown) {
    info.prisma = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json(info);
}