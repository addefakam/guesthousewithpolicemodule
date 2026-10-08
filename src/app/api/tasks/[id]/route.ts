import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/init-db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
import { logStaffActivity } from "@/lib/staff-log";

/**
 * /api/tasks/[id]
 *
 * GET    → fetch a single task (any auth user in the same provider).
 * PATCH  → update a task. Operators/super-users can edit anything; staff
 *          can only change the status (e.g. mark as IN_PROGRESS or COMPLETED).
 *          When status transitions to COMPLETED, sets completedAt + completedByUserId.
 *          Logs TASK_UPDATE (or TASK_COMPLETE if status becomes COMPLETED).
 * DELETE → soft-delete by setting status=CANCELLED (preserves audit trail).
 *          Operators/super-users only. Logs TASK_DELETE.
 */

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);

    const { id } = await params;
    const where: Record<string, unknown> = filter.isPolice
      ? { id }
      : { id, providerId: filter.providerId };

    const task = await db.task.findFirst({
      where,
      include: {
        assignedToUser: { select: { id: true, name: true, username: true } },
        assignedByUser: { select: { id: true, name: true, username: true } },
        completedByUser: { select: { id: true, name: true, username: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[tasks/[id] GET]", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);
    const { providerId } = filter;

    const { id } = await params;
    const body = await req.json();

    const existing = await db.task.findFirst({
      where: filter.isPolice ? { id } : { id, providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // STAFF restrictions: they can only change the status (no other field).
    // This lets a staff member mark a task IN_PROGRESS or COMPLETED, but not
    // reassign it, change the priority, or edit the title.
    const isStaff = auth.role === "STAFF";
    const allowedFields = isStaff
      ? ["status"]
      : ["title", "description", "status", "priority", "category", "dueDate", "assignedToUserId"];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        // validate enums
        if (key === "status" && !VALID_STATUSES.includes(body[key])) {
          return NextResponse.json(
            { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
            { status: 400 },
          );
        }
        if (key === "priority" && !VALID_PRIORITIES.includes(body[key])) {
          return NextResponse.json(
            { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
            { status: 400 },
          );
        }
        updateData[key] = body[key];
      }
    }

    // If status is being changed to COMPLETED, record who completed it and when.
    // This is the audit hook that powers the staff performance dashboard.
    let completionAction = false;
    if (updateData.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updateData.completedAt = new Date();
      updateData.completedByUserId = auth.userId;
      completionAction = true;
    }
    // If status is being moved away from COMPLETED, clear the completion fields
    // (someone re-opened the task — old completion is no longer current).
    if (existing.status === "COMPLETED" && updateData.status && updateData.status !== "COMPLETED") {
      updateData.completedAt = null;
      updateData.completedByUserId = null;
    }

    // If reassigning, verify the new assignee belongs to the same provider.
    if (updateData.assignedToUserId !== undefined && updateData.assignedToUserId !== null) {
      const assignee = await db.user.findFirst({
        where: { id: updateData.assignedToUserId as string, providerId },
        select: { id: true, name: true },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Assigned user not found in your organization." },
          { status: 404 },
        );
      }
    }

    const updated = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedToUser: { select: { id: true, name: true, username: true } },
        assignedByUser: { select: { id: true, name: true, username: true } },
        completedByUser: { select: { id: true, name: true, username: true } },
      },
    });

    // Audit log — distinguish between "completed" and "general update" so the
    // staff performance dashboard can count completions accurately.
    logStaffActivity({
      req,
      userId: auth.userId,
      userName: auth.userName,
      action: completionAction ? "TASK_COMPLETE" : "TASK_UPDATE",
      targetType: "TASK",
      targetId: id,
      details: {
        title: updated.title,
        status: updated.status,
        priority: updated.priority,
        assignedTo: updated.assignedToUser?.name || "",
        previousStatus: existing.status,
      },
      providerId,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[tasks/[id] PATCH]", error);
    const msg = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);
    const { providerId } = filter;

    // Only operators and super-users can delete tasks.
    if (auth.role === "STAFF" || auth.role === "POLICE") {
      return NextResponse.json(
        { error: "Only operators and super-users can delete tasks." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await db.task.findFirst({
      where: filter.isPolice ? { id } : { id, providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Soft-delete: mark as CANCELLED rather than physically deleting, so
    // the audit trail (and any completion records) are preserved.
    const updated = await db.task.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    logStaffActivity({
      req,
      userId: auth.userId,
      userName: auth.userName,
      action: "TASK_DELETE",
      targetType: "TASK",
      targetId: id,
      details: { title: existing.title, previousStatus: existing.status },
      providerId,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[tasks/[id] DELETE]", error);
    const msg = error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
