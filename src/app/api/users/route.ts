import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { username, password, role, name } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Username, password, and name are required" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const user = await db.user.create({
      data: { username, password, role: role || "STAFF", name, providerId: providerId || "" },
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { id, username, password, role, name } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (username !== undefined) data.username = username;
    if (password !== undefined) data.password = password;
    if (role !== undefined) data.role = role;
    if (name !== undefined) data.name = name;

    const user = await db.user.update({
      where: { id, ...(providerId ? { providerId } : {}) },
      data,
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error: unknown) {
    console.error("Users PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (prismaError.code === "P2002") {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const selfId = searchParams.get("selfId");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (id === selfId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    await db.user.delete({ where: { id, ...(providerId ? { providerId } : {}) } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Users DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}