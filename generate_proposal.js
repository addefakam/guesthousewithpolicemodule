const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, TabStopType, TabStopPosition, TableOfContents,
  SectionType, LevelFormat, TableLayoutType,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════════════
// PALETTE: Dawn Mist Tech (Cool + Light + Active)
// ═══════════════════════════════════════════════════════════════════
const P = {
  primary: "#0A1628",
  body: "#1A2B40",
  secondary: "#6878A0",
  accent: "#5B8DB8",
  surface: "#F4F8FC",
};

// Cover palette extensions for R4
const PC = {
  bg: P.primary,
  titleColor: "FFFFFF",
  subtitleColor: "B0C8E0",
  metaColor: P.body,
  accentLine: P.accent,
};

// ═══════════════════════════════════════════════════════════════════
// BORDERS
// ═══════════════════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: "D0D8E4" };
const tableBorders = {
  top: thinBorder, bottom: thinBorder,
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E4EAF0" },
  insideVertical: { style: BorderStyle.NONE },
};

// ═══════════════════════════════════════════════════════════════════
// IMAGE LOADER (preserves aspect ratio)
// ═══════════════════════════════════════════════════════════════════
const ASSET_DIR = "/home/z/my-project/download/proposal_assets";
function loadImg(filename, displayWidth = 432) {
  const buf = fs.readFileSync(`${ASSET_DIR}/${filename}`);
  // Read PNG dimensions from header
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const displayHeight = Math.round(displayWidth * (h / w));
  return { data: buf, transformation: { width: displayWidth, height: displayHeight }, type: "png" };
}

const img01 = loadImg("01_system_architecture.png", 460);
const img02 = loadImg("02_old_vs_new.png", 460);
const img03 = loadImg("03_data_flow.png", 460);
const img04 = loadImg("04_security_model.png", 460);
const img05 = loadImg("05_implementation_phases.png", 460);
const img06 = loadImg("06_impact_metrics.png", 460);
const img07 = loadImg("07_admin_structure.png", 460);

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const BODY = 24; // 12pt
const H1_SIZE = 32; // 16pt
const H2_SIZE = 28; // 14pt
const H3_SIZE = 24; // 12pt
const LINE = 312; // 1.3x

function bodyPara(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 160, line: LINE },
    ...opts,
    children: [new TextRun({ text, size: BODY, font: { ascii: "Calibri" }, color: P.body })],
  });
}

function bodyParaBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 160, line: LINE },
    children: [
      new TextRun({ text: label, size: BODY, font: { ascii: "Calibri" }, color: P.body, bold: true }),
      new TextRun({ text, size: BODY, font: { ascii: "Calibri" }, color: P.body }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200, line: LINE },
    children: [new TextRun({ text, size: H1_SIZE, bold: true, font: { ascii: "Calibri" }, color: P.primary })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160, line: LINE },
    children: [new TextRun({ text, size: H2_SIZE, bold: true, font: { ascii: "Calibri" }, color: P.primary })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120, line: LINE },
    children: [new TextRun({ text, size: H3_SIZE, bold: true, font: { ascii: "Calibri" }, color: P.body })],
  });
}

function imgParagraph(imgObj, caption = "") {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [new ImageRun(imgObj)],
    }),
  ];
  if (caption) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: caption, size: 20, font: { ascii: "Calibri" }, color: P.secondary, italics: true })],
    }));
  }
  return children;
}

function emptyPara() {
  return new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "", size: 2 })] });
}

