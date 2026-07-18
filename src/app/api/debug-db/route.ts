import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

export async function GET() {
  // Step 1: Read env var directly in function body (runtime)
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  const result: Record<string, string> = {
    step1_directRead: tursoUrl ? "GOT: " + tursoUrl.replace(/\/\/.*@/, "//***@") : "UNDEFINED",
    step1_type: typeof tursoUrl,
    step1_tokenSet: tursoToken ? "YES" : "NO",
  };

  // Step 2: Try creating libsql client directly (no Prisma)
  try {
    const client = createClient({
      url: tursoUrl!,
      authToken: tursoToken || undefined,
    });
    const queryResult = await client.execute("SELECT 1 as test");
    result.step2_libsqlDirect = "OK: " + JSON.stringify(queryResult.rows);
  } catch (err: unknown) {
    result.step2_libsqlDirect = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  // Step 3: Try Prisma with adapter
  try {
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
    const { PrismaClient } = await import("@prisma/client");
    const libsql = createClient({
      url: tursoUrl!,
      authToken: tursoToken || undefined,
    });
    const adapter = new PrismaLibSQL(libsql);
    const prisma = new PrismaClient({ adapter });
    await prisma.$connect();
    const count = await prisma.user.count();
    result.step3_prismaAdapter = "OK: user count = " + count;
    await prisma.$disconnect();
  } catch (err: unknown) {
    result.step3_prismaAdapter = "FAILED: " + (err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json(result);
}