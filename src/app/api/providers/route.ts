import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice } from "@/lib/tenant";
import { writeFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    requirePolice(auth);

    const providers = await db.provider.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(providers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch providers";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // PUBLIC endpoint - no auth required
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const ownerName = formData.get("ownerName") as string;
    const phone = formData.get("phone") as string;
    const email = (formData.get("email") as string) || "";
    const address = (formData.get("address") as string) || "";
    const type = (formData.get("type") as string) || "GUEST_HOUSE";
    const licenseNo = (formData.get("licenseNo") as string) || "";
    const licenseFile = formData.get("licenseFile") as File | null;

    if (!name || !ownerName || !phone) {
      return NextResponse.json(
        { error: "name, ownerName, and phone are required" },
        { status: 400 }
      );
    }

    let licenseFilePath = "";
    if (licenseFile) {
      const bytes = await licenseFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(licenseFile.name) || ".bin";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      await writeFile(filepath, buffer);
      licenseFilePath = `/uploads/${filename}`;
    }

    const provider = await db.provider.create({
      data: {
        name,
        ownerName,
        phone,
        email,
        address,
        type,
        licenseNo,
        licenseFile: licenseFilePath,
        status: "PENDING",
      },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register provider";
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}