function makeTable(headers, rows) {
  const headerCells = headers.map((h, i) => new TableCell({
    width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.primary },
    borders: tableBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: h, size: 22, bold: true, font: { ascii: "Calibri" }, color: "FFFFFF" })],
    })],
  }));

  const dataRows = rows.map((row, ri) => new TableRow({
    cantSplit: true,
    children: row.map((cell, ci) => new TableCell({
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? "FFFFFF" : P.surface },
      borders: tableBorders,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
        children: [new TextRun({ text: cell, size: 21, font: { ascii: "Calibri" }, color: P.body })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }),
      ...dataRows,
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════
// TITLE LAYOUT (English adaptation of calcTitleLayout)
// ═══════════════════════════════════════════════════════════════════
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // For English: char width ≈ pt * 11 twips (average, mixed case)
  const charWidth = (pt) => pt * 11;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));

  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([" ", "-", "/", ":", ",", "(", ")", "of", "and", "with", "for", "the"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    // Search backward from charsPerLine to 60% for a space/break point
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && remaining[i - 1] === " ") {
        breakAt = i;
        break;
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  // Prevent single-word orphan on last line
  if (lines.length > 1 && lines[lines.length - 1].split(" ").length <= 2 && lines[lines.length - 1].length < 20) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════════
// COVER R4: Top Color Block
// ═══════════════════════════════════════════════════════════════════
function buildCoverR4() {
  const title = "Bishoftu Guest House Management System (GHMS) with Police Module Integration";
  const subtitle = "A Comprehensive Business Proposal for Digital Transformation of Guest House Administration and Public Safety";
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;

  const { titlePt, titleLines } = calcTitleLayout(title, availableWidth, 34, 22);
  const titleSize = titlePt * 2;

  const UPPER_MIN = 7500;
  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const subtitleH = (11 * 23 + 200);
  const englishLabelH = (9 * 23 + 500);
  const upperContentH = englishLabelH + titleBlockHeight + subtitleH;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);
  const DIVIDER_H = 60;

  const contentEstimate = englishLabelH + titleLines.length * (titlePt * 23 + 200) + subtitleH;
  const spacerIntrinsic = 280;
  const topSpacing = Math.max(UPPER_H - contentEstimate - spacerIntrinsic - 800, 400);

  // Upper dark block
  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: PC.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          new Paragraph({
            spacing: { after: 500, line: Math.ceil(9 * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: "B U S I N E S S   P R O P O S A L",
              size: 18, color: PC.accentLine, font: { ascii: "Calibri" }, characterSpacing: 60 })],
          }),
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200,
              line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: line, size: titleSize, bold: true,
              color: PC.titleColor, font: { ascii: "Calibri" } })],
          })),
          new Paragraph({
            spacing: { after: 100, line: Math.ceil(11 * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: subtitle, size: 24, color: PC.subtitleColor,
              font: { ascii: "Calibri" } })],
          }),
        ],
      })],
    })],
  });

  // Accent divider
  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: DIVIDER_H, rule: "exact" },
      children: [new TableCell({ borders: noBorders,
        shading: { type: ShadingType.CLEAR, fill: PC.accentLine },
        children: [emptyPara()] })],
    })],
  });

  // Lower white area
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    new Paragraph({ indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: "Prepared for: 【Organization Name】", size: 28, color: PC.metaColor, font: { ascii: "Calibri" } })],
    }),
    new Paragraph({ indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: "Prepared by: 【Submitting Organization】", size: 28, color: PC.metaColor, font: { ascii: "Calibri" } })],
    }),
    new Paragraph({ indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: `Date: ${dateStr}`, size: 28, color: PC.metaColor, font: { ascii: "Calibri" } })],
    }),
    new Paragraph({ indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: "Reference: 【Document Reference Number】", size: 28, color: PC.metaColor, font: { ascii: "Calibri" } })],
    }),
    new Paragraph({ spacing: { before: 2000 } }),
    // Confidential tag
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: "CONFIDENTIAL", size: 24, bold: true, color: "C04040", font: { ascii: "Calibri" }, characterSpacing: 40 }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════════════════
// SECTION CONTENT BUILDERS
// ═══════════════════════════════════════════════════════════════════

function buildExecSummary() {
  return [
    h1("Executive Summary"),
    bodyPara("The Bishoftu Guest House Management System (GHMS) with Police Module Integration represents a transformative initiative designed to modernize guest house administration across Bishoftu City while simultaneously strengthening public safety through seamless law enforcement integration. This proposal outlines a comprehensive, cloud-native digital platform that will replace the current paper-based registration and management processes with an efficient, real-time, and transparent system accessible to all stakeholders."),
    bodyPara("Bishoftu, a rapidly growing city in the Oromia Special Zone, has experienced significant growth in its hospitality sector, with dozens of guest houses operating across its three sub-cities: Cheleleka, Dibayyu, and Dukem. The current manual registration and record-keeping methods are inherently slow, error-prone, and disconnected from the law enforcement apparatus that is essential for maintaining public safety. Guests register on paper ledgers that cannot be searched, shared, or analyzed in real time, creating critical blind spots for police monitoring and suspect identification."),
    bodyPara("The GHMS platform addresses these challenges through a multi-faceted approach. For guest house operators, the system provides digital registration, room management, subscription tracking, and revenue reporting capabilities. For the Bishoftu City Administration, it delivers city-wide visibility into guest house operations, licensing compliance, and revenue collection. Most critically, for the Bishoftu Police Commission, the integrated Police Module enables real-time guest monitoring, suspect matching against watchlists, intelligence gathering, and rapid emergency response capabilities."),
    bodyPara("Built on modern technology stack including Next.js 16, PostgreSQL, and cloud infrastructure, the GHMS is designed for scalability, security, and ease of use. The system features a responsive web dashboard for administrators and operators, alongside a Progressive Web App (PWA) for public guest self-registration. With a phased implementation plan spanning approximately twelve months, this project will position Bishoftu as a leader in digital governance and smart city innovation within the Oromia region."),
  ];
}

