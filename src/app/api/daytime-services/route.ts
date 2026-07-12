import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter, checkWritePermission } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;
    if (active !== null) {
      where.active = active === "true";
    }

    const services = await db.daytimeService.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Daytime services GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "POST");
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { name, price, category, duration, description, active } = body;

    if (!name || price === undefined || !category) {
      return NextResponse.json({ error: "Name, price, and category are required" }, { status: 400 });
    }

    const service = await db.daytimeService.create({
      data: {
        name,
        price: parseFloat(price),
        category,
        duration: duration || "",
        description: description || "",
        active: active !== undefined ? active : true,
        providerId: providerId || "",
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Daytime services POST error:", error);
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
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    if (data.price !== undefined) {
      data.price = parseFloat(data.price);
    }

    const service = await db.daytimeService.update({
      where: { id, ...(providerId ? { providerId } : {}) },
      data,
    });

    return NextResponse.json(service);
  } catch (error: unknown) {
    console.error("Daytime services PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    await db.daytimeService.delete({ where: { id, ...(providerId ? { providerId } : {}) } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Daytime services DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}