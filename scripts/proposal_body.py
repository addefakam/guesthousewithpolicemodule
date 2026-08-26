#!/usr/bin/env python3
"""
Business Proposal PDF - Bishoftu GHMS with Police Integration
Report Route: ReportLab body (no cover in story)
"""

import os
import sys
import hashlib
import platform

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus.doctemplate import SimpleDocTemplate
from reportlab.pdfgen import canvas as pdfcanvas

# ─── Paths ─────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
BODY_PDF = os.path.join(SCRIPT_DIR, 'body.pdf')
COVER_PDF = os.path.join(SCRIPT_DIR, 'cover.pdf')
FINAL_PDF = os.path.join(OUTPUT_DIR, 'Bishoftu_GHMS_Business_Proposal.pdf')
ARCH_IMG = os.path.join(SCRIPT_DIR, 'arch_diagram.png')
OLD_NEW_IMG = os.path.join(SCRIPT_DIR, 'old_vs_new.png')

# ─── Fonts ─────────────────────────────────────────────────────
_IS_MAC = platform.system() == 'Darwin'
FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts') if _IS_MAC else '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold', italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# Install font fallback for mixed text
sys.path.insert(0, os.path.join(SCRIPT_DIR, '..', 'skills', 'pdf', 'scripts'))
from pdf import install_font_fallback
install_font_fallback()

# ━━ Cascade Palette (auto-generated) ━━
PAGE_BG       = colors.HexColor('#f4f4f5')
SECTION_BG    = colors.HexColor('#eeedef')
CARD_BG       = colors.HexColor('#e9e6eb')
TABLE_STRIPE  = colors.HexColor('#eceaed')
HEADER_FILL   = colors.HexColor('#684a78')
COVER_BLOCK   = colors.HexColor('#705b7b')
BORDER        = colors.HexColor('#c9c0ce')
ICON_COLOR    = colors.HexColor('#8846a9')
ACCENT        = colors.HexColor('#7a2ba1')
ACCENT_2      = colors.HexColor('#59cc59')
TEXT_PRIMARY  = colors.HexColor('#242226')
TEXT_MUTED    = colors.HexColor('#77717a')
SEM_SUCCESS   = colors.HexColor('#428f5c')
SEM_WARNING   = colors.HexColor('#8f7643')
SEM_ERROR     = colors.HexColor('#a54d45')
SEM_INFO      = colors.HexColor('#4a6785')

# ─── Styles ────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 72  # 1 inch
CONTENT_W = PAGE_W - 2 * MARGIN

# TOC styles
toc_level0 = ParagraphStyle(
    name='TOC0', fontName='FreeSerif-Bold', fontSize=12, leading=20,
    leftIndent=0, spaceBefore=6, spaceAfter=2, textColor=TEXT_PRIMARY
)
toc_level1 = ParagraphStyle(
    name='TOC1', fontName='FreeSerif', fontSize=10.5, leading=18,
    leftIndent=20, spaceBefore=2, spaceAfter=2, textColor=TEXT_MUTED
)

# Body styles
h1_style = ParagraphStyle(
    name='H1', fontName='FreeSerif-Bold', fontSize=20, leading=28,
    spaceBefore=18, spaceAfter=10, textColor=TEXT_PRIMARY
)
h2_style = ParagraphStyle(
    name='H2', fontName='FreeSerif-Bold', fontSize=14, leading=20,
    spaceBefore=14, spaceAfter=8, textColor=HEADER_FILL
)
h3_style = ParagraphStyle(
    name='H3', fontName='FreeSerif-Bold', fontSize=11.5, leading=17,
    spaceBefore=10, spaceAfter=6, textColor=TEXT_PRIMARY
)
body_style = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5, leading=18,
    alignment=TA_JUSTIFY, spaceBefore=0, spaceAfter=6, textColor=TEXT_PRIMARY
)
body_left = ParagraphStyle(
    name='BodyLeft', fontName='FreeSerif', fontSize=10.5, leading=18,
    alignment=TA_LEFT, spaceBefore=0, spaceAfter=6, textColor=TEXT_PRIMARY
)
caption_style = ParagraphStyle(
    name='Caption', fontName='FreeSerif-Italic', fontSize=9, leading=14,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=4, spaceAfter=12
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='FreeSerif', fontSize=10.5, leading=18,
    alignment=TA_LEFT, spaceBefore=2, spaceAfter=2, textColor=TEXT_PRIMARY,
    leftIndent=24, bulletIndent=12
)
# ─── TocDocTemplate ─────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.page_count = 0

    def afterPage(self):
        self.page_count += 1

    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def safe_keep(elements):
    total = 0
    for el in elements:
        w, h = el.wrap(CONTENT_W, PAGE_H)
        total += h
    if total <= PAGE_H * 0.4:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