function buildBackground() {
  return [
    h1("Background and Problem Statement"),
    h2("Overview of Bishoftu City"),
    bodyPara("Bishoftu City, located in the Oromia Special Zone Surrounding Finfinnee, is one of the fastest-growing urban centers in Ethiopia. The city is administratively divided into three sub-cities: Cheleleka, Dibayyu, and Dukem, each further subdivided into multiple woredas that serve as the primary units of local governance. Bishoftu's strategic location along the major corridor connecting Addis Ababa to the eastern and southern regions of the country has fueled rapid urbanization, commercial development, and a growing demand for hospitality services."),
    bodyPara("The hospitality sector in Bishoftu has expanded significantly in recent years, with numerous guest houses, hotels, and lodging facilities operating across all three sub-cities. These establishments serve a diverse clientele, including business travelers, government officials, tourists visiting nearby Lake Bishoftu and other attractions, and transient workers. The growth in guest house operations has, however, outpaced the administrative infrastructure needed to regulate, monitor, and manage this sector effectively."),
    h2("The Guest House Industry Challenge"),
    bodyPara("Currently, guest house operations in Bishoftu rely almost entirely on manual, paper-based processes for guest registration, room allocation, record-keeping, and regulatory compliance. Each guest house maintains its own handwritten registration ledger, with no standardized format or centralized data collection mechanism. This fragmented approach creates significant operational inefficiencies for guest house owners, regulatory gaps for the city administration, and critical security vulnerabilities for law enforcement agencies."),
    bodyPara("The absence of a digital system means that police authorities must physically visit each guest house to review registration records, a process that is time-consuming, resource-intensive, and inherently delayed. By the time police obtain information about a guest's stay, that guest may have already checked out and departed the city. This gap in real-time visibility poses a genuine threat to public safety and undermines the city's ability to respond to security incidents, track persons of interest, or prevent criminal activities."),
    ...imgParagraph(img02, "Figure 1: Old Manual System vs. New Digital GHMS Comparison"),
  ];
}

function buildOldSystemDrawbacks() {
  return [
    h1("Old System Drawbacks"),
    bodyPara("The existing manual system for guest house management in Bishoftu suffers from a comprehensive set of interconnected failures that affect every stakeholder in the ecosystem. Understanding these drawbacks in detail is essential for appreciating the magnitude of improvement that the GHMS platform will deliver. The following analysis examines each major failure point and its cascading consequences for administration, public safety, and economic governance."),
    h2("Paper-Based Registration and Record-Keeping"),
    bodyPara("Guest registration in the current system is conducted using handwritten entries in bound ledgers maintained at each individual guest house. This process is inherently slow, prone to errors such as illegible handwriting and incomplete entries, and entirely dependent on the diligence of the guest house staff on duty. There are no validation checks to ensure that required fields such as full name, identification number, nationality, purpose of visit, and duration of stay are accurately captured. Over time, these physical ledgers deteriorate, pages are lost or damaged, and the accumulated records become increasingly difficult to search or reference."),
    h2("No Real-Time Tracking or Visibility"),
    bodyPara("Because each guest house operates as an isolated data silo with no digital connectivity, there is no mechanism for real-time tracking of guest movements, occupancy levels, or registration patterns across the city. The city administration has no centralized dashboard or reporting tool to monitor how many guests are currently staying in Bishoftu, which establishments are operating at capacity, or whether any guest houses are operating without valid licenses. This lack of visibility makes evidence-based policy decisions, resource allocation, and strategic planning virtually impossible."),
    h2("Delayed Police Communication"),
    bodyPara("The most critical failure of the current system from a public safety perspective is the complete absence of real-time communication between guest houses and law enforcement. Police officers must conduct physical visits to each establishment to review registration records, a process that can take days or weeks to cover all guest houses in the city. This delay means that suspects, fugitives, or persons of interest can check into a guest house, stay for several days, and depart before police are even aware of their presence. In emergency situations, there is no rapid alert mechanism to notify police of suspicious activities or specific guest registrations that match known watchlists."),
    h2("No License Verification or Compliance Monitoring"),
    bodyPara("The city administration currently lacks a systematic mechanism for verifying whether guest houses are operating with valid, current licenses. License renewal tracking is handled through separate manual processes that are not integrated with guest house operations data. This gap allows some establishments to continue operating with expired or revoked licenses, creating unfair competition for compliant businesses and potential safety risks for guests who stay in unregulated facilities. The absence of a compliance monitoring system also means that the city cannot proactively identify establishments that fail to meet health, safety, or operational standards."),
    h2("No Revenue Transparency or Reporting"),
    bodyPara("Without a centralized digital system, the city administration has limited visibility into the actual revenue generated by the guest house sector. Tax collection and fee assessment rely on self-reported figures from individual operators, which are inherently unreliable and susceptible to underreporting. The lack of automated revenue reporting means that the city cannot accurately forecast revenue, identify collection gaps, or ensure that all operators are contributing their fair share to the local economy. This transparency deficit undermines fiscal governance and deprives the city of resources that could be reinvested in public services and infrastructure."),
  ];
}

