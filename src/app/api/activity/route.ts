import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const activities = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
    return NextResponse.json(activities);
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}