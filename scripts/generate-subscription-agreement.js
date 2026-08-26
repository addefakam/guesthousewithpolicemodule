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
  children: [new TextRun({ text: "Guest House Service Subscription Agreement", size: 44, bold: true, color: "000000", font: HEADING_FONT })] }));

// Contract number
children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 120, line: LINE_SPACING },
  children: [new TextRun({ text: "Contract No.: 【Please fill in】", size: 21, font: BODY_FONT, color: "000000" })] }));
children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 60, line: LINE_SPACING },
  children: [new TextRun({ text: "Date: 【____/____/____】", size: 21, font: BODY_FONT, color: "000000" })] }));
children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 200, line: LINE_SPACING },
  children: [new TextRun({ text: "Location: 【Please fill in: City, Country】", size: 21, font: BODY_FONT, color: "000000" })] }));

// Parties
children.push(...partyInfoBlock("Party A (Platform Operator)", "【Platform Operator Full Legal Name】", [
  ["Address", "【Please fill in: Full address】"],
  ["Legal Representative", "【Please fill in】"],
  ["Business Registration No.", "【Please fill in】"],
  ["Contact Phone", "【Please fill in】"],
  ["Contact Email", "【Please fill in】"],
]));

children.push(...partyInfoBlock("Party B (Guest House Provider)", "【Guest House Name】", [
  ["Address", "【Please fill in: Full address】"],
  ["Owner / Legal Representative", "【Please fill in】"],
  ["Business License No.", "【Please fill in】"],
  ["Contact Phone", "【Please fill in】"],
  ["Contact Email", "【Please fill in】"],
]));

// Recitals
children.push(new Paragraph({ spacing: { before: 300, after: 120, line: LINE_SPACING }, children: [] }));
children.push(bodyPara("WHEREAS, Party A operates a digital Guest House Management System (hereinafter referred to as the \"Platform\") that provides comprehensive guest house operational management, reservation tracking, guest registration, and regulatory compliance tools;"));
children.push(bodyPara("WHEREAS, Party B has been approved to operate a guest house establishment (hereinafter referred to as the \"Establishment\") and has completed the initial registration on the Platform, having accepted the terms of the Guest House Service Registration and Time Use Agreement;"));
children.push(bodyPara("WHEREAS, Party B now desires to subscribe to the Platform\'s ongoing services by selecting a subscription plan and agreeing to the recurring service terms, fees, and operational conditions set forth in this Agreement;"));
children.push(bodyPara("NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:"));

// Article 1
children.push(articleHeading("Article 1  Definitions"));
children.push(subClause("1.1  \"Platform\" means the digital Guest House Management System operated by Party A, including all web applications, mobile interfaces, databases, APIs, and support services. The Platform encompasses all operational modules including room management, reservation tracking, guest registration, daytime service booking, expense tracking, housekeeping scheduling, and reporting."));
children.push(subClause("1.2  \"Subscription Plan\" means the specific service tier and time period selected by Party B, as described in Article 3 of this Agreement. Available plans include Monthly, Quarterly, Semi-Annual, and Yearly cycles."));
children.push(subClause("1.3  \"Service Period\" means the active duration for which Party B has paid and is authorized to access the Platform, calculated from the subscription start date through the end date corresponding to the selected Subscription Plan."));
children.push(subClause("1.4  \"Service Level\" means the minimum performance standards guaranteed by Party A, including system availability, response times for technical support, and data security measures, as specified in Article 6."));
children.push(subClause("1.5  \"Subscription Fee\" means the recurring payment due from Party B for access to the Platform during each Service Period, the amount of which is determined by the selected Subscription Plan."));

// Article 2
children.push(articleHeading("Article 2  Relationship to the Registration Agreement"));
children.push(subClause("2.1  This Agreement supplements and is subordinate to the Guest House Service Registration and Time Use Agreement (the \"Registration Agreement\") previously accepted by Party B. In the event of any conflict between this Agreement and the Registration Agreement, the Registration Agreement shall prevail."));
children.push(subClause("2.2  Party B acknowledges that acceptance of this Agreement is a condition for activating a paid subscription on the Platform. The Registration Agreement governs the initial registration, approval, and general terms of use, while this Agreement governs the specific terms of the paid subscription service including fees, service levels, and renewal conditions."));
children.push(subClause("2.3  All definitions, obligations, and provisions of the Registration Agreement that are not specifically addressed or modified by this Agreement shall remain in full force and effect."));

