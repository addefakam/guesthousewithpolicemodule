const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, AlignmentType, WidthType, BorderStyle,
} = require("docx");
const fs = require("fs");

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const noBordersAll = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

const BODY_FONT = "Times New Roman";
const HEADING_FONT = "Times New Roman";
const BODY_SIZE = 24;
const LINE_SPACING = 360;

function safeText(value, placeholder) {
  if (!value && value !== 0) return placeholder || "【Please fill in】";
  return String(value);
}

function partyInfoBlock(partyLabel, partyName, fields) {
  const headerPara = new Paragraph({
    spacing: { before: 300, after: 160, line: LINE_SPACING },
    children: [new TextRun({ text: `${partyLabel}: ${safeText(partyName, "【Full legal name】")}`, size: 24, font: HEADING_FONT, bold: true, color: "000000" })],
  });
  const infoTable = new Table({
    width: { size: 90, type: WidthType.PERCENTAGE },
    borders: noBordersAll,
    rows: fields.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 40, bottom: 40, left: 420, right: 60 },
            children: [new Paragraph({ spacing: { line: LINE_SPACING }, children: [new TextRun({ text: `${label}:`, size: 24, font: BODY_FONT, color: "000000" })] })] }),
          new TableCell({ borders: noBorders, margins: { top: 40, bottom: 40, left: 60, right: 120 },
            children: [new Paragraph({ spacing: { line: LINE_SPACING }, children: [new TextRun({ text: safeText(value), size: 24, font: BODY_FONT, color: "000000" })] })] }),
        ],
      })
    ),
  });
  return [headerPara, infoTable];
}

function bodyPara(text) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 480 }, spacing: { after: 80, line: LINE_SPACING },
    children: [new TextRun({ text, size: BODY_SIZE, font: BODY_FONT, color: "000000" })] });
}

function subClause(text, indent = 720) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { left: indent, hanging: 360 }, spacing: { after: 60, line: LINE_SPACING },
    children: [new TextRun({ text, size: BODY_SIZE, font: BODY_FONT, color: "000000" })] });
}

function subSubClause(text) { return subClause(text, 1080); }

function articleHeading(text) {
  return new Paragraph({ spacing: { before: 300, after: 160, line: LINE_SPACING },
    children: [new TextRun({ text, size: 24, font: HEADING_FONT, bold: true, color: "000000" })] });
}

function buildSignatureBlock(partyA, partyB) {
  const fields = ["Party (Seal)", "Legal Rep / Authorized Rep (Signature)", "Contact Person", "Contact Info", "Signing Location", "Date"];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBordersAll,
    rows: fields.map((label, i) => {
      const isDate = i === fields.length - 1;
      const aVal = isDate ? "【____/____/____】" : safeText(partyA?.[i]);
      const bVal = isDate ? "【____/____/____】" : safeText(partyB?.[i]);
      const displayA = i === 0 ? `Party A: ${aVal}` : `${label}: ${aVal}`;
      const displayB = i === 0 ? `Party B: ${bVal}` : `${label}: ${bVal}`;
      return new TableRow({
        children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 60 },
            children: [new Paragraph({ spacing: { line: LINE_SPACING }, children: [new TextRun({ text: displayA, size: 24, color: "000000", font: BODY_FONT })] })] }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 80, bottom: 80, left: 60, right: 120 },
            children: [new Paragraph({ spacing: { line: LINE_SPACING }, children: [new TextRun({ text: displayB, size: 24, color: "000000", font: BODY_FONT })] })] }),
        ],
      });
    }),
  });
}

const children = [];

// Title
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200, line: Math.ceil(22 * 23), lineRule: "atLeast" },
  children: [new TextRun({ text: "Police-Platform Partnership Agreement for Guest House Monitoring and Regulation", size: 44, bold: true, color: "000000", font: HEADING_FONT })] }));

// Contract number
children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 120, line: LINE_SPACING },
  children: [new TextRun({ text: "Contract No.: 【Please fill in】", size: 21, font: BODY_FONT, color: "000000" })] }));
