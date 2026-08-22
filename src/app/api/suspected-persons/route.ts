import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { requirePoliceMinRank } from "@/lib/police-permissions";
import { ensureSuspectTables } from "@/lib/suspect-check";
import { Prisma } from "@prisma/client";
import { isValidPhone } from "@/lib/utils";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);
    await ensureSuspectTables();

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") || "";
    const severity = searchParams.get("severity") || "";
    const activeOnly = searchParams.get("active") !== "false";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE)))
    );
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (q) {
      // ID-only search: match against SuspectId table and legacy idNumber field
      const matchingIdPersons = await db.$queryRaw<{ suspectedPersonId: string }[]>(
        Prisma.sql`SELECT DISTINCT "suspectedPersonId" FROM "SuspectId" WHERE LOWER("idNumber") LIKE LOWER(${`%${q}%`})`
      );
      const idsFromIdTable = matchingIdPersons.map(r => r.suspectedPersonId);

      const orConditions: Record<string, unknown>[] = [
        { idNumber: { contains: q } },
      ];
      if (idsFromIdTable.length > 0) {
        orConditions.push({ id: { in: idsFromIdTable } });
      }
      where.OR = orConditions;
    }
    if (severity) {
      where.severity = severity;
    }
    if (activeOnly) {
      where.is_active = true;
    }

    const [persons, total] = await Promise.all([
      db.suspectedPerson.findMany({
        where,
        include: {
          _count: { select: { matches: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.suspectedPerson.count({ where }),
    ]);

    // Fetch all IDs for the returned persons
    if (persons.length > 0) {
      const personIds = persons.map(p => p.id);
      const allIds = await db.$queryRaw<
        { id: string; suspectedPersonId: string; idType: string; idNumber: string; createdAt: string }[]
      >(
        Prisma.sql`SELECT * FROM "SuspectId" WHERE "suspectedPersonId" IN (${Prisma.join(personIds)}) ORDER BY "createdAt" ASC`
      );

      // Group IDs by person
      const idsByPerson: Record<string, { idType: string; idNumber: string }[]> = {};
      for (const sid of allIds) {
        if (!idsByPerson[sid.suspectedPersonId]) idsByPerson[sid.suspectedPersonId] = [];
        idsByPerson[sid.suspectedPersonId].push({ idType: sid.idType, idNumber: sid.idNumber });
      }

      // Attach IDs to each person
      for (const p of persons) {
        (p as Record<string, unknown>).identifiers = idsByPerson[p.id] || [];
      }
    }

    return NextResponse.json({
      persons,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
    const message = error instanceof Error ? error.message : "Failed to fetch suspected persons";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);
    requirePoliceMinRank(auth, "DETECTIVE");
    await ensureSuspectTables();

    const body = await req.json();
    const { name, phone, idNumber, idType, nationality, address, description, severity, identifiers } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number format. Use 7-15 digits with optional + prefix." }, { status: 400 });
    }

    // Keep the legacy single idNumber/idType for backwards compat
    const primaryId = idNumber || "";
    const primaryIdType = idType || "";

    const person = await db.suspectedPerson.create({
      data: {
        name: name.trim(),
        phone: phone || "",
        idNumber: primaryId,
        idType: primaryIdType,
        nationality: nationality || "",
        address: address || "",
        description: description || "",
        severity: severity || "MEDIUM",
        registeredBy: auth.role,
      },
      include: {
        _count: { select: { matches: true } },
      },
    });

    // Create SuspectId records for all provided identifiers
    const idsToCreate: { idType: string; idNumber: string }[] = [];
    if (Array.isArray(identifiers) && identifiers.length > 0) {
      for (const ident of identifiers) {
        if (ident.idNumber && ident.idNumber.trim()) {
          idsToCreate.push({ idType: ident.idType || "Other", idNumber: ident.idNumber.trim() });
        }
      }
    }
    // Also create from legacy fields if not already in the list
    if (primaryId && !idsToCreate.some(i => i.idNumber.toLowerCase() === primaryId.toLowerCase())) {
      idsToCreate.unshift({ idType: primaryIdType || "National_ID", idNumber: primaryId });
    }

    for (const sid of idsToCreate) {
      try {
        await db.$executeRaw(Prisma.sql`
          INSERT INTO "SuspectId" ("id", "suspectedPersonId", "idType", "idNumber", "createdAt")
          VALUES (gen_random_uuid()::text, ${person.id}, ${sid.idType}, ${sid.idNumber}, CURRENT_TIMESTAMP)
          ON CONFLICT ("idNumber", "idType") DO NOTHING
        `);
      } catch {
        // Skip duplicate IDs silently
      }
    }

    // Fetch the created IDs to return
    const createdIds = await db.$queryRaw<{ idType: string; idNumber: string }[]>(
      Prisma.sql`SELECT "idType", "idNumber" FROM "SuspectId" WHERE "suspectedPersonId" = ${person.id} ORDER BY "createdAt" ASC`
    );

    return NextResponse.json({
      ...person,
      identifiers: createdIds,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to create suspected person";
    const status = message.includes("Police") ? 403 : message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