# ─── Helpers ────────────────────────────────────────────────────
def make_table(headers, rows, col_widths=None):
    """Create a styled table with header row."""
    if col_widths is None:
        n = len(headers)
        col_widths = [CONTENT_W / n] * n
    
    hdr = [Paragraph(f'<b>{h}</b>', ParagraphStyle(
        name='TH', fontName='FreeSerif-Bold', fontSize=9.5, leading=14,
        textColor=colors.white, alignment=TA_CENTER
    )) for h in headers]
    
    data = [hdr]
    for row in rows:
        data.append([
            Paragraph(str(c), ParagraphStyle(
                name='TC', fontName='FreeSerif', fontSize=9.5, leading=14,
                textColor=TEXT_PRIMARY, alignment=TA_LEFT
            )) for c in row
        ])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

# ─── Build Story ────────────────────────────────────────────────
story = []

# --- TOC ---
toc = TableOfContents()
toc.levelStyles = [toc_level0, toc_level1]
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle(
    name='TOCTitle', fontName='FreeSerif-Bold', fontSize=22, leading=30,
    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=18
)))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# CHAPTER 1: EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════
story.append(add_heading('<b>1. Executive Summary</b>', h1_style, level=0))

story.append(Paragraph(
    'The Bishoftu Guest House Management System (GHMS) with Police Integration is a transformative digital platform '
    'designed to modernize the guest house industry across Bishoftu City and its three sub-city administrations: '
    'Cheleleka, Dibayyu, and Dukem. This proposal presents a comprehensive, technology-driven solution that addresses '
    'the critical gap between hospitality service management and public safety enforcement. The system digitizes '
    'guest house operations including reservations, room management, guest registration, payment tracking, and '
    'expense management, while simultaneously providing law enforcement agencies with real-time intelligence '
    'capabilities for suspect identification, geofence monitoring, and cross-referencing of guest records against '
    'wanted persons databases.',
    body_style
))
story.append(Paragraph(
    'Currently, guest houses in the Bishoftu area operate through manual, paper-based processes that create '
    'significant vulnerabilities in both service quality and security. Guest registration records exist in isolated '
    'ledgers, police verification depends entirely on phone calls and physical visits, and there is no centralized '
    'mechanism for tracking guest movement across multiple establishments. This fragmentation has created an environment '
    'where suspicious activities can go undetected, regulatory compliance cannot be effectively monitored, and the '
    'hospitality sector cannot reach its full economic potential. The proposed system eliminates these gaps by creating '
    'a unified digital ecosystem that serves all stakeholders simultaneously: guest house owners gain professional '
    'management tools, guests gain transparency and direct access to services, police gain real-time intelligence, '
    'and city administrators gain comprehensive oversight and regulatory enforcement capabilities.',
    body_style
))
story.append(Paragraph(
    'The platform is built on modern web technologies including Next.js 16, PostgreSQL, Prisma ORM, and Vercel cloud '
    'infrastructure, ensuring scalability, security, and reliability. A guest-facing Progressive Web Application (PWA) '
    'enables citizens to browse registered guest houses, view room availability, and report security concerns directly '
    'to law enforcement. The system has been designed with role-based access control supporting five distinct user '
    'roles: Superuser (system administrator), Operator (city administration), Police (law enforcement with ranked '
    'hierarchy), Staff (guest house employees), and Guests (public users). This multi-stakeholder architecture ensures '
    'that every party in the ecosystem has the precise access and tools they need, while maintaining strict data '
    'isolation between sensitive police intelligence and routine hospitality operations.',
    body_style
))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 2: PROBLEM STATEMENT - OLD SYSTEM DRAWBACKS
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>2. Problem Statement: Drawbacks of the Existing System</b>', h1_style, level=0))