function buildProposedSolution() {
  return [
    h1("Proposed Solution: GHMS with Police Module"),
    bodyPara("The Guest House Management System (GHMS) is a comprehensive, cloud-native digital platform designed to address every deficiency identified in the current manual system. The GHMS provides an integrated solution that serves four distinct stakeholder groups: guest house operators, city administrators, police authorities, and the general public. By unifying these stakeholders on a single platform, the GHMS eliminates information silos, enables real-time data sharing, and creates a foundation for data-driven governance and public safety."),
    h2("Digital Guest Registration"),
    bodyPara("The GHMS replaces handwritten ledgers with a streamlined digital registration process that captures all required guest information through an intuitive, mobile-responsive interface. Operators can register new guests in under two minutes, with built-in validation ensuring that all mandatory fields are completed accurately. The system supports document capture for identification verification and automatically timestamps each registration entry. Guest records are immediately stored in the centralized database, making them searchable and accessible to authorized personnel across the system."),
    h2("Room and Occupancy Management"),
    bodyPara("Operators gain access to a comprehensive room management dashboard that displays real-time availability, room status (available, occupied, maintenance, reserved), and occupancy rates. The system supports room type categorization, pricing configuration, and automatic check-out processing. Historical occupancy data is retained for analytics and reporting, enabling operators to identify peak demand periods, optimize pricing strategies, and plan maintenance schedules during low-occupancy periods."),
    h2("Real-Time Tracking and City-Wide Dashboard"),
    bodyPara("The city administration receives a powerful dashboard that aggregates data from all registered guest houses across Bishoftu's three sub-cities. This dashboard provides real-time visibility into total occupancy levels, registration trends, license compliance status, and revenue collection figures. Administrators can drill down from city-wide overviews to individual sub-city or woreda-level data, enabling targeted oversight and resource allocation. Automated alerts notify administrators of potential compliance issues, unusual registration patterns, or system anomalies that require attention."),
    h2("Police Module for Public Safety"),
    bodyPara("The integrated Police Module is the cornerstone feature that distinguishes the GHMS from conventional property management systems. This module provides the Bishoftu Police Commission with real-time access to guest registration data, automated suspect matching against internal watchlists, and intelligence gathering tools. Police officers can search for specific individuals across all guest houses simultaneously, set up automated alerts for persons of interest, and access comprehensive guest movement histories. The module supports emergency response coordination, allowing police to identify the exact location and room number of any registered guest within seconds."),
    h2("Subscription and License Management"),
    bodyPara("The GHMS includes a complete subscription and license management subsystem that streamlines the regulatory relationship between guest house operators and the city administration. Operators can apply for new licenses, submit renewal applications, and track application status through the platform. The administration can set subscription tiers, configure fee structures, automate invoice generation, and track payment history. Automated notifications alert operators of upcoming license expirations, reducing the incidence of lapsed licenses and improving overall compliance rates across the city."),
    ...imgParagraph(img01, "Figure 2: GHMS System Architecture Overview"),
  ];
}

function buildTechDesign() {
  return [
    h1("System Architecture and Technical Design"),
    h2("Technology Stack"),
    bodyPara("The GHMS is built on a modern, enterprise-grade technology stack selected for its reliability, scalability, security, and developer ecosystem. The frontend is developed using Next.js 16 with the App Router architecture, providing server-side rendering, optimized performance, and a progressive web app (PWA) experience for mobile users. The application uses TypeScript throughout, ensuring type safety and reducing runtime errors. The user interface is built with Tailwind CSS 4 and the shadcn/ui component library, delivering a professional, responsive design that works seamlessly across desktops, tablets, and smartphones."),
    bodyPara("The backend leverages the same Next.js framework with API routes, supported by Prisma ORM for type-safe database interactions. PostgreSQL serves as the primary database, chosen for its robustness, support for complex queries, and proven performance at scale. Authentication and role-based access control are implemented using NextAuth.js v4, providing secure session management and multi-factor authentication capabilities. Real-time communication features, including live guest registration updates and police alert notifications, are powered by WebSocket connections through Socket.io."),
    bodyPara("The entire platform is deployed on Vercel Cloud, which provides automatic scaling, global content delivery, and enterprise-grade security infrastructure. This deployment model ensures that the system remains available and responsive even during peak usage periods, with automatic failover and disaster recovery capabilities. The cloud architecture also simplifies maintenance and updates, as new features and security patches can be deployed without downtime or disruption to ongoing operations."),

    makeTable(
      ["Component", "Technology", "Purpose"],
      [
        ["Frontend Framework", "Next.js 16 (App Router)", "Server-side rendering, routing, API layer"],
        ["Language", "TypeScript 5", "Type safety, developer productivity"],
        ["UI Library", "Tailwind CSS 4 + shadcn/ui", "Responsive, accessible interface"],
        ["Database", "PostgreSQL", "Relational data storage, complex queries"],
        ["ORM", "Prisma", "Type-safe database interactions"],
        ["Authentication", "NextAuth.js v4", "Session management, RBAC"],
        ["Real-Time", "Socket.io", "Live updates, notifications"],
        ["Deployment", "Vercel Cloud", "Auto-scaling, CDN, CI/CD"],
        ["Mobile App", "PWA (Progressive Web App)", "Guest self-registration, offline support"],
      ]
    ),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Table 1: GHMS Technology Stack Overview", size: 20, italics: true, font: { ascii: "Calibri" }, color: P.secondary, alignment: AlignmentType.CENTER })] }),

    h2("Multi-User Role System"),
    bodyPara("The GHMS implements a sophisticated role-based access control (RBAC) system that defines precise permissions and capabilities for each user type. This design ensures that sensitive data is accessible only to authorized personnel while providing each stakeholder group with the tools and information they need to perform their roles effectively. The system supports four primary roles, each with a tailored interface and permission set."),
    bodyParaBold("Superuser: ", "The Superuser role is reserved for the highest-level system administrators who have unrestricted access to all system features, data, and configuration settings. Superusers can manage user accounts, configure system parameters, define sub-city and woreda boundaries, set subscription pricing, and access all reporting and analytics features. This role is typically assigned to senior officials within the Bishoftu City Administration who are responsible for overall system governance."),
    bodyParaBold("Police: ", "The Police role provides access to the specialized Police Module, including real-time guest monitoring, suspect matching, watchlist management, intelligence gathering, and emergency response tools. Police users can search for individuals across all guest houses, view registration histories, set up automated alerts for persons of interest, and coordinate with other police users through the system's internal communication features. Police users cannot access subscription management or revenue data."),
    bodyParaBold("Operator: ", "The Operator role is designed for guest house owners and managers who are responsible for day-to-day operations at their establishments. Operators can register and check out guests, manage room availability, view occupancy reports for their own property, and handle subscription payments. Each operator's access is restricted to their own registered establishment, ensuring data isolation between competing businesses."),
    bodyParaBold("Staff: ", "The Staff role is a limited-access version of the Operator role, intended for front-desk employees and junior staff members. Staff users can perform guest registration and check-out, view room status, and access basic reporting for their assigned establishment. Staff users cannot modify subscription details, access financial reports, or change system configuration settings."),

    h2("Public Guest PWA Mobile App"),
    bodyPara("In addition to the web-based dashboards for administrators and operators, the GHMS includes a Progressive Web App (PWA) designed for the general public. This mobile-optimized application allows guests to complete pre-registration before arriving at a guest house, reducing check-in time and improving the accuracy of registration data. The PWA works offline, automatically synchronizing data when connectivity is restored, and can be installed on any smartphone without requiring app store downloads."),
    bodyPara("The guest PWA captures identification information, travel details, and purpose of visit through a streamlined, multilingual interface. Upon arrival at the guest house, the pre-registered guest simply presents a QR code that the operator scans to complete the check-in process instantly. This approach reduces the burden on front-desk staff, minimizes transcription errors, and ensures that guest data is captured in a standardized format across all establishments."),

    ...imgParagraph(img03, "Figure 3: GHMS Data Flow Architecture"),
    ...imgParagraph(img04, "Figure 4: GHMS Security and Access Control Model"),
  ];
}

