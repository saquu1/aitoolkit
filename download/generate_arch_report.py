#!/usr/bin/env python3
"""
Architecture Analysis Report — AI Toolkit Application
Comprehensive audit of duplication, gaps, broken dependencies, and consolidation opportunities.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.units import cm, inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Font Registration ──────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/calibri-regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ─── Color Palette ──────────────────────────────────────────────────────────
DARK_BLUE = colors.HexColor('#1F4E79')
MID_BLUE = colors.HexColor('#2E75B6')
LIGHT_BLUE = colors.HexColor('#D6E4F0')
ACCENT_RED = colors.HexColor('#C0392B')
ACCENT_ORANGE = colors.HexColor('#E67E22')
ACCENT_GREEN = colors.HexColor('#27AE60')
ACCENT_YELLOW = colors.HexColor('#F39C12')
ROW_ODD = colors.HexColor('#F5F5F5')
ROW_EVEN = colors.white
LIGHT_RED_BG = colors.HexColor('#FDEDEC')
LIGHT_YELLOW_BG = colors.HexColor('#FEF9E7')
LIGHT_GREEN_BG = colors.HexColor('#EAFAF1')
LIGHT_BLUE_BG = colors.HexColor('#EBF5FB')

# ─── Style Definitions ──────────────────────────────────────────────────────
cover_title = ParagraphStyle('CoverTitle', fontName='Times New Roman', fontSize=36, leading=44, alignment=TA_CENTER, spaceAfter=20, textColor=DARK_BLUE)
cover_subtitle = ParagraphStyle('CoverSubtitle', fontName='Times New Roman', fontSize=18, leading=26, alignment=TA_CENTER, spaceAfter=12, textColor=MID_BLUE)
cover_info = ParagraphStyle('CoverInfo', fontName='Times New Roman', fontSize=13, leading=20, alignment=TA_CENTER, spaceAfter=8, textColor=colors.HexColor('#555555'))

h1 = ParagraphStyle('H1', fontName='Times New Roman', fontSize=20, leading=28, textColor=DARK_BLUE, spaceBefore=18, spaceAfter=10)
h2 = ParagraphStyle('H2', fontName='Times New Roman', fontSize=15, leading=22, textColor=MID_BLUE, spaceBefore=14, spaceAfter=8)
h3 = ParagraphStyle('H3', fontName='Times New Roman', fontSize=12, leading=18, textColor=colors.HexColor('#34495E'), spaceBefore=10, spaceAfter=6)

body = ParagraphStyle('Body', fontName='Times New Roman', fontSize=10.5, leading=17, alignment=TA_JUSTIFY, spaceAfter=6)
body_left = ParagraphStyle('BodyLeft', fontName='Times New Roman', fontSize=10.5, leading=17, alignment=TA_LEFT, spaceAfter=6)
bullet = ParagraphStyle('Bullet', fontName='Times New Roman', fontSize=10.5, leading=17, alignment=TA_LEFT, leftIndent=18, bulletIndent=6, spaceAfter=4)
caption = ParagraphStyle('Caption', fontName='Times New Roman', fontSize=9.5, leading=14, alignment=TA_CENTER, textColor=colors.HexColor('#666666'), spaceBefore=3, spaceAfter=6)

# Table cell styles
th = ParagraphStyle('TH', fontName='Times New Roman', fontSize=9.5, leading=13, alignment=TA_CENTER, textColor=colors.white)
td = ParagraphStyle('TD', fontName='Times New Roman', fontSize=9, leading=13, alignment=TA_CENTER)
td_left = ParagraphStyle('TDLeft', fontName='Times New Roman', fontSize=9, leading=13, alignment=TA_LEFT)
td_left_sm = ParagraphStyle('TDLeftSm', fontName='Times New Roman', fontSize=8.5, leading=12, alignment=TA_LEFT)

# TOC styles
toc_h1 = ParagraphStyle('TOCH1', fontName='Times New Roman', fontSize=13, leading=20, leftIndent=20)
toc_h2 = ParagraphStyle('TOCH2', fontName='Times New Roman', fontSize=11, leading=18, leftIndent=40)


# ─── TocDocTemplate ────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def __init__(self, *args, **kwargs):
        SimpleDocTemplate.__init__(self, *args, **kwargs)
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            self.notify('TOCEntry', (level, text, self.page))


# ─── Helpers ────────────────────────────────────────────────────────────────
def heading(text, style, level=0):
    p = Paragraph(f'<b>{text}</b>', style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    return p

def para(text):
    return Paragraph(text, body)

def para_left(text):
    return Paragraph(text, body_left)

def bullet_item(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', bullet)

def hr():
    t = Table([['']], colWidths=[17*cm], rowHeights=[1])
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#CCCCCC'))]))
    return t

def make_table(headers, rows, col_widths, caption_text=None):
    """Build a standard styled table."""
    data = [[Paragraph(f'<b>{h}</b>', th) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), td_left_sm) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        bg = ROW_EVEN if i % 2 == 1 else ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))

    elements = [Spacer(1, 10), t]
    if caption_text:
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(caption_text, caption))
    elements.append(Spacer(1, 10))
    return elements

def status_badge(text, color_bg):
    """Colored inline status."""
    s = ParagraphStyle('Badge', fontName='Times New Roman', fontSize=9, leading=13, textColor=colors.white, alignment=TA_CENTER)
    data = [[Paragraph(f'<b>{text}</b>', s)]]
    t = Table(data, colWidths=[1.8*cm], rowHeights=[0.45*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color_bg),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return t

def colored_table(headers, rows, col_widths, caption_text=None, row_colors=None):
    """Table with per-row color coding."""
    data = [[Paragraph(f'<b>{h}</b>', th) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), td_left_sm) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    if row_colors:
        for i, rc in enumerate(row_colors):
            r = i + 1
            if r < len(data):
                style_cmds.append(('BACKGROUND', (0, r), (-1, r), rc))
    else:
        for i in range(1, len(data)):
            bg = ROW_EVEN if i % 2 == 1 else ROW_ODD
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))

    elements = [Spacer(1, 10), t]
    if caption_text:
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(caption_text, caption))
    elements.append(Spacer(1, 10))
    return elements


# ─── BUILD DOCUMENT ─────────────────────────────────────────────────────────
OUTPUT = '/home/z/my-project/download/Architecture_Analysis_Report.pdf'

doc = TocDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=2*cm, bottomMargin=2*cm,
    title='Architecture Analysis Report',
    author='Z.ai',
    creator='Z.ai',
    subject='Comprehensive audit of AI Toolkit application architecture, duplication, gaps, and consolidation'
)

story = []

# ═══════════════════════ COVER PAGE ═════════════════════════════════════════
story.append(Spacer(1, 100))
story.append(Paragraph('<b>Architecture Analysis Report</b>', cover_title))
story.append(Spacer(1, 20))
story.append(Paragraph('AI Toolkit Application', cover_subtitle))
story.append(Spacer(1, 10))
story.append(Paragraph('Comprehensive Audit: Duplication, Gaps, Broken Dependencies,<br/>and Consolidation Opportunities', cover_info))
story.append(Spacer(1, 60))
story.append(Paragraph('Generated: March 29, 2026', cover_info))
story.append(Paragraph('Scope: 41 Pages, 134 API Routes, 25 Tabs, 180+ Lib Files', cover_info))
story.append(Paragraph('Analysis Depth: Full Codebase Static Analysis + Runtime Verification', cover_info))
story.append(PageBreak())

# ═══════════════════════ TABLE OF CONTENTS ═════════════════════════════════
story.append(Paragraph('<b>Table of Contents</b>', h1))
story.append(Spacer(1, 12))
toc = TableOfContents()
toc.levelStyles = [toc_h1, toc_h2]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════ 1. EXECUTIVE SUMMARY ═══════════════════════════════
story.append(heading('1. Executive Summary', h1, 0))

story.append(para(
    'This report presents a comprehensive architectural audit of the AI Toolkit application, a Next.js 16.1.3 '
    'single-page application that has been built incrementally through multiple AI-assisted coding sessions over '
    'an extended period. The analysis reveals a systemic pattern of <b>accidental architecture</b>, where each '
    'development session added new features in isolation without awareness of existing implementations. The result '
    'is a sprawling codebase with 41 page routes, 134 API routes, 25 sidebar tabs, 170 React components, and '
    'over 180 TypeScript library files, many of which duplicate or overlap with each other.'
))
story.append(Spacer(1, 6))
story.append(para(
    'The most critical finding is that the application has three fundamental architectural problems working in '
    'combination to produce a degraded user experience. First, a <b>dual-database split</b> between the main '
    'Prisma-connected SQLite database and a separate contract-validator database means that cross-tab data '
    'dependencies are broken, causing the Smart Fix Center to show zero suggestions, the Test Generator to show '
    'zero tests, and the Data Flow Map to crash entirely. Second, <b>three error storage systems</b> running in '
    'parallel with different schemas mean that error counts are inconsistent and pattern detection is fragmented. '
    'Third, <b>15 pairs of duplicate library files</b> bloat the codebase and create maintenance risk where a fix '
    'in one copy may not propagate to the other.'
))
story.append(Spacer(1, 6))

# Key Metrics summary table
story.extend(colored_table(
    ['Metric', 'Count', 'Assessment'],
    [
        ['Page Routes (page.tsx)', '41', 'High fragmentation'],
        ['API Routes (route.ts)', '134', 'Excessive; many overlap'],
        ['Sidebar Tabs', '25', 'Too many; related features scattered'],
        ['React Components', '170', 'Large surface area'],
        ['TypeScript Lib Files', '180+', '15 duplicate pairs identified'],
        ['Broken Tabs (syntax crash)', '3 of 9 key tabs', '33% of core tabs non-functional'],
        ['Duplicate Error Systems', '3 separate systems', 'Inconsistent data, fragmented UX'],
        ['Separate Databases', '2 (main + cvDb)', 'Cross-tab pipeline broken'],
        ['Prisma DB Models', '153+', 'Schema-code desync is #1 error pattern'],
        ['Orphaned / Legacy Files', '20+ identified', 'Dead code increases maintenance burden'],
    ],
    [5.5*cm, 3*cm, 8.5*cm],
    caption_text='Table 1: Key Architecture Metrics'
))

story.append(para(
    'The application functions as a developer toolkit for managing SQL database schemas, generating code from '
    'stored procedures, running contract validation between frontend and API layers, and tracking AI coding '
    'session history. While the breadth of features is impressive, the lack of architectural governance has led '
    'to a situation where the same conceptual operations (error logging, analytics, scanning, fixing) are '
    'implemented three or more times across different files with different data models, making the system '
    'difficult to maintain, debug, and extend.'
))

# ═══════════════════════ 2. APPLICATION ARCHITECTURE ════════════════════════
story.append(heading('2. Application Architecture Overview', h1, 0))

story.append(heading('2.1 Navigation Model', h2, 1))
story.append(para(
    'The application uses an <b>SPA-style tab switching</b> mechanism on the root URL path <b>/</b>. All 25 '
    'tabs are rendered conditionally inside a single <b>AppContent</b> component in <b>src/app/page.tsx</b>. '
    'Navigation is driven by a <b>NAV_ITEMS</b> array that maps tab IDs to URL slugs. When a user clicks a '
    'sidebar item, the router pushes <b>/?tab=contract-validator</b> (for example), and the active tab state '
    'changes to render the corresponding component. There is no Next.js route group layout or file-system-based '
    'tab routing for the main dashboard; the entire navigation lives in one monolithic page component.'
))
story.append(para(
    'In parallel, a separate project-level navigation exists under <b>/project/[id]/</b> using standard Next.js '
    'App Router file-system routing with its own layout file containing 15 navigation items. This dual navigation '
    'model means there are effectively two applications sharing a codebase: the main dashboard SPA and the '
    'project workspace. Additionally, two legacy layout components (<b>DashboardLayout.tsx</b> and <b>AppLayout.tsx</b>) '
    'exist in the codebase but are not actively used, representing dead code from earlier architectural iterations.'
))

story.append(heading('2.2 Technology Stack', h2, 1))
story.extend(make_table(
    ['Layer', 'Technology', 'Version', 'Notes'],
    [
        ['Framework', 'Next.js (Standalone)', '16.1.3', 'SPA mode with Turbopack'],
        ['Language', 'TypeScript', '5.x', 'Strict mode disabled'],
        ['Database', 'SQLite (Prisma ORM)', 'N/A', '153+ models, single .db file'],
        ['Database 2', 'SQLite (raw better-sqlite3)', 'N/A', 'Contract Validator only'],
        ['Reverse Proxy', 'Caddy', 'N/A', 'Port 81 to 3000'],
        ['UI Library', 'shadcn/ui + Tailwind CSS', '4.x', '170 components'],
        ['AI SDK', 'z-ai-web-dev-sdk', 'N/A', 'Chat + Image generation'],
        ['Auth', 'NextAuth.js', 'N/A', 'Currently disabled (no-op middleware)'],
        ['State Management', 'React useState + useEffect', 'N/A', 'No global state (Redux/Zustand)'],
    ],
    [3*cm, 4.5*cm, 2.5*cm, 7*cm],
    caption_text='Table 2: Technology Stack'
))

story.append(heading('2.3 Database Layer', h2, 1))
story.append(para(
    'The application uses <b>two independent SQLite databases</b>, which is the single most consequential '
    'architectural decision in the codebase. The primary database is managed through Prisma ORM at '
    '<b>/home/z/my-project/db/custom.db</b> and contains 153+ models covering chat logs, error patterns, '
    'intelligence bank data, smart fixer records, raw import data, analytics, and more. The secondary database '
    'is managed through direct better-sqlite3 calls in <b>contract-validator-db.ts</b> and stores contract '
    'validation scan results, detected issues, and fix suggestions. These two databases are completely '
    'disconnected, and there is no synchronization mechanism between them.'
))
story.append(para(
    'This dual-database architecture creates a critical data flow problem: the Contract Validator tab stores '
    'scan results in the secondary database, but the Smart Fix Center, Test Generator, and Data Flow Map tabs '
    'all query the primary Prisma database to retrieve scan data. This means that when a user performs a scan '
    'in the Contract Validator tab, the resulting data is invisible to all downstream tabs that depend on it. '
    'This is the root cause of the persistent "0 suggestions" and "0 tests" problem reported by the user.'
))

# ═══════════════════════ 3. TAB ANALYSIS ═══════════════════════════════════
story.append(heading('3. Complete Tab Analysis', h1, 0))
story.append(para(
    'The following section provides a detailed analysis of each of the 25 sidebar tabs, focusing on the 9 '
    'tabs visible in the user workspace as documented in mixup.md. For each tab, we assessed its implementation '
    'status, API integration, code quality, and functional completeness. The analysis was performed through '
    'static code analysis of component files, API route handlers, and library modules.'
))

story.append(heading('3.1 Tab Status Overview', h2, 1))
story.extend(colored_table(
    ['Tab', 'Component', 'Lines', 'API Calls', 'Status'],
    [
        ['Chat Logs', 'ChatLogTab.tsx', '4,543', '42', 'Working'],
        ['Error Pattern Dashboard', 'ErrorPatternDashboardTab.tsx', '1,831', '18', 'Working'],
        ['API Contract Validator', 'ContractValidatorTab.tsx', '1,502', '15', 'Working'],
        ['Smart Fix Center', 'FixCenterDashboard.tsx', '658', '8', 'Working (empty data)'],
        ['Contract Test Generator', 'TestRunnerDashboard.tsx', '474', '6', 'Working (empty data)'],
        ['Import Analyzer', 'ImportFixerDashboard.tsx', '532', '7', 'Working'],
        ['Data Flow Map', 'FlowMapViewer.tsx', '448', '3', 'BROKEN (syntax)'],
        ['Pre-commit Hook', 'PreCommitHookManager.tsx', '485', '7', 'BROKEN (syntax)'],
        ['API Management', 'ApiManagementTab.tsx', '700', '5', 'BROKEN (syntax)'],
    ],
    [3.5*cm, 5*cm, 1.8*cm, 2*cm, 4.7*cm],
    caption_text='Table 3: Tab Status Overview (9 core tabs from mixup.md)',
    row_colors=[
        LIGHT_GREEN_BG, LIGHT_GREEN_BG, LIGHT_GREEN_BG, LIGHT_YELLOW_BG,
        LIGHT_YELLOW_BG, LIGHT_GREEN_BG, LIGHT_RED_BG, LIGHT_RED_BG, LIGHT_RED_BG
    ]
))

story.append(heading('3.2 Broken Tab Components', h2, 1))
story.append(para(
    'Three of the nine core tabs have an identical corruption pattern in their React <b>useState</b> '
    'declarations. In each case, the opening bracket <b>[</b> and the first character of the variable name '
    'were stripped, producing syntactically invalid JavaScript that causes an immediate crash when the '
    'component is imported and rendered. Since the SPA renders all non-lazy tabs into the DOM simultaneously, '
    'these three crashes can potentially prevent the entire application from loading, depending on whether '
    'error boundaries are implemented around individual tab components.'
))

story.extend(make_table(
    ['File', 'Line', 'Broken Code', 'Correct Code', 'Impact'],
    [
        ['FlowMapViewer.tsx', '56', 'const ermaidCode, setMermaidCode]',
         'const [mermaidCode, setMermaidCode]', 'Data Flow Map crashes on render'],
        ['PreCommitHookManager.tsx', '71', 'const istory, setHistory]',
         'const [history, setHistory]', 'Pre-commit Hook crashes on render'],
        ['ApiManagementTab.tsx', '69', 'const essage, setMessage]',
         'const [message, setMessage]', 'API Management crashes on render'],
    ],
    [3.5*cm, 1.2*cm, 4.2*cm, 4.2*cm, 3.9*cm],
    caption_text='Table 4: Broken useState Declarations (identical corruption pattern)'
))

story.append(para(
    'The corruption pattern is consistent across all three files, suggesting they were affected by the same '
    'automated tool or editing process. The fix for each is trivial (a one-character insertion of <b>[</b>), '
    'but the fact that these errors persisted through multiple builds and deployments indicates a lack of '
    'automated type-checking or linting in the build pipeline. A standard <b>npm run build</b> or <b>tsc --noEmit</b> '
    'would have caught these syntax errors before they ever reached production.'
))

story.append(heading('3.3 Chat Logs Tab (4543 lines)', h2, 1))
story.append(para(
    'The Chat Logs tab is by far the largest and most feature-complete component in the application, at 4,543 '
    'lines of TypeScript with 42 distinct API calls. It functions as a comprehensive session management tool '
    'with features for AI-powered extraction of session data from JSON exports, batch import of chat histories, '
    'auto-fetching of recent sessions, re-import of raw data with traceability, and manual import via paste '
    'or file upload. It includes inline sub-tabs for Session Logs, Analytics, and Error Patterns, meaning it '
    'duplicates some of the functionality found in the dedicated Analytics and Error Pattern Dashboard tabs.'
))
story.append(para(
    'The Chat Logs tab communicates with 15 different API endpoints spanning <b>/api/analytics</b>, '
    '<b>/api/error-patterns</b>, <b>/api/chat-logs/*</b> (8 sub-routes), and <b>/api/raw-data/*</b> (2 sub-routes). '
    'It uses a custom API client helper from <b>@/lib/api-client</b> that wraps fetch with standardized error '
    'handling and response parsing. The tab contains no TODOs, FIXMEs, or placeholder stubs, indicating it '
    'was built to production quality. However, its massive size suggests it should be decomposed into smaller, '
    'focused sub-components to improve maintainability and reduce bundle size.'
))

story.append(heading('3.4 Contract Validator Tab (1502 lines)', h2, 1))
story.append(para(
    'The Contract Validator tab implements a scan-and-fix pipeline for detecting data mismatches between '
    'Frontend, API, and Database layers. It supports file-selection-based scanning, full codebase scanning, '
    'scan history tracking, and issue management with severity classification. The tab reports 11 total scans, '
    '2,688 open issues, 37 fixed issues, and 2,725 total issues, indicating substantial real-world usage. '
    'The critical architectural issue is that it stores scan data in a <b>separate SQLite database</b> '
    '(via <b>contract-validator-db.ts</b>) rather than the main Prisma-managed database, which breaks the '
    'data pipeline to downstream tabs.'
))

story.append(heading('3.5 Smart Fix Center (658 lines)', h2, 1))
story.append(para(
    'The Smart Fix Center is designed to bridge Contract Validator scans and the Smart Fixer engine. It '
    'fetches issues from <b>/api/contract-validator</b> and generates fix suggestions via <b>/api/smart-fixer</b>. '
    'Despite having a fully wired UI with stats cards, suggestion lists, and apply/revert buttons, it shows '
    '<b>Total Suggestions: 0</b> because it reads issues from the main Prisma database while the Contract '
    'Validator stores them in the separate database. This is a data dependency problem, not a code problem. '
    'The tab has 8 API calls, all connected to real backend endpoints, and its code is production-quality. '
    'It would function correctly immediately if the database unification issue were resolved.'
))

story.append(heading('3.6 Test Generator and Data Flow Map', h2, 1))
story.append(para(
    'The Test Generator (474 lines, 6 API calls) generates contract tests from API endpoints or from issues '
    'detected by the Contract Validator. Like the Smart Fix Center, it shows zero tests because it depends on '
    'scan data from the Contract Validator that lives in the wrong database. Its code is fully functional and '
    'would populate with data once the database split is resolved. The Data Flow Map (448 lines, 3 API calls) '
    'visualizes data flow between Frontend, API, and Database layers using both a canvas-based renderer and '
    'Mermaid diagram output. However, it cannot render at all due to the useState syntax error described above. '
    'Once that single-character fix is applied, it would be fully functional.'
))

# ═══════════════════════ 4. DUPLICATION ANALYSIS ════════════════════════════
story.append(heading('4. Duplication Analysis', h1, 0))

story.append(heading('4.1 Error Storage Systems (3 Separate Implementations)', h2, 1))
story.append(para(
    'The most consequential duplication in the codebase is the existence of three completely separate error '
    'storage systems, each with its own database table, API routes, and consumer components. These systems '
    'were clearly built in different AI coding sessions without awareness of each other, and they use '
    'fundamentally different data models, making data correlation between them impossible without custom '
    'migration logic.'
))

story.extend(make_table(
    ['System', 'API Route', 'DB Table', 'Schema', 'Consumers'],
    [
        ['Error Log', '/api/error-log', 'ErrorLog', 'message, stack, path, count',
         'System auto-logging, Error Monitor'],
        ['Error Registry', '/api/error-registry', 'ErrorRegistry', 'category, code, context, resolution',
         'Error Pattern Dashboard, AI Resolution'],
        ['Error Detection', '/api/chat-logs/error-detection', 'Delegates to Registry',
         'Delegates to ErrorRegistry', 'Chat Logs tab'],
    ],
    [2.2*cm, 3.5*cm, 2.5*cm, 4*cm, 4.8*cm],
    caption_text='Table 5: Three Parallel Error Storage Systems'
))

story.append(para(
    'The <b>ErrorLog</b> system uses a simple schema with message, stack trace, file path, and occurrence '
    'count. It is designed for automated server-side error capture and powers the system error monitoring. '
    'The <b>ErrorRegistry</b> system uses a richer schema with error categories (AUTH_ERROR, DATABASE_ERROR, '
    'VALIDATION_ERROR, etc.), error codes, structured context, and resolution tracking. It powers the Error '
    'Pattern Dashboard and AI Resolution features. The <b>Error Detection</b> route in the chat-logs namespace '
    'scans chat session data for error patterns and delegates to the ErrorRegistry, creating a third surface '
    'for the same underlying operation. When a user views "error stats" from different tabs, they get '
    'different numbers because each system counts differently and from different tables.'
))

story.append(heading('4.2 Analytics Query Duplication (13 Locations)', h2, 1))
story.append(para(
    'Session fetching and analytics queries are duplicated across 13 different API route files. The same '
    'fundamental operations, <b>chatLog.findMany()</b> and <b>aISession.findMany()</b>, appear in the main '
    'analytics route (864 lines with approximately 20 action handlers), the fast analytics route (131 lines), '
    'the hybrid analytics route (255 lines), the mixed analytics route (identical to fast), the sync route, '
    'the data route (5 separate queries), the intelligence route (3 queries), the extract-v2 route, and several '
    'chat-logs sub-routes. Each implementation uses slightly different filtering, sorting, and transformation '
    'logic, producing subtly different results for the same conceptual query.'
))
story.append(para(
    'The root cause is that each AI coding session created a new analytics endpoint tailored to the specific '
    'needs of the tab being built, without refactoring shared query logic into a common service layer. The '
    'recommended consolidation is to extract all session/analytics querying into a single '
    '<b>AnalyticsDataService</b> class that provides parameterized query methods, which each API route can '
    'invoke with its specific parameters. This would reduce the analytics code footprint by approximately '
    '60-70% and ensure consistent data across all tabs.'
))

story.append(heading('4.3 Library File Duplication (15 Confirmed Pairs)', h2, 1))
story.extend(make_table(
    ['Functionality', 'Version 1 (root)', 'Version 2 ( subdir)', 'Version 3 (subdir)',
     'Risk Level'],
    [
        ['Analytics Extraction', 'analytics-extraction-service.ts',
         'analytics-extraction-v2.ts', 'analytics/extraction.ts', 'High'],
        ['Error Patterns', 'error-pattern-detection.ts',
         'error-pattern-service.ts', 'analytics/pattern-detection.ts', 'High'],
        ['Error Registry', 'error-registry.ts',
         'error-management/error-registry.ts', 'N/A', 'High'],
        ['MySQL Parser', 'mysql-parser.ts',
         'parsers/mysql-parser.ts', 'N/A', 'Medium'],
        ['Prisma Generator', 'prisma-generator.ts',
         'generators/prisma-generator.ts', 'N/A', 'Medium'],
        ['SP Parser', 'sp-parser.ts',
         'sp-parser-enhanced.ts', 'spdll/ (8 files)', 'Medium'],
        ['Intelligence', 'intelligence-service.ts',
         'intelligence-bank.ts', 'intelligence-bank/ (12 files)', 'High'],
        ['View Analysis', 'view-analyzer.ts',
         'view-intelligence-service.ts', 'N/A', 'Medium'],
        ['Auth', 'auth.ts',
         'auth-simple.ts', 'N/A', 'Low'],
        ['Contract Validator DB', 'contract-validator-db.ts',
         'contract-validator-backup.ts', 'N/A', 'Low'],
        ['API Route Generator', 'spdll/api-route-generator.ts',
         'generators/api-route-generator.ts', 'N/A', 'Medium'],
        ['Validation', 'validation/code-validator.ts',
         'validations/organization-building.ts', 'N/A', 'Low'],
        ['DB Connection', 'db.ts + db-connection.ts',
         'N/A', 'db/index.ts', 'Low'],
        ['Export', 'export/export-hub.ts',
         'export/project-export.ts', 'N/A', 'Low'],
        ['Flow Generation', 'flow-generator.ts',
         'flow-map.ts', 'N/A', 'Low'],
    ],
    [2.5*cm, 3.8*cm, 3.5*cm, 3.8*cm, 1.8*cm],
    caption_text='Table 6: 15 Confirmed Duplicate/Overlapping Library File Pairs'
))

story.append(para(
    'The duplication pattern follows a consistent evolutionary arc: an initial implementation is created at '
    'the root of <b>src/lib/</b>, then a subsequent AI session creates an enhanced version (often suffixed '
    'with <b>-v2</b> or <b>-enhanced</b>), and eventually a fully reorganized version is placed in a proper '
    'subdirectory. The older versions are never deleted, creating a confusing landscape where import statements '
    'may reference different versions of the same functionality depending on which file they import from. In '
    'several cases, the older root-level files are still imported by active components while the newer '
    'subdirectory versions contain fixes and improvements that are not being used.'
))

story.append(heading('4.4 Feature Duplication Across Tabs', h2, 1))
story.extend(make_table(
    ['Feature', 'Tab 1', 'Tab 2', 'Tab 3', 'Impact'],
    [
        ['Error Analysis', 'Error Pattern Dashboard', 'Chat Logs (Error Patterns)',
         'Analytics (Patterns tab)', 'Inconsistent error stats'],
        ['Session Analytics', 'Chat Logs', 'Analytics (Sessions)',
         'Analytics (Overview)', 'Different session counts'],
        ['Issue Tracking', 'Contract Validator (Open Issues)', 'Smart Fix Center',
         'Chat Logs (Issues Tracker)', 'Disconnected issue states'],
        ['Scan / Fix Pipeline', 'Contract Validator', 'Smart Fix Center',
         'Import Fixer', 'Broken cross-tab pipeline'],
        ['Import / Upload', 'Chat Logs (Batch Import)', 'Universal Upload',
         'Schema Toolkit', '3 ways to do same thing'],
        ['Intelligence Data', 'Intelligence Bank', 'Intelligence (Step 4)',
         'Project Intelligence', 'Scattered AI insights'],
        ['Data Flow Analysis', 'Flow Map (visual)', 'Contract Validator (code)',
         'Intelligence Bank (schema)', 'No unified data model'],
        ['File Management', 'File Manager', 'Schema Toolkit Upload',
         'Universal Upload', 'Confusing upload UX'],
    ],
    [2.8*cm, 3.5*cm, 3.5*cm, 3.5*cm, 3.7*cm],
    caption_text='Table 7: Feature Duplication Across Tabs (8 overlapping feature areas)'
))

# ═══════════════════════ 5. BROKEN DEPENDENCY CHAIN ═════════════════════════
story.append(heading('5. Broken Cross-Tab Dependency Chain', h1, 0))

story.append(para(
    'The most architecturally significant problem in the application is the broken data flow pipeline between '
    'related tabs. The Contract Validator, Smart Fix Center, Test Generator, Data Flow Map, and Pre-commit '
    'Hook tabs form a logical processing pipeline where each tab depends on data produced by the previous one. '
    'However, this pipeline is broken at the very first step due to the dual-database architecture, causing '
    'a cascading failure that renders the entire downstream chain non-functional or empty.'
))

story.append(heading('5.1 Dependency Chain Diagram', h2, 1))
story.append(Spacer(1, 8))

# Build dependency chain as a visual table
chain_style = ParagraphStyle('ChainStep', fontName='Times New Roman', fontSize=10, leading=15, alignment=TA_CENTER, textColor=colors.white)
arrow_style = ParagraphStyle('Arrow', fontName='Times New Roman', fontSize=14, leading=18, alignment=TA_CENTER, textColor=ACCENT_RED)

chain_data = [
    [Paragraph('<b>Contract Validator</b><br/>Scans code, detects issues', chain_style),
     Paragraph('<b>---</b>', arrow_style),
     Paragraph('<b>Smart Fix Center</b><br/>Generates fix suggestions', chain_style),
     Paragraph('<b>---</b>', arrow_style),
     Paragraph('<b>Test Generator</b><br/>Creates regression tests', chain_style)],
]
chain_t = Table(chain_data, colWidths=[4.2*cm, 1.2*cm, 4.2*cm, 1.2*cm, 4.2*cm])
chain_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), ACCENT_GREEN),
    ('BACKGROUND', (2, 0), (2, 0), ACCENT_ORANGE),
    ('BACKGROUND', (4, 0), (4, 0), ACCENT_RED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('BOX', (0, 0), (0, 0), 1, ACCENT_GREEN),
    ('BOX', (2, 0), (2, 0), 1, ACCENT_ORANGE),
    ('BOX', (4, 0), (4, 0), 1, ACCENT_RED),
]))
story.append(chain_t)
story.append(Spacer(1, 4))
story.append(Paragraph('<b>Figure 1:</b> Cross-tab dependency chain (Green=Working, Orange=Empty, Red=Crashed)', caption))
story.append(Spacer(1, 6))

story.append(Paragraph('<b>---</b>', arrow_style))
story.append(Spacer(1, 4))

chain_data2 = [
    [Paragraph('<b>Test Generator</b>', chain_style),
     Paragraph('<b>---</b>', arrow_style),
     Paragraph('<b>Data Flow Map</b>', chain_style),
     Paragraph('<b>---</b>', arrow_style),
     Paragraph('<b>Pre-commit Hook</b>', chain_style)],
]
chain_t2 = Table(chain_data2, colWidths=[4.2*cm, 1.2*cm, 4.2*cm, 1.2*cm, 4.2*cm])
chain_t2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), ACCENT_RED),
    ('BACKGROUND', (2, 0), (2, 0), ACCENT_RED),
    ('BACKGROUND', (4, 0), (4, 0), ACCENT_RED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('BOX', (0, 0), (0, 0), 1, ACCENT_RED),
    ('BOX', (2, 0), (2, 0), 1, ACCENT_RED),
    ('BOX', (4, 0), (4, 0), 1, ACCENT_RED),
]))
story.append(chain_t2)
story.append(Spacer(1, 10))

story.append(heading('5.2 Root Cause: Dual Database Architecture', h2, 1))
story.extend(make_table(
    ['Component', 'Reads From', 'Writes To', 'Problem'],
    [
        ['Contract Validator', 'File system (code scan)', 'cvDb (separate SQLite)',
         'Scan data stored in wrong DB'],
        ['Smart Fix Center', 'Prisma (main DB)', 'Prisma (main DB)',
         'Cannot find scan results from CV'],
        ['Test Generator', 'Prisma (main DB)', 'File system',
         'Cannot find scan results from CV'],
        ['Data Flow Map', 'Prisma (main DB)', 'N/A (read-only)',
         'Cannot find scan results from CV'],
        ['Pre-commit Hook', 'File system', 'File system',
         'Broken by syntax error, unrelated to DB'],
    ],
    [3*cm, 3.5*cm, 3.5*cm, 7*cm],
    caption_text='Table 8: Database Read/Write Matrix Showing Pipeline Break'
))

story.append(para(
    'The Contract Validator uses a dedicated database instance created through <b>better-sqlite3</b> directly '
    'in <b>contract-validator-db.ts</b>. This database stores scan results, detected issues (currently 2,725), '
    'and fix application records. Meanwhile, the Smart Fix Center and Test Generator both use the standard '
    '<b>PrismaClient</b> connected to the main database at <b>/home/z/my-project/db/custom.db</b>. When the '
    'Smart Fix Center calls <b>/api/smart-fixer</b> to get suggestions, it queries the main DB for issues '
    'that were never written there; they exist only in the contract-validator DB. The fix requires either '
    'migrating all contract-validator data into Prisma models in the main DB, or implementing a cross-database '
    'query layer.'
))

# ═══════════════════════ 6. API ROUTE PROBLEMS ══════════════════════════════
story.append(heading('6. API Route Architecture Issues', h1, 0))

story.append(heading('6.1 Prisma Client Instantiation Inconsistency', h2, 1))
story.append(para(
    'Three API routes create their own <b>new PrismaClient()</b> instance instead of using the shared <b>db</b> '
    'object from <b>@/lib/db</b>. The shared <b>db</b> module implements connection pooling and lazy '
    'initialization, which prevents connection exhaustion during hot-reload in development. The routes that '
    'bypass this shared instance are <b>/api/smart-fixer/route.ts</b>, <b>/api/test-generator/route.ts</b>, '
    'and <b>/api/flow-map/route.ts</b>. In production with the standalone build, this is less critical since '
    'the server process is long-lived, but in development it can cause "too many open database connections" '
    'errors when Next.js hot-reloads these routes multiple times, as each reload creates a new PrismaClient '
    'that holds a database connection.'
))

story.append(heading('6.2 Mega-Route Anti-Pattern', h2, 1))
story.extend(make_table(
    ['Route', 'Lines', 'Actions (GET/POST)', 'Assessment'],
    [
        ['analytics/route.ts', '864', '~15 GET + 5 POST', 'Extreme: should be 5+ separate routes'],
        ['contract-validator/route.ts', '1,353', '~12 actions', 'Extreme: mixing scan, fix, history, AI'],
        ['error-patterns/scope/route.ts', '544', '~8 actions', 'High: could be 3 routes'],
        ['contract-validator/scope/route.ts', '835', '~10 actions', 'High: scope wrapper on same logic'],
        ['smart-fixer/route.ts', '423', '~6 actions', 'Moderate: acceptable for single concern'],
        ['chat-logs/route.ts', '~400', '~6 actions', 'Moderate: acceptable'],
    ],
    [4.5*cm, 1.5*cm, 3.5*cm, 7.5*cm],
    caption_text='Table 9: Mega-Route Files (single file handling too many actions)'
))

story.append(para(
    'The <b>analytics/route.ts</b> file at 864 lines and approximately 20 distinct action handlers is the '
    'most egregious example of this anti-pattern. A single file handles session listing, stats computation, '
    'data export, issue aggregation, and feature extraction, all differentiated by <b>action</b> query '
    'parameters. This makes the file difficult to navigate, test, and maintain. The recommended approach is '
    'to split each action group into its own route file under a directory structure such as '
    '<b>/api/analytics/sessions/route.ts</b>, <b>/api/analytics/stats/route.ts</b>, etc. Next.js App Router '
    'supports this pattern natively through file-system routing.'
))

story.append(heading('6.3 Error Route Fragmentation', h2, 1))
story.append(para(
    'Error-related functionality is scattered across 6 different API routes: <b>/api/error-log</b>, '
    '<b>/api/error-registry</b>, <b>/api/error-patterns</b>, <b>/api/error-patterns/scope</b>, '
    '<b>/api/error-patterns/ai-resolution</b>, and <b>/api/chat-logs/error-detection</b>. Each route '
    'handles a slightly different aspect of error management (logging, registry, pattern detection, AI analysis, '
    'chat log scanning), but they share overlapping concerns and sometimes query the same underlying data. '
    'A unified <b>/api/errors/</b> route group with sub-routes for each concern would be more maintainable '
    'and would enforce a single source of truth for error data.'
))

# ═══════════════════════ 7. ERROR PATTERN ANALYSIS ══════════════════════════
story.append(heading('7. AI Code Generation Error Patterns', h1, 0))

story.append(para(
    'Based on the 24-hour error audit and this architecture analysis, a clear pattern has emerged in how '
    'AI-generated code fails. Understanding these patterns is essential for preventing future errors and '
    'improving the quality of AI-assisted development sessions.'
))

story.append(heading('7.1 The #1 Error Pattern: Schema-Code Desync', h2, 1))
story.append(para(
    'Over the past 24 hours, 3 separate 500-level server errors were traced to the same root cause: AI-generated '
    'code referencing Prisma models, fields, or relation names that do not match the actual schema definition. '
    'This occurred in the Intelligence Bank scope route (6 wrong relation names), the Smart Fixer route '
    '(5 missing models), and the Raw Data service (15+ wrong relation field names with incorrect casing). '
    'In every case, the AI coding agent generated Prisma queries based on assumed field names without reading '
    'the schema.prisma file to verify the actual names. Prisma is case-sensitive for relation field names, '
    'meaning even a single character difference causes a runtime "Unknown field" error.'
))

story.extend(make_table(
    ['Error', 'Occurrences', 'Root Cause', 'Pattern Type', 'Fix Complexity'],
    [
        ['intelligence-bank/scope 500', '13', '6 wrong relation names',
         'Schema-Code Desync', 'Low (rename fields)'],
        ['smart-fixer 500', '26', '5 missing Prisma models',
         'Schema-Code Desync', 'Medium (add models + build)'],
        ['raw-data 500', '5', '15+ wrong relation casing',
         'Schema-Code Desync', 'Low (rename fields)'],
        ['ErrorLog cascade', '13', 'Unique constraint in catch handler',
         'Error Handling Gap', 'Medium (architectural rewrite)'],
    ],
    [3.5*cm, 2*cm, 4*cm, 3*cm, 3.5*cm],
    caption_text='Table 10: 24-Hour Error Pattern Summary (57 total errors from 4 root causes)'
))

story.append(heading('7.2 The Stale Deployment Problem', h2, 1))
story.append(para(
    'A second recurring pattern is stale deployment, where the production server continues running old compiled '
    'code from a directory that has been deleted or replaced. The standalone build at <b>.next/standalone/</b> '
    'copies compiled JavaScript into a self-contained directory, but if the build output directory is deleted '
    'or rebuilt while the server is still running, the process continues executing from memory using the old '
    'code. This was observed when the intelligence-bank/scope route was returning 500 errors from a process '
    'whose working directory showed as <b>(deleted)</b> in <b>/proc/PID/cwd</b>. The fix requires ensuring '
    'that the server process is fully stopped before rebuild, and verifying the process working directory '
    'matches the current build output.'
))

story.append(heading('7.3 The Build Pipeline Gap', h2, 1))
story.append(para(
    'The build script at <b>/home/z/my-project/build.sh</b> was missing a critical step: copying the '
    'generated Prisma client to the standalone build directory. After running <b>prisma db push</b> and '
    '<b>prisma generate</b>, the new client code exists in <b>node_modules/@prisma/client/</b> but is not '
    'included in the standalone build, which uses its own <b>node_modules/</b> copy. This means that new '
    'Prisma models added to the schema are invisible to the production server even after a full rebuild. The '
    'fix was to add explicit copy commands to build.sh: <b>cp -r node_modules/@prisma/client '
    '.next/standalone/node_modules/@prisma/</b> and the same for <b>.prisma/</b>. This is a build pipeline '
    'gap that should be documented in the project README to prevent regression.'
))

# ═══════════════════════ 8. GAP ANALYSIS ═══════════════════════════════════
story.append(heading('8. Gap Analysis: What Each Tab Is Missing', h1, 0))

story.extend(make_table(
    ['Tab', 'What It Has', 'What It Is Missing', 'Severity'],
    [
        ['Smart Fix Center', 'Full UI, API wiring, backup/restore',
         'Scan data from Contract Validator (wrong DB)', 'Critical'],
        ['Test Generator', 'Full UI, generate/save/run tests',
         'Scan data from Contract Validator (wrong DB)', 'Critical'],
        ['Data Flow Map', 'Canvas + Mermaid rendering, API calls',
         'Working code (syntax error crash)', 'High'],
        ['Pre-commit Hook', 'Install/config/execution history UI',
         'Working code (syntax error crash)', 'High'],
        ['API Management', 'Auth status, DB latency, endpoint listing',
         'Working code (syntax error crash)', 'High'],
        ['Chat Logs', '42 API calls, batch import, AI extract',
         'Nothing (most complete tab)', 'None'],
        ['Contract Validator', 'Scan/fix/AI pipeline, 2725 issues',
         'Integration with main DB for downstream tabs', 'Medium'],
        ['Error Patterns', 'Pattern detection, AI resolution, shortcuts',
         'Unified error data (3 competing systems)', 'Medium'],
        ['Import Fixer', 'Analyze imports, fix suggestions, filters',
         'Integration with Contract Validator issues', 'Low'],
    ],
    [2.5*cm, 4.5*cm, 5.5*cm, 2*cm],
    caption_text='Table 11: Gap Analysis for Each Core Tab',
    row_colors=[
        LIGHT_RED_BG, LIGHT_RED_BG, LIGHT_RED_BG, LIGHT_RED_BG, LIGHT_RED_BG,
        LIGHT_GREEN_BG, LIGHT_YELLOW_BG, LIGHT_YELLOW_BG, LIGHT_BLUE_BG
    ]
))

story.append(heading('8.1 Infrastructure Gaps', h2, 1))
story.append(para(
    'Beyond tab-specific gaps, the application is missing several infrastructure-level capabilities that '
    'are standard in production applications of this scale. There is no global state management library '
    '(such as Redux, Zustand, or Jotai), meaning each tab independently fetches data that other tabs have '
    'already loaded. There is no automated testing framework configured (no Jest, Vitest, or Playwright), '
    'which explains how syntax errors in three tab components went undetected. There is no CI/CD pipeline '
    'or automated build verification. There are no TypeScript strict mode checks (the tsconfig.json likely '
    'has strict disabled), which allows type mismatches to slip through. There is no API documentation '
    '(no Swagger/OpenAPI), making it difficult for developers to understand the 134 endpoints without '
    'reading source code. And there is no error monitoring or alerting system that would notify developers '
    'when 500 errors occur in production.'
))

# ═══════════════════════ 9. CONSOLIDATION RECOMMENDATIONS ════════════════════
story.append(heading('9. Consolidation Recommendations', h1, 0))

story.append(para(
    'Based on the findings of this analysis, the following consolidation plan is recommended, organized by '
    'priority and estimated effort. Each recommendation addresses a specific architectural problem identified '
    'in the preceding sections and provides a concrete path to resolution.'
))

story.append(heading('9.1 Priority 0: Emergency Fixes (Same Day)', h2, 1))
story.extend(make_table(
    ['#', 'Action', 'Files Affected', 'Effort', 'Impact'],
    [
        ['1', 'Fix 3 broken useState declarations', 'FlowMapViewer.tsx, PreCommitHookManager.tsx, ApiManagementTab.tsx',
         '15 minutes', '3 tabs restored immediately'],
        ['2', 'Add TypeScript checking to build.sh', 'build.sh, tsconfig.json',
         '30 minutes', 'Prevents future syntax errors'],
        ['3', 'Unify Contract Validator DB into Prisma', 'contract-validator-db.ts, schema.prisma, smart-fixer, test-generator',
         '4-6 hours', 'Restores cross-tab data pipeline'],
    ],
    [0.8*cm, 4.5*cm, 5*cm, 1.8*cm, 4.9*cm],
    caption_text='Table 12: Emergency Fixes (Priority 0)'
))

story.append(heading('9.2 Priority 1: Database Unification (Week 1)', h2, 1))
story.append(para(
    'The single most impactful architectural change is unifying the contract-validator database into the main '
    'Prisma schema. This involves creating Prisma models for <b>ContractScan</b>, <b>ContractIssue</b>, and '
    '<b>ContractFixRecord</b> in <b>schema.prisma</b>, migrating existing data from the separate SQLite file, '
    'and updating <b>contract-validator-db.ts</b> to use the shared Prisma client. Once complete, the Smart '
    'Fix Center will immediately see scan results, the Test Generator will have issues to generate tests from, '
    'and the Data Flow Map will have scan metadata to visualize. This one change unblocks 3 tabs simultaneously '
    'and resolves the most user-visible problem in the application.'
))

story.append(heading('9.3 Priority 2: Error System Consolidation (Week 1-2)', h2, 1))
story.append(para(
    'Merge the three error storage systems into a unified error management module. The recommended approach is '
    'to extend the <b>ErrorRegistry</b> model (which has the richest schema) to include the fields from '
    '<b>ErrorLog</b> (stack trace, file path, occurrence count), then migrate ErrorLog data into ErrorRegistry '
    'with a type discriminator. The <b>/api/error-log</b> route should be updated to delegate to the unified '
    'ErrorRegistry, and the <b>/api/chat-logs/error-detection</b> route should be refactored to use the same '
    'path. This consolidation will ensure consistent error counts across all tabs and enable the Error Pattern '
    'Dashboard to show comprehensive statistics from a single data source.'
))

story.append(heading('9.4 Priority 3: Analytics Consolidation (Week 2)', h2, 1))
story.append(para(
    'Extract the duplicated analytics query logic from 13 API routes into a shared <b>AnalyticsDataService</b> '
    'class. This service should provide parameterized methods for session fetching, stats computation, pattern '
    'detection, and data export. Each API route would then become a thin wrapper that calls the service with '
    'route-specific parameters. This consolidation would reduce the analytics code footprint by approximately '
    '60-70%, eliminate data inconsistencies between tabs, and make the analytics logic testable in isolation.'
))

story.append(heading('9.5 Priority 4: Library Cleanup (Week 2-3)', h2, 1))
story.append(para(
    'Perform a systematic audit of the 15 duplicate library file pairs identified in Section 4.3. For each '
    'pair, determine which version is actively imported by consuming components, which version has the most '
    'complete and correct implementation, and whether the differences between versions are intentional or '
    'accidental. Then consolidate into a single canonical version, update all imports, and delete the '
    'orphaned files. This cleanup will reduce the library surface area by approximately 15-20 files and '
    'eliminate the risk of fixing a bug in one copy while the other copy remains broken.'
))

story.append(heading('9.6 Priority 5: Tab Consolidation (Week 3-4)', h2, 1))
story.extend(make_table(
    ['Current Tabs (Separate)', 'Proposed Consolidation', 'Rationale'],
    [
        ['Chat Logs + Analytics page', 'Unified "Session Analytics" tab with sub-views',
         'Both query same data; Chat Logs already has analytics inline'],
        ['Contract Validator + Smart Fix Center + Test Generator',
         'Unified "Quality Pipeline" tab with stages',
         'Form a natural pipeline; data dependencies already exist'],
        ['Error Patterns + Error Detection', 'Single "Error Management" tab',
         'Both manage errors; 3 separate systems should be 1'],
        ['File Manager + Universal Upload + Schema Toolkit',
         'Single "File Operations" tab',
         '3 tabs for upload/import is confusing for users'],
        ['Intelligence Bank + Intelligence + Project Intelligence',
         'Single "Intelligence Hub" tab',
         'All provide AI insights; scattered across 3 tabs'],
    ],
    [4.5*cm, 5*cm, 7.5*cm],
    caption_text='Table 13: Proposed Tab Consolidation (25 tabs reduced to ~15)'
))

story.append(para(
    'The tab consolidation would reduce the sidebar from 25 items to approximately 15, which is closer to '
    'the industry standard of 7-12 navigation items for complex applications. Each consolidated tab would '
    'use internal sub-navigation (tabs, accordions, or sections) to organize the previously scattered '
    'functionality. This approach preserves all existing features while dramatically improving discoverability '
    'and reducing cognitive load on users.'
))

# ═══════════════════════ 10. ARCHITECTURE RISK MATRIX ═══════════════════════
story.append(heading('10. Architecture Risk Matrix', h1, 0))

story.append(para(
    'The following matrix summarizes the key architectural risks identified in this analysis, their current '
    'severity, and the recommended mitigation timeline. Risks are categorized by type (data, code, '
    'infrastructure) and prioritized by impact on end users.'
))

story.extend(make_table(
    ['Risk', 'Type', 'Severity', 'Likelihood', 'Mitigation', 'Timeline'],
    [
        ['Dual DB breaks cross-tab pipeline', 'Data', 'Critical', 'Certain',
         'Migrate cvDb to Prisma', 'Week 1'],
        ['Broken tabs crash SPA', 'Code', 'High', 'Certain',
         'Fix useState + add type checking', 'Same day'],
        ['Schema-code desync causes 500s', 'Code', 'High', 'High',
         'Schema validation in CI', 'Week 1'],
        ['Stale deployment serves old code', 'Infra', 'High', 'Medium',
         'Process lifecycle management', 'Week 1'],
        ['3 error systems give wrong counts', 'Data', 'Medium', 'Certain',
         'Merge into unified system', 'Week 1-2'],
        ['13x duplicated analytics queries', 'Code', 'Medium', 'Certain',
         'Extract shared service', 'Week 2'],
        ['No automated testing', 'Infra', 'Medium', 'High',
         'Add Jest + Playwright', 'Week 2'],
        ['15 duplicate lib files', 'Code', 'Low', 'High',
         'Systematic audit + cleanup', 'Week 2-3'],
        ['No global state management', 'Code', 'Low', 'Medium',
         'Add Zustand or similar', 'Week 3'],
        ['No CI/CD pipeline', 'Infra', 'Low', 'Medium',
         'GitHub Actions / Jenkins', 'Week 3-4'],
    ],
    [3.5*cm, 1.5*cm, 1.5*cm, 1.8*cm, 3.5*cm, 2*cm],
    caption_text='Table 14: Architecture Risk Matrix (10 identified risks)',
    row_colors=[
        LIGHT_RED_BG, LIGHT_RED_BG, LIGHT_YELLOW_BG, LIGHT_YELLOW_BG,
        LIGHT_YELLOW_BG, LIGHT_YELLOW_BG, LIGHT_YELLOW_BG, LIGHT_BLUE_BG,
        LIGHT_BLUE_BG, LIGHT_BLUE_BG
    ]
))

# ═══════════════════════ 11. CONCLUSION ═════════════════════════════════════
story.append(heading('11. Conclusion', h1, 0))

story.append(para(
    'The AI Toolkit application demonstrates the typical trajectory of a project built primarily through '
    'AI-assisted coding sessions without centralized architectural governance. Each session produces '
    'high-quality, functional code in isolation, but the cumulative effect is a codebase with significant '
    'duplication, inconsistent data models, broken cross-component dependencies, and an expanding surface '
    'area of features that overlap without being properly integrated. The core architectural problems are '
    'not bugs in individual components but rather systemic issues in how the components interact: the dual '
    'database split, the three error systems, the scattered analytics queries, and the fragmented navigation.'
))
story.append(para(
    'The positive finding is that the individual component implementations are generally high quality. The '
    'Chat Logs tab with 4,543 lines and 42 API calls is a sophisticated piece of engineering. The Contract '
    'Validator has processed 2,725 real issues across 11 scans. The Error Pattern Dashboard has a working AI '
    'resolution pipeline. These are not empty shells or prototypes; they are production-grade features that '
    'have been used for real work. The problem is entirely at the integration layer: connecting these '
    'well-built components into a coherent, unified system where data flows seamlessly between them.'
))
story.append(para(
    'The recommended consolidation plan would reduce the tab count from 25 to approximately 15, eliminate '
    '15 duplicate library files, merge 3 error systems into 1, unify 2 databases, and consolidate 13 '
    'duplicated analytics queries into a shared service. These changes would not remove any user-facing '
    'features but would make the existing features more discoverable, consistent, and maintainable. The '
    'estimated total effort is 3-4 weeks for a single developer, with the most critical fixes (broken tabs, '
    'database unification) achievable in the first week.'
))

# ═══════════════════════ BUILD ══════════════════════════════════════════════
doc.multiBuild(story)
print(f"PDF built: {OUTPUT}")
