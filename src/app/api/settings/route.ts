import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let settings = await db.settings.findUnique({ where: { id: "main" } });

    if (!settings) {
      settings = await db.settings.create({ data: { id: "main" } });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure we always update the "main" record
    const settings = await db.settings.upsert({
      where: { id: "main" },
      update: body,
      create: { id: "main", ...body },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}