children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 60, line: LINE_SPACING },
  children: [new TextRun({ text: "Date: 【____/____/____】", size: 21, font: BODY_FONT, color: "000000" })] }));
children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 200, line: LINE_SPACING },
  children: [new TextRun({ text: "Location: 【Please fill in: City, Country】", size: 21, font: BODY_FONT, color: "000000" })] }));

// Parties
children.push(...partyInfoBlock("Party A (Law Enforcement Authority)", "【Police Department / Law Enforcement Agency Full Name】", [
  ["Address", "【Please fill in: Full address】"],
  ["Head of Department", "【Please fill in】"],
  ["Contact Phone", "【Please fill in】"],
  ["Contact Email", "【Please fill in】"],
]));

children.push(...partyInfoBlock("Party B (Platform Operator)", "【Platform Operator Full Legal Name】", [
  ["Address", "【Please fill in: Full address】"],
  ["Legal Representative", "【Please fill in】"],
  ["Business Registration No.", "【Please fill in】"],
  ["Contact Phone", "【Please fill in】"],
  ["Contact Email", "【Please fill in】"],
]));

// Recitals
children.push(new Paragraph({ spacing: { before: 300, after: 120, line: LINE_SPACING }, children: [] }));
children.push(bodyPara("WHEREAS, Party A is the law enforcement authority responsible for maintaining public safety, enforcing guest house licensing regulations, monitoring criminal activities, and ensuring the security and well-being of guests and the general public within its jurisdiction;"));
children.push(bodyPara("WHEREAS, Party B operates a digital Guest House Management System (hereinafter referred to as the \"Platform\") that provides guest house registration, reservation management, guest tracking, identity verification, and regulatory compliance monitoring services to guest house operators within Party A\'s jurisdiction;"));
children.push(bodyPara("WHEREAS, both parties recognize that effective monitoring and regulation of guest houses requires close cooperation between law enforcement and technology service providers, and that the Platform\'s digital capabilities can significantly enhance Party A\'s ability to detect, prevent, and investigate criminal activities;"));
children.push(bodyPara("WHEREAS, the parties desire to establish a formal framework for cooperation, data sharing, and mutual support in the interest of public safety and regulatory compliance;"));
children.push(bodyPara("NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:"));

// Article 1
children.push(articleHeading("Article 1  Definitions and Interpretation"));
children.push(subClause("1.1  \"Platform\" means the digital Guest House Management System operated by Party B, including all web applications, databases, APIs, analytical tools, and support services used by guest house providers for daily operations management."));
children.push(subClause("1.2  \"Provider\" means any guest house, hotel, lodge, homestay, resort, or similar hospitality business registered on the Platform and operating within Party A\'s jurisdiction."));
children.push(subClause("1.3  \"Guest Data\" means all information collected through the Platform relating to guests, including personal identification details, check-in and check-out records, reservation history, room assignments, and associated metadata."));
children.push(subClause("1.4  \"Intelligence Features\" means the Platform\'s analytical capabilities provided to Party A, including suspect watchlist matching, identity linking across providers, frequent-stay anomaly detection, guest movement tracking, and hotspot mapping."));
children.push(subClause("1.5  \"Alert System\" means the automated notification mechanism through which the Platform informs Party A of suspect matches, suspicious activity patterns, and other security-relevant events based on configurable alert rules."));
children.push(subClause("1.6  \"Authorized Officers\" means police personnel who have been granted access credentials to the Platform\'s law enforcement interface, categorized by rank as ADMIN, DETECTIVE, OFFICER, or VIEWER."));
children.push(subClause("1.7  \"Audit Trail\" means the comprehensive log of all actions performed on the Platform by any user, including login events, data views, data exports, report generation, and configuration changes, recorded with timestamp, user identity, IP address, and user agent."));

