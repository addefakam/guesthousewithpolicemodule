#!/usr/bin/env python3
"""
Generate diagrams for Bishoftu GHMS Business Proposal.
Diagrams: System Architecture, Old vs New Comparison, Data Flow, Security Model,
Implementation Phases, Impact Metrics.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np
import os

OUT = '/home/z/my-project/download/proposal_assets'
os.makedirs(OUT, exist_ok=True)

# Color palette - professional government/official style
C = {
    'dark': '#1B2A4A',
    'primary': '#2C5282',
    'secondary': '#3182CE',
    'accent': '#38A169',
    'accent2': '#D69E2E',
    'danger': '#E53E3E',
    'light_blue': '#EBF8FF',
    'light_green': '#F0FFF4',
    'light_yellow': '#FFFFF0',
    'light_red': '#FFF5F5',
    'light_gray': '#F7FAFC',
    'gray': '#A0AEC0',
    'text': '#2D3748',
    'white': '#FFFFFF',
}

fm.fontManager.addfont('/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf')
plt.rcParams['font.sans-serif'] = ['Noto Serif SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ====================================================================
# DIAGRAM 1: System Architecture Overview
# ====================================================================
def draw_system_architecture():
    fig, ax = plt.subplots(1, 1, figsize=(14, 10))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Title
    ax.text(7, 9.6, 'Bishoftu GHMS - System Architecture', ha='center', va='center',
            fontsize=18, fontweight='bold', color=C['dark'])

    # === USER LAYER (top) ===
    users = [
        ('Guest (PWA)', 2, 8.2, C['accent']),
        ('Guest House\nOperator', 5, 8.2, C['primary']),
        ('Police\nAdmin', 8, 8.2, C['danger']),
        ('System\nAdmin', 11, 8.2, C['accent2']),
    ]
    for label, x, y, color in users:
        box = FancyBboxPatch((x-1.1, y-0.5), 2.2, 1.0, boxstyle="round,pad=0.1",
                               facecolor=color, edgecolor='white', alpha=0.9, linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center', fontsize=10, fontweight='bold', color='white')

    ax.text(0.3, 8.2, 'USER LAYER', ha='left', va='center', fontsize=9, fontweight='bold', color=C['gray'], rotation=90)

    # Arrows down
    for x in [2, 5, 8, 11]:
        ax.annotate('', xy=(x, 7.1), xytext=(x, 7.6),
                    arrowprops=dict(arrowstyle='->', color=C['gray'], lw=1.5))

    # === API GATEWAY LAYER ===
    api_items = [
        ('Public API\n/api/guest/*', 2, 6.5, C['light_green']),
        ('Auth API\n/api/auth/*', 5, 6.5, C['light_blue']),
        ('Police API\n/api/police-*', 8, 6.5, C['light_red']),
        ('Admin API\n/api/superuser/*', 11, 6.5, C['light_yellow']),
    ]
    for label, x, y, color in api_items:
        box = FancyBboxPatch((x-1.1, y-0.5), 2.2, 1.0, boxstyle="round,pad=0.1",
                               facecolor=color, edgecolor=C['primary'], alpha=0.8, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center', fontsize=8.5, color=C['dark'])

    ax.text(0.3, 6.5, 'API GATEWAY', ha='left', va='center', fontsize=9, fontweight='bold', color=C['gray'], rotation=90)

    # Arrows down
    for x in [2, 5, 8, 11]:
        ax.annotate('', xy=(x, 5.5), xytext=(x, 5.9),
                    arrowprops=dict(arrowstyle='->', color=C['gray'], lw=1.5))

    # === BUSINESS LOGIC LAYER ===
    logic_items = [
        ('Guest House\nManagement', 3.5, 4.8, C['primary']),
        ('Room &\nReservation', 6, 4.8, C['secondary']),
        ('Police Intelligence\n& Security', 8.5, 4.8, C['danger']),
        ('Admin &\nSubscription', 11, 4.8, C['accent2']),
    ]
    for label, x, y, color in logic_items:
        box = FancyBboxPatch((x-1.1, y-0.5), 2.2, 1.0, boxstyle="round,pad=0.1",
                               facecolor=color, edgecolor='white', alpha=0.85, linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center', fontsize=8.5, fontweight='bold', color='white')

    ax.text(0.3, 4.8, 'BUSINESS LOGIC', ha='left', va='center', fontsize=9, fontweight='bold', color=C['gray'], rotation=90)

    # Arrows down to DB
    for x in [3.5, 6, 8.5, 11]:
        ax.annotate('', xy=(x, 3.5), xytext=(x, 4.2),
                    arrowprops=dict(arrowstyle='->', color=C['gray'], lw=1.5))

    # === DATABASE LAYER ===
    db_box = FancyBboxPatch((2, 2.5), 10, 1.0, boxstyle="round,pad=0.15",
                            facecolor=C['dark'], edgecolor=C['primary'], alpha=0.9, linewidth=2)
    ax.add_patch(db_box)
    ax.text(7, 3.0, 'PostgreSQL Database + Prisma ORM', ha='center', va='center',
            fontsize=13, fontweight='bold', color='white')
    ax.text(0.3, 3.0, 'DATA LAYER', ha='left', va='center', fontsize=9, fontweight='bold', color=C['gray'], rotation=90)

    # === DEPLOYMENT ===
    dep_items = [
        ('Vercel Cloud', 3, 1.5),
        ('Next.js 16', 6, 1.5),
        ('Prisma + PostgreSQL', 10, 1.5),
    ]
    ax.text(0.3, 1.5, 'DEPLOYMENT', ha='left', va='center', fontsize=9, fontweight='bold', color=C['gray'], rotation=90)
    for label, x, y in dep_items:
        ax.text(x, y, label, ha='center', va='center', fontsize=9, color=C['text'],
                bbox=dict(boxstyle='round,pad=0.3', facecolor=C['light_gray'], edgecolor=C['gray'], alpha=0.7))

    # Horizontal line separating police module
    ax.plot([7.2, 12.5], [7.0, 7.0], '--', color=C['danger'], alpha=0.4, lw=1)
    ax.text(12.6, 7.0, 'Police Module', fontsize=7, color=C['danger'], va='center', style='italic')

    plt.tight_layout()
    plt.savefig(f'{OUT}/01_system_architecture.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 01_system_architecture')


# ====================================================================
# DIAGRAM 2: Old System vs New System
# ====================================================================
def draw_old_vs_new():
    fig, axes = plt.subplots(1, 2, figsize=(14, 8))

    for ax, title, items, color in [
        (axes[0], 'OLD SYSTEM (Manual)', [
            ('Paper-based guest registration', 'X'),
            ('No real-time room tracking', 'X'),
            ('Manual police communication', 'X'),
            ('No guest house license tracking', 'X'),
            ('No city-wide visibility', 'X'),
            ('No suspect identification', 'X'),
            ('No revenue reporting', 'X'),
            ('No subscription management', 'X'),
        ], C['danger']),
        (axes[1], 'NEW SYSTEM (GHMS + Police)', [
            ('Digital guest registration', 'check'),
            ('Real-time room availability', 'check'),
            ('Direct police integration', 'check'),
            ('Automated license verification', 'check'),
            ('City-wide dashboard', 'check'),
            ('AI-powered suspect matching', 'check'),
            ('Automated revenue analytics', 'check'),
            ('Subscription lifecycle mgmt', 'check'),
        ], C['accent'])
    ]:
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')

        # Title
        ax.text(5, 9.5, title, ha='center', va='center', fontsize=14, fontweight='bold', color=color)

        y_start = 8.5
        for i, (text, icon) in enumerate(items):
            y = y_start - i * 1.0
            if icon == 'X':
                bg_color = C['light_red']
                icon_text = 'X'
                icon_color = C['danger']
            else:
                bg_color = C['light_green']
                icon_text = 'check'
                icon_color = C['accent']

            box = FancyBboxPatch((0.5, y-0.35), 9, 0.7, boxstyle="round,pad=0.08",
                                   facecolor=bg_color, edgecolor=color, alpha=0.5, linewidth=1)
            ax.add_patch(box)
            ax.text(1.2, y, icon_text, ha='center', va='center', fontsize=16,
                    fontweight='bold', color=icon_color)
            ax.text(2.0, y, text, ha='left', va='center', fontsize=10, color=C['text'])

    plt.tight_layout()
    plt.savefig(f'{OUT}/02_old_vs_new.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 02_old_vs_new')


# ====================================================================
# DIAGRAM 3: Data Flow Diagram
# ====================================================================
def draw_data_flow():
    fig, ax = plt.subplots(1, 1, figsize=(14, 8))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')

    ax.text(7, 7.6, 'Data Flow - Guest House to Police Integration', ha='center', fontsize=16, fontweight='bold', color=C['dark'])

    # Flow nodes
    nodes = [
        (1.5, 5.5, 'Guest\nArrival', C['primary']),
        (4.0, 5.5, 'Operator\nCheck-in', C['secondary']),
        (6.5, 5.5, 'System\nDatabase', C['dark']),
        (9.0, 5.5, 'Suspect\nMatching', C['danger']),
        (11.5, 5.5, 'Police\nAlert', C['danger']),
        (4.0, 2.5, 'Room\nAssignment', C['accent']),
        (6.5, 2.5, 'Revenue\nTracking', C['accent2']),
        (9.0, 2.5, 'City-Wide\nDashboard', C['primary']),
    ]

    for x, y, label, color in nodes:
        box = FancyBboxPatch((x-0.9, y-0.55), 1.8, 1.1, boxstyle="round,pad=0.1",
                               facecolor=color, edgecolor='white', alpha=0.9, linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center', fontsize=9, fontweight='bold', color='white')

    # Arrows
    arrows = [
        (2.5, 5.5, 3.0, 5.5),
        (5.0, 5.5, 5.5, 5.5),
        (7.5, 5.5, 8.0, 5.5),
        (10.0, 5.5, 10.5, 5.5),
        (4.0, 4.9, 4.0, 3.2),
        (5.0, 2.5, 5.5, 2.5),
        (7.5, 2.5, 8.0, 2.5),
        (6.5, 4.9, 6.5, 3.2),
    ]
    for x1, y1, x2, y2 in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=C['gray'], lw=2))

    # Labels on arrows
    ax.text(2.75, 5.85, 'ID +\nDetails', fontsize=7, color=C['gray'], ha='center')
    ax.text(5.25, 5.85, 'Store\nRecord', fontsize=7, color=C['gray'], ha='center')
    ax.text(7.75, 5.85, 'Auto\nCheck', fontsize=7, color=C['danger'], ha='center')
    ax.text(10.25, 5.85, 'Alert\nNotify', fontsize=7, color=C['danger'], ha='center')

    plt.tight_layout()
    plt.savefig(f'{OUT}/03_data_flow.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 03_data_flow')


# ====================================================================
# DIAGRAM 4: Security & Access Control
# ====================================================================
def draw_security_model():
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')

    ax.text(6, 7.6, 'Role-Based Access Control & Security Model', ha='center', fontsize=16, fontweight='bold', color=C['dark'])

    roles = [
        ('SUPERUSER\n(System Admin)', 2, 6.0, C['accent2'], ['Full system control', 'User management', 'Subscription mgmt', 'Audit logs', 'Joint operations']),
        ('POLICE\n(Law Enforcement)', 6, 6.0, C['danger'], ['Suspect matching', 'Guest surveillance', 'Emergency actions', 'Intelligence reports', 'Room monitoring']),
        ('OPERATOR\n(Guest House)', 10, 6.0, C['primary'], ['Room management', 'Reservations', 'Guest check-in', 'Housekeeping', 'Expenses']),
    ]

    for label, x, y, color, perms in roles:
        box = FancyBboxPatch((x-1.3, y-0.5), 2.6, 1.0, boxstyle="round,pad=0.1",
                               facecolor=color, edgecolor='white', alpha=0.9, linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center', fontsize=9, fontweight='bold', color='white')

        # Permissions below
        for j, perm in enumerate(perms):
            py = y - 1.1 - j * 0.65
            ax.text(x, py, perm, ha='center', va='center', fontsize=8, color=C['text'],
                    bbox=dict(boxstyle='round,pad=0.25', facecolor=C['light_gray'], edgecolor=color, alpha=0.4, lw=0.8))

    # Joint operations connector
    ax.annotate('', xy=(3.4, 6.0), xytext=(4.6, 6.0),
                arrowprops=dict(arrowstyle='<->', color=C['accent'], lw=2, linestyle='dashed'))
    ax.text(4.0, 6.3, 'Joint\nSession', ha='center', fontsize=7, color=C['accent'], fontweight='bold')

    plt.tight_layout()
    plt.savefig(f'{OUT}/04_security_model.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 04_security_model')


# ====================================================================
# DIAGRAM 5: Implementation Phases
# ====================================================================
def draw_implementation_phases():
    fig, ax = plt.subplots(1, 1, figsize=(14, 6))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 6)
    ax.axis('off')

    ax.text(7, 5.6, 'Implementation Roadmap', ha='center', fontsize=16, fontweight='bold', color=C['dark'])

    phases = [
        ('Phase 1', 'Foundation', 'Database setup, user auth,\nprovider registration,\nroom management', C['primary'], 1.5),
        ('Phase 2', 'Operations', 'Reservations, guests,\nhousekeeping, expenses,\nreporting', C['secondary'], 4.5),
        ('Phase 3', 'Police Module', 'Suspect matching, intelligence,\nemergency actions, audits,\ngeofencing', C['danger'], 7.5),
        ('Phase 4', 'Public Access', 'Guest PWA app, public API,\nmobile-friendly interface,\nPWA icons', C['accent'], 10.5),
    ]

    for phase_num, title, desc, color, x in phases:
        # Phase box
        box = FancyBboxPatch((x-1.2, 1.5), 2.4, 3.5, boxstyle="round,pad=0.12",
                               facecolor=color, edgecolor='white', alpha=0.12, linewidth=2)
        ax.add_patch(box)
        # Phase header
        header = FancyBboxPatch((x-1.2, 4.2), 2.4, 0.8, boxstyle="round,pad=0.1",
                               facecolor=color, edgecolor='white', alpha=0.9, linewidth=1.5)
        ax.add_patch(header)
        ax.text(x, 4.6, phase_num, ha='center', va='center', fontsize=10, fontweight='bold', color='white')
        ax.text(x, 3.7, title, ha='center', va='center', fontsize=11, fontweight='bold', color=color)
        ax.text(x, 2.5, desc, ha='center', va='center', fontsize=8, color=C['text'], linespacing=1.5)

    # Arrows between phases
    for i in range(3):
        x1 = phases[i][4] + 1.3
        x2 = phases[i+1][4] - 1.3
        ax.annotate('', xy=(x2, 3.25), xytext=(x1, 3.25),
                    arrowprops=dict(arrowstyle='->', color=C['gray'], lw=2))

    plt.tight_layout()
    plt.savefig(f'{OUT}/05_implementation_phases.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 05_implementation_phases')


# ====================================================================
# DIAGRAM 6: Impact Metrics
# ====================================================================
def draw_impact_metrics():
    fig, axes = plt.subplots(1, 3, figsize=(14, 5))

    # Chart 1: Before vs After comparison
    cats = ['Registration\nTime', 'Room\nTracking', 'Police\nResponse', 'Revenue\nVisibility', 'Guest\nSafety']
    before = [45, 20, 60, 15, 30]
    after = [5, 95, 90, 85, 90]
    x = np.arange(len(cats))
    w = 0.35
    axes[0].bar(x - w/2, before, w, color=C['danger'], alpha=0.7, label='Old System')
    axes[0].bar(x + w/2, after, w, color=C['accent'], alpha=0.7, label='New System')
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(cats, fontsize=8)
    axes[0].set_ylabel('Efficiency (%)', fontsize=9)
    axes[0].set_title('Operational Efficiency', fontsize=11, fontweight='bold', color=C['dark'])
    axes[0].legend(fontsize=8)
    axes[0].set_ylim(0, 110)
    axes[0].spines['top'].set_visible(False)
    axes[0].spines['right'].set_visible(False)

    # Chart 2: Sub-city coverage
    subcities = ['Cheleleka', 'Dibayyu', 'Dukem']
    registered = [8, 12, 15]
    approved = [6, 10, 13]
    x2 = np.arange(len(subcities))
    axes[1].bar(x2, registered, 0.5, color=C['secondary'], alpha=0.7, label='Registered')
    axes[1].bar(x2, approved, 0.5, color=C['accent'], alpha=0.7, label='Approved')
    axes[1].set_xticks(x2)
    axes[1].set_xticklabels(subcities, fontsize=9)
    axes[1].set_ylabel('Guest Houses', fontsize=9)
    axes[1].set_title('Sub-City Coverage', fontsize=11, fontweight='bold', color=C['dark'])
    axes[1].legend(fontsize=8)
    axes[1].spines['top'].set_visible(False)
    axes[1].spines['right'].set_visible(False)

    # Chart 3: Key metrics radar
    categories = ['Security', 'Efficiency', 'Transparency', 'Revenue\nTracking', 'Citizen\nService']
    values = [9, 8.5, 9, 8, 9.5]
    values += values[:1]
    angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
    angles += angles[:1]
    axes[2] = fig.add_subplot(133, polar=True)
    axes[2].fill(angles, values, alpha=0.2, color=C['primary'])
    axes[2].plot(angles, values, 'o-', color=C['primary'], linewidth=2)
    axes[2].set_xticks(angles[:-1])
    axes[2].set_xticklabels(categories, fontsize=8)
    axes[2].set_ylim(0, 10)
    axes[2].set_title('System Impact Score', fontsize=11, fontweight='bold', color=C['dark'], pad=20)

    # Remove the third regular axis
    axes[2].remove()

    plt.tight_layout()
    plt.savefig(f'{OUT}/06_impact_metrics.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 06_impact_metrics')


# ====================================================================
# DIAGRAM 7: Bishoftu Administrative Structure
# ====================================================================
def draw_admin_structure():
    fig, ax = plt.subplots(1, 1, figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis('off')

    ax.text(6, 6.6, 'Bishoftu City - Administrative Hierarchy', ha='center', fontsize=16, fontweight='bold', color=C['dark'])

    # Bishoftu City (top)
    box = FancyBboxPatch((4, 5.5), 4, 0.8, boxstyle="round,pad=0.1",
                           facecolor=C['dark'], edgecolor='white', alpha=0.9, linewidth=2)
    ax.add_patch(box)
    ax.text(6, 5.9, 'Bishoftu City Administration', ha='center', va='center', fontsize=11, fontweight='bold', color='white')

    # Sub-cities
    subcities = [
        ('Cheleleka Sub-City', 2, 3.8),
        ('Dibayyu Sub-City', 6, 3.8),
        ('Dukem Sub-City', 10, 3.8),
    ]
    for label, x, y in subcities:
        ax.annotate('', xy=(x, y+0.4), xytext=(6, 5.4), arrowprops=dict(arrowstyle='->', color=C['gray'], lw=1.5))
        box = FancyBboxPatch((x-1.5, y-0.3), 3.0, 0.7, boxstyle="round,pad=0.08",
                               facecolor=C['primary'], edgecolor='white', alpha=0.85, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, y+0.05, label, ha='center', va='center', fontsize=9, fontweight='bold', color='white')

    # Woredas under each sub-city
    woredas = {
        2: ['Woreda 01', 'Woreda 02', 'Woreda 03'],
        6: ['Woreda 01', 'Woreda 02', 'Woreda 03', 'Woreda 04'],
        10: ['Woreda 01', 'Woreda 02'],
    }
    for parent_x, wlist in woredas.items():
        for j, w in enumerate(wlist):
            wx = parent_x - (len(wlist)-1) * 0.55 + j * 1.1
            ax.annotate('', xy=(wx, 2.6), xytext=(parent_x, 3.4),
                        arrowprops=dict(arrowstyle='->', color=C['gray'], lw=1, alpha=0.7))
            ax.text(wx, 2.3, w, ha='center', va='center', fontsize=7.5, color=C['text'],
                    bbox=dict(boxstyle='round,pad=0.2', facecolor=C['light_blue'], edgecolor=C['secondary'], alpha=0.5, lw=0.8))

    # Guest houses at bottom
    ax.text(6, 1.3, 'Guest Houses Registered Under Each Woreda', ha='center', fontsize=10, color=C['text'], style='italic')
    gh_box = FancyBboxPatch((2.5, 0.5), 7, 0.6, boxstyle="round,pad=0.08",
                            facecolor=C['accent'], edgecolor='white', alpha=0.2, linewidth=1.5)
    ax.add_patch(gh_box)
    ax.text(6, 0.8, '35+ Guest Houses  |  200+ Rooms  |  3 Sub-Cities  |  9+ Woredas', ha='center', va='center', fontsize=9, fontweight='bold', color=C['accent'])

    plt.tight_layout()
    plt.savefig(f'{OUT}/07_admin_structure.png', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('OK: 07_admin_structure')


# Run all
if __name__ == '__main__':
    draw_system_architecture()
    draw_old_vs_new()
    draw_data_flow()
    draw_security_model()
    draw_implementation_phases()
    draw_impact_metrics()
    draw_admin_structure()
    print('All diagrams generated!')
