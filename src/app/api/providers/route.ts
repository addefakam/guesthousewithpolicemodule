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

// POST - New provider registration request (public, with license file upload)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let name: string, ownerName: string, phone: string, email: string, address: string,
      type: string, licenseNo: string, username: string, password: string, licenseFile: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = (formData.get("name") as string) || "";
      ownerName = (formData.get("ownerName") as string) || "";
      phone = (formData.get("phone") as string) || "";
      email = (formData.get("email") as string) || "";
      address = (formData.get("address") as string) || "";
      type = (formData.get("type") as string) || "GUEST_HOUSE";
      licenseNo = (formData.get("licenseNo") as string) || "";
      username = (formData.get("username") as string) || "";
      password = (formData.get("password") as string) || "";

      // Handle license file upload
      const file = formData.get("licenseFile") as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // Store as data URI with base64
        licenseFile = `data:${file.type};base64,${buffer.toString("base64")}`;
      } else {
        licenseFile = "";
      }
    } else {
      const body = await request.json();
      name = body.name || "";
      ownerName = body.ownerName || "";
      phone = body.phone || "";
      email = body.email || "";
      address = body.address || "";
      type = body.type || "GUEST_HOUSE";
      licenseNo = body.licenseNo || "";
      username = body.username || "";
      password = body.password || "";
      licenseFile = body.licenseFile || "";
    }

    if (!name || !ownerName || !phone || !username || !password) {
      return NextResponse.json({ error: "Name, owner, phone, username, and password are required" }, { status: 400 });
    }

    if (!licenseNo) {
      return NextResponse.json({ error: "License number is required" }, { status: 400 });
    }

    if (!licenseFile) {
      return NextResponse.json({ error: "License document is required. Please attach your license file." }, { status: 400 });
    }

    const provider = await db.provider.create({
      data: {
        name,
        ownerName,
        phone,
        email: email || "",
        address: address || "",
        type: type || "GUEST_HOUSE",
        licenseNo,
        licenseFile,
        status: "PENDING",
      },
    });

    // Create the admin user for this provider
    await db.user.create({
      data: { username, password, role: "SUPERUSER", name: ownerName, providerId: provider.id },
    });

    await db.activityLog.create({
      data: {
        message: `New provider registration submitted: ${name} by ${ownerName} (License: ${licenseNo})`,
        type: "INFO",
        providerId: provider.id,
      },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error: any) {
    console.error("Providers POST error:", error);
    if (error.code === "P2002") return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Approve/reject/suspend provider (police only)
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
    if (status === "APPROVED") {
      updateData.approvedBy = approvedBy || "police";
      updateData.approvedAt = new Date();
      updateData.rejectionReason = "";
    }
    if (status === "REJECTED") updateData.rejectionReason = rejectionReason || "";
    const provider = await db.provider.update({
      where: { id },
      data: updateData,
    });
    await db.activityLog.create({
      data: {
        message: `Provider ${provider.name} status changed to ${status}${rejectionReason ? ` - Reason: ${rejectionReason}` : ""}`,
        type: status === "APPROVED" ? "SUCCESS" : "WARNING",
      },
    });
    return NextResponse.json(provider);
  } catch (error: any) {
    console.error("Providers PUT error:", error);
    if (error.code === "P2025") return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}