function buildPoliceModule() {
  return [
    h1("Police Module and Public Safety Integration"),
    bodyPara("The Police Module is the defining feature of the GHMS and represents the most compelling value proposition for decision-makers concerned with public safety and law enforcement. Unlike conventional property management systems that focus solely on commercial operations, the GHMS places public safety at the core of its architecture by providing law enforcement with real-time, actionable intelligence derived from guest registration data across the entire city. This section provides a detailed examination of each police feature and its operational significance."),
    h2("Real-Time Suspect Matching"),
    bodyPara("The suspect matching engine is the primary public safety feature of the Police Module. When a new guest is registered at any guest house in Bishoftu, the system automatically compares the guest's identifying information (name, identification number, photograph) against a police-maintained watchlist of persons of interest, wanted individuals, and known suspects. This comparison occurs in real time, typically completing within seconds of registration. If a match is detected, the system immediately generates a high-priority alert that is pushed to all active police users via the WebSocket notification system, along with the guest's current location, room number, and the guest house contact information."),
    bodyPara("The watchlist is managed exclusively by authorized police personnel who can add, modify, or remove entries based on ongoing investigations and intelligence updates. The system supports multiple watchlist categories, including wanted persons, missing persons, individuals with outstanding warrants, and persons of interest in active investigations. Each category triggers a different alert priority level, ensuring that police responses are proportionate to the severity of the match."),
    h2("Intelligence Gathering and Analytics"),
    bodyPara("Beyond individual suspect matching, the Police Module provides powerful analytical tools that enable law enforcement to identify broader patterns and trends in guest movement across the city. The analytics dashboard displays registration heatmaps by sub-city and woreda, peak check-in periods, frequently visited establishments by specific individuals, and correlations between guest demographics and geographic areas. These insights support proactive policing strategies, resource deployment decisions, and strategic planning for public safety operations."),
    bodyPara("The intelligence module also maintains a comprehensive movement history for every registered guest, creating a searchable timeline of all stays across Bishoftu guest houses. Police investigators can use this feature to reconstruct the movements of suspects before or after criminal incidents, identify associates through co-registration patterns, and establish behavioral baselines that help distinguish normal activity from suspicious behavior. All intelligence data is protected by strict access controls and audit logging to prevent unauthorized disclosure."),
    h2("Emergency Operations and Rapid Response"),
    bodyPara("The Police Module includes an emergency operations interface designed to support rapid response scenarios. In the event of a security incident, natural disaster, or public safety emergency, police commanders can activate an emergency mode that provides enhanced situational awareness across all guest houses. This mode displays real-time occupancy data for every registered establishment, identifies guest houses in the affected area, and provides direct communication channels to operators for coordinated evacuation or lockdown procedures."),
    bodyPara("The emergency module also supports the creation and distribution of security advisories to all guest house operators simultaneously. Police can issue alerts about specific threats, wanted individuals, or safety instructions that are delivered instantly to every registered establishment in the system. This broadcast capability ensures that critical information reaches all operators within minutes, dramatically reducing the response time compared to the current phone-based notification system."),
    h2("Joint Operations with System Administration"),
    bodyPara("The GHMS facilitates seamless collaboration between the Police Commission and the City Administration through shared dashboards and coordinated workflow tools. When police identify a guest house that is harboring criminal activity or operating in violation of regulations, they can flag the establishment in the system, automatically notifying the administration's licensing department for follow-up action. Similarly, the administration can flag compliance issues for police attention, creating a closed-loop enforcement mechanism."),
    h2("Comprehensive Audit Logging"),
    bodyPara("Every action performed within the Police Module is recorded in an immutable audit log that captures the user identity, timestamp, action type, and data accessed. This audit trail provides accountability for police use of the system, supports internal affairs investigations if needed, and ensures compliance with legal requirements for data access and privacy protection. The audit log is maintained separately from operational data, with access restricted to senior police leadership and system superusers, preventing tampering or retrospective modification."),
    h2("Geofencing and Room Monitoring"),
    bodyPara("For high-security scenarios, the Police Module supports geofencing capabilities that can trigger automatic alerts when registered guests enter or exit designated geographic zones. Combined with the room monitoring feature, which provides police with visibility into room allocation and occupancy duration, these tools create a comprehensive surveillance framework that enhances public safety without requiring physical police presence at every establishment. The geofencing feature integrates with the sub-city and woreda administrative boundaries, allowing police to define monitoring zones that align with the city's governance structure."),
  ];
}