// Article 3
children.push(articleHeading("Article 3  Subscription Plans and Pricing"));
children.push(subClause("3.1  Party A offers the following Subscription Plans. Party B shall select one plan prior to the commencement of each Service Period. Fees are denominated in Ethiopian Birr (ETB) and are exclusive of applicable taxes."));

// Subscription Table
const tBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

const subTable = new Table({
  width: { size: 85, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER, borders: tBorders,
  rows: [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: ["Subscription Plan", "Duration", "Monthly Fee (ETB)", "Total Fee (ETB)"].map(text =>
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: noBorders,
          shading: { type: "CLEAR", fill: "F0F0F0" },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 22, font: BODY_FONT, color: "000000" })] })],
        })
      ),
    }),
    ...[
      ["Monthly", "30 calendar days", "【Please fill in】", "【Please fill in】"],
      ["Quarterly", "90 calendar days", "【Please fill in】", "【Please fill in】"],
      ["Semi-Annual", "180 calendar days", "【Please fill in】", "【Please fill in】"],
      ["Yearly", "365 calendar days", "【Please fill in】", "【Please fill in】"],
    ].map(row =>
      new TableRow({
        cantSplit: true,
        children: row.map(text =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: noBorders,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: 22, font: BODY_FONT, color: "000000" })] })],
          })
        ),
      }),
    ),
  ],
});
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, keepNext: true,
  children: [new TextRun({ text: "Table 1: Subscription Plans and Fees", size: 21, font: BODY_FONT, color: "000000", italics: true })] }));
children.push(subTable);

children.push(subClause("3.2  Pricing shown in Table 1 is introductory and may be adjusted by Party A upon thirty (30) calendar days\' written notice. Adjusted pricing shall take effect at the start of the next renewal cycle following the notice period."));
children.push(subClause("3.3  Party A may from time to time offer promotional discounts, early renewal incentives, or loyalty pricing. Such offers shall be communicated to Party B through the Platform or by written notice and shall be subject to the terms and conditions specified in the offer."));

// Article 4
children.push(articleHeading("Article 4  Subscription Activation and Renewal"));
children.push(subClause("4.1  Upon Party B\'s selection of a Subscription Plan and successful payment of the applicable fee, Party A shall activate the subscription and set the Service Period start date. If the activation follows the Trial Period, the Service Period shall commence on the day after the Trial Period expires."));
children.push(subClause("4.2  For renewals, Party B shall make payment prior to or on the Service Period end date. Party A shall send automated reminder notifications at least seven (7) calendar days before the end of each Service Period. Upon receipt of payment before expiry, the new Service Period shall commence the day after the current end date, ensuring uninterrupted access."));
children.push(subClause("4.3  If Party B renews after the current Service Period has expired, the new Service Period shall commence from the date of payment. Any time gap between the previous end date and the new start date shall not be credited, and Party B acknowledges that during such gap the Platform\'s phased restriction system (Warning, Grace, Suspension) shall apply as described in the Registration Agreement."));
children.push(subClause("4.4  Party B may upgrade or downgrade its Subscription Plan at any time by notifying Party A through the Platform or in writing. Plan changes shall take effect at the start of the next Service Period. If upgrading, a prorated credit for the remaining value of the current plan may be applied toward the new plan at Party A\'s discretion."));

// Article 5
children.push(articleHeading("Article 5  Payment Terms"));
children.push(subClause("5.1  Payment shall be made through the methods designated by Party A, including but not limited to bank transfer, mobile money, or other electronic payment channels accepted on the Platform. Party A shall issue a payment confirmation receipt upon successful receipt of each payment."));
children.push(subClause("5.2  Payment is due prior to or on the first day of each Service Period. Party B shall ensure that payment is completed in full to avoid service interruption. Partial payments may be accepted at Party A\'s discretion but shall not prevent the phased restriction system from activating if the full amount is not received by the due date."));
children.push(subClause("5.3  Late payments shall be subject to a penalty of ten percent (10%) of the outstanding amount for each full calendar week of delay, up to a maximum of one hundred percent (100%) of the unpaid subscription fee. Party A shall notify Party B of late payment before applying any penalty."));
children.push(subClause("5.4  In the event of a payment dispute, Party B shall notify Party A in writing within fifteen (15) calendar days of the disputed payment. Party A shall investigate and respond within ten (10) business days. Pending resolution, Party B\'s access shall not be suspended unless the payment is more than fifteen (15) calendar days overdue."));
children.push(subClause("5.5  Party A shall maintain a complete and accurate record of all payments received from Party B, accessible through the Platform\'s subscription management interface. Upon request, Party A shall provide a formal payment statement in writing."));