story.append(Paragraph(
    'The current hospitality management landscape in Bishoftu City suffers from systemic inefficiencies that affect '
    'public safety, economic development, and regulatory compliance. Through extensive consultation with guest house '
    'operators, local police officials, and city administration representatives, the following critical drawbacks '
    'have been identified in the existing manual system. Each of these issues represents not merely an inconvenience '
    'but a structural failure that undermines the safety and prosperity of the community.',
    body_style
))

story.append(add_heading('<b>2.1 Paper-Based Guest Registration</b>', h2_style, level=1))
story.append(Paragraph(
    'Guest houses across Bishoftu currently rely on handwritten registration books to record guest information. '
    'These paper records are inherently vulnerable to damage, loss, and forgery. More critically, they are '
    'completely isolated from one another, meaning a guest who moves between multiple establishments leaves no '
    'connected trail. When police need to investigate a person of interest, they must physically visit each guest '
    'house individually and manually search through paper ledgers, a process that can take days or weeks and often '
    'yields incomplete results. The absence of a centralized digital database means that patterns of suspicious '
    'behavior, such as a single individual frequently changing locations or using different identification documents, '
    'are virtually impossible to detect under the current system.',
    body_style
))

story.append(add_heading('<b>2.2 No Real-Time Police Integration</b>', h2_style, level=1))
story.append(Paragraph(
    'There is currently no digital communication channel between guest houses and law enforcement agencies. '
    'Police officers must rely on informal relationships and physical visits to gather intelligence about guest '
    'activities. This creates dangerous delays in identifying and apprehending suspects. If a wanted criminal '
    'checks into a guest house, the establishment has no automated mechanism to flag this check-in to authorities. '
    'Similarly, if a guest reports suspicious activity, the report must travel through informal channels rather than '
    'being instantly routed to the nearest police station with precise location data and guest details. This lack of '
    'real-time integration has been identified by law enforcement as one of the most significant security gaps in the '
    'current hospitality oversight framework.',
    body_style
))

story.append(add_heading('<b>2.3 Absence of Regulatory Oversight</b>', h2_style, level=1))
story.append(Paragraph(
    'The city administration has no systematic way to track which guest houses are operating legally, whether they '
    'meet minimum standards, or whether they have renewed their operating licenses. Guest houses can operate for '
    'years without any inspection or compliance verification. There is no centralized registry of licensed establishments, '
    'no mechanism for tracking license renewals, and no standardized criteria for evaluating operational quality. '
    'This regulatory vacuum not only exposes guests to substandard and potentially unsafe accommodations but also '
    'creates opportunities for unlicensed establishments to operate outside the law, potentially harboring illegal '
    'activities without any risk of detection or consequence.',
    body_style
))

story.append(add_heading('<b>2.4 No Guest-Facing Service Discovery</b>', h2_style, level=1))
story.append(Paragraph(
    'Visitors and tourists arriving in Bishoftu have no digital platform to discover available guest houses, compare '
    'room prices, or verify the legitimacy of an establishment. This information asymmetry forces guests to rely on '
    'word-of-mouth recommendations or physical visits, which is particularly challenging for travelers arriving from '
    'other cities or countries. The absence of a public-facing platform also means guests have no channel to report '
    'problems such as safety concerns, overcharging, or fraudulent practices to the relevant authorities. This lack of '
    'transparency undermines consumer confidence in the local hospitality sector and limits the economic growth '
    'potential of the industry, as visitors cannot make informed choices about their accommodation.',
    body_style
))

story.append(add_heading('<b>2.5 Manual Financial and Operational Management</b>', h2_style, level=1))
story.append(Paragraph(
    'Guest house operators manage their businesses using a combination of paper ledgers, personal spreadsheets, and '
    'memory. Room availability is tracked manually on whiteboards or in notebooks, leading to frequent double-bookings '
    'and lost revenue. Financial records including payments, expenses, and tax obligations are maintained in informal '
    'systems that make accurate reporting impossible. The lack of professional management tools means guest house '
    'owners cannot analyze their business performance, identify trends, or make data-driven decisions about pricing, '
    'staffing, or facility improvements. This operational inefficiency directly limits the profitability and '
    'sustainability of guest house businesses in the region.',
    body_style
))

