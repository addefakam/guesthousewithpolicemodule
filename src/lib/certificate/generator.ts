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
import QRCode from "qrcode";
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
  // FreeSerif has BOTH Ge'ez + Latin digits — used for Amharic strings that
  // contain Latin characters (like dates "8 ሴፕቴምበር 2026"). Noto Sans Ethiopic
  // alone doesn't include Latin digits, so dates lost their day/year numbers.
  ethiopicMixed: string;
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
    doc.registerFont("EthiopicMixed", f.ethiopicMixed);
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
    ethiopicMixed: path.join(fontsDir, "FreeSerif.ttf"),
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
  doc.registerFont("EthiopicMixed", f.ethiopicMixed);
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

  // Corner ornaments: 4 small circular badges, one at each corner of the
  // inner gold border. Each badge is an Oromia Police-style emblem —
  // copper/gold circular badge with 'POOLISII OROMIYAA' text around the
  // rim and a stylized Odaa tree (traditional Oromo sycamore symbol) at
  // the center. Inspired by the official Oromia Police emblem, redrawn
  // as vector primitives to match the certificate's color palette.
  const cornerOffset = m + 14;
  const cornerR = 28;
  const cornerCorners: [number, number][] = [
    [cornerOffset, cornerOffset],
    [w - cornerOffset, cornerOffset],
    [cornerOffset, h - cornerOffset],
    [w - cornerOffset, h - cornerOffset],
  ];
  for (const [cx, cy] of cornerCorners) {
    drawCornerLogo(doc, cx, cy, cornerR);
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

// ─── Corner logo — Oromia Police-style emblem ────────────────────────────
//
// Used at all four corners of the inner gold border. Each badge is an
// emblem inspired by the official Oromia Police logo:
//   - Outer copper/gold circular ring
//   - Navy filled inner disc
//   - "POOLISII OROMIYAA" text wrapped around the top half of the rim
//     (Afaan Oromoo for "Oromia Police")
//   - A small five-pointed star at the bottom of the rim
//   - A stylized Odaa tree (traditional Oromo sycamore symbol) at the
//     center — trunk with a radiating canopy of leaves
//
// Colors are chosen to harmonize with the certificate's existing palette
// (navy + gold + cream) rather than copying the source emblem's hue.
function drawCornerLogo(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number,
) {
  // ── 1. Outer copper/gold filled ring (the badge body)
  doc
    .circle(cx, cy, r)
    .fillColor(C.gold)
    .fill();

  // ── 2. Inner navy filled disc (the badge center)
  const innerR = r - 4;
  doc
    .circle(cx, cy, innerR)
    .fillColor(C.navy)
    .fill();

  // ── 3. Thin gold-light inner ring (decorative separator)
  doc
    .circle(cx, cy, innerR - 2)
    .lineWidth(0.4)
    .strokeColor(C.goldLight)
    .stroke();

  // ── 4. (Removed per user request — was "POOLISII OROMIYAA" rim text)
  //    The badge now has no text; only the central Odaa tree + star.

  // ── 5. Small five-point star at the bottom of the rim (7 o'clock position)
  drawFivePointStar(doc, cx, cy + r - 2, 2.5, C.navy);

  // ── 6. Central Odaa tree symbol
  //    Stylized sycamore: trunk + canopy of radiating leaves
  drawOdaaTree(doc, cx, cy, innerR - 4);
}

// ─── Five-pointed star (filled, points up) ────────────────────────────────
function drawFivePointStar(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  rOuter: number,
  color: string,
) {
  const rInner = rOuter * 0.4;
  const points = 5;
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

// ─── Odaa tree — traditional Oromo sycamore symbol ────────────────────────
//
// A stylized representation of the Odaa (sycamore fig tree), the
// traditional gathering tree under which the Oromo Gadaa council meets.
// Drawn as: trunk (rectangle) + radiating leaf canopy (overlapping
// circles forming a fan) + small roots at the base.
function drawOdaaTree(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  scale: number,
) {
  // Scale factor for sizing within the badge
  const trunkW = scale * 0.18;
  const trunkH = scale * 0.55;
  const canopyR = scale * 0.32;

  // Trunk (vertical rectangle, gold-light color)
  doc
    .rect(cx - trunkW / 2, cy - trunkH * 0.2, trunkW, trunkH)
    .fillColor(C.goldLight)
    .fill();

  // Canopy — radiating circles forming a fan/leaf cluster at the top
  // 7 overlapping circles arranged in a semicircle above the trunk
  const canopyCenterY = cy - trunkH * 0.35;
  const leafR = canopyR * 0.55;
  const leafPositions = [
    { x: cx, y: canopyCenterY - canopyR * 0.8 }, // top center
    { x: cx - canopyR * 0.6, y: canopyCenterY - canopyR * 0.5 }, // upper left
    { x: cx + canopyR * 0.6, y: canopyCenterY - canopyR * 0.5 }, // upper right
    { x: cx - canopyR * 0.9, y: canopyCenterY }, // left
    { x: cx + canopyR * 0.9, y: canopyCenterY }, // right
    { x: cx - canopyR * 0.4, y: canopyCenterY - canopyR * 0.2 }, // mid-left
    { x: cx + canopyR * 0.4, y: canopyCenterY - canopyR * 0.2 }, // mid-right
  ];
  for (const pos of leafPositions) {
    doc
      .circle(pos.x, pos.y, leafR)
      .fillColor(C.goldLight)
      .fill();
  }

  // Roots — two small lines flaring out from the base of the trunk
  const rootY = cy + trunkH * 0.35;
  doc
    .moveTo(cx, rootY - 2)
    .lineTo(cx - canopyR * 0.5, rootY + 4)
    .lineWidth(1)
    .strokeColor(C.goldLight)
    .stroke();
  doc
    .moveTo(cx, rootY - 2)
    .lineTo(cx + canopyR * 0.5, rootY + 4)
    .lineWidth(1)
    .strokeColor(C.goldLight)
    .stroke();

  // Small ground line below the roots
  doc
    .moveTo(cx - canopyR * 0.7, rootY + 5)
    .lineTo(cx + canopyR * 0.7, rootY + 5)
    .lineWidth(0.5)
    .strokeColor(C.goldLight)
    .stroke();
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

  // ── 2. Top header — Issuing authority banner ─────────────────────────
  // Reduced from 28pt (too big) to 18pt — sits in the middle of the
  // visual hierarchy: bigger than the system-name lines (12-13pt) but
  // smaller than the guesthouse name (24pt). Centered, balanced.
  // topY bumped from 56 → 90 to push items 1-5 down and close the wide
  // gap between the decorative line (5) and the guesthouse name (6).
  const topY = 90;
  doc
    .font("SansBold")
    .fontSize(18)
    .fillColor(C.gold)
    .text("Qajeelcha Olaanaa Poolisii Bulchiinsa Magaalaa Bishooftuu", 0, topY, {
      width: w,
      align: "center",
    });

  // Thin gold separator line below the issuing-authority banner
  doc
    .moveTo(w / 2 - 100, topY + 28)
    .lineTo(w / 2 + 100, topY + 28)
    .lineWidth(0.8)
    .strokeColor(C.gold)
    .stroke();
  drawDiamond(doc, w / 2 - 100, topY + 28, 2, C.gold);
  drawDiamond(doc, w / 2 + 100, topY + 28, 2, C.gold);

  // ── 3. Issuing authority (system name) ──────────────────────────────
  doc
    .font("SerifBold")
    .fontSize(16)
    .fillColor(C.navy)
    .text("Sirna Bulchiinsa Mana Seeree", 0, topY + 40, {
      width: w,
      align: "center",
    })
    .font("EthiopicBold")
    .fontSize(12)
    .fillColor(C.ink)
    .text("የእንግዳ ቤት አስተዳደር ስርዓት", 0, topY + 60, {
      width: w,
      align: "center",
    })
    .font("SerifBold")
    .fontSize(11)
    .fillColor(C.inkSoft)
    .text("GUEST HOUSE MANAGEMENT SYSTEM", 0, topY + 76, {
      width: w,
      align: "center",
    });

  // ── 4. Certificate title removed per user request ────────────────────
  const titleY = topY + 96;

  // ── 5. Decorative line ──────────────────────────────────────────────
  const lineY = titleY + 16;
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

  // ── 6. Preamble removed per user request ─────────────────────────────
  // Tightened gap from lineY+38 → lineY+18 to close the wide space
  // between the decorative line and the guesthouse name.
  const preY = lineY + 18;

  // ── 7. Guesthouse name (hero element) ────────────────────────────────
  // Font size reduced from 28 to 24 per user request (relative scaling).
  const nameY = preY + 14;
  doc
    .font("SerifBold")
    .fontSize(24)
    .fillColor(C.navy)
    .text(data.provider.name, 0, nameY, {
      width: w,
      align: "center",
    });

  // Underline the name
  const nameWidth = doc.widthOfString(data.provider.name, { font: "SerifBold", size: 24 });
  const nameUnderlineY = nameY + 30;
  doc
    .moveTo(w / 2 - nameWidth / 2, nameUnderlineY)
    .lineTo(w / 2 + nameWidth / 2, nameUnderlineY)
    .lineWidth(0.8)
    .strokeColor(C.gold)
    .stroke();

  // ── 8. Certification statement (trilingual) — OM / AM / EN order ─────
  // Font sizes scaled up (10→14, 11→14) to fill the page. Y offsets
  // increased to accommodate larger line heights.
  const stmtY = nameUnderlineY + 22;
  doc
    .font("SerifItalic")
    .fontSize(14)
    .fillColor(C.inkSoft)
    .text(
      "Leenjii milkiidhaan kan xumure yoo ta'u, akkaataa istaandardii",
      0,
      stmtY,
      { width: w, align: "center" },
    )
    .font("SerifItalic")
    .fontSize(14)
    .fillColor(C.inkSoft)
    .text(
      "Waajjira Poolisiitiin sirnichatti guutummaatti fayyadamuuf waraqaa ragaa argateera.",
      0,
      stmtY + 20,
      { width: w, align: "center" },
    )
    .font("Ethiopic")
    .fontSize(14)
    .fillColor(C.inkSoft)
    .text(
      "ከፖሊስ ቢሮው መስፈርቶች ጋር በሚስማማ መልኩ፣ ስርዓቱን ሙሉ በሙሉ",
      0,
      stmtY + 44,
      { width: w, align: "center" },
    )
    .font("Ethiopic")
    .fontSize(14)
    .fillColor(C.inkSoft)
    .text(
      "ለመጠቀም የሚያስችለውን ስልጠና በተሳካ ሁኔታ አጠናቆ የምስክር ወረቀት አግኝቷል።",
      0,
      stmtY + 64,
      { width: w, align: "center" },
    )
    .font("SerifItalic")
    .fontSize(14)
    .fillColor(C.ink)
    .text(
      "Has successfully completed training and obtained a certificate of credentials",
      0,
      stmtY + 88,
      { width: w, align: "center" },
    )
    .font("SerifItalic")
    .fontSize(14)
    .fillColor(C.ink)
    .text(
      "to fully utilize the system in accordance with the standards of the Police Office.",
      0,
      stmtY + 108,
      { width: w, align: "center" },
    );

  // ── 9. Footer — centered signature + Oromo date only ─────────────────
  // Font sizes scaled up (11→14, 8→11, 10→13) to fill the page.
  // Y offsets re-spaced to use the vertical space freed by removing
  // the title block and preamble.
  const footerY = stmtY + 144;

  // Signature line — centered, no seal above it now
  const sigY = footerY + 30;
  doc
    .moveTo(w / 2 - 100, sigY)
    .lineTo(w / 2 + 100, sigY)
    .lineWidth(0.6)
    .strokeColor(C.ink)
    .stroke();

  // Issuer name (just the name — no role label per user request)
  doc
    .font("SerifBold")
    .fontSize(14)
    .fillColor(C.ink)
    .text(data.issuedByName || "System Administrator", w / 2 - 140, sigY + 5, {
      width: 280,
      align: "center",
    });

  // Date of issue — Oromo only, per user request.
  const dateY = sigY + 30;
  doc
    .font("SerifBold")
    .fontSize(11)
    .fillColor(C.goldDark)
    .text("Guyaa Kennaa", w / 2 - 140, dateY, {
      width: 280,
      align: "center",
    })
    .font("SerifBold")
    .fontSize(13)
    .fillColor(C.ink)
    .text(formatDateOm(data.issuedAt), w / 2 - 140, dateY + 16, {
      width: 280,
      align: "center",
    });

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

// ─── Trilingual type names (OM / AM / EN order) ──────────────────────────
function humanizeTypeTrilingual(type: string): { om: string; am: string; en: string } {
  const map: Record<string, { om: string; am: string; en: string }> = {
    GUEST_HOUSE: { om: "Mana Gaazee", am: "እንግድ ቤት", en: "Guest House" },
    HOTEL: { om: "Hoteela", am: "ሆቴል", en: "Hotel" },
    LODGE: { om: "Lojii", am: "ሎጅ", en: "Lodge" },
    RESORT: { om: "Reesoortii", am: "ሪሶርት", en: "Resort" },
    MOTEL: { om: "Mooteelaa", am: "ሞቴል", en: "Motel" },
  };
  return map[type] || { om: type, am: type, en: type };
}

// ─── Build the QR payload (trilingual, OM / AM / EN) ─────────────────────
//
// Encodes the full certification record as a structured plain-text payload.
// Anyone scanning the QR with a phone camera will see this text. We use
// simple labelled lines so the output is human-readable in any QR app,
// not just our own verifier.
function buildQrPayload(d: CertificateData): string {
  const expiry = addValidityYear(d.issuedAt);
  const t = humanizeTypeTrilingual(d.provider.type);

  // Oromo section
  const om = [
    "MARSARIISA MIRGANSA  ·  GHMS",
    "Leenjii milkaa'aa ee xumuruun, sirna guutuun fayyadamiinuu danda'uuf mirkaneffameera, akkaataa sadarkaa Waajjira Poolisiitiin.",
    `Lakk. Marsariisa: ${d.certNumber}`,
    `Maqaa Dhaabbata: ${d.provider.name}`,
    `Abbaa Qabeenyaa: ${d.provider.ownerName || "—"}`,
    `Lakk. Hayyama: ${d.provider.licenseNo || "—"}`,
    `Akaakuu: ${t.om}`,
    `Teessoo: ${d.provider.address || "—"}`,
    `Guyaa Kennaa: ${formatDateOm(d.issuedAt)}`,
    `Hanga: ${formatDateOm(expiry)}`,
    `Kename: ${d.issuedByName || "Bulcha Sirna"}`,
  ].join("\n");

  // Amharic section
  const am = [
    "የምዝገባ ማረጋገጫ  ·  GHMS",
    "ስልጠናውን በተሳካ ሆኖ አጠናቅቋል እንዲሁም በፖሊስ ጽሕፈት ቤት ደረጃዎች መሠረት ስርዓቱን በድጋፚ መጠቀም ተፈቅዷል።",
    `የማረጋገጫ ቁጥር: ${d.certNumber}`,
    `የተቋም ስም: ${d.provider.name}`,
    `ባለቤት: ${d.provider.ownerName || "—"}`,
    `የፈቃድ ቁጥር: ${d.provider.licenseNo || "—"}`,
    `አይነት: ${t.am}`,
    `አድራሻ: ${d.provider.address || "—"}`,
    `የመስጠት ቀን: ${formatDateAm(d.issuedAt)}`,
    `እስከ: ${formatDateAm(expiry)}`,
    `የሰጠው: ${d.issuedByName || "የስርዓት አስተዳዳሪ"}`,
  ].join("\n");

  // English section
  const en = [
    "CERTIFICATE OF REGISTRATION  ·  GHMS",
    "Has successfully completed training and is certified to fully utilize the system in accordance with the standards of the Police Office.",
    `Certificate No.: ${d.certNumber}`,
    `Establishment: ${d.provider.name}`,
    `Owner: ${d.provider.ownerName || "—"}`,
    `License No.: ${d.provider.licenseNo || "—"}`,
    `Type: ${t.en}`,
    `Address: ${d.provider.address || "—"}`,
    `Issued: ${formatDate(d.issuedAt)}`,
    `Valid until: ${formatDate(expiry)}`,
    `Issued by: ${d.issuedByName || "System Administrator"}`,
    `Verify: https://guesthousewithpolicemodule-ghjo-five.vercel.app/verify?q=${d.certNumber}`,
  ].join("\n");

  return [om, am, en].join("\n\n");
}

// Render the QR code and embed it into the PDF at (x, y) with given size.
// Returns void — drawing happens directly on the doc.
async function drawQrCode(
  doc: PDFKit.PDFDocument,
  payload: string,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  // Generate QR as PNG buffer. Use high error correction so the QR stays
  // scannable even if printed at low DPI or partially obscured.
  const pngBuffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: Math.floor(size * 2), // 2× for crisp rendering when scaled down
    color: {
      dark: "#0d1b3d", // navy — matches the cert's primary color
      light: "#ffffff00", // transparent background (we draw our own frame)
    },
  });
  doc.image(pngBuffer, x, y, { width: size, height: size });
}