function buildAdminStructure() {
  return [
    h1("Administrative Structure Integration"),
    bodyPara("A critical design principle of the GHMS is its deep integration with Bishoftu City's existing administrative hierarchy. Rather than imposing a new organizational structure, the system is designed to mirror and reinforce the city's established governance framework, ensuring that data, permissions, and reporting align with the authority and responsibilities of each administrative level. This section describes how the GHMS maps to Bishoftu's three-tier administrative structure and the benefits this alignment delivers."),
    h2("Three Sub-Cities: Cheleleka, Dibayyu, and Dukem"),
    bodyPara("Bishoftu City is organized into three sub-cities, each with its own administrative leadership and jurisdiction. The GHMS treats sub-cities as primary organizational units within the system, allowing sub-city administrators to view and manage all guest houses within their jurisdiction. Each sub-city has its own dashboard showing occupancy rates, registration volumes, license compliance, and revenue data specific to that area. This granular visibility enables sub-city officials to make informed decisions about local hospitality management without relying on city-wide aggregated reports that may obscure local conditions."),
    h2("Woreda-Level Management"),
    bodyPara("Below the sub-city level, Bishoftu is further divided into nine or more woredas that serve as the primary units of local governance and service delivery. The GHMS supports woreda-level data segmentation, allowing woreda administrators to focus on the guest houses within their specific area of responsibility. This hierarchical data model ensures that each level of administration sees the data most relevant to its decision-making authority, while senior officials at the city level retain the ability to drill down into any sub-city or woreda for detailed analysis."),
    bodyPara("The administrative structure integration also extends to police operations, where police jurisdiction typically aligns with sub-city boundaries. Police users assigned to a specific sub-city see guest registration data from that area by default, with the ability to expand their view to city-wide data when authorized. This jurisdictional alignment reduces information overload for individual officers while ensuring that comprehensive data is available for coordinated city-wide operations when needed."),
    ...imgParagraph(img07, "Figure 5: GHMS Administrative Structure Mapping"),
  ];
}

function buildImplementation() {
  return [
    h1("Implementation Roadmap"),
    bodyPara("The GHMS implementation follows a carefully structured four-phase approach designed to deliver incremental value while managing risk and ensuring stakeholder alignment at each stage. This phased methodology allows the project team to validate core functionality before expanding scope, incorporate feedback from early users, and maintain quality standards throughout the development lifecycle. Each phase builds upon the foundations established in previous phases, creating a cumulative and coherent system that meets the full range of requirements identified in this proposal."),
    h2("Phase 1: Foundation (Months 1-3)"),
    bodyPara("The Foundation phase focuses on establishing the core technical infrastructure and implementing the essential guest house management features. During this phase, the development team will set up the cloud deployment environment on Vercel, configure the PostgreSQL database, implement the authentication and role-based access control system, and build the primary operator dashboard with digital guest registration and room management capabilities. This phase also includes the initial onboarding of pilot guest houses in one sub-city to validate the core workflows and gather early user feedback."),
    h2("Phase 2: Operations (Months 4-6)"),
    bodyPara("The Operations phase expands the system's administrative capabilities, focusing on the city administration dashboard, license management, subscription handling, and revenue reporting features. This phase includes the rollout to all three sub-cities and the migration of existing guest house records from paper ledgers to the digital system. Training programs for operators and administrators will be conducted during this phase, with dedicated support teams ensuring smooth adoption and addressing any operational challenges that arise during the transition."),
    h2("Phase 3: Police Module (Months 7-9)"),
    bodyPara("The Police Module phase represents the most critical and sensitive component of the implementation. This phase involves the development and deployment of the full Police Module, including suspect matching, watchlist management, intelligence analytics, emergency operations, and audit logging. Given the sensitive nature of police data, this phase includes extensive security testing, access control validation, and privacy impact assessment. Police training will be conducted in close collaboration with the Bishoftu Police Commission to ensure that officers are proficient in using all module features and understand the legal and ethical requirements for data access."),
    h2("Phase 4: Public Access (Months 10-12)"),
    bodyPara("The Public Access phase completes the GHMS ecosystem by launching the guest-facing PWA for self-registration, implementing multilingual support, and activating the full suite of automated notifications and reporting features. This phase also includes system-wide performance optimization, load testing, and the establishment of ongoing maintenance and support procedures. A comprehensive handover to the city administration's IT team ensures that the system can be operated, maintained, and extended independently after the initial implementation period concludes."),
    ...imgParagraph(img05, "Figure 6: GHMS Implementation Phases Timeline"),
  ];
}