# Old vs New comparison image
story.append(Spacer(1, 18))
if os.path.exists(OLD_NEW_IMG):
    img = Image(OLD_NEW_IMG, width=CONTENT_W, height=CONTENT_W * 0.65)
    story.append(img)
    story.append(Paragraph('Figure 1: Comparison of Old Manual System vs. Proposed Digital System', caption_style))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 3: PROPOSED SOLUTION
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>3. Proposed Solution</b>', h1_style, level=0))

story.append(Paragraph(
    'The proposed Bishoftu Guest House Management System is a comprehensive, cloud-hosted digital platform that '
    'addresses every identified drawback of the current manual system. The solution is designed as a multi-tenant '
    'web application with five distinct interfaces tailored to the specific needs of each stakeholder group. '
    'Built on a modern technology stack, the system ensures reliability, security, and scalability while remaining '
    'accessible to users with varying levels of technical expertise. The following sections describe the core '
    'components and capabilities of the proposed system in detail.',
    body_style
))

story.append(add_heading('<b>3.1 System Architecture</b>', h2_style, level=1))
story.append(Paragraph(
    'The system follows a four-layer architecture that ensures clean separation of concerns, maintainability, and '
    'security. The Presentation Layer consists of four distinct user interfaces: a mobile Progressive Web App for '
    'guests, a comprehensive admin dashboard for superusers and operators, a dedicated police intelligence portal, '
    'and a staff management dashboard for guest house employees. Each interface is designed with mobile-first '
    'principles to ensure accessibility across all device types. The API Gateway Layer is built on Next.js server-side '
    'route handlers and provides RESTful endpoints for all system operations, with public endpoints for guest-facing '
    'features and authenticated endpoints for administrative and police functions. The Intelligence and Security Engine '
    'operates as a middleware layer that performs automated suspect matching, geofence monitoring, anomaly detection, '
    'and comprehensive audit logging. The Data Layer uses PostgreSQL as the primary database with Prisma ORM for '
    'type-safe data access, managed through 20+ relational tables covering every aspect of guest house operations and '
    'police intelligence. The system is deployed on Vercel cloud infrastructure for automatic scaling, global edge '
    'deployment, and continuous integration and delivery.',
    body_style
))

# Architecture diagram
if os.path.exists(ARCH_IMG):
    from PIL import Image as PILImage
    pimg = PILImage.open(ARCH_IMG)
    img_w, img_h = pimg.size
    aspect = img_h / img_w
    display_w = CONTENT_W
    display_h = display_w * aspect
    if display_h > 400:
        display_h = 400
        display_w = display_h / aspect
    img = Image(ARCH_IMG, width=display_w, height=display_h)
    story.append(Spacer(1, 12))
    story.append(img)
    story.append(Paragraph('Figure 2: System Architecture Overview - Four-Layer Design', caption_style))

story.append(add_heading('<b>3.2 Guest House Management Module</b>', h2_style, level=1))
story.append(Paragraph(
    'The guest house management module provides a complete digital solution for daily operations. Room management '
    'supports five room types (Single, Double, Twin, Suite, and Deluxe) with real-time availability tracking across '
    'four status states (Available, Occupied, Maintenance, and Reserved). The reservation system handles the full '
    'lifecycle from booking creation through check-in, check-out, and cancellation, with support for multiple payment '
    'methods including cash, bank transfer, card, and mobile money. Guest registration captures comprehensive '
    'information including identification documents, nationality, and full address details broken down by region, '
    'zone, woreda, and kebele for precise geographic tracking. Financial management includes expense tracking '
    'with categorized entries, payment recording with receipt numbers, and tax calculation support. Housekeeping '
    'task management enables scheduling of cleaning, maintenance, and inspection tasks with assignment tracking '
    'and completion status monitoring. The module also supports daytime service bookings for hourly services such '
    'as conference room usage, laundry, and dining, providing guest houses with additional revenue stream management.',
    body_style
))

