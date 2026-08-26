const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, BorderStyle, WidthType, PageBreak, Footer, PageNumber,
        HeadingLevel } = require('docx');
const fs = require('fs');

const DOCX_SCRIPTS = '/home/z/my-project/skills/docx/scripts';

// ── Helpers ──
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function safeText(value, placeholder) {
  if (value === undefined || value === null || value === '' || String(value) === 'NaN') return placeholder || '\u3010Please fill in\u3011';
  return String(value);
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 360, after: 60 },
    children: [new TextRun({ text, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })],
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 60 },
    children: [new TextRun({ text, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })],
  });
}

function clauseHeading(text) {
  return new Paragraph({
    spacing: { before: 300, after: 120, line: 360 },
    children: [new TextRun({ text, size: 24, bold: true, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimHei' } })],
  });
}

function subClause(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 480, hanging: 480 },
    spacing: { line: 360, after: 40 },
    children: [new TextRun({ text, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })],
  });
}

function partyInfoBlock(partyLabel, partyName, fields) {
  const headerPara = new Paragraph({
    spacing: { before: 200, after: 120, line: 360 },
    children: [new TextRun({ text: `${partyLabel}: ${safeText(partyName, '\u3010Full name\u3011')}`, size: 24, bold: true, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })],
  });

  const infoTable = new Table({
    width: { size: 90, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: fields.map(([label, value]) => new TableRow({
      children: [
        new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 40, bottom: 40, left: 420, right: 60 },
          children: [new Paragraph({ spacing: { line: 360 }, children: [new TextRun({ text: `${label}:`, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
        new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 40, bottom: 40, left: 60, right: 120 },
          children: [new Paragraph({ spacing: { line: 360 }, children: [new TextRun({ text: safeText(value), size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
      ],
    })),
  });

  return [headerPara, infoTable];
}

function signatureBlock(partyAName, partyBName) {
  const fields = ['Authorized Representative (Signature)', 'Name & Title', 'Contact Person', 'Contact Information', 'Signing Location', 'Date'];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: fields.map((label, i) => {
      const aVal = i === fields.length - 1 ? '\u3010____/____/____\u3011' : '';
      const bVal = i === fields.length - 1 ? '\u3010____/____/____\u3011' : '';
      const displayA = i === 0 ? `Party A \u3010${safeText(partyAName, 'Company Name')}\u3011 (Seal): ${aVal}` : `${label}: ${aVal}`;
      const displayB = i === 0 ? `Party B \u3010${safeText(partyBName, 'Police Office')}\u3011 (Seal): ${bVal}` : `${label}: ${bVal}`;
      return new TableRow({
        children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 60 },
            children: [new Paragraph({ spacing: { line: 360 }, children: [new TextRun({ text: displayA, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { top: 80, bottom: 80, left: 60, right: 120 },
            children: [new Paragraph({ spacing: { line: 360 }, children: [new TextRun({ text: displayB, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
        ],
      });
    }),
  });
}

// ══════════════════════════════════════════════════════════════════════════
// CONTRACT 1: PARTNERSHIP AGREEMENT (Framework / Cooperation)
// ══════════════════════════════════════════════════════════════════════════
async function generateContract1() {
  const children = [
    // Title
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, line: 360 },
      children: [new TextRun({ text: 'PARTNERSHIP AND COOPERATION AGREEMENT', size: 44, bold: true, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimHei' } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200, line: 360 },
      children: [new TextRun({ text: 'For the Deployment of the Guest House Management System', size: 28, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 60, line: 360 },
      children: [new TextRun({ text: 'Contract No.: \u3010____/____/____\u3011', size: 21, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 300, line: 360 },
      children: [new TextRun({ text: 'Date: \u3010____/____/____\u3011', size: 21, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] }),

    // Party Information
    ...partyInfoBlock('Party A (The Service Provider)', '\u3010Company Name\u3011', [
      ['Address', '\u3010Company Address, Bishoftu / Addis Ababa\u3011'],
      ['TIN Number', '\u3010TIN Number\u3011'],
      ['Business License No.', '\u3010License Number\u3011'],
      ['Legal Representative', '\u3010Full Name\u3011'],
      ['Phone', '\u3010Phone Number\u3011'],
      ['Email', '\u3010Email Address\u3011'],
    ]),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
    ...partyInfoBlock('Party B (The Regulatory Partner)', 'Bishoftu City Police Office', [
      ['Address', '\u3010Police Office Address, Bishoftu\u3011'],
      ['Represented By', '\u3010Name and Title of Police Chief\u3011'],
      ['Phone', '\u3010Office Phone Number\u3011'],
      ['Email', '\u3010Office Email\u3011'],
    ]),
    new Paragraph({ spacing: { before: 300 }, children: [] }),

    // ── RECITALS ──
    clauseHeading('RECITALS'),
    body('WHEREAS, Party A has developed a digital Guest House Management System (hereinafter referred to as the \u201cSystem\u201d) designed to digitize guest registration, room management, reservation tracking, and police security monitoring for guest houses and similar hospitality establishments;'),
    body('WHEREAS, Party B is the designated law enforcement authority responsible for regulating guest houses, monitoring guest movements, and maintaining public safety within Bishoftu City Administration;'),
    body('WHEREAS, both parties recognize that the manual system of guest registration currently in use creates challenges for law enforcement, including delayed information access, inaccurate guest records, and limited capacity for real-time security monitoring;'),
    body('WHEREAS, Party B has agreed to facilitate the adoption of the System by all registered guest houses within Bishoftu City through regulatory means, and Party A has agreed to provide the System, technical support, and revenue sharing as described herein;'),
    body('NOW, THEREFORE, in consideration of the mutual promises and covenants contained in this Agreement, the parties agree as follows:'),

    // ── ARTICLE 1 ──
    clauseHeading('Article 1  Definitions and Interpretation'),
    subClause('1.1  \u201cSystem\u201d means the Guest House Management System software, including all modules for guest registration, room and reservation management, reporting, and police security monitoring, as developed and maintained by Party A.'),
    subClause('1.2  \u201cGuest Houses\u201d means all guest houses, hotels, lodges, homestays, resorts, and similar hospitality establishments operating within the jurisdiction of Bishoftu City Administration.'),
    subClause('1.3  \u201cSubscriber\u201d means a guest house that has entered into a Subscription Agreement with Party A to use the System.'),
    subClause('1.4  \u201cSubscription Revenue\u201d means the total monthly subscription fees collected by Party A from all Subscribers within Bishoftu City.'),
    subClause('1.5  \u201cRevenue Share\u201d means the percentage of Subscription Revenue payable to Party B as described in Article 5.'),
    subClause('1.6  \u201cGuest Data\u201d means all information registered in the System relating to guests, including but not limited to personal identification, nationality, purpose of stay, room assignments, and duration of stay.'),
    subClause('1.7  \u201cPolice Module\u201d means the component of the System accessible exclusively to authorized Party B personnel for security monitoring, suspect tracking, guest search, and anomaly detection.'),

    // ── ARTICLE 2 ──
    clauseHeading('Article 2  Purpose and Scope of Cooperation'),
    subClause('2.1  The purpose of this Agreement is to establish a partnership framework for the deployment and operation of the System across all guest houses in Bishoftu City, combining Party A\u2019s technology capabilities with Party B\u2019s regulatory authority.'),
    subClause('2.2  Party A shall provide the System, including all software modules, hosting, maintenance, technical support, and user training, to all guest houses that subscribe to the service.'),
    subClause('2.3  Party B shall use its regulatory authority to facilitate the adoption and usage of the System by guest houses within Bishoftu City, including but not limited to issuing directives, conducting compliance inspections, and requiring System usage as a condition of operational licensing.'),
    subClause('2.4  This Agreement covers an estimated 126 guest houses operating within Bishoftu City, though the actual number may vary as new guest houses open or existing ones close.'),

    // ── ARTICLE 3 ──
    clauseHeading('Article 3  Division of Responsibilities'),
    clauseHeading('3.1  Responsibilities of Party A (Service Provider)'),
    subClause('(1) Deploy, host, and maintain the System in a secure and reliable manner, ensuring availability of at least 95% of the time, excluding scheduled maintenance windows.'),
    subClause('(2) Provide each Subscriber with login credentials, initial training, and an operation manual for the System.'),
    subClause('(3) Provide Party B with authorized access credentials to the Police Module, including creation and management of user accounts for designated police personnel.'),
    subClause('(4) Provide ongoing technical support to all Subscribers and Party B personnel during business hours, with a response time target of 24 hours for non-critical issues and 4 hours for critical system outages.'),
    subClause('(5) Collect subscription fees directly from each Subscriber in accordance with individual Subscription Agreements.'),
    subClause('(6) Remit the Revenue Share to Party B in accordance with the payment schedule described in Article 5.'),
    subClause('(7) Ensure the security and integrity of all data stored in the System, including Guest Data, and implement reasonable measures to prevent unauthorized access, data loss, or system breaches.'),
    subClause('(8) Provide monthly usage and compliance reports to Party B, including the list of active Subscribers, subscription status, and any guest houses that have suspended or terminated their subscriptions.'),

    clauseHeading('3.2  Responsibilities of Party B (Regulatory Partner)'),
    subClause('(1) Issue an official directive or notice to all guest houses within Bishoftu City requiring the adoption and active use of the System as a condition of their operational license.'),
    subClause('(2) Designate a liaison officer who shall serve as the primary point of contact between Party B and Party A, responsible for coordination, issue resolution, and compliance monitoring. The liaison officer shall respond to Party A communications within 48 hours.'),
    subClause('(3) Conduct periodic inspections (no less than quarterly) to verify that guest houses are actively using the System and maintaining accurate guest registration records.'),
    subClause('(4) Use the Police Module exclusively for lawful law enforcement purposes and ensure that all authorized police personnel with System access comply with data protection obligations described in Article 7.'),
    subClause('(5) Not access, request, or use Guest Data for purposes unrelated to official law enforcement duties.'),
    subClause('(6) Facilitate introductory meetings between Party A and guest house owners during the initial deployment phase to support onboarding.'),
    subClause('(7) Provide a written performance report to Party A every six months, detailing the level of System adoption, compliance rates, and any regulatory actions taken against non-compliant guest houses.'),

    // ── ARTICLE 4 ──
    clauseHeading('Article 4  Commercial Arrangement and Pricing'),
    subClause('4.1  Subscription fees shall be collected by Party A directly from each Subscriber based on a tiered per-bed pricing model as follows:'),
    // Pricing table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' } },
      rows: [
        new TableRow({ tableHeader: true, children: [
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, top: { style: BorderStyle.SINGLE, size: 4, color: '000000' } }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: 'Tier', bold: true, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, top: { style: BorderStyle.SINGLE, size: 4, color: '000000' } }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: 'Number of Beds', bold: true, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, top: { style: BorderStyle.SINGLE, size: 4, color: '000000' } }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: 'Rate per Bed (ETB/Month)', bold: true, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, top: { style: BorderStyle.SINGLE, size: 4, color: '000000' } }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: 'Monthly Cap (ETB)', bold: true, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] }),
        ]}),
        ...[['Tier 1', '1 - 10 beds', '100', '1,000'], ['Tier 2', '11 - 30 beds', '80', '2,400'], ['Tier 3', '31+ beds', '60', '3,000 (negotiable)']].map(function(row) {
          var cells = row.map(function(text) {
            return new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' } }, margins: { top: 40, bottom: 40, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: text, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] });
          });
          return new TableRow({ children: cells });
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    subClause('4.2  Each Subscriber shall enter into a separate Subscription Agreement with Party A. Party B shall not be responsible for collecting subscription fees from Subscribers.'),
    subClause('4.3  The initial deployment period (\u3010first 60 days from the Effective Date\u3011) shall be a free trial period during which no subscription fees are charged to Subscribers. This trial period is intended to facilitate onboarding and adoption.'),

    // ── ARTICLE 5 ──
    clauseHeading('Article 5  Revenue Share and Payment Terms'),
    subClause('5.1  In consideration of Party B\u2019s regulatory facilitation and enforcement efforts, Party A shall pay to Party B a Revenue Share equal to twenty percent (20%) of the total Subscription Revenue collected from all Subscribers within Bishoftu City during each calendar month.'),
    subClause('5.2  In addition to the Revenue Share, Party A shall pay Party B a fixed monthly facilitation fee of Ten Thousand Ethiopian Birr (ETB 10,000.00) to cover administrative and coordination costs incurred by Party B in fulfilling its responsibilities under this Agreement.'),
    subClause('5.3  Party A shall calculate and remit the Revenue Share and facilitation fee to Party B within fifteen (15) business days following the end of each calendar month. Payment shall be made via bank transfer to Party B\u2019s designated bank account:'),
    subClause('    Bank: \u3010Bank Name\u3011\n    Account Name: \u3010Account Name\u3011\n    Account Number: \u3010Account Number\u3011\n    Branch: \u3010Branch Name\u3011'),
    subClause('5.4  Party A shall provide Party B with a monthly revenue report detailing the number of active Subscribers, total Subscription Revenue collected, the Revenue Share calculation, and the facilitation fee, prior to each payment.'),
    subClause('5.5  If Party B fails to perform the responsibilities described in Article 3.2 for two (2) consecutive months without reasonable cause, the Revenue Share percentage shall be reduced to ten percent (10%) until Party B resumes full performance. Party A shall provide written notice of such reduction at least ten (10) business days before it takes effect.'),

    // ── ARTICLE 6 ──
    clauseHeading('Article 6  Performance Targets and Milestones'),
    subClause('6.1  Both parties agree to the following adoption milestones:'),
    subClause('(1) Within thirty (30) days of the Effective Date: Party B shall issue the official directive requiring System adoption. At least fifty (50) guest houses shall be registered in the System.'),
    subClause('(2) Within sixty (60) days of the Effective Date: At least one hundred (100) guest houses shall be registered and actively using the System. All registered guest houses shall have completed at least one guest check-in through the System.'),
    subClause('(3) Within ninety (90) days of the Effective Date: At least one hundred and ten (110) guest houses shall be registered. Party B shall have completed at least one compliance inspection.'),
    subClause('6.2  If the milestones in Article 6.1 are not met due to Party B\u2019s failure to perform its facilitation responsibilities, Party A may, at its sole discretion, reduce the Revenue Share or terminate this Agreement upon thirty (30) days written notice.'),

    // ── ARTICLE 7 ──
    clauseHeading('Article 7  Data Protection and Ownership'),
    subClause('7.1  All Guest Data collected and stored in the System shall remain the property of the respective Subscribers and the guests themselves. Party A shall not access, export, sell, or share Guest Data with any third party except as required by law or as necessary to provide the System services.'),
    subClause('7.2  Party B shall have read-only access to Guest Data through the Police Module for law enforcement purposes only. Party B shall not modify, delete, or alter Guest Data stored in the System, except as authorized by applicable law.'),
    subClause('7.3  Both parties shall implement appropriate technical and organizational measures to protect the security and confidentiality of Guest Data. In the event of a data breach, the party whose systems were compromised shall notify the other party within twenty-four (24) hours of discovery.'),
    subClause('7.4  Party A shall store System data on servers with industry-standard security protocols, including encryption at rest and in transit. Party A shall not transfer Guest Data outside of Ethiopia without prior written consent from Party B.'),
    subClause('7.5  Upon termination or expiration of this Agreement, Party A shall, upon Party B\u2019s written request, provide a complete data export of all Guest Data for Bishoftu City Subscribers in a standard machine-readable format within thirty (30) days.'),

    // ── ARTICLE 8 ──
    clauseHeading('Article 8  Intellectual Property'),
    subClause('8.1  The System, including all software code, design, documentation, trademarks, and trade secrets, shall remain the sole and exclusive intellectual property of Party A. Nothing in this Agreement shall be construed as a transfer or assignment of any intellectual property rights from Party A to Party B or any Subscriber.'),
    subClause('8.2  Party B is granted a non-exclusive, non-transferable, revocable license to access and use the Police Module of the System for the duration of this Agreement, solely for official law enforcement purposes within Bishoftu City.'),
    subClause('8.3  Party B shall not reverse engineer, decompile, copy, modify, or create derivative works based on the System or any part thereof.'),

    // ── ARTICLE 9 ──
    clauseHeading('Article 9  Term and Renewal'),
    subClause('9.1  This Agreement shall commence on the Effective Date and shall remain in effect for an initial term of one (1) year, unless terminated earlier in accordance with Article 10.'),
    subClause('9.2  This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal to the other party at least sixty (60) days prior to the expiration of the then-current term.'),
    subClause('9.3  Upon renewal, the parties may negotiate adjustments to the Revenue Share percentage, facilitation fee, and other commercial terms based on the performance and results achieved during the preceding term.'),

    // ── ARTICLE 10 ──
    clauseHeading('Article 10  Termination'),
    subClause('10.1  Either party may terminate this Agreement without cause upon ninety (90) days prior written notice to the other party.'),
    subClause('10.2  Either party may terminate this Agreement immediately upon written notice if the other party commits a material breach of any provision of this Agreement and fails to cure such breach within thirty (30) days of receiving written notice specifying the breach.'),
    subClause('10.3  Party A may terminate this Agreement immediately if Party B engages in any conduct that materially damages the reputation or business interests of Party A, including but not limited to using the partnership for political or personal purposes unrelated to System deployment.'),
    subClause('10.4  Upon termination: (a) Party B shall cease using the System and the Police Module; (b) Party A shall deactivate all police user accounts within fifteen (15) days; (c) Party A shall continue to provide the System to individual Subscribers under their separate Subscription Agreements, which shall remain in effect regardless of termination of this partnership; and (d) all outstanding payment obligations accrued prior to the termination date shall remain due and payable.'),

    // ── ARTICLE 11 ──
    clauseHeading('Article 11  Liability for Breach'),
    subClause('11.1  If Party A fails to maintain the System in accordance with the availability standards described in Article 3.1(1) for more than seventy-two (72) consecutive hours, Party B may issue a written notice requiring remediation. If the issue is not resolved within a reasonable timeframe, Party B may reduce the Revenue Share proportionally for the affected period.'),
    subClause('11.2  If Party B fails to perform its facilitation responsibilities described in Article 3.2 for two (2) consecutive months, Party A shall have the right to reduce the Revenue Share as described in Article 5.5.'),
    subClause('11.3  Neither party shall be liable to the other for indirect, incidental, or consequential damages arising out of or related to this Agreement, including but not limited to loss of revenue, loss of data, or business interruption, except in cases of gross negligence or willful misconduct.'),

    // ── ARTICLE 12 ──
    clauseHeading('Article 12  Force Majeure'),
    subClause('12.1  Neither party shall be liable for any failure or delay in performing its obligations under this Agreement if such failure or delay results from circumstances beyond the reasonable control of the affected party, including but not limited to natural disasters, government actions, war, terrorism, pandemic, internet infrastructure failures, or power outages.'),
    subClause('12.2  The affected party shall notify the other party in writing within five (5) business days of the occurrence of a force majeure event and shall use reasonable efforts to mitigate its effects and resume performance as soon as practicable.'),

    // ── ARTICLE 13 ──
    clauseHeading('Article 13  Dispute Resolution'),
    subClause('13.1  The parties shall first attempt to resolve any dispute arising out of or relating to this Agreement through good-faith negotiation between the designated liaison officers of each party.'),
    subClause('13.2  If the dispute is not resolved through negotiation within thirty (30) days, either party may refer the matter to mediation administered by \u3010Name of Mediation Institution or \u201cappropriate mediation body\u201d\u3011 in accordance with its rules and procedures.'),
    subClause('13.3  If mediation fails, the dispute shall be submitted to the exclusive jurisdiction of the courts of \u3010Oromia Regional State / Bishoftu City\u3011.'),

    // ── ARTICLE 14 ──
    clauseHeading('Article 14  Notices'),
    subClause('14.1  All notices, requests, and other communications under this Agreement shall be in writing and delivered by hand, registered mail, or email to the addresses specified in the Party Information section above, or to such other address as a party may designate by written notice.'),
    subClause('14.2  Notices shall be deemed received: (a) upon personal delivery; (b) five (5) business days after mailing by registered mail; and (c) one (1) business day after sending by email, provided that no delivery failure notification is received.'),

    // ── ARTICLE 15 ──
    clauseHeading('Article 15  Miscellaneous'),
    subClause('15.1  This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, negotiations, and agreements, whether written or oral.'),
    subClause('15.2  No amendment or modification of this Agreement shall be valid unless made in writing and signed by both parties.'),
    subClause('15.3  Neither party may assign or transfer its rights or obligations under this Agreement to any third party without the prior written consent of the other party.'),
    subClause('15.4  The failure of either party to enforce any provision of this Agreement shall not constitute a waiver of such provision or the right to enforce it at a later time.'),
    subClause('15.5  If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.'),
    subClause('15.6  This Agreement may be executed in two or more counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument.'),
    new Paragraph({ spacing: { before: 600 }, children: [] }),

    // Signature Block
    clauseHeading('SIGNATURE BLOCK'),
    signatureBlock('\u3010Company Name\u3011', 'Bishoftu City Police Office'),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: { ascii: 'Times New Roman', eastAsia: 'SimSun' }, size: 24, color: '000000' }, paragraph: { spacing: { line: 360 } } } },
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838, orientation: 'portrait' }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '000000', font: { ascii: 'Times New Roman' } })] })] }) },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('/home/z/my-project/download/Partnership_Agreement_Police_Bishoftu.docx', buffer);
  console.log('Contract 1 generated: Partnership_Agreement_Police_Bishoftu.docx');
}

// ══════════════════════════════════════════════════════════════════════════
// CONTRACT 2: GUEST HOUSE SUBSCRIPTION AGREEMENT
// ══════════════════════════════════════════════════════════════════════════
async function generateContract2() {
  const children = [
    // Title
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, line: 360 },
      children: [new TextRun({ text: 'GUEST HOUSE MANAGEMENT SYSTEM', size: 44, bold: true, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimHei' } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, line: 360 },
      children: [new TextRun({ text: 'SUBSCRIPTION SERVICE AGREEMENT', size: 44, bold: true, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimHei' } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200, line: 360 },
      children: [new TextRun({ text: 'Between the Service Provider and the Guest House', size: 28, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 60, line: 360 },
      children: [new TextRun({ text: 'Agreement No.: GH-BC-\u3010____/____/____\u3011', size: 21, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 300, line: 360 },
      children: [new TextRun({ text: 'Date: \u3010____/____/____\u3011', size: 21, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] }),

    // Party Information
    ...partyInfoBlock('Party A (Service Provider)', '\u3010Company Name\u3011', [
      ['Address', '\u3010Company Address\u3011'],
      ['TIN Number', '\u3010TIN Number\u3011'],
      ['Phone', '\u3010Phone Number\u3011'],
      ['Email', '\u3010Email Address\u3011'],
    ]),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
    ...partyInfoBlock('Party B (Subscriber)', '\u3010Guest House Name\u3011', [
      ['Address', '\u3010Guest House Address, Bishoftu\u3011'],
      ['License Number', '\u3010Business License Number\u3011'],
      ['Owner / Manager', '\u3010Full Name\u3011'],
      ['Phone', '\u3010Phone Number\u3011'],
      ['Total Beds', '\u3010Number of beds\u3011'],
    ]),
    new Paragraph({ spacing: { before: 300 }, children: [] }),

    // ── RECITALS ──
    clauseHeading('RECITALS'),
    body('WHEREAS, Party A operates a digital Guest House Management System (the \u201cSystem\u201d) that provides guest registration, room management, reservation tracking, and reporting tools for hospitality establishments;'),
    body('WHEREAS, Party B operates a guest house in Bishoftu City and desires to subscribe to the System for the management of its guest registration, room allocation, and operational reporting;'),
    body('WHEREAS, the use of the System by guest houses in Bishoftu City has been facilitated through a cooperation arrangement between Party A and Bishoftu City Police Office;'),
    body('NOW, THEREFORE, the parties agree as follows:'),

    // ── ARTICLE 1 ──
    clauseHeading('Article 1  Subscription and Service Description'),
    subClause('1.1  Party A shall provide Party B with access to the System, including the following modules: guest registration and check-in/check-out management, room and bed inventory management, reservation and booking management, guest history and reporting, and operational dashboard.'),
    subClause('1.2  Party A shall create operator accounts for Party B\u2019s authorized staff, including a primary administrator account and additional staff accounts as reasonably requested by Party B. Each account shall have role-based access controls appropriate to the user\u2019s responsibilities.'),
    subClause('1.3  Party B shall use the System to register all guests upon check-in and check-out, maintain accurate room and bed inventory, and record all reservations. Party B acknowledges that failure to maintain accurate records may result in regulatory consequences under applicable local laws.'),

    // ── ARTICLE 2 ──
    clauseHeading('Article 2  Subscription Fee and Payment Terms'),
    subClause('2.1  The subscription fee shall be calculated based on the total number of beds in Party B\u2019s guest house, in accordance with the following tiered pricing:'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' } },
      rows: [
        new TableRow({ tableHeader: true, children: ['Tier', 'Number of Beds', 'Rate per Bed (ETB/Month)', 'Monthly Cap (ETB)'].map(h =>
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, top: { style: BorderStyle.SINGLE, size: 4, color: '000000' } }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: h, bold: true, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] })
        )}),
        ...[['Tier 1', '1 - 10 beds', '100', '1,000'], ['Tier 2', '11 - 30 beds', '80', '2,400'], ['Tier 3', '31+ beds', '60', '3,000 (negotiable)']].map(function(row) {
          var cells = row.map(function(text) {
            return new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' } }, margins: { top: 40, bottom: 40, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: text, size: 24, color: '000000', font: { ascii: 'Times New Roman', eastAsia: 'SimSun' } })] })] });
          });
          return new TableRow({ children: cells });
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    subClause('2.2  Party B\u2019s applicable tier and monthly fee shall be determined based on the number of beds declared by Party B at the time of subscription. If Party B\u2019s bed count changes during the subscription period, Party B shall notify Party A within fifteen (15) days, and the fee shall be adjusted accordingly from the following month.'),
    subClause('2.3  Payment shall be made monthly in advance, no later than the 5th day of each calendar month. Payment shall be made via Telebirr, mobile banking, or bank transfer to Party A\u2019s designated account:'),
    subClause('    Payment Method: Telebirr / CBE Birr / Bank Transfer\n    Account Name: \u3010Account Name\u3011\n    Account Number / Telebirr: \u3010Account Number\u3011\n    Bank: \u3010Bank Name, if applicable\u3011'),
    subClause('2.4  Party A shall issue a receipt or invoice for each payment received. Party B shall retain such receipts for its records.'),
    subClause('2.5  A free trial period of sixty (60) days from the Effective Date shall apply, during which no subscription fees are payable. After the trial period, fees shall commence from the first day of the following month.'),

    // ── ARTICLE 3 ──
    clauseHeading('Article 3  Party B\u2019s Obligations'),
    subClause('3.1  Party B shall ensure that all guest check-ins and check-outs are registered in the System accurately and in real time, or as close to real time as operationally feasible.'),
    subClause('3.2  Party B shall not share its login credentials with any unauthorized person. Party B shall immediately notify Party A if it suspects that any account credentials have been compromised.'),
    subClause('3.3  Party B shall maintain accurate and up-to-date room and bed inventory information in the System.'),
    subClause('3.4  Party B shall ensure that its staff members who use the System are adequately trained on its operation. Party A shall provide initial training at no additional cost during the onboarding period.'),
    subClause('3.5  Party B shall not use the System for any unlawful purpose or in any manner that violates applicable laws and regulations of Ethiopia and the Oromia Regional State.'),

    // ── ARTICLE 4 ──
    clauseHeading('Article 4  Party A\u2019s Obligations'),
    subClause('4.1  Party A shall maintain the System in good working order and ensure availability of at least 95% of the time, excluding scheduled maintenance.'),
    subClause('4.2  Party A shall provide technical support to Party B during business hours via phone, email, or in-person visits as needed. Critical issues affecting guest registration shall be prioritized with a response time target of four (4) hours.'),
    subClause('4.3  Party A shall not access, modify, or share Party B\u2019s guest data with any third party, except as required to provide the System services or as mandated by applicable law.'),
    subClause('4.4  Party A shall provide at least seven (7) days\u2019 advance notice before any scheduled maintenance that may result in System unavailability, except in cases of emergency.'),

    // ── ARTICLE 5 ──
    clauseHeading('Article 5  Data Protection and Privacy'),
    subClause('5.1  All data entered into the System by Party B, including guest personal information, shall remain the property of Party B and its guests.'),
    subClause('5.2  Party A shall implement reasonable security measures to protect data stored in the System, including encryption, access controls, and regular security assessments.'),
    subClause('5.3  Party B acknowledges that guest registration data may be accessible to authorized Bishoftu City Police personnel through a separate law enforcement module of the System, solely for public safety and law enforcement purposes.'),
    subClause('5.4  In the event of a data breach affecting Party B\u2019s data, Party A shall notify Party B within twenty-four (24) hours of discovery and take immediate remedial action.'),
    subClause('5.5  Upon termination of this Agreement, Party A shall, upon Party B\u2019s written request, export and provide Party B\u2019s data in a standard machine-readable format within fifteen (15) days.'),

    // ── ARTICLE 6 ──
    clauseHeading('Article 6  Term, Suspension, and Termination'),
    subClause('6.1  This Agreement shall commence on the Effective Date and shall continue for an initial term of one (1) year. It shall automatically renew for successive one (1) year terms unless either party provides at least thirty (30) days\u2019 written notice of non-renewal.'),
    subClause('6.2  If Party B fails to pay the subscription fee within fifteen (15) days after the due date, Party A may suspend Party B\u2019s access to the System. Access shall be restored within twenty-four (24) hours of full payment of the outstanding amount.'),
    subClause('6.3  If Party B fails to pay for two (2) consecutive months, Party A may terminate this Agreement upon fifteen (15) days\u2019 written notice. Party A shall notify Bishoftu City Police Office of such termination.'),
    subClause('6.4  Either party may terminate this Agreement immediately upon written notice if the other party commits a material breach that remains uncured for thirty (30) days after written notice of the breach.'),
    subClause('6.5  Party A may terminate this Agreement immediately if Party B uses the System for any unlawful purpose.'),

    // ── ARTICLE 7 ──
    clauseHeading('Article 7  Limitation of Liability'),
    subClause('7.1  Party A\u2019s total liability under this Agreement shall not exceed the total subscription fees paid by Party B in the twelve (12) months preceding the event giving rise to the claim.'),
    subClause('7.2  Party A shall not be liable for any indirect, incidental, or consequential damages, including but not limited to loss of revenue, loss of guests, or business interruption, arising out of or related to the System, except in cases of gross negligence or willful misconduct.'),
    subClause('7.3  Party B shall indemnify and hold harmless Party A from any claims, damages, or liabilities arising from Party B\u2019s failure to comply with applicable laws, including but not limited to failure to maintain accurate guest registration records as required by law.'),

    // ── ARTICLE 8 ──
    clauseHeading('Article 8  Force Majeure'),
    subClause('8.1  Neither party shall be liable for any failure or delay in performing its obligations if such failure or delay results from circumstances beyond its reasonable control, including natural disasters, government actions, internet outages, or power failures.'),
    subClause('8.2  The affected party shall notify the other party within five (5) business days and use reasonable efforts to resume performance.'),

    // ── ARTICLE 9 ──
    clauseHeading('Article 9  Dispute Resolution'),
    subClause('9.1  The parties shall first attempt to resolve any dispute through good-faith negotiation. If negotiation fails within fifteen (15) days, the dispute shall be referred to mediation.'),
    subClause('9.2  If mediation fails, the dispute shall be submitted to the courts of \u3010Oromia Regional State / Bishoftu City\u3011.'),

    // ── ARTICLE 10 ──
    clauseHeading('Article 10  Miscellaneous'),
    subClause('10.1  This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions and agreements.'),
    subClause('10.2  No amendment shall be valid unless in writing and signed by both parties.'),
    subClause('10.3  Party B may not assign this Agreement without Party A\u2019s prior written consent.'),
    subClause('10.4  If any provision is found invalid, the remaining provisions shall continue in full force.'),
    subClause('10.5  This Agreement may be executed in counterparts, each of which shall be deemed an original.'),
    new Paragraph({ spacing: { before: 600 }, children: [] }),

    // Signature Block
    clauseHeading('SIGNATURE BLOCK'),
    signatureBlock('\u3010Company Name\u3011', '\u3010Guest House Name\u3011'),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: { ascii: 'Times New Roman', eastAsia: 'SimSun' }, size: 24, color: '000000' }, paragraph: { spacing: { line: 360 } } } },
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838, orientation: 'portrait' }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '000000', font: { ascii: 'Times New Roman' } })] })] }) },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('/home/z/my-project/download/GuestHouse_Subscription_Agreement.docx', buffer);
  console.log('Contract 2 generated: GuestHouse_Subscription_Agreement.docx');
}

// ── Run ──
(async () => {
  try {
    await generateContract1();
    await generateContract2();
    console.log('Both contracts generated successfully.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