function buildImpactBenefits() {
  return [
    h1("Expected Impact and Benefits"),
    bodyPara("The GHMS is projected to deliver transformative benefits across four key dimensions: operational efficiency, public safety, revenue transparency, and digital governance. These benefits are interrelated and mutually reinforcing, creating a virtuous cycle where improved operations enhance safety outcomes, which in turn build public confidence and support further digital transformation initiatives. This section quantifies the expected impact across each dimension, providing decision-makers with a clear understanding of the return on investment."),
    h2("Operational Efficiency Gains"),
    bodyPara("The transition from paper-based to digital registration is expected to reduce guest check-in time by approximately seventy percent, from an average of eight minutes per guest to under two minutes. Room management automation will eliminate manual availability tracking, reducing booking errors and overbooking incidents to near zero. License renewal processing, which currently requires multiple physical visits to government offices, will be streamlined to a fully digital workflow that can be completed in minutes from any location. These efficiency gains translate directly into cost savings for guest house operators and reduced administrative burden for the city government."),
    h2("Public Safety Enhancement"),
    bodyPara("The Police Module's real-time suspect matching capability is expected to significantly improve the speed and accuracy of suspect identification. Currently, police identification of persons of interest at guest houses relies on random inspections that may occur days or weeks after a suspect has registered. With the GHMS, identification can occur within seconds of registration, enabling immediate police response. The intelligence analytics features are projected to increase the detection of suspicious movement patterns by enabling police to analyze city-wide guest data that was previously inaccessible. Emergency response coordination is expected to improve dramatically through the broadcast alert system and real-time occupancy visibility."),
    h2("Revenue Transparency and Collection"),
    bodyPara("The GHMS will provide the city administration with accurate, real-time visibility into the guest house sector's revenue contribution. Automated fee calculation, digital payment tracking, and standardized reporting will reduce revenue leakage caused by underreporting or calculation errors. The subscription management system ensures that all operators maintain current licenses, increasing compliance rates and associated fee collection. Based on comparable digital transformation initiatives in similar municipalities, the city can expect a significant increase in guest house-related revenue collection within the first year of full system deployment."),
    h2("Digital Governance Leadership"),
    bodyPara("Beyond the direct operational benefits, the GHMS positions Bishoftu City as a pioneer in digital governance within the Oromia region. The system demonstrates that technology can be leveraged to simultaneously improve service delivery, enhance public safety, and strengthen fiscal governance. The success of this project will create a replicable model that can be adapted for other sectors and municipalities, establishing Bishoftu as a reference case study for smart city innovation in Ethiopia. The data infrastructure created by the GHMS also lays the foundation for future integration with other government systems, including tax administration, immigration services, and national security databases."),
    ...imgParagraph(img06, "Figure 7: GHMS Projected Impact Metrics"),
  ];
}

function buildBudget() {
  return [
    h1("Budget and Resource Requirements"),
    bodyPara("The successful implementation of the GHMS requires a carefully planned investment across four primary cost categories: software development, infrastructure and hosting, training and change management, and ongoing maintenance and support. The following budget framework provides estimated costs for each category, based on current market rates for the required technology stack and personnel. These estimates are intended to provide a realistic planning baseline and may be refined during detailed project scoping and procurement processes."),
    makeTable(
      ["Category", "Description", "Estimated Cost (ETB)"],
      [
        ["Software Development", "Full-stack development, UI/UX design, QA testing", "3,500,000 - 4,500,000"],
        ["Infrastructure (Year 1)", "Vercel Cloud hosting, PostgreSQL, CDN, domain", "180,000 - 250,000"],
        ["Police Module", "Specialized security development, integration testing", "800,000 - 1,200,000"],
        ["Training Programs", "Operator, admin, and police user training", "300,000 - 450,000"],
        ["Data Migration", "Paper ledger digitization and data entry", "150,000 - 250,000"],
        ["Project Management", "Coordination, reporting, stakeholder management", "400,000 - 550,000"],
        ["Maintenance (Year 1)", "Ongoing support, bug fixes, minor enhancements", "350,000 - 500,000"],
        ["Contingency (10%)", "Risk buffer for unforeseen requirements", "568,000 - 770,000"],
        ["Total Estimated Budget", "Complete project lifecycle (12 months)", "6,248,000 - 8,470,000"],
      ]
    ),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Table 2: GHMS Budget Framework (Estimated)", size: 20, italics: true, font: { ascii: "Calibri" }, color: P.secondary, alignment: AlignmentType.CENTER })] }),
    bodyPara("The budget estimates above reflect a comprehensive, production-ready implementation that includes all features described in this proposal. The development costs cover the full technology stack, including the web dashboards, mobile PWA, Police Module, and all supporting infrastructure. Infrastructure costs are based on Vercel Cloud pricing for the expected usage volume, with headroom for growth during the first year of operation. Training costs include materials development, venue rental, trainer fees, and participant travel allowances for multi-session training programs conducted in each sub-city."),
    bodyPara("The annual maintenance and support budget represents the ongoing cost of operating the system after the initial implementation period. This includes server infrastructure, security monitoring, bug fixes, performance optimization, and minor feature enhancements based on user feedback. The maintenance budget is expected to decrease in subsequent years as the system stabilizes and the initial user adoption curve flattens. The project team recommends establishing a dedicated GHMS operations unit within the city administration to manage ongoing system governance and vendor relationships."),
  ];
}