// Article 6
children.push(articleHeading("Article 6  Service Level and Technical Support"));
children.push(subClause("6.1  Party A shall maintain the Platform\'s availability at a minimum of ninety-five percent (95%) during each calendar month, measured on a per-minute basis. Scheduled maintenance shall not count toward downtime, provided Party A gives at least twenty-four (24) hours of advance notice through the Platform or by email."));
children.push(subClause("6.2  In the event that Platform availability falls below the ninety-five percent (95%) threshold in any calendar month, Party B shall be entitled to a service credit equal to one (1) day of subscription fee for each full percentage point of shortfall below the threshold. Service credits shall be applied to the next renewal payment and shall not exceed the total fee for the affected Service Period."));
children.push(subClause("6.3  Party A shall provide technical support to Party B during normal business hours, defined as Monday through Friday, 8:00 AM to 6:00 PM, excluding public holidays. Technical support requests shall be acknowledged within four (4) business hours and resolved within a reasonable timeframe based on severity."));
children.push(subClause("6.4  Critical system failures that prevent Party B from performing essential operations (guest check-in, check-out, reservation management) shall be treated with priority and shall be addressed with the objective of restoring service within four (4) hours during business hours or eight (8) hours outside business hours."));
children.push(subClause("6.5  Party A shall implement and maintain industry-standard security measures including encryption of sensitive data at rest and in transit, secure access controls, regular security assessments, and prompt remediation of identified vulnerabilities. Party A shall notify Party B within forty-eight (48) hours of any confirmed data security incident affecting Party B\'s data."));

// Article 7
children.push(articleHeading("Article 7  Subscription Lifecycle and Expiration"));
children.push(subClause("7.1  Throughout each Service Period, the Platform shall display the current subscription status, remaining days, and next renewal date on Party B\'s dashboard. This information shall be continuously updated and clearly visible upon login."));
children.push(subClause("7.2  As the Service Period approaches expiration, the Platform shall implement the following phased notification and restriction system: (a) Warning Phase, triggered at seven (7) calendar days or fewer remaining, during which a prominent warning banner shall be displayed and new guest check-ins and new reservations shall be restricted; (b) Grace Period, triggered upon expiration, lasting two (2) calendar days, during which access is limited to viewing existing data and processing renewal payment; and (c) Suspension Phase, triggered upon expiration of the Grace Period without renewal, during which full access to the Platform is suspended until the subscription is renewed."));
children.push(subClause("7.3  During the Warning Phase and Grace Period, Party B\'s existing data shall remain fully accessible in read-only mode. Party A shall not delete or modify any of Party B\'s data during these phases. Upon full Suspension, data shall be preserved but inaccessible through the Platform interface."));
children.push(subClause("7.4  Party A shall send reminder notifications through the Platform and, where applicable, via email or SMS at the following intervals: (a) seven (7) days before expiration; (b) three (3) days before expiration; (c) on the day of expiration; and (d) upon entry into the Grace Period. The failure of Party B to receive any notification due to incorrect contact information or technical issues shall not relieve Party B of the obligation to renew on time."));

// Article 8
children.push(articleHeading("Article 8  Platform Modules and Features"));
children.push(subClause("8.1  During each active Service Period, Party B shall have access to the following Platform modules: (a) Room Management, including room inventory, room type configuration, and availability status tracking; (b) Reservation Management, including overnight reservation creation, modification, cancellation, check-in, and check-out processing; (c) Guest Registration, including guest profile creation, identification recording, and stay history; (d) Daytime Services, including service category management, booking, and scheduling; (e) Expense Tracking, including operational expense recording and categorization; (f) Housekeeping Management, including task scheduling, assignment, and completion tracking; and (g) Reporting, including reservation reports, occupancy summaries, and revenue overviews."));
children.push(subClause("8.2  The default check-in time for overnight reservations is 14:00 (2:00 PM) and the default check-out time is 12:00 (noon). Party B may configure these times through the Platform\'s settings module to match the Establishment\'s operational policies. Changes to check-in and check-out times shall not affect reservations already confirmed under the previous settings."));
children.push(subClause("8.3  Party A reserves the right to update, modify, improve, or discontinue any Platform module or feature. Material changes that significantly affect the core usability of the Platform shall be communicated to Party B at least seven (7) calendar days before implementation. Party B may request a refund for the remaining Service Period if a material change renders the Platform substantially unsuitable for Party B\'s operations, subject to Party A\'s reasonable assessment."));