story.append(add_heading('<b>3.3 Police Intelligence and Security Module</b>', h2_style, level=1))
story.append(Paragraph(
    'The police intelligence module represents the most significant innovation in this system, providing law '
    'enforcement with capabilities that were previously impossible under the manual system. The Suspected Persons '
    'database allows police to maintain a comprehensive registry of persons of interest with severity ratings '
    '(Low, Medium, High, Critical), identification documents, and behavioral descriptions. When a new guest checks '
    'into any registered guest house, the system automatically cross-references the guest information against this '
    'database and generates real-time match alerts when potential matches are detected. The Geofence feature enables '
    'police to define virtual perimeters around sensitive locations, with automatic alerts triggered when registered '
    'guests enter or exit these zones. The Frequent Stay Analysis engine identifies patterns such as guests who '
    'stay at unusually short intervals across multiple establishments, a behavior pattern that may indicate '
    'surveillance, drug trafficking, or other illicit activities. All police actions within the system are recorded '
    'in a comprehensive Audit Log that tracks the officer name, action type, target, IP address, and timestamp, '
    'ensuring full accountability and traceability of law enforcement access to sensitive guest data.',
    body_style
))

# Police features table
story.append(Spacer(1, 12))
police_headers = ['Feature', 'Description', 'Impact']
police_rows = [
    ['Suspect Matching', 'Auto cross-reference every check-in against suspect database', 'Real-time threat detection'],
    ['Geofence Alerts', 'Virtual perimeters with automatic entry/exit notifications', 'Location-based security monitoring'],
    ['Frequent Stay Analysis', 'Pattern detection for guests moving between establishments', 'Early warning for suspicious behavior'],
    ['Audit Logging', 'Full traceability of all police data access and actions', 'Accountability and transparency'],
    ['Data Export', 'Structured intelligence reports for investigations', 'Evidence-grade documentation'],
    ['Provider Suspension', 'Emergency closure authority for non-compliant houses', 'Rapid regulatory enforcement'],
]
story.append(make_table(police_headers, police_rows, [CONTENT_W*0.22, CONTENT_W*0.50, CONTENT_W*0.28]))
story.append(Paragraph('Table 1: Police Intelligence and Security Module Features', caption_style))

story.append(add_heading('<b>3.4 Guest-Facing Mobile Application (PWA)</b>', h2_style, level=1))
story.append(Paragraph(
    'The guest-facing Progressive Web Application provides citizens with a modern, mobile-optimized interface for '
    'discovering and engaging with registered guest houses in the Bishoftu area. The PWA features a searchable '
    'directory of all approved guest houses organized by sub-city (Cheleleka, Dibayyu, and Dukem), allowing visitors '
    'to filter by location and search by name. Each guest house listing displays the property name, location details, '
    'available room count, and minimum nightly rate. The application includes a prominent "Call Police" button that '
    'connects guests directly to the Bishoftu police emergency line, ensuring that any security concern can be '
    'reported immediately. The PWA is designed as an installable application that can be added to a phone home screen '
    'for instant access, functioning like a native app without requiring installation from an app store. This approach '
    'ensures maximum accessibility across all smartphone types and eliminates the barrier of app store discovery '
    'and download requirements.',
    body_style
))

story.append(add_heading('<b>3.5 Administrative and Compliance Module</b>', h2_style, level=1))
story.append(Paragraph(
    'The administrative module provides city administrators (Superusers and Operators) with comprehensive oversight '
    'tools for managing the entire guest house ecosystem. Provider registration requires submission of business '
    'license information, physical address broken down by administrative hierarchy (sub-city, woreda), and contact details. '
    'All new registrations undergo administrative review before activation, ensuring that only legitimate, licensed '
    'establishments appear in the public system. The subscription management system supports four billing cycles '
    '(Monthly, Quarterly, Semi-Annual, and Yearly) with automated payment tracking and renewal notifications. '
    'Administrators can view comprehensive dashboards showing registration statistics, subscription compliance rates, '
    'and system-wide operational metrics. The system also supports joint operations between police and city '
    'administration through shared emergency response tools and unified user management for cross-agency collaboration.',
    body_style
))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 4: SYSTEM VISIBILITY AND PROJECT IMPACT
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>4. System Visibility and Project Impact</b>', h1_style, level=0))

