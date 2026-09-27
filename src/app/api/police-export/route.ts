import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// Hard cap to prevent runaway exports.
const MAX_ROWS = 10000;
const BATCH_SIZE = 500;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const format = searchParams.get("format") || "json";

    const metadata = {
      exportedAt: new Date().toISOString(),
      exportedBy: auth.role || "POLICE",
      dataSource: "GHMS Police Module",
      maxRows: MAX_ROWS,
    };

    // JSON path — true streaming with cursor-based pagination
    if (format !== "csv") {
      const filename = `police-export-${type}-${Date.now()}.json`;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const enqueue = (s: string) => controller.enqueue(encoder.encode(s));
          try {
            enqueue(`{"_metadata":${JSON.stringify(metadata)},"data":{`);
            let sectionCount = 0;

            const streamSection = async (key: string, queryFn: (skip: number, take: number) => Promise<unknown[]>, mapFn: (row: any) => unknown) => {
              if (sectionCount > 0) enqueue(",");
              enqueue(`"${key}":[`);
              let skip = 0;
              let first = true;
              while (skip < MAX_ROWS) {
                const rows = await queryFn(skip, Math.min(BATCH_SIZE, MAX_ROWS - skip));
                if (rows.length === 0) break;
                for (const row of rows) {
                  if (!first) enqueue(",");
                  enqueue(JSON.stringify(mapFn(row)));
                  first = false;
                }
                skip += rows.length;
                if (rows.length < BATCH_SIZE) break;
              }
              enqueue("]");
              sectionCount++;
            };

            if (type === "guests" || type === "all") {
              await streamSection("guests",
                (skip, take) => db.guest.findMany({
                  select: { name: true, phone: true, idNumber: true, idType: true, nationality: true, provider: { select: { name: true } } },
                  orderBy: { createdAt: "desc" }, skip, take,
                }),
                (g) => ({ name: g.name, phone: g.phone, idNumber: g.idNumber, idType: g.idType, nationality: g.nationality, provider: g.provider?.name }),
              );
            }

            if (type === "matches" || type === "all") {
              await streamSection("matches",
                (skip, take) => db.suspectMatch.findMany({
                  select: { guestName: true, guestPhone: true, providerName: true, matchType: true, createdAt: true, suspectedPerson: { select: { name: true, severity: true } } },
                  orderBy: { createdAt: "desc" }, skip, take,
                }),
                (m) => ({ suspectName: m.suspectedPerson.name, severity: m.suspectedPerson.severity, guestName: m.guestName, guestPhone: m.guestPhone, providerName: m.providerName, matchType: m.matchType, detectedAt: m.createdAt }),
              );
            }

            if (type === "audit" || type === "all") {
              await streamSection("auditLogs",
                (skip, take) => db.auditLog.findMany({
                  select: { officerName: true, action: true, targetId: true, targetType: true, ipAddress: true, createdAt: true },
                  orderBy: { createdAt: "desc" }, skip, take,
                }),
                (a) => a,
              );
            }

            enqueue("}}");
          } catch (err) {
            controller.error(err);
            return;
          }
          controller.close();
        },
      });

      logAudit(req, { action: "EXPORT_DATA", details: `type=${type} format=json` });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="police-export-${type}-${Date.now()}.json"`,
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // XLSX path — generate Excel file using the xlsx library
    if (format === "xlsx") {
      logAudit(req, { action: "EXPORT_DATA", details: `type=${type} format=xlsx` });

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // ── Guests sheet ──
      if (type === "guests" || type === "all") {
        const guestRows: Record<string, unknown>[] = [];
        let skip = 0;
        while (skip < MAX_ROWS) {
          const rows = await db.guest.findMany({
            select: { name: true, phone: true, idNumber: true, idType: true, nationality: true, provider: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            skip,
            take: BATCH_SIZE,
          });
          if (rows.length === 0) break;
          for (const g of rows) {
            guestRows.push({
              Name: g.name,
              Phone: g.phone,
              "ID Number": g.idNumber,
              "ID Type": g.idType,
              Nationality: g.nationality,
            });
          }
          skip += rows.length;
          if (rows.length < BATCH_SIZE) break;
        }
        const ws = XLSX.utils.json_to_sheet(guestRows);
        ws["!cols"] = Object.keys(guestRows[0] || { Name: "" }).map((k) => ({ wch: k.length + 5 }));
        XLSX.utils.book_append_sheet(wb, ws, "Guests");
      }

      // ── Suspect Matches sheet ──
      if (type === "matches" || type === "all") {
        const matchRows: Record<string, unknown>[] = [];
        let skip = 0;
        while (skip < MAX_ROWS) {
          const rows = await db.suspectMatch.findMany({
            select: { guestName: true, guestPhone: true, providerName: true, matchType: true, createdAt: true, suspectedPerson: { select: { name: true, severity: true } } },
            orderBy: { createdAt: "desc" },
            skip,
            take: BATCH_SIZE,
          });
          if (rows.length === 0) break;
          for (const m of rows) {
            matchRows.push({
              "Suspect Name": m.suspectedPerson?.name || "",
              Severity: m.suspectedPerson?.severity || "",
              "Guest Name": m.guestName,
              "Guest Phone": m.guestPhone,
              "Provider Name": m.providerName,
              "Match Type": m.matchType,
              "Detected At": m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
            });
          }
          skip += rows.length;
          if (rows.length < BATCH_SIZE) break;
        }
        if (matchRows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(matchRows);
          ws["!cols"] = Object.keys(matchRows[0]).map((k) => ({ wch: k.length + 5 }));
          XLSX.utils.book_append_sheet(wb, ws, "Suspect Matches");
        }
      }

      // ── Audit Logs sheet ──
      if (type === "audit" || type === "all") {
        const auditRows: Record<string, unknown>[] = [];
        const rows = await db.auditLog.findMany({
          select: { officerName: true, action: true, targetId: true, targetType: true, ipAddress: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: MAX_ROWS,
        });
        for (const a of rows) {
          auditRows.push({
            "Officer Name": a.officerName,
            Action: a.action,
            "Target ID": a.targetId,
            "Target Type": a.targetType,
            "IP Address": a.ipAddress,
            "Created At": a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
          });
        }
        if (auditRows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(auditRows);
          ws["!cols"] = Object.keys(auditRows[0]).map((k) => ({ wch: k.length + 5 }));
          XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
        }
      }

      // If no sheets were added (e.g. no data), add an empty placeholder
      if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["No data to export"]]), "Empty");
      }

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const filename = `police-export-${type}-${Date.now()}.xlsx`;

      return new Response(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // CSV path — true streaming with cursor-based pagination
    logAudit(req, { action: "EXPORT_DATA", details: `type=${type} format=csv` });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (s: string) => controller.enqueue(encoder.encode(s));
        try {
          const targetType = type === "all" ? "guests" : type;
          const headers: Record<string, string[]> = {
            guests: ["name", "phone", "idNumber", "idType", "nationality", "provider"],
            matches: ["suspectName", "severity", "guestName", "guestPhone", "providerName", "matchType", "detectedAt"],
            audit: ["officerName", "action", "targetId", "targetType", "ipAddress", "createdAt"],
          };
          const headerRow = headers[targetType] || headers.guests;
          // Metadata header
          enqueue(`Export Date,${metadata.exportedAt}\n`);
          enqueue(`Exported By,${metadata.exportedBy}\n`);
          enqueue(`Max Rows,${MAX_ROWS}\n`);
          enqueue("\n");
          enqueue(headerRow.map((h) => `"${h}"`).join(",") + "\n");

          const csvEscape = (val: unknown): string => {
            if (val === null || val === undefined) return "";
            const s = val instanceof Date ? val.toISOString() : String(val);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          };

          // Cursor-based streaming for each section
          const streamCsvRows = async (
            queryFn: (skip: number, take: number) => Promise<any[]>,
            mapFn: (row: any) => string[],
          ) => {
            let skip = 0;
            while (skip < MAX_ROWS) {
              const rows = await queryFn(skip, Math.min(BATCH_SIZE, MAX_ROWS - skip));
              if (rows.length === 0) break;
              for (const row of rows) {
                enqueue(mapFn(row).join(",") + "\n");
              }
              skip += rows.length;
              if (rows.length < BATCH_SIZE) break;
            }
          };

          if (targetType === "guests") {
            await streamCsvRows(
              (skip, take) => db.guest.findMany({
                select: { name: true, phone: true, idNumber: true, idType: true, nationality: true, provider: { select: { name: true } } },
                orderBy: { createdAt: "desc" }, skip, take,
              }),
              (r) => [csvEscape(r.name), csvEscape(r.phone), csvEscape(r.idNumber), csvEscape(r.idType), csvEscape(r.nationality), csvEscape(r.provider?.name || "")],
            );
          } else if (targetType === "matches") {
            await streamCsvRows(
              (skip, take) => db.suspectMatch.findMany({
                select: { guestName: true, guestPhone: true, providerName: true, matchType: true, createdAt: true, suspectedPerson: { select: { name: true, severity: true } } },
                orderBy: { createdAt: "desc" }, skip, take,
              }),
              (m) => [csvEscape(m.suspectedPerson.name), csvEscape(m.suspectedPerson.severity), csvEscape(m.guestName), csvEscape(m.guestPhone), csvEscape(m.providerName), csvEscape(m.matchType), csvEscape(m.createdAt)],
            );
          } else if (targetType === "audit") {
            await streamCsvRows(
              (skip, take) => db.auditLog.findMany({
                select: { officerName: true, action: true, targetId: true, targetType: true, ipAddress: true, createdAt: true },
                orderBy: { createdAt: "desc" }, skip, take,
              }),
              (a) => [csvEscape(a.officerName), csvEscape(a.action), csvEscape(a.targetId), csvEscape(a.targetType), csvEscape(a.ipAddress), csvEscape(a.createdAt)],
            );
          }
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="police-export-${type}-${Date.now()}.csv"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to export data";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