// Article 9
children.push(articleHeading("Article 9  Data Ownership and Portability"));
children.push(subClause("9.1  Party B retains full ownership of all operational data entered into the Platform, including guest records, reservation data, expense records, and configuration settings. Party A shall not use Party B\'s data for any purpose other than providing the Platform services, regulatory compliance, and aggregated anonymized analytics."));
children.push(subClause("9.2  Upon request and at any time during an active Service Period, Party A shall provide Party B with the ability to export its data in a standard, machine-readable format (JSON or CSV). Party A shall not impose unreasonable restrictions or excessive fees on data export requests made during an active subscription."));
children.push(subClause("9.3  Upon termination or expiration of this Agreement without renewal, Party B shall have thirty (30) calendar days to request and download a complete export of its data. After this period, Party A shall retain the data for an additional sixty (60) calendar days before permanently deleting it, unless otherwise required by applicable law or regulation."));

// Article 10
children.push(articleHeading("Article 10  Termination"));
children.push(subClause("10.1  Either party may terminate this Agreement by providing thirty (30) calendar days\' written notice to the other party. In the event of termination by Party B, no refund shall be provided for the remaining portion of the current Service Period unless otherwise agreed in writing."));
children.push(subClause("10.2  Party A may terminate this Agreement immediately upon written notice if Party B: (a) breaches any material provision of this Agreement and fails to cure such breach within fifteen (15) calendar days; (b) uses the Platform for any unlawful purpose; (c) fails to maintain a valid business license for the Establishment; or (d) engages in conduct that may damage the reputation or integrity of the Platform."));
children.push(subClause("10.3  Upon termination, Party B shall settle all outstanding fees within fifteen (15) calendar days. Party A shall provide Party B access for data export purposes for thirty (30) calendar days following the termination date."));

// Article 11
children.push(articleHeading("Article 11  Limitation of Liability"));
children.push(subClause("11.1  Neither party shall be liable for any indirect, incidental, consequential, special, or punitive damages arising out of or in connection with this Agreement. This exclusion applies regardless of whether such damages were foreseeable."));
children.push(subClause("11.2  The total aggregate liability of either party under this Agreement shall not exceed the total subscription fees paid or payable by Party B during the twelve (12) month period immediately preceding the event giving rise to the claim."));
children.push(subClause("11.3  Party A shall not be liable for any loss of revenue, guest dissatisfaction, or operational disruption caused by: (a) Party B\'s failure to renew on time; (b) Party B\'s improper use of the Platform; (c) third-party service interruptions (internet, power, payment processors); or (d) Party B\'s failure to maintain accurate data on the Platform."));

// Article 12
children.push(articleHeading("Article 12  Force Majeure"));
children.push(subClause("12.1  Neither party shall be liable for failure or delay caused by circumstances beyond reasonable control, including natural disasters, epidemics, government actions, war, terrorism, civil unrest, power outages, internet disruptions, or cyberattacks on critical infrastructure."));
children.push(subClause("12.2  The affected party shall provide written notice within five (5) calendar days. If the event continues for more than sixty (60) consecutive calendar days, either party may terminate upon fifteen (15) calendar days\' written notice."));

// Article 13
children.push(articleHeading("Article 13  Dispute Resolution"));
children.push(subClause("13.1  Disputes shall first be resolved through good-faith negotiation within thirty (30) calendar days. Unresolved disputes shall proceed to mediation with costs shared equally. If mediation fails within sixty (60) calendar days, either party may refer the dispute to the competent courts of 【Please fill in: Jurisdiction】."));

// Article 14
children.push(articleHeading("Article 14  Notices and Miscellaneous"));
children.push(subClause("14.1  Notices shall be in writing and deemed given when delivered personally, sent by registered mail with receipt, or transmitted by email with read receipt. Notices shall be addressed to the parties at the addresses specified in this Agreement or as subsequently updated in writing."));
children.push(subClause("14.2  Entire Agreement: This Agreement, together with the Registration Agreement, constitutes the complete understanding between the parties regarding the subscription services."));
children.push(subClause("14.3  Amendment: No modification shall be valid unless in writing and signed by both parties."));
children.push(subClause("14.4  Waiver: Failure to enforce any provision shall not constitute a waiver."));
children.push(subClause("14.5  Severability: Invalid provisions shall not affect the remaining provisions."));
children.push(subClause("14.6  Governing Law: This Agreement shall be governed by the laws of 【Please fill in: Applicable Jurisdiction】."));
children.push(subClause("14.7  Counterparts: This Agreement may be executed in counterparts, each deemed an original."));

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

const OUTPUT = "/home/z/my-project/download/Guest_House_Service_Subscription_Agreement.docx";
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUTPUT, buf); console.log(`Saved: ${OUTPUT}`); });
