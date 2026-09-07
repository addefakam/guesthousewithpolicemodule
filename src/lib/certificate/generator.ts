/**
 * Certificate of Registration PDF generator.
 *
 * Visual style: Governmental / ministerial — deep navy background panel,
 * gold ornate border, official seal, elegant serif typography (Tinos /
 * Times-equivalent), with Amharic + Oromo secondary lines using Noto Sans
 * Ethiopic.
 *
 * Layout: A4 landscape (842 × 595 pt).
 * All elements drawn with pdfkit vector ops — fully selectable text,
 * small file size, scales crisply at any zoom.
 */

import PDFDocument from "pdfkit";
import type { Provider } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

export interface CertificateData {
  provider: Pick<
    Provider,
    | "id"
    | "name"
    | "ownerName"
    | "address"
    | "licenseNo"
    | "type"
    | "phone"
    | "email"
  >;
  certNumber: string;
  issuedAt: Date;
  issuedByName: string;
}

// ─── Color palette (governmental) ───────────────────────────────────────
const C = {
  navy: "#0d1b3d",          // primary deep navy
  navyDark: "#070f24",      // navy shadow / outer border
  gold: "#c9a44c",          // primary gold accent
  goldLight: "#e3c878",     // highlight gold
  goldDark: "#8c6f1f",      // shadow gold
  cream: "#fbf7ec",         // background parchment
  creamShadow: "#f0e9d2",   // darker parchment edge
  ink: "#1a1a1a",           // body text
  inkSoft: "#3a3a3a",       // secondary body
  sealRed: "#8b1a1a",       // official seal
  sealRedDark: "#5a0e0e",
  white: "#ffffff",
};

// ─── Font registration ─────────────────────────────────────────────────
type Fonts = {
  serif: string;
  serifBold: string;
  serifItalic: string;
  sansBold: string;
  sans: string;
  ethiopic: string;
  ethiopicBold: string;
};

let _fontsCache: Fonts | null = null;