// Article 2
children.push(articleHeading("Article 2  Purpose and Scope of Cooperation"));
children.push(subClause("2.1  The purpose of this Agreement is to establish a formal framework for cooperation between Party A and Party B in the following areas: (a) digital monitoring of guest house operations for regulatory compliance; (b) real-time intelligence sharing for law enforcement purposes; (c) automated suspect identification and alerting; (d) cross-provider guest movement tracking; and (e) data-driven reporting and analytics to support public safety decision-making."));
children.push(subClause("2.2  Party B shall provide Party A with access to the Platform\'s law enforcement interface, which includes a centralized dashboard displaying aggregate statistics across all registered providers, intelligence analysis tools, configurable alert systems, reporting capabilities, and data export functions."));
children.push(subClause("2.3  This Agreement applies to all guest house providers registered on the Platform and operating within the geographic jurisdiction of Party A. The specific jurisdictional boundaries shall be defined by Party A and communicated to Party B in writing."));

// Article 3
children.push(articleHeading("Article 3  Party A Rights and Obligations"));
children.push(subClause("3.1  Party A shall designate Authorized Officers to access the Platform\'s law enforcement interface. Party A shall maintain a current list of designated officers, including their names, ranks, and assigned access levels, and shall notify Party B within five (5) business days of any changes to the list."));
children.push(subClause("3.2  Party A shall have the right to: (a) view guest registration data across all providers in real-time; (b) search for specific guests by name, phone number, or identification number across all providers; (c) access intelligence reports including suspect matches, identity linkages, frequent-stay alerts, and movement histories; (d) configure alert rules and notification preferences for suspect matching and anomaly detection; (e) generate and export reports on guest registration, occupancy, revenue, compliance, suspicious activity, and guest movement patterns; and (f) approve, reject, suspend, or reactivate provider registrations."));
children.push(subClause("3.3  Party A shall maintain a suspect watchlist by registering suspected persons with identifying information including name, phone number, identification number, photograph, severity level, associated case number, and wanted date. The Platform shall automatically compare all new guest check-ins, reservations, and daytime bookings against this watchlist."));
children.push(subClause("3.4  Party A shall ensure that all Authorized Officers use the Platform in accordance with applicable laws and regulations, and that access credentials are not shared with unauthorized persons. Party A shall be solely responsible for any actions taken by its officers on the Platform."));
children.push(subClause("3.5  Party A shall notify Party B within twenty-four (24) hours if any information accessed through the Platform is used in connection with a formal investigation, arrest, or legal proceeding, to the extent permitted by applicable law."));

// Article 4
children.push(articleHeading("Article 4  Party B Rights and Obligations"));
children.push(subClause("4.1  Party B shall maintain the Platform in good working order and ensure a minimum availability of ninety-five percent (95%) during each calendar month, excluding scheduled maintenance for which Party B shall provide at least twenty-four (24) hours of advance notice to Party A."));
children.push(subClause("4.2  Party B shall implement and maintain industry-standard security measures to protect the data stored on and transmitted through the Platform, including encryption of sensitive data at rest and in transit, role-based access control, multi-factor authentication for administrative access, and regular security audits."));
children.push(subClause("4.3  Party B shall ensure that the Intelligence Features operate accurately and in real-time, specifically: (a) suspect watchlist matching shall be performed automatically upon every new guest check-in, reservation, or daytime booking; (b) identity linking analysis shall detect guests registered at multiple providers using the same phone number or identification number; (c) frequent-stay anomaly detection shall identify guests staying at three (3) or more different establishments and calculate risk levels based on average days between stays; and (d) guest movement tracking shall provide a complete reservation history across all providers for any searched guest."));
children.push(subClause("4.4  Party B shall maintain a comprehensive Audit Trail of all Platform activity and shall make audit logs available to Party A upon request. Audit logs shall be retained for a minimum of twelve (12) months."));
children.push(subClause("4.5  Party B shall provide technical support to Party A during normal business hours and shall address critical system failures affecting law enforcement capabilities with priority. Party B shall designate a technical liaison for communication with Party A regarding system issues, feature requests, and security concerns."));
children.push(subClause("4.6  Party B shall not disclose any Guest Data or intelligence outputs to any third party except: (a) as required by a court order, subpoena, or legal process; (b) to comply with a lawful directive from a government authority with jurisdiction; or (c) with the prior written consent of Party A."));

