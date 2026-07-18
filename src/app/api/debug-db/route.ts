import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const result: Record<string, string> = {
    env: tursoUrl ? "GOT: " + tursoUrl.replace(/\/\/.*@/, "//***@") : "UNDEFINED",
  };

  // Test: Prisma with adapter (config object, not client instance)
  try {
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
    const { PrismaClient } = await import("@prisma/client");

    const adapter = new PrismaLibSQL({
      url: tursoUrl!,
      authToken: tursoToken || undefined,
    });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.user.count();
    result.prisma = "OK: user count = " + count;
    await prisma.$disconnect();
  } catch (err: unknown) {
    result.prisma = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  // Test: login via shared db module
  try {
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({ where: { username: "admin" } });
    result.login = user ? "OK: found " + user.name + " (" + user.role + ")" : "FAILED: user not found";
  } catch (err: unknown) {
    result.login = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json(result);
}