async function loadFonts(doc: PDFKit.PDFDocument): Promise<Fonts> {
  if (_fontsCache) {
    // Register on this doc too (pdfkit fonts are per-doc)
    const f = _fontsCache;
    doc.registerFont("Serif", f.serif);
    doc.registerFont("SerifBold", f.serifBold);
    doc.registerFont("SerifItalic", f.serifItalic);
    doc.registerFont("Sans", f.sans);
    doc.registerFont("SansBold", f.sansBold);
    doc.registerFont("Ethiopic", f.ethiopic);
    doc.registerFont("EthiopicBold", f.ethiopicBold);
    return f;
  }
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const f: Fonts = {
    serif: path.join(fontsDir, "LiberationSerif-Regular.ttf"),
    serifBold: path.join(fontsDir, "LiberationSerif-Bold.ttf"),
    serifItalic: path.join(fontsDir, "LiberationSerif-Italic.ttf"),
    sans: path.join(fontsDir, "LiberationSans-Regular.ttf"),
    sansBold: path.join(fontsDir, "LiberationSans-Bold.ttf"),
    ethiopic: path.join(fontsDir, "NotoSansEthiopic-Regular.ttf"),
    ethiopicBold: path.join(fontsDir, "NotoSansEthiopic-Bold.ttf"),
  };
  // Verify files exist (fail loudly in dev rather than produce a broken PDF)
  for (const [k, p] of Object.entries(f)) {
    try {
      await fs.access(p);
    } catch {
      throw new Error(`[certificate] Missing font file: ${k} → ${p}`);
    }
  }
  doc.registerFont("Serif", f.serif);
  doc.registerFont("SerifBold", f.serifBold);
  doc.registerFont("SerifItalic", f.serifItalic);
  doc.registerFont("Sans", f.sans);
  doc.registerFont("SansBold", f.sansBold);
  doc.registerFont("Ethiopic", f.ethiopic);
  doc.registerFont("EthiopicBold", f.ethiopicBold);
  _fontsCache = f;
  return f;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateAm(d: Date): string {
  // Ethiopian calendar is ~7 years behind; show Gregorian for legal clarity
  // but use Amharic month names for cultural familiarity.
  const months = [
    "ጃንዩወሪ", "ፌብሩወሪ", "ማርች", "ኤፕሪል", "ሜይ", "ጁን",
    "ጁላይ", "ኦገስት", "ሴፕቴምበር", "ኦክቶበር", "ኖቬምበር", "ዲሴምበር",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateOm(d: Date): string {
  const months = [
    "Amajjii", "Guraandhala", "Bitooteessa", "Elba", "Caamsa", "Waxabajjii",
    "Adooleessa", "Hagayya", "Fuulbaana", "Onkololeessa", "Sadaasa", "Muddee",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function addValidityYear(d: Date): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + 1);
  return r;
}

// Compute certificate number: GHMS-CERT-YYYY-NNNN
// NNNN is the zero-padded count of providers that have a certNumber at issue time.
export function buildCertNumber(seq: number, year: number): string {
  return `GHMS-CERT-${year}-${String(seq).padStart(4, "0")}`;
}

// ─── Ornate border drawing ──────────────────────────────────────────────

function drawOrnateBorder(doc: PDFKit.PDFDocument, w: number, h: number) {
  // Outer navy frame
  doc
    .rect(0, 0, w, h)
    .fill(C.navy);

  // Cream parchment inner area (leaving a ~28pt navy border)
  const m = 28;
  doc
    .rect(m, m, w - 2 * m, h - 2 * m)
    .fill(C.cream);

  // Gold double-line border on the navy edge
  doc
    .rect(m - 6, m - 6, w - 2 * (m - 6), h - 2 * (m - 6))
    .lineWidth(1.2)
    .strokeColor(C.gold)
    .stroke();

  doc
    .rect(m - 12, m - 12, w - 2 * (m - 12), h - 2 * (m - 12))
    .lineWidth(0.6)
    .strokeColor(C.goldDark)
    .stroke();

  // Inner gold border around the cream area
  doc
    .rect(m + 14, m + 14, w - 2 * (m + 14), h - 2 * (m + 14))
    .lineWidth(0.8)
    .strokeColor(C.gold)
    .stroke();

  // Corner ornaments (4 small filled diamonds at the inner gold border corners)
  const cornerOffset = m + 14;
  const corners = [
    [cornerOffset, cornerOffset],
    [w - cornerOffset, cornerOffset],
    [cornerOffset, h - cornerOffset],
    [w - cornerOffset, h - cornerOffset],
  ];
  for (const [cx, cy] of corners) {
    drawDiamond(doc, cx, cy, 5, C.gold);
  }

  // Subtle gold filigree on top center and bottom center of the navy border
  drawTopFiligree(doc, w / 2, m - 14, 60, 14);
  drawTopFiligree(doc, w / 2, h - m + 14, 60, 14, true);
}

function drawDiamond(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  doc
    .save()
    .moveTo(cx, cy - r)
    .lineTo(cx + r, cy)
    .lineTo(cx, cy + r)
    .lineTo(cx - r, cy)
    .fill(color)
    .restore();
}

function drawTopFiligree(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  width: number,
  height: number,
  flip = false,
) {
  // A small symmetric flourish: three diamonds + connecting line
  doc.save();
  if (flip) {
    // Mirror vertically around cy
    doc.translate(cx, cy);
    doc.scale(1, -1);
    doc.translate(-cx, -cy);
  }
  // Horizontal line
  doc
    .moveTo(cx - width / 2, cy)
    .lineTo(cx + width / 2, cy)
    .lineWidth(0.6)
    .strokeColor(C.goldLight)
    .stroke();
  // Three diamonds along it
  drawDiamond(doc, cx, cy, 4, C.gold);
  drawDiamond(doc, cx - width / 2, cy, 3, C.gold);
  drawDiamond(doc, cx + width / 2, cy, 3, C.gold);
  // Small curls at each end
  doc
    .circle(cx - width / 2 - 6, cy, 2)
    .fill(C.goldLight);
  doc
    .circle(cx + width / 2 + 6, cy, 2)
    .fill(C.goldLight);
  doc.restore();
}

// ─── Official seal ───────────────────────────────────────────────────────

function drawSeal(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number) {
  // Outer dark ring
  doc
    .circle(cx, cy, r)
    .lineWidth(2.5)
    .strokeColor(C.sealRedDark)
    .fill(C.sealRed)
    .stroke();

  // Inner ring
  doc
    .circle(cx, cy, r - 8)
    .lineWidth(1)
    .strokeColor(C.goldLight)
    .stroke();

  // Star at center (8-pointed)
  drawEightPointStar(doc, cx, cy, r - 16, r - 26, C.goldLight);

  // Text around the outer ring — "GUEST HOUSE MANAGEMENT SYSTEM" top, "OFFICIAL SEAL" bottom
  doc
    .fontSize(7)
    .fillColor(C.goldLight)
    .font("SansBold");
  drawTextOnArc(
    doc,
    "★ GUEST HOUSE MANAGEMENT SYSTEM ★",
    cx,
    cy,
    r - 4,
    Math.PI * 0.05, // start angle (top)
    true, // top half (sweep clockwise from left to right)
  );
  drawTextOnArc(
    doc,
    "★ OFFICIAL SEAL ★",
    cx,
    cy,
    r - 4,
    Math.PI * 1.05, // bottom half start
    false,
  );

  // Center text
  doc
    .fontSize(8)
    .fillColor(C.goldLight)
    .font("SansBold")
    .text("GHMS", cx - 20, cy - 4, { width: 40, align: "center" });
}

function drawEightPointStar(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  color: string,
) {
  const points = 8;
  doc.save();
  doc.moveTo(cx, cy - rOuter);
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    doc.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  doc.fill(color);
  doc.restore();
}

// Render text along an arc (one character at a time).
// top: true → text reads left-to-right across the top of the circle
// top: false → text reads left-to-right across the bottom of the circle
function drawTextOnArc(
  doc: PDFKit.PDFDocument,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  top: boolean,
) {
  // Total arc length we want to spread characters across.
  const totalChars = text.length;
  const arcSpan = Math.PI * 0.9; // ~162 degrees
  const step = arcSpan / Math.max(totalChars - 1, 1);
  doc.save();
  for (let i = 0; i < totalChars; i++) {
    const angle = top ? startAngle + i * step : startAngle + i * step;
    const x = cx + Math.cos(angle - Math.PI / 2) * radius;
    const y = cy + Math.sin(angle - Math.PI / 2) * radius;
    doc
      .save()
      .translate(x, y)
      .rotate(top ? (angle * 180) / Math.PI : (angle * 180) / Math.PI + 180)
      .text(text[i], -2, -3, { width: 6, align: "center" })
      .restore();
  }
  doc.restore();
}

// ─── Main certificate builder ───────────────────────────────────────────

export async function buildCertificatePdf(
  data: CertificateData,
): Promise<Buffer> {
  // A4 landscape: 842 × 595 pt
  // NOTE: don't pass layout: 'landscape' — pdfkit swaps the [w, h] array back
  // to portrait when layout is set. Just give the dims directly.
  const w = 842;
  const h = 595;
  const doc = new PDFDocument({
    size: [w, h],
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    info: {
      Title: `Certificate of Registration — ${data.provider.name}`,
      Author: "GHMS — Guest House Management System",
      Subject: "Provider Registration Certificate",
      Creator: "GHMS",
    },
  });

  await loadFonts(doc);

  // Collect PDF into a buffer (pdfkit is stream-based)
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  // ── 1. Background + ornate border ────────────────────────────────────
  drawOrnateBorder(doc, w, h);

  // ── 2. Top header — Republic of Ethiopia / federal look ──────────────
  const topY = 60;
  doc
    .font("SansBold")
    .fontSize(10)
    .fillColor(C.gold)
    .text("FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA", 0, topY, {
      width: w,
      align: "center",
    })
    .font("SerifItalic")
    .fontSize(8)
    .fillColor(C.goldLight)
    .text("የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ", 0, topY + 14, {
      width: w,
      align: "center",
    })
    .font("Sans")
    .fontSize(7)
    .fillColor(C.gold)
    .text("Ripabliikii Dimokraatawaa Federaalawaa Itoophiyaa", 0, topY + 28, {
      width: w,
      align: "center",
    });

  // Thin gold separator line below the federal header
  doc
    .moveTo(w / 2 - 100, topY + 46)
    .lineTo(w / 2 + 100, topY + 46)
    .lineWidth(0.8)
    .strokeColor(C.gold)
    .stroke();
  drawDiamond(doc, w / 2 - 100, topY + 46, 2, C.gold);
  drawDiamond(doc, w / 2 + 100, topY + 46, 2, C.gold);

  // ── 3. Issuing authority ─────────────────────────────────────────────
  doc
    .font("SerifBold")
    .fontSize(12)
    .fillColor(C.navy)
    .text("GUEST HOUSE MANAGEMENT SYSTEM", 0, topY + 56, {
      width: w,
      align: "center",
    })
    .font("EthiopicBold")
    .fontSize(9)
    .fillColor(C.ink)
    .text("የእንግድ ቤት አስተዳደር ስርዓት", 0, topY + 72, {
      width: w,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(8)
    .fillColor(C.inkSoft)
    .text("Sirna Bulchiinsa Mana Gaazee", 0, topY + 84, {
      width: w,
      align: "center",
    });

  // ── 4. "Certificate of Registration" title ───────────────────────────
  const titleY = topY + 100;
  doc
    .font("SerifBold")
    .fontSize(34)
    .fillColor(C.navy)
    .text("Certificate of Registration", 0, titleY, {
      width: w,
      align: "center",
    })
    .font("EthiopicBold")
    .fontSize(16)
    .fillColor(C.navy)
    .text("የምዝገባ ማረጋገጫ", 0, titleY + 38, {
      width: w,
      align: "center",
    })
    .font("EthiopicBold")
    .fontSize(13)
    .fillColor(C.navy)
    .text("Marsariisa Mirgansa", 0, titleY + 60, {
      width: w,
      align: "center",
    });

  // ── 5. Decorative line below title ──────────────────────────────────
  const lineY = titleY + 84;
  doc
    .moveTo(w / 2 - 180, lineY)
    .lineTo(w / 2 - 20, lineY)
    .lineWidth(1.2)
    .strokeColor(C.gold)
    .stroke();
  doc
    .moveTo(w / 2 + 20, lineY)
    .lineTo(w / 2 + 180, lineY)
    .lineWidth(1.2)
    .strokeColor(C.gold)
    .stroke();
  drawDiamond(doc, w / 2, lineY, 4, C.gold);

  // ── 6. "This is to certify that" preamble ───────────────────────────
  const preY = lineY + 14;
  doc
    .font("SerifItalic")
    .fontSize(13)
    .fillColor(C.inkSoft)
    .text("This is to certify that", 0, preY, {
      width: w,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(10)
    .fillColor(C.inkSoft)
    .text("ይህ የሚያረጋግጸው", 0, preY + 18, {
      width: w,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(9)
    .fillColor(C.inkSoft)
    .text("Kun immoo mirkaneessa", 0, preY + 32, {
      width: w,
      align: "center",
    });

  // ── 7. Guesthouse name (hero element) ────────────────────────────────
  const nameY = preY + 48;
  doc
    .font("SerifBold")
    .fontSize(28)
    .fillColor(C.navy)
    .text(data.provider.name, 0, nameY, {
      width: w,
      align: "center",
    });

  // Underline the name
  const nameWidth = doc.widthOfString(data.provider.name, { font: "SerifBold", size: 28 });
  const nameUnderlineY = nameY + 34;
  doc
    .moveTo(w / 2 - nameWidth / 2, nameUnderlineY)
    .lineTo(w / 2 + nameWidth / 2, nameUnderlineY)
    .lineWidth(0.8)
    .strokeColor(C.gold)
    .stroke();

  // ── 8. Certification statement (trilingual) ─────────────────────────
  const stmtY = nameUnderlineY + 12;
  doc
    .font("SerifItalic")
    .fontSize(11)
    .fillColor(C.ink)
    .text(
      "is hereby certified as a registered lodging establishment, authorized to provide hospitality services",
      0,
      stmtY,
      { width: w, align: "center" },
    )
    .font("SerifItalic")
    .fontSize(11)
    .fillColor(C.ink)
    .text("in accordance with the standards of the Guest House Management System.", 0, stmtY + 14, {
      width: w,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(9)
    .fillColor(C.inkSoft)
    .text("በእንግድ ቤት አስተዳደር ስርዓት ደረጃዎች መሠረት እንግድ ቤት አገልግሎት ለመስጠት የተፈቀደ እና የተመዘገበ መሆኑን ይህ ሰነድ ያረጋግጣል።", 0, stmtY + 32, {
      width: w,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(9)
    .fillColor(C.inkSoft)
    .text("Akkaataa sadarkaa sirna bulchiinsa mana gaazee, tajaajila gaazee kennuu danda'uuf kan mirkaneessameefi kan galmaa'ee ta'uu isaa kun qabiyyeeffata.", 0, stmtY + 46, {
      width: w,
      align: "center",
    });

  // ── 9. Guesthouse details — small factbox ───────────────────────────
  // Place a small bordered card with owner, address, license no.
  const boxW = 360;
  const boxH = 50;
  const boxX = (w - boxW) / 2;
  const boxY = stmtY + 60;

  doc
    .save()
    .roundedRect(boxX, boxY, boxW, boxH, 4)
    .lineWidth(0.6)
    .strokeColor(C.goldDark)
    .fillOpacity(0.05)
    .fill(C.gold)
    .restore();

  // Header line
  doc
    .font("SansBold")
    .fontSize(7)
    .fillColor(C.navy)
    .text("ESTABLISHMENT PARTICULARS  ·  የተቋም ዝርዝር መረጃ  ·  Qabiyyee Dhaabbata", boxX + 8, boxY + 4, {
      width: boxW - 16,
      align: "center",
    });

  // Three columns inside the factbox
  const colW = (boxW - 16) / 3;
  const cols = [
    { label: "Owner / ባለቤት / Abbaa Qabeenyaa", value: data.provider.ownerName || "—" },
    { label: "License No. / ፈቃድ / Lakk. Hayyama", value: data.provider.licenseNo || "—" },
    { label: "Type / አይነት / Akaakuu", value: humanizeType(data.provider.type) },
  ];
  cols.forEach((c, i) => {
    const cx = boxX + 8 + i * colW;
    doc
      .font("Sans")
      .fontSize(6)
      .fillColor(C.inkSoft)
      .text(c.label, cx, boxY + 14, { width: colW, align: "center" });
    doc
      .font("SerifBold")
      .fontSize(10)
      .fillColor(C.ink)
      .text(c.value, cx, boxY + 26, { width: colW, align: "center" });
  });

  // Address row below the factbox
  if (data.provider.address) {
    doc
      .font("Sans")
      .fontSize(7)
      .fillColor(C.inkSoft)
      .text(
        `Address / አድራሻ / Teessoo: ${data.provider.address}`,
        boxX,
        boxY + boxH - 8,
        { width: boxW, align: "center" },
      );
  }

  // ── 10. Footer area: certificate number, issue/expiry, seal, signature ──
  // Three columns:
  //   LEFT (90 to 330):  Cert number
  //   CENTER (340 to 500): Seal + signature line
  //   RIGHT (510 to 750): Issue date + validity
  const footerY = 490;

  // Left: Certificate number
  doc
    .font("SansBold")
    .fontSize(7)
    .fillColor(C.goldDark)
    .text("CERTIFICATE NUMBER", 90, footerY, {
      width: 240,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(6)
    .fillColor(C.inkSoft)
    .text("የማረጋገጫ ቁጥር  ·  Lakk. Marsariisa", 90, footerY + 9, {
      width: 240,
      align: "center",
    })
    .font("SansBold")
    .fontSize(12)
    .fillColor(C.navy)
    .text(data.certNumber, 90, footerY + 24, { width: 240, align: "center" });

  // Center: Seal overlapping the signature line (classic certificate design)
  const sealCY = footerY + 18;
  drawSeal(doc, w / 2, sealCY, 26);
  // Signature line directly below the seal
  const sigY = sealCY + 30;
  doc
    .moveTo(w / 2 - 90, sigY)
    .lineTo(w / 2 + 90, sigY)
    .lineWidth(0.6)
    .strokeColor(C.ink)
    .stroke();
  doc
    .font("SansBold")
    .fontSize(8)
    .fillColor(C.ink)
    .text(data.issuedByName || "System Administrator", w / 2 - 120, sigY + 3, {
      width: 240,
      align: "center",
    })
    .font("Sans")
    .fontSize(6)
    .fillColor(C.inkSoft)
    .text(
      "System Administrator  ·  የስርዓት አስተዳዳሪ  ·  Bulcha Sirna",
      w / 2 - 120,
      sigY + 14,
      { width: 240, align: "center" },
    );

  // Right: Issue date + validity
  doc
    .font("SansBold")
    .fontSize(7)
    .fillColor(C.goldDark)
    .text("DATE OF ISSUE", w - 330, footerY, {
      width: 240,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(6)
    .fillColor(C.inkSoft)
    .text("የመስጠት ቀን  ·  Guyaa Kennaa", w - 330, footerY + 9, {
      width: 240,
      align: "center",
    })
    .font("SerifBold")
    .fontSize(11)
    .fillColor(C.ink)
    .text(formatDate(data.issuedAt), w - 330, footerY + 24, {
      width: 240,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(7)
    .fillColor(C.inkSoft)
    .text(formatDateAm(data.issuedAt), w - 330, footerY + 38, {
      width: 240,
      align: "center",
    })
    .font("Ethiopic")
    .fontSize(7)
    .fillColor(C.inkSoft)
    .text(formatDateOm(data.issuedAt), w - 330, footerY + 50, {
      width: 240,
      align: "center",
    });

  // Validity line (single trilingual line)
  const expiry = addValidityYear(data.issuedAt);
  doc
    .font("Sans")
    .fontSize(6.5)
    .fillColor(C.inkSoft)
    .text(
      `Valid until ${formatDate(expiry)}  ·  እስከ ${formatDateAm(expiry)} ድረስ  ·  Hanga ${formatDateOm(expiry)}`,
      w - 330,
      footerY + 64,
      { width: 240, align: "center" },
    );

  // ── 12. Microprint footer (anti-forgery detail) — single line, in-bounds ──
  doc
    .font("SerifItalic")
    .fontSize(5)
    .fillColor(C.goldDark)
    .text(
      "This certificate is issued electronically by the GHMS platform.  ·  Any alteration or forgery is punishable by law.",
      60,
      h - 22,
      { width: w - 120, align: "center" },
    );

  // ── Done ─────────────────────────────────────────────────────────────
  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function humanizeType(type: string): string {
  const map: Record<string, string> = {
    GUEST_HOUSE: "Guest House",
    HOTEL: "Hotel",
    LODGE: "Lodge",
    RESORT: "Resort",
    MOTEL: "Motel",
  };
  return map[type] || type || "Guest House";
}