// Article 5
children.push(articleHeading("Article 5  Intelligence Features and Alert System"));
children.push(subClause("5.1  Party B shall provide the following Intelligence Features to Party A through the Platform\'s law enforcement interface:"));
children.push(subSubClause("(1) Suspect Watchlist Management: Party A may register, update, and remove suspected persons. The Platform shall automatically compare all new guest entries against the watchlist and create match records with severity classification (CRITICAL, HIGH, MEDIUM, LOW)."));
children.push(subSubClause("(2) Identity Linking: Cross-provider analysis to detect guests who register at multiple establishments using the same phone number or identification number, presented as linked guest clusters with associated provider information."));
children.push(subSubClause("(3) Frequent-Stay Anomaly Detection: Automated scanning to identify guests staying at three (3) or more different providers, with calculation of average days between stays and automatic risk level assignment. Results shall be stored as Frequent Stay Alert records for review."));
children.push(subSubClause("(4) Guest Movement Tracking: Search capability by guest name, phone number, or identification number to retrieve complete reservation history, room assignments, and suspect match associations across all providers."));
children.push(subSubClause("(5) Hotspot Mapping: Geographic visualization of all registered providers overlaid with suspect match density data, ranked by match frequency to support resource allocation decisions."));
children.push(subSubClause("(6) Occupancy and Crime Correlation Analytics: Six-month rolling comparison of reservation volumes versus suspect match counts, broken down by month, to support trend analysis and predictive policing."));
children.push(subClause("5.2  The Alert System shall operate as follows: (a) CRITICAL severity suspect matches shall trigger immediate notifications; (b) HIGH severity matches shall be subject to a configurable escalation delay, defaulting to sixty (60) minutes, after which notifications are sent if not previously acknowledged; (c) alerts may be delivered via email, SMS, or in-platform notification, as configured by Party A; and (d) smart anomaly detection may be enabled or disabled by Party A administrators."));
children.push(subClause("5.3  Party A shall be responsible for maintaining the accuracy and currency of the suspect watchlist. Party B shall not be liable for failures in suspect matching that result from inaccurate, incomplete, or outdated watchlist data provided by Party A."));

// Article 6
children.push(articleHeading("Article 6  Data Access, Sharing, and Privacy"));
children.push(subClause("6.1  Party A shall have read-only access to Guest Data across all registered providers within its jurisdiction. Party A shall not have the ability to modify, add, or delete guest data through the law enforcement interface, except for managing the suspect watchlist."));
children.push(subClause("6.2  Party A may export Guest Data, reservation records, and suspect match records in JSON or CSV format through the Platform\'s data export function. Exports shall be capped at ten thousand (10,000) records per extraction and shall be logged in the Audit Trail."));
children.push(subClause("6.3  Both parties shall comply with all applicable data protection and privacy laws. Party B shall ensure that the collection and processing of Guest Data through the Platform is conducted in accordance with the consent of the data subjects or as permitted by applicable law. Party A shall use data accessed through the Platform solely for law enforcement and public safety purposes."));
children.push(subClause("6.4  Party A shall not use any data obtained through the Platform for purposes unrelated to law enforcement, public safety, or regulatory compliance. Any unauthorized use of data by Party A\'s officers shall be the sole responsibility of Party A."));
children.push(subClause("6.5  In the event of a data breach affecting Guest Data or intelligence outputs, the discovering party shall notify the other party within twenty-four (24) hours and shall cooperate fully in investigating and remediating the breach."));

// Article 7
children.push(articleHeading("Article 7  Provider Registration Oversight"));
children.push(subClause("7.1  Party B shall forward all new guest house registration applications to Party A for review and approval. No provider shall be activated on the Platform without the prior approval of Party A or a designated officer."));
children.push(subClause("7.2  Party A shall have the authority to: (a) approve new provider registrations; (b) reject applications with a written reason that shall be communicated to the applicant through the Platform; (c) suspend active providers for regulatory violations, safety concerns, or lawful directives, with a requirement to provide a reason and optional message to the provider; and (d) reactivate previously suspended providers upon satisfactory resolution of the suspension grounds."));
children.push(subClause("7.3  Party B shall implement and maintain an audit trail of all provider approval, rejection, suspension, and reactivation actions taken by Party A, including the identity of the officer, the timestamp, and the stated reason."));

