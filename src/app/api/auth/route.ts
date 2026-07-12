import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    if (action === "logout") {
      return NextResponse.json({ success: true });
    }

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
      include: { provider: { select: { id: true, name: true, status: true, type: true } } },
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Block provider users if their provider is not approved
    if (user.provider && user.provider.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Your account is pending approval. Provider status: ${user.provider.status}` },
        { status: 403 }
      );
    }

    const { password: _, provider, ...userWithoutPassword } = user;
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        provider: provider || null,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}