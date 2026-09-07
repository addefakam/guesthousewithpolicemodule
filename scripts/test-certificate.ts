/**
 * Smoke-test the certificate PDF generator without running the full Next.js app.
 * Run via: npx tsx scripts/test-certificate.ts
 */
import { buildCertificatePdf, type CertificateData } from "../src/lib/certificate/generator";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const data: CertificateData = {
    provider: {
      id: "test-001",
      name: "Sunrise Guest House",
      ownerName: "Abebe Bekele",
      address: "Bole Road, Addis Ababa, Ethiopia",
      licenseNo: "GH-AA-007-2024",
      type: "GUEST_HOUSE",
      phone: "+251911234567",
      email: "info@sunrisegh.com",
    },
    certNumber: "GHMS-CERT-2026-0001",
    issuedAt: new Date(),
    issuedByName: "Selam Tesfaye",
  };

  console.log("[test] Building certificate PDF...");
  const buf = await buildCertificatePdf(data);
  const outPath = path.join(process.cwd(), "download", "test-certificate.pdf");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
  console.log(`[test] OK — wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error("[test] FAIL:", err);
  process.exit(1);
});
