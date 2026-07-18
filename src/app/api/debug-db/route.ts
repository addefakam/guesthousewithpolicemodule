import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  const result: Record<string, string> = {
    step1_envRead: tursoUrl ? "GOT: " + tursoUrl.replace(/\/\/.*@/, "//***@") : "UNDEFINED",
  };

  // Test: Prisma with adapter + DATABASE_URL override
  try {
    process.env.DATABASE_URL = tursoUrl!;

    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
    const { PrismaClient } = await import("@prisma/client");

    const libsql = createClient({
      url: tursoUrl!,
      authToken: tursoToken || undefined,
    });
    const adapter = new PrismaLibSQL(libsql);
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.user.count();
    result.step2_prismaWithOverride = "OK: user count = " + count;
    await prisma.$disconnect();
  } catch (err: unknown) {
    result.step2_prismaWithOverride = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  // Test: login query
  try {
    process.env.DATABASE_URL = tursoUrl!;
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({ where: { username: "admin" } });
    result.step3_loginTest = user ? "OK: found user " + user.name : "FAILED: user not found";
  } catch (err: unknown) {
    result.step3_loginTest = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json(result);
}