story.append(Paragraph(
    'The visibility of this project extends across multiple dimensions, encompassing public safety improvements, '
    'economic development, regulatory modernization, and technological advancement. This section outlines the '
    'tangible and measurable impacts that the system will deliver to each stakeholder group and the broader '
    'Bishoftu community. The project is designed not merely as a software deployment but as a foundational '
    'infrastructure investment that will transform how the hospitality sector operates and interacts with law '
    'enforcement for years to come.',
    body_style
))

story.append(add_heading('<b>4.1 Public Safety Enhancement</b>', h2_style, level=1))
story.append(Paragraph(
    'The most immediate and impactful benefit of this system is the dramatic enhancement of public safety through '
    'real-time intelligence sharing between guest houses and police. The automated suspect matching system will '
    'reduce the time required to identify a wanted person checking into a guest house from days or weeks under the '
    'current manual system to seconds. The geofence monitoring capability provides continuous, automated surveillance '
    'of sensitive areas without requiring additional police personnel. The frequent stay analysis engine will '
    'enable proactive identification of suspicious patterns before crimes occur, shifting the security posture from '
    'reactive investigation to proactive prevention. The direct police communication channel in the guest mobile '
    'application empowers citizens to report security concerns instantly, creating a community-wide safety network '
    'that extends the reach of law enforcement beyond what traditional policing methods can achieve.',
    body_style
))

story.append(add_heading('<b>4.2 Economic Development</b>', h2_style, level=1))
story.append(Paragraph(
    'The system will drive economic growth in the Bishoftu hospitality sector through several mechanisms. The public '
    'guest-facing platform will increase visibility for registered guest houses, connecting them with potential '
    'customers who previously had no way to discover their services. Professional management tools will help guest '
    'house operators improve operational efficiency, reduce double-bookings, and optimize room pricing, directly '
    'increasing revenue per available room. The subscription-based compliance model creates a sustainable revenue '
    'stream for system maintenance while ensuring that only serious, committed operators participate in the formal '
    'economy. As the system demonstrates its effectiveness in improving both safety and service quality, Bishoftu will '
    'gain a reputation as a well-regulated, safe destination for both domestic and international visitors, attracting '
    'additional tourism revenue and encouraging further investment in the hospitality sector.',
    body_style
))

story.append(add_heading('<b>4.3 Regulatory Modernization</b>', h2_style, level=1))
story.append(Paragraph(
    'For city administrators, this system provides the first comprehensive digital tool for regulating the guest house '
    'industry. The centralized provider registry gives administrators real-time visibility into which establishments are '
    'operating, their license status, and their compliance history. Subscription tracking automates what was previously '
    'a manual and unreliable process of tracking license renewals and fee payments. The dashboard analytics provide '
    'data-driven insights into industry trends, enabling evidence-based policy decisions. The system creates an '
    'auditable record of all administrative actions, ensuring transparency and accountability in regulatory '
    'enforcement. This digital transformation of regulatory processes sets a precedent that can be extended to other '
    'sectors of city administration, establishing Bishoftu as a leader in digital governance within the Oromia region.',
    body_style
))

story.append(add_heading('<b>4.4 Key Performance Indicators</b>', h2_style, level=1))
story.append(Paragraph(
    'The success of this project will be measured against the following key performance indicators, which have been '
    'designed to provide clear, quantifiable metrics for evaluating the system impact across all stakeholder groups. '
    'These KPIs will be tracked through the system built-in analytics dashboard and reported to city administration '
    'on a quarterly basis.',
    body_style
))

kpi_headers = ['KPI', 'Current Baseline', 'Target (Year 1)', 'Target (Year 2)']
kpi_rows = [
    ['Guest house registration rate', 'Unknown (no tracking)', '80% of operating houses', '95% coverage'],
    ['Suspect identification time', 'Days to weeks (manual)', 'Under 5 minutes (automated)', 'Real-time (instant)'],
    ['Guest satisfaction score', 'Not measured', '3.5 / 5.0 average', '4.2 / 5.0 average'],
    ['Revenue per room (avg increase)', 'Not tracked', '15% improvement', '25% improvement'],
    ['Police response time', 'Hours (physical visit)', 'Minutes (digital alert)', 'Minutes (direct PWA call)'],
    ['Compliance rate (licenses)', 'Estimated below 50%', '75% compliance', '90% compliance'],
    ['Digital check-in adoption', '0% (all paper)', '60% digital registrations', '85% digital registrations'],
]
story.append(Spacer(1, 12))
story.append(make_table(kpi_headers, kpi_rows, [CONTENT_W*0.30, CONTENT_W*0.22, CONTENT_W*0.24, CONTENT_W*0.24]))
story.append(Paragraph('Table 2: Key Performance Indicators and Targets', caption_style))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 5: TECHNOLOGY STACK
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>5. Technology Stack</b>', h1_style, level=0))

