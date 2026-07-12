import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter, checkWritePermission } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;

    if (status) where.status = status;
    if (date) where.scheduledDate = date;

    const tasks = await db.housekeepingTask.findMany({
      where,
      include: { room: true },
      orderBy: { scheduledDate: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Housekeeping GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "POST");
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { roomId, type, scheduledDate, assignedTo, notes } = body;

    if (!roomId || !type || !scheduledDate) {
      return NextResponse.json({ error: "Room, type, and scheduled date are required" }, { status: 400 });
    }

    const task = await db.housekeepingTask.create({
      data: {
        roomId,
        type,
        status: "PENDING",
        scheduledDate,
        assignedTo: assignedTo || null,
        notes: notes || "",
        providerId: providerId || "",
      },
      include: { room: true },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Housekeeping POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "PUT");
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // If marking as completed, set completedAt
    if (data.status === "COMPLETED") {
      data.completedAt = new Date();
    }

    const task = await db.housekeepingTask.update({
      where: { id, ...(providerId ? { providerId } : {}) },
      data,
      include: { room: true },
    });

    return NextResponse.json(task);
  } catch (error: unknown) {
    console.error("Housekeeping PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "DELETE");
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await db.housekeepingTask.delete({ where: { id, ...(providerId ? { providerId } : {}) } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Housekeeping DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}