import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePolice } from "@/lib/tenant";

// GET - List all providers (police use) or single provider
export async function GET(request: NextRequest) {
  try {
    const denied = requirePolice(request);
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const provider = await db.provider.findUnique({
        where: { id },
        include: { _count: { select: { rooms: true, guests: true, reservations: true, users: true } } },
      });
      if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      return NextResponse.json(provider);
    }
    const status = searchParams.get("status");
    const where: any = {};
    if (status) where.status = status;
    const providers = await db.provider.findMany({
      where,
      include: { _count: { select: { rooms: true, guests: true, reservations: true, users: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(providers);
  } catch (error) {
    console.error("Providers GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - New provider registration request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ownerName, phone, email, address, type, licenseNo, username, password } = body;
    if (!name || !ownerName || !phone || !username || !password) {
      return NextResponse.json({ error: "Name, owner, phone, username, and password are required" }, { status: 400 });
    }
    const provider = await db.provider.create({
      data: { name, ownerName, phone, email: email || "", address: address || "", type: type || "GUEST_HOUSE", licenseNo: licenseNo || "", status: "PENDING" },
    });
    // Create the admin user for this provider
    await db.user.create({
      data: { username, password, role: "SUPERUSER", name: ownerName, providerId: provider.id },
    });
    await db.activityLog.create({
      data: { message: `New provider registration: ${name} by ${ownerName}`, type: "INFO", providerId: provider.id },
    });
    return NextResponse.json(provider, { status: 201 });
  } catch (error: any) {
    console.error("Providers POST error:", error);
    if (error.code === "P2002") return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Approve/reject/suspend provider
export async function PUT(request: NextRequest) {
  try {
    const denied = requirePolice(request);
    if (denied) return denied;
    const body = await request.json();
    const { id, status, rejectionReason, approvedBy } = body;
    if (!id || !status) {
      return NextResponse.json({ error: "Provider ID and status are required" }, { status: 400 });
    }
    const updateData: any = { status };
    if (status === "APPROVED") { updateData.approvedBy = approvedBy || "police"; updateData.approvedAt = new Date(); updateData.rejectionReason = ""; }
    if (status === "REJECTED") updateData.rejectionReason = rejectionReason || "";
    const provider = await db.provider.update({ where: { id }, data: updateData });
    await db.activityLog.create({
      data: { message: `Provider ${provider.name} status changed to ${status}`, type: status === "APPROVED" ? "SUCCESS" : "WARNING" },
    });
    return NextResponse.json(provider);
  } catch (error: any) {
    console.error("Providers PUT error:", error);
    if (error.code === "P2025") return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}