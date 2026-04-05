// =============================================================================
// Compliance Data Export API — CSV / JSON download of compliance scan results
// =============================================================================
//
// GET /api/compliance-export?format=csv|json
//
// Fetches compliance scan data from the database and returns it as either:
//   - CSV:  text/csv with structured sections:
//       1. Summary (total columns, PII, PHI, financial, PCI fields)
//       2. Framework Scores (HIPAA, GDPR, SOX, PCI-DSS)
//       3. Rule Evaluations (all rules with status, severity, actions)
//       4. Gap Report (all violations with severity, description, effort)
//       5. Sensitivity Breakdown (public, internal, confidential, restricted)
//       6. Top Findings (up to 50 sensitive fields detected)
//   - JSON: application/json with the full compliance-scan response payload
//
// Reuses the compliance scan engine by calling /api/compliance-scan internally.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// CSV HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape double quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(...cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(escapeCSV).join(",") + "\n";
}

function csvSection(title: string): string {
  return `\n# ${title}\n`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

interface RuleEvaluation {
  ruleId: string;
  name: string;
  reference: string;
  severity: string;
  status: string;
  description: string;
  affectedFields: number;
  requiredActions: string[];
}

interface Violation {
  id: string;
  severity: string;
  framework: string;
  ruleId: string;
  title: string;
  description: string;
  affectedFields: number;
  requiredActions: string[];
  estimatedEffort: string;
}

interface GapReport {
  totalViolations: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  violations: Violation[];
}

interface ComplianceResponse {
  success: boolean;
  scanTimestamp: string;
  summary: {
    totalColumns: number;
    piiFields: number;
    phiFields: number;
    financialFields: number;
    soxFields: number;
    pciFields: number;
    encryptionRequired: number;
    maskingRequired: number;
    auditRequired: number;
    consentRequired: number;
  };
  frameworks: Record<
    string,
    {
      status: string;
      score: number;
      coverage: string;
      phiFields?: number;
      piiFields?: number;
      financialFields?: number;
      cardFields?: number;
      findings: Array<{
        table: string;
        column: string;
        type: string;
        category: string;
        confidence: number;
        action: string;
      }>;
    }
  >;
  sensitivityBreakdown: {
    public: number;
    internal: number;
    confidential: number;
    restricted: number;
  };
  topFindings: Array<{
    table: string;
    column: string;
    classification: string;
    sensitivity: string;
    frameworks: string[];
    confidence: number;
    action: string;
  }>;
  ruleEvaluations?: Record<string, RuleEvaluation[]>;
  gapReport?: GapReport;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD CSV PAYLOAD
// ═══════════════════════════════════════════════════════════════════════════

function buildCSV(data: ComplianceResponse): string {
  const lines: string[] = [];
  const s = data.summary;
  const fw = data.frameworks;
  const sens = data.sensitivityBreakdown;
  const ruleEvals = data.ruleEvaluations;
  const gapReport = data.gapReport;

  // ─── Header ───
  lines.push(csvRow("COMPLIANCE GAP REPORT"));
  lines.push(csvRow("Generated", data.scanTimestamp));
  lines.push(csvRow("Source", "Schema Intelligence Engine - Compliance Scanner"));

  // ─── Section 1: Summary ───
  lines.push(csvSection("SECTION 1: SUMMARY"));
  lines.push(csvRow("Metric", "Value"));
  lines.push(csvRow("Total Columns Scanned", s.totalColumns));
  lines.push(csvRow("PII Fields", s.piiFields));
  lines.push(csvRow("PHI Fields", s.phiFields));
  lines.push(csvRow("Financial Fields", s.financialFields));
  lines.push(csvRow("SOX Fields", s.soxFields));
  lines.push(csvRow("PCI-DSS Fields", s.pciFields));
  lines.push(csvRow("Encryption Required", s.encryptionRequired));
  lines.push(csvRow("Masking Required", s.maskingRequired));
  lines.push(csvRow("Audit Required", s.auditRequired));
  lines.push(csvRow("Consent Required", s.consentRequired));

  // ─── Section 2: Framework Scores ───
  lines.push(csvSection("SECTION 2: FRAMEWORK SCORES"));
  lines.push(csvRow("Framework", "Status", "Score", "Coverage", "Fields Detected", "Findings Count"));
  for (const [name, f] of Object.entries(fw)) {
    const fieldsDetected =
      f.phiFields ?? f.piiFields ?? f.financialFields ?? f.cardFields ?? 0;
    lines.push(
      csvRow(
        name,
        f.status,
        f.score,
        f.coverage,
        fieldsDetected,
        f.findings.length
      )
    );
  }

  // ─── Section 3: Rule Evaluations ───
  if (ruleEvals) {
    lines.push(csvSection("SECTION 3: RULE EVALUATIONS"));
    lines.push(csvRow("Framework", "Rule ID", "Rule Name", "Reference", "Severity", "Status", "Affected Fields", "Required Actions"));
    let ruleCount = 0;
    for (const [framework, rules] of Object.entries(ruleEvals)) {
      for (const rule of rules) {
        lines.push(
          csvRow(
            framework,
            rule.ruleId,
            rule.name,
            rule.reference,
            rule.severity,
            rule.status,
            rule.affectedFields,
            (rule.requiredActions || []).join("; ")
          )
        );
        ruleCount++;
      }
    }
    if (ruleCount === 0) {
      lines.push(csvRow("N/A", "", "No rules evaluated", "", "", "", "", ""));
    }
  } else {
    lines.push(csvSection("SECTION 3: RULE EVALUATIONS"));
    lines.push(csvRow("Status", "Rule evaluations not available from scan"));
  }

  // ─── Section 4: Gap Report ───
  if (gapReport) {
    lines.push(csvSection("SECTION 4: GAP REPORT"));
    lines.push(csvRow("Total Violations", gapReport.totalViolations));
    lines.push(csvRow("Critical", gapReport.bySeverity?.critical || 0));
    lines.push(csvRow("High", gapReport.bySeverity?.high || 0));
    lines.push(csvRow("Medium", gapReport.bySeverity?.medium || 0));
    lines.push(csvRow("Low", gapReport.bySeverity?.low || 0));

    // Violation details
    const violations = gapReport.violations || [];
    if (violations.length > 0) {
      lines.push(csvRow("")); // blank separator
      lines.push(csvRow("ID", "Severity", "Framework", "Rule ID", "Title", "Description", "Affected Fields", "Required Actions", "Estimated Effort"));
      for (const v of violations) {
        lines.push(
          csvRow(
            v.id,
            v.severity,
            v.framework,
            v.ruleId,
            v.title,
            v.description,
            v.affectedFields,
            (v.requiredActions || []).join("; "),
            v.estimatedEffort || "N/A"
          )
        );
      }
    }
  } else {
    lines.push(csvSection("SECTION 4: GAP REPORT"));
    lines.push(csvRow("Status", "Gap report not available from scan"));
  }

  // ─── Section 5: Sensitivity Breakdown ───
  lines.push(csvSection("SECTION 5: SENSITIVITY BREAKDOWN"));
  lines.push(csvRow("Level", "Columns", "Percentage"));
  const totalCols = s.totalColumns || 1;
  for (const [level, count] of Object.entries(sens)) {
    lines.push(
      csvRow(
        level,
        count,
        `${Math.round((count as number / totalCols) * 100)}%`
      )
    );
  }

  // ─── Section 6: Top Findings (Sensitive Fields) ───
  lines.push(csvSection("SECTION 6: TOP FINDINGS (Sensitive Fields)"));
  lines.push(csvRow("Table", "Column", "Classification", "Sensitivity", "Confidence %", "Frameworks", "Action"));
  const topFindings = data.topFindings.slice(0, 50);
  if (topFindings.length > 0) {
    for (const f of topFindings) {
      lines.push(
        csvRow(
          `${f.table}.${f.column}`,
          f.classification,
          f.sensitivity,
          f.confidence,
          (f.frameworks || []).join("/"),
          f.action || "Review"
        )
      );
    }
  } else {
    lines.push(csvRow("N/A", "", "No sensitive fields detected", "", "", "", ""));
  }

  // ─── Footer ───
  lines.push(csvSection("END OF REPORT"));
  lines.push(csvRow("Generated by", "Schema Intelligence Engine"));
  lines.push(csvRow("Scan timestamp", data.scanTimestamp));

  return lines.join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();

    // Fetch compliance data by calling the internal scan endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const scanUrl = `${baseUrl}/api/compliance-scan`;
    const scanRes = await fetch(scanUrl, { cache: "no-store" });

    if (!scanRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch compliance scan data" },
        { status: 502 }
      );
    }

    const data: ComplianceResponse = await scanRes.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: "Compliance scan returned unsuccessful result" },
        { status: 502 }
      );
    }

    // Generate date string for filename (YYYY-MM-DD)
    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "json") {
      // Return full compliance-scan response as downloadable JSON
      const jsonPayload = JSON.stringify(data, null, 2);
      return new NextResponse(jsonPayload, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="compliance-report-${dateStr}.json"`,
        },
      });
    }

    // Default: CSV format
    const csvPayload = buildCSV(data);
    return new NextResponse(csvPayload, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compliance-report-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("[compliance-export] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: message,
        scanTimestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
