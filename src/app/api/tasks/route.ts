import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/init-db";
import { getAuthContext, getProviderFilter, AuthError } from "@/lib/tenant";
import { logStaffActivity } from "@/lib/staff-log";

/**
 * /api/tasks
 *
 * GET  → list tasks for the caller's provider (or all for POLICE/SUPERUSER).
 *        Accepts filter params: status, priority, assignedToUserId, category, mine=1.
 * POST → create a new task. Operators and super-users only (STAFF cannot
 *        create tasks — they only receive them). Logs TASK_CREATE.
 */

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export async function GET(req: NextRequest) {
  try {
    await ensureDatabase();
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);

    const where: Record<string, unknown> = filter.isPolice
      ? {}
      : { providerId: filter.providerId };

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const assignedToUserId = searchParams.get("assignedToUserId") || "";
    const category = searchParams.get("category") || "";

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToUserId) where.assignedToUserId = assignedToUserId;
    if (category) where.category = category;

    // Special case: "mine" returns tasks assigned to the current user.
    if (searchParams.get("mine") === "1") {
      where.assignedToUserId = auth.userId;
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        assignedToUser: {
          select: { id: true, name: true, username: true },
        },
        assignedByUser: {
          select: { id: true, name: true, username: true },
        },
        completedByUser: {
          select: { id: true, name: true, username: true },
        },
      },
      take: 500,
    });

    return NextResponse.json({ data: tasks, total: tasks.length });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[tasks GET]", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("Unknown table")) {
      return NextResponse.json({ data: [], total: 0 });
    }
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);

    // Only operators and super-users can create tasks.
    if (auth.role === "STAFF" || auth.role === "POLICE") {
      return NextResponse.json(
        { error: "Only operators and super-users can create tasks." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      priority = "MEDIUM",
      category = "General",
      dueDate = "",
      assignedToUserId = null,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 },
      );
    }

    // Verify the assigned user belongs to the same provider (if specified).
    if (assignedToUserId) {
      const assignee = await db.user.findFirst({
        where: { id: assignedToUserId, providerId },
        select: { id: true, name: true, role: true },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Assigned user not found in your organization." },
          { status: 404 },
        );
      }
    }

    const task = await db.task.create({
      data: {
        title: title.trim(),
        description: description || "",
        priority,
        category,
        dueDate,
        assignedToUserId: assignedToUserId || null,
        assignedByUserId: auth.userId,
        providerId,
      },
      include: {
        assignedToUser: { select: { id: true, name: true, username: true } },
        assignedByUser: { select: { id: true, name: true, username: true } },
      },
    });

    logStaffActivity({
      req,
      userId: auth.userId,
      userName: auth.userName,
      action: "TASK_CREATE",
      targetType: "TASK",
      targetId: task.id,
      details: {
        title: task.title,
        priority: task.priority,
        category: task.category,
        assignedTo: task.assignedToUser?.name || "",
        dueDate: task.dueDate,
      },
      providerId,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[tasks POST]", error);
    const msg = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
