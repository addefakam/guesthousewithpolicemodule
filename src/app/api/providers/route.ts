import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/init-db";
import { db } from "@/lib/db";
import { getAuthContext, AuthError } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth-utils";
import { uploadFile } from "@/lib/storage";
import { isValidPhone, isValidEmail } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabase();

    const auth = await getAuthContext(req);
    // Both POLICE and SUPERUSER can list providers (guesthouses)
    if (auth.role !== "POLICE" && auth.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const providers = await db.provider.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        ownerName: true,
        phone: true,
        email: true,
        address: true,
        type: true,
        licenseNo: true,
        licenseFile: false as const,
        status: true,
        approvedBy: true,
        approvedAt: true,
        rejectionReason: true,
        suspensionReason: true,
        suspendedAt: true,
        suspendedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return with empty licenseFile so frontend type stays consistent
    const result = providers.map(p => ({ ...p, licenseFile: "" }));

    return NextResponse.json(result);
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to fetch providers";
    const status = message.includes("denied") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();

    const contentType = req.headers.get("content-type") || "";

    // ── JSON body: SUPERUSER creating a guesthouse (auto-approved) ──
    if (contentType.includes("application/json")) {
      const auth = await getAuthContext(req);
      if (auth.role !== "SUPERUSER") {
        return NextResponse.json({ error: "Only superuser can create guesthouses directly" }, { status: 403 });
      }

      const body = await req.json();
      const { name, ownerName, phone, email, address, type, licenseNo, licenseFile, username, password } = body;

      if (!name?.trim() || !ownerName?.trim() || !phone?.trim()) {
        return NextResponse.json(
          { error: "Guesthouse name, owner name, and phone are required" },
          { status: 400 }
        );
      }
      if (!isValidPhone(phone.trim())) {
        return NextResponse.json(
          { error: "Invalid phone number format. Use 7-15 digits with optional + prefix." },
          { status: 400 }
        );
      }
      if (email?.trim() && !isValidEmail(email.trim())) {
        return NextResponse.json(
          { error: "Invalid email address format" },
          { status: 400 }
        );
      }
      if (!username?.trim() || !password?.trim()) {
        return NextResponse.json(
          { error: "Operator username and password are required" },
          { status: 400 }
        );
      }

      const existingUser = await db.user.findUnique({
        where: { username: username.trim() },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }

      // Upload license file to blob storage if provided as base64
      let licenseFileUrl = "";
      if (typeof licenseFile === "string" && licenseFile.startsWith("data:")) {
        licenseFileUrl = await uploadFile(licenseFile, "licenses");
      } else if (typeof licenseFile === "string") {
        licenseFileUrl = licenseFile; // Already a URL from blob
      }

      const provider = await db.$transaction(async (tx) => {
        const p = await tx.provider.create({
          data: {
            name: name.trim(),
            ownerName: ownerName.trim(),
            phone: phone.trim(),
            email: email?.trim() || "",
            address: address?.trim() || "",
            type: type || "GUEST_HOUSE",
            licenseNo: licenseNo?.trim() || "",
            licenseFile: licenseFileUrl,
            status: "APPROVED",
            approvedBy: auth.userId || auth.userName || "superuser",
            approvedAt: new Date(),
          },
        });

        const hashedPassword = await hashPassword(password.trim());

        await tx.user.create({
          data: {
            username: username.trim(),
            password: hashedPassword,
            role: "OPERATOR",
            name: ownerName.trim(),
            email: email?.trim() || null,
            phone: phone.trim(),
            providerId: p.id,
            isActive: true,
          },
        });

        return p;
      });

      return NextResponse.json(provider, { status: 201 });
    }

    // ── FormData body: Public registration (PENDING approval) ──
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const ownerName = formData.get("ownerName") as string;
    const phone = formData.get("phone") as string;
    const email = (formData.get("email") as string) || "";
    const address = (formData.get("address") as string) || "";
    const latitude = parseFloat(formData.get("latitude") as string) || 9.02;
    const longitude = parseFloat(formData.get("longitude") as string) || 38.75;
    const type = (formData.get("type") as string) || "GUEST_HOUSE";
    const licenseNo = (formData.get("licenseNo") as string) || "";
    const licenseFile = formData.get("licenseFile") as File | null;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!name || !ownerName || !phone || !username || !password) {
      return NextResponse.json(
        { error: "name, ownerName, phone, username, and password are required" },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone.trim())) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use 7-15 digits with optional + prefix." },
        { status: 400 }
      );
    }
    if (email?.trim() && !isValidEmail(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    let licenseFileUrl = "";
    if (licenseFile) {
      const bytes = await licenseFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = licenseFile.type || "application/octet-stream";
      const base64Uri = `data:${mimeType};base64,${buffer.toString("base64")}`;
      licenseFileUrl = await uploadFile(base64Uri, "licenses");
    }

    const provider = await db.$transaction(async (tx) => {
      const p = await tx.provider.create({
        data: {
          name,
          ownerName,
          phone,
          email,
          address,
          latitude,
          longitude,
          type,
          licenseNo,
          licenseFile: licenseFileUrl,
          status: "PENDING",
        },
      });

      const hashedPassword = await hashPassword(password);

      await tx.user.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
          role: "OPERATOR",
          name: ownerName,
          providerId: p.id,
        },
      });

      return p;
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to register provider";
    const status = message.includes("required") || message.includes("taken") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