function buildConclusion() {
  return [
    h1("Conclusion and Recommendation"),
    bodyPara("The Bishoftu Guest House Management System with Police Module Integration represents a strategic investment in the city's digital infrastructure that will yield compounding returns across public safety, administrative efficiency, revenue governance, and civic innovation. The current manual system is not merely inefficient; it represents a genuine liability that undermines the city's ability to regulate its growing hospitality sector, protect its residents and visitors, and maximize the economic potential of one of its most dynamic industries."),
    bodyPara("The GHMS addresses every identified deficiency through an integrated, cloud-native platform that serves guest house operators, city administrators, police authorities, and the general public. The phased implementation approach minimizes risk while delivering incremental value at each stage. The technology stack is proven, modern, and scalable, ensuring that the system will remain effective and adaptable as Bishoftu continues to grow and evolve. Most importantly, the Police Module establishes a new paradigm for collaboration between hospitality management and law enforcement, creating a public safety framework that is proactive rather than reactive."),
    bodyPara("We respectfully recommend that the Bishoftu City Administration approve the GHMS project for immediate initiation. The twelve-month implementation timeline is ambitious but achievable, and the phased approach allows for course corrections based on early feedback. The estimated budget of 6.2 to 8.5 million ETB represents a modest investment relative to the substantial, long-term benefits in public safety, operational efficiency, and revenue transparency. By approving this proposal, Bishoftu will position itself at the forefront of digital governance in the Oromia region and set a standard that other cities in Ethiopia will seek to follow."),
    bodyPara("We are prepared to begin detailed project scoping and stakeholder consultations immediately upon approval, and we welcome the opportunity to present this proposal in person to the appropriate decision-making body. Our team is committed to delivering a system that meets the highest standards of quality, security, and usability, and that serves the people of Bishoftu for years to come."),
  ];
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri" }, size: BODY, color: P.body },
        paragraph: { spacing: { line: LINE } },
      },
      heading1: {
        run: { font: { ascii: "Calibri" }, size: H1_SIZE, bold: true, color: P.primary },
        paragraph: { spacing: { before: 480, after: 200, line: LINE } },
      },
      heading2: {
        run: { font: { ascii: "Calibri" }, size: H2_SIZE, bold: true, color: P.primary },
        paragraph: { spacing: { before: 320, after: 160, line: LINE } },
      },
      heading3: {
        run: { font: { ascii: "Calibri" }, size: H3_SIZE, bold: true, color: P.body },
        paragraph: { spacing: { before: 240, after: 120, line: LINE } },
      },
    },
  },
  numbering: {
    config: [],
  },
  sections: [
    // ═══ SECTION 1: COVER (no page number, margin 0) ═══
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCoverR4(),
    },
    // ═══ SECTION 2: TOC (Roman numerals) ═══
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
        titlePage: true,
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "GHMS Business Proposal", size: 18, color: P.secondary, font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary, font: { ascii: "Calibri" } })],
          })],
        }),
      },
      children: [
        new Paragraph({
          spacing: { before: 400, after: 300, line: LINE },
          children: [new TextRun({ text: "Table of Contents", size: 36, bold: true, font: { ascii: "Calibri" }, color: P.primary })],
        }),
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
      ],
    },
    // ═══ SECTION 3: BODY (Arabic numerals, reset to 1) ═══
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "GHMS Business Proposal  |  Confidential", size: 18, color: P.secondary, font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary, font: { ascii: "Calibri" } })],
          })],
        }),
      },
      children: [
        ...buildExecSummary(),
        ...buildBackground(),
        ...buildOldSystemDrawbacks(),
        ...buildProposedSolution(),
        ...buildTechDesign(),
        ...buildPoliceModule(),
        ...buildAdminStructure(),
        ...buildImplementation(),
        ...buildImpactBenefits(),
        ...buildBudget(),
        ...buildConclusion(),
      ],
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════════
const OUTPUT = "/home/z/my-project/download/Bishoftu_GHMS_Business_Proposal.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Generated: " + OUTPUT);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