story.append(Paragraph(
    'The system is built on a carefully selected technology stack that prioritizes reliability, security, '
    'scalability, and maintainability. Each technology choice has been made to ensure that the system can serve '
    'the Bishoftu community effectively while being maintainable by local developers and sustainable within the '
    'available infrastructure. The following table summarizes the core technologies and their roles within the system.',
    body_style
))

tech_headers = ['Component', 'Technology', 'Purpose']
tech_rows = [
    ['Frontend Framework', 'Next.js 16 + React', 'Full-stack web application with server-side rendering'],
    ['UI Components', 'Tailwind CSS + shadcn/ui', 'Professional, responsive interface design'],
    ['Database', 'PostgreSQL', 'Relational data storage with advanced querying'],
    ['ORM', 'Prisma', 'Type-safe database access and migration management'],
    ['Authentication', 'JWT + bcrypt', 'Secure role-based access control'],
    ['Hosting', 'Vercel Cloud', 'Automatic scaling, CI/CD, global edge deployment'],
    ['Guest App', 'Progressive Web App (PWA)', 'Installable mobile experience without app store'],
    ['Real-time Alerts', 'REST API + Web hooks', 'Instant suspect matching and geofence notifications'],
]
story.append(Spacer(1, 12))
story.append(make_table(tech_headers, tech_rows, [CONTENT_W*0.20, CONTENT_W*0.30, CONTENT_W*0.50]))
story.append(Paragraph('Table 3: Technology Stack Summary', caption_style))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 6: IMPLEMENTATION ROADMAP
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>6. Implementation Roadmap</b>', h1_style, level=0))

story.append(Paragraph(
    'The implementation of this system will follow a phased approach designed to minimize disruption to ongoing '
    'operations while delivering incremental value at each stage. The roadmap has been designed in consultation '
    'with stakeholders to ensure that the most critical capabilities are deployed first, building momentum and '
    'demonstrating value before proceeding to more advanced features.',
    body_style
))

roadmap_headers = ['Phase', 'Duration', 'Deliverables', 'Success Criteria']
roadmap_rows = [
    ['Phase 1: Foundation', 'Months 1-3', 'Core platform, provider registration, admin dashboard, basic room and reservation management', '10+ guest houses registered and actively using the system'],
    ['Phase 2: Security', 'Months 3-5', 'Police intelligence module, suspect database, automated matching, audit logging', 'Police actively using the system for suspect verification'],
    ['Phase 3: Public Access', 'Months 5-7', 'Guest PWA launch, public directory, direct police communication, sub-city filtering', 'PWA installed by 100+ users within first month'],
    ['Phase 4: Intelligence', 'Months 7-9', 'Geofence monitoring, frequent stay analysis, anomaly detection, data export tools', 'At least 2 geofence zones actively monitored'],
    ['Phase 5: Scale', 'Months 9-12', 'Subscription management, analytics dashboards, performance optimization, city-wide expansion', 'All sub-cities (Cheleleka, Dibayyu, Dukem) fully onboarded'],
]
story.append(Spacer(1, 12))
story.append(make_table(roadmap_headers, roadmap_rows, [CONTENT_W*0.15, CONTENT_W*0.12, CONTENT_W*0.43, CONTENT_W*0.30]))
story.append(Paragraph('Table 4: Implementation Roadmap and Phased Delivery Plan', caption_style))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 7: BUDGET ESTIMATE
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>7. Budget Estimate</b>', h1_style, level=0))

story.append(Paragraph(
    'The following budget estimate provides a high-level overview of the investment required to implement and '
    'operate the Bishoftu Guest House Management System. The estimates are based on current market rates for '
    'cloud infrastructure, software development, and training services within Ethiopia. The budget is structured '
    'to demonstrate that a high-impact digital platform can be deployed within a reasonable investment envelope, '
    'with the subscription model providing a path to long-term financial sustainability that reduces dependence on '
    'continued government funding.',
    body_style
))