// Article 8
children.push(articleHeading("Article 8  Reporting and Analytics"));
children.push(subClause("8.1  Party B shall provide Party A with access to the following standard reports through the Platform: Guest Registration Report (filterable by date range and provider), Occupancy Report (occupancy trends by date and provider), Revenue Report (revenue breakdown across providers), Provider Compliance Report (provider adherence assessment), Suspicious Activity Report (suspect match data filtered by provider), and Guest Movement Report (guest movement patterns across providers and dates)."));
children.push(subClause("8.2  Party B shall provide Party A with a centralized dashboard displaying the following aggregate statistics across all registered providers: total number of providers, total rooms, total guests registered, active reservations, and combined revenue from overnight and daytime services."));
children.push(subClause("8.3  Party A may request custom reports or analytics features, and Party B shall use reasonable efforts to accommodate such requests within a mutually agreed timeline. Custom report development may be subject to separate cost arrangements as agreed in writing by both parties."));

// Article 9
children.push(articleHeading("Article 9  Access Control and Security"));
children.push(subClause("9.1  Access to the Platform\'s law enforcement interface shall be controlled through a role-based access control system with the following hierarchy: ADMIN (full access including alert configuration and officer management), DETECTIVE (intelligence features, reports, data export, frequent-stay scanning), OFFICER (guest search, provider oversight, standard reports), and VIEWER (read-only dashboard access)."));
children.push(subClause("9.2  Party B shall issue unique access credentials to each Authorized Officer designated by Party A. Credentials shall not be shared, transferred, or used by any person other than the designated officer. Party A shall notify Party B immediately upon the departure of any officer from the department so that access credentials may be revoked."));
children.push(subClause("9.3  Party B may store officer photographs for identification purposes within the Platform. Such photographs shall be used solely for access verification and account management."));

// Article 10
children.push(articleHeading("Article 10  Confidentiality"));
children.push(subClause("10.1  Both parties acknowledge that the data, intelligence outputs, and operational details accessible through the Platform are confidential and shall be treated as such. Neither party shall disclose such information to any third party except as expressly permitted under this Agreement or as required by law."));
children.push(subClause("10.2  Party A shall ensure that all Authorized Officers are informed of and bound by confidentiality obligations regarding the data and intelligence accessed through the Platform. Breach of confidentiality by an officer of Party A shall be the sole responsibility of Party A."));
children.push(subClause("10.3  The confidentiality obligations under this Article shall survive the termination or expiration of this Agreement for a period of five (5) years."));

// Article 11
children.push(articleHeading("Article 11  Liability and Indemnification"));
children.push(subClause("11.1  Party B shall not be liable for any actions taken or not taken by Party A based on intelligence outputs, alerts, or data provided through the Platform. Party A acknowledges that the Platform is a tool to assist law enforcement and that all operational and enforcement decisions remain the sole responsibility of Party A."));
children.push(subClause("11.2  Party A shall indemnify and hold harmless Party B from any claims, damages, losses, or liabilities arising from Party A\'s use of data or intelligence accessed through the Platform, including but not limited to claims arising from arrests, investigations, or enforcement actions based on such data."));
children.push(subClause("11.3  Party B shall not be liable for any failure of the Platform that results from: (a) inaccurate or incomplete data entered by providers or Party A; (b) force majeure events as defined in Article 13; (c) Party A\'s failure to maintain accurate watchlist data; or (d) unauthorized access resulting from Party A\'s failure to secure its credentials."));
children.push(subClause("11.4  The total aggregate liability of either party under this Agreement shall not exceed the total fees paid or payable under this Agreement during the twelve (12) month period immediately preceding the event giving rise to the claim."));

