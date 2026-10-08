import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";

import { logStaffActivity } from "@/lib/staff-log";
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    // Police users see ALL notifications (they have cross-provider visibility)
    let notifications;
    let total;
    if (auth.role === "POLICE") {
      [notifications, total] = await Promise.all([
        db.notification.findMany({
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.notification.count(),
      ]);
    } else {
      const { providerId } = getProviderFilter(auth);
      const where = {
        providerId,
        title: { not: { contains: "Suspect Match Alert" } },
      };
      [notifications, total] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.notification.count({ where }),
      ]);
    }

    return NextResponse.json({ notifications, total, page, limit });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    // SUPERUSER can submit concerns; others blocked (notifications are system-generated)
    checkWritePermission(auth, { allowSuperuser: true });

    const body = await req.json();
    const { title, message, type, link, userId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        title,
        message,
        type: type || "INFO",
        link: link || null,
        providerId,
        userId: userId || null,
      },
    });

        // Staff activity log
    logStaffActivity({
      req,
      userId: auth.userId,
      userName: auth.userName,
      action: "NOTIFICATION_CREATE",
      targetType: "RESERVATION",
      targetId: id,
      details: { type: notification.type || "", message: notification.message || "" },
      providerId,
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to create notification";
    const status = message.includes("required") ? 400 : message.includes("cannot") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}