budget_headers = ['Category', 'Description', 'Estimated Cost (ETB)']
budget_rows = [
    ['Platform Development', 'Full-stack development, testing, and deployment of all modules', '1,500,000'],
    ['Cloud Infrastructure (Year 1)', 'Vercel hosting, PostgreSQL database, domain, SSL certificates', '120,000'],
    ['Training and Onboarding', 'Staff training for guest houses, police, and administrators', '200,000'],
    ['PWA Design and Testing', 'Mobile interface design, usability testing, icon and asset creation', '150,000'],
    ['Project Management', 'Coordination, stakeholder engagement, progress monitoring', '180,000'],
    ['Contingency (15%)', 'Risk buffer for unforeseen requirements and scope adjustments', '322,500'],
    ['Total Investment', 'Complete first-year implementation and operational costs', '2,472,500'],
]
story.append(Spacer(1, 12))
story.append(make_table(budget_headers, budget_rows, [CONTENT_W*0.25, CONTENT_W*0.50, CONTENT_W*0.25]))
story.append(Paragraph('Table 5: Budget Estimate for First-Year Implementation', caption_style))

story.append(Paragraph(
    'The projected annual operational cost from Year 2 onward is estimated at approximately 250,000 ETB, covering '
    'cloud hosting, maintenance, and support. This operational cost can be fully offset by the subscription revenue '
    'model, where each registered guest house pays a monthly or quarterly subscription fee. With a target of 50 '
    'registered guest houses paying an average of 500 ETB per month, the projected annual subscription revenue would '
    'be 300,000 ETB, making the system financially self-sustaining from the second year of operation.',
    body_style
))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 8: CONCLUSION AND RECOMMENDATION
# ═══════════════════════════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>8. Conclusion and Recommendation</b>', h1_style, level=0))

story.append(Paragraph(
    'The Bishoftu Guest House Management System with Police Integration represents a critical investment in the '
    'safety, economic development, and regulatory modernization of the Bishoftu City hospitality sector. The current '
    'manual system creates unacceptable gaps in public safety, limits economic growth, and prevents effective '
    'regulatory oversight. The proposed digital platform addresses all of these challenges through a single, '
    'integrated solution that serves every stakeholder in the ecosystem: guest house operators gain professional '
    'management tools, guests gain transparency and safety, police gain real-time intelligence capabilities, and '
    'city administrators gain comprehensive oversight and regulatory enforcement tools.',
    body_style
))

story.append(Paragraph(
    'The technology stack has been selected for reliability, scalability, and local maintainability. The phased '
    'implementation roadmap ensures that the most critical capabilities are delivered first, building stakeholder '
    'confidence and demonstrating value before advancing to more sophisticated features. The budget is designed to be '
    'achievable within current fiscal constraints while the subscription model ensures long-term financial sustainability. '
    'We respectfully recommend that the Bishoftu City Administration and Oromia Police Commission approve this '
    'proposal and allocate the necessary resources to begin Phase 1 implementation at the earliest opportunity. The '
    'sooner this system is deployed, the sooner the community will benefit from enhanced safety, improved services, '
    'and stronger regulatory oversight of the guest house industry.',
    body_style
))

# ─── Page Number Drawing ──────────────────────────────────────
# Override afterPage to draw page numbers directly
_orig_after_page = TocDocTemplate.afterPage

def _after_page_with_num(self):
    _orig_after_page(self)
    self.canv.saveState()
    self.canv.setFont('FreeSerif', 9)
    self.canv.setFillColor(TEXT_MUTED)
    self.canv.drawCentredString(PAGE_W / 2, 36, f'{self.page}')
    self.canv.restoreState()

TocDocTemplate.afterPage = _after_page_with_num

# ─── Build Body PDF ─────────────────────────────────────────────
doc = TocDocTemplate(
    BODY_PDF,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title='Bishoftu GHMS Business Proposal',
    author='Bishoftu City Administration',
    subject='Business Proposal for Guest House Management System with Police Integration'
)

doc.multiBuild(story)
print(f'Body PDF built: {BODY_PDF}')