// Article 12
children.push(articleHeading("Article 12  Term and Termination"));
children.push(subClause("12.1  This Agreement shall take effect on the date of the last signature and shall remain in force for an initial term of two (2) years. Thereafter, the Agreement shall automatically renew for successive one (1) year periods unless either party provides written notice of non-renewal at least ninety (90) calendar days before the end of the then-current term."));
children.push(subClause("12.2  Either party may terminate this Agreement by providing sixty (60) calendar days\' written notice to the other party. In the event of termination, Party A shall return or destroy all exported data obtained through the Platform, and Party B shall revoke all access credentials within five (5) business days of the termination date."));
children.push(subClause("12.3  Either party may terminate this Agreement immediately upon written notice if the other party materially breaches any provision of this Agreement and fails to cure such breach within thirty (30) calendar days of receiving written notice specifying the breach."));

// Article 13
children.push(articleHeading("Article 13  Force Majeure"));
children.push(subClause("13.1  Neither party shall be liable for any failure or delay in performing its obligations under this Agreement to the extent caused by circumstances beyond reasonable control, including natural disasters, epidemics, pandemics, government actions, war, terrorism, civil unrest, power outages, internet service disruptions, or cyberattacks on critical infrastructure."));
children.push(subClause("13.2  The affected party shall provide written notice within five (5) calendar days of becoming aware of the force majeure event. If the event continues for more than sixty (60) consecutive calendar days, either party may terminate this Agreement upon fifteen (15) calendar days\' written notice."));

// Article 14
children.push(articleHeading("Article 14  Dispute Resolution"));
children.push(subClause("14.1  The parties shall attempt to resolve disputes through good-faith negotiation within thirty (30) calendar days. Unresolved disputes shall be submitted to mediation administered by a mutually agreed-upon mediator, with costs shared equally."));
children.push(subClause("14.2  If mediation fails within sixty (60) calendar days, either party may refer the dispute to the competent courts of 【Please fill in: Jurisdiction】, which shall have exclusive jurisdiction."));

// Article 15
children.push(articleHeading("Article 15  Notices and Amendments"));
children.push(subClause("15.1  All notices shall be in writing and deemed given when delivered personally, sent by registered mail with receipt confirmation, or transmitted by email with read receipt confirmation."));
children.push(subClause("15.2  No amendment to this Agreement shall be valid unless made in writing and signed by authorized representatives of both parties."));

// Article 16
children.push(articleHeading("Article 16  Miscellaneous"));
children.push(subClause("16.1  Entire Agreement: This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements regarding the subject matter hereof."));
children.push(subClause("16.2  Severability: If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force."));
children.push(subClause("16.3  Waiver: Failure to enforce any provision shall not constitute a waiver of the right to enforce it in the future."));
children.push(subClause("16.4  Governing Law: This Agreement shall be governed by the laws of 【Please fill in: Applicable Jurisdiction】."));
children.push(subClause("16.5  Counterparts: This Agreement may be executed in counterparts, each of which shall be deemed an original."));

// Signature block
children.push(new Paragraph({ spacing: { before: 600, after: 200, line: LINE_SPACING }, children: [] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300, line: LINE_SPACING },
  children: [new TextRun({ text: "IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.", size: 24, font: BODY_FONT, color: "000000" })] }));

children.push(buildSignatureBlock(
  ["【Please fill in: Party A full name】", "【Please fill in】", "【Please fill in】", "【Please fill in】", "【Please fill in】", "【____/____/____】"],
  ["【Please fill in: Party B full name】", "【Please fill in】", "【Please fill in】", "【Please fill in】", "【Please fill in】", "【____/____/____】"]
));

const doc = new Document({
  styles: { default: { document: { run: { font: { ascii: BODY_FONT, eastAsia: "SimSun" }, size: BODY_SIZE, color: "000000" }, paragraph: { spacing: { line: LINE_SPACING } } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: BODY_FONT, color: "000000" })] })] }) },
    children }],
});

const OUTPUT = "/home/z/my-project/download/Police_Platform_Partnership_Agreement.docx";
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUTPUT, buf); console.log(`Saved: ${OUTPUT}`); });
