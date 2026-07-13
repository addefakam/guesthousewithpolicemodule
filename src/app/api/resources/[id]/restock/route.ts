import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkWritePermission } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = checkWritePermission(request, "POST", { blockSuperuser: true });
    if (denied) return denied;
    const { id } = await params;
    const body = await request.json();
    const { qty } = body;

    if (!qty || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
    }

    const resource = await db.resource.findUnique({ where: { id } });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const updated = await db.resource.update({
      where: { id },
      data: {
        quantity: { increment: parseFloat(qty) },
        lastRestocked: new Date(),
      },
    });

    await db.activityLog.create({
      data: {
        message: `Restocked ${resource.name}: +${qty} ${resource.unit} (now ${updated.quantity})`,
        type: "INFO",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Restock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}