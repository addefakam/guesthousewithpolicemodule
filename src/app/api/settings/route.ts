import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter, checkWritePermission } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);

    let settings = await db.settings.findFirst({
      where: { providerId: providerId || "" },
    });

    if (!settings) {
      settings = await db.settings.create({
        data: { providerId: providerId || "" },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "PUT", { requireSuperuser: true });
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();

    const pid = providerId || "";

    // Find existing settings for this provider, or create new
    const existing = await db.settings.findFirst({
      where: { providerId: pid },
    });

    let settings;
    if (existing) {
      settings = await db.settings.update({
        where: { id: existing.id },
        data: body,
      });
    } else {
      settings = await db.settings.create({
        data: { providerId: pid, ...body },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
