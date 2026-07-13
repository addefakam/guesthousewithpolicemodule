import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter, checkWritePermission } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;

    if (category) where.category = category;
    if (lowStock === "true") {
      // Items where quantity <= minLevel
      const allItems = await db.resource.findMany({
        where,
        orderBy: { name: "asc" },
      });
      const filtered = allItems.filter((item) => item.quantity <= item.minLevel);
      return NextResponse.json(filtered);
    }

    const resources = await db.resource.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(resources);
  } catch (error) {
    console.error("Resources GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "POST", { blockSuperuser: true, staffPermissionKey: "resources" });
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { name, category, quantity, unit, minLevel, costPerUnit, supplier } = body;

    if (!name || !category || quantity === undefined || !unit) {
      return NextResponse.json({ error: "Name, category, quantity, and unit are required" }, { status: 400 });
    }

    const resource = await db.resource.create({
      data: {
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        minLevel: parseFloat(minLevel) || 0,
        costPerUnit: parseFloat(costPerUnit) || 0,
        supplier: supplier || "",
        lastRestocked: new Date(),
        providerId: providerId || "",
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("Resources POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "PUT", { blockSuperuser: true, staffPermissionKey: "resources" });
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { id, quantity, minLevel, costPerUnit, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    if (quantity !== undefined) data.quantity = parseFloat(quantity);
    if (minLevel !== undefined) data.minLevel = parseFloat(minLevel);
    if (costPerUnit !== undefined) data.costPerUnit = parseFloat(costPerUnit);

    const resource = await db.resource.update({
      where: { id, ...(providerId ? { providerId } : {}) },
      data,
    });

    return NextResponse.json(resource);
  } catch (error: unknown) {
    console.error("Resources PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "DELETE", { blockSuperuser: true, staffPermissionKey: "resources" });
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    await db.resource.delete({ where: { id, ...(providerId ? { providerId } : {}) } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Resources DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}