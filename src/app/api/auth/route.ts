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
      const statusMessages: Record<string, string> = {
        PENDING: "Your provider account is pending police approval. Please wait for an officer to review and approve your registration.",
        REJECTED: "Your provider registration has been rejected. Please contact the police office for more information.",
        SUSPENDED: "Your provider account has been suspended. All operations are disabled until re-activation by police.",
      };
      const msg = statusMessages[user.provider.status] || `Your account is not active. Status: ${user.provider.status}`;
      return NextResponse.json(
        { error: msg, providerStatus: user.provider.status, providerName: user.provider.name },
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