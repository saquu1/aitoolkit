// =============================================================================
// Compliance Data Export API — CSV / JSON download of compliance scan results
// =============================================================================
//
// GET /api/compliance-export?format=csv|json
//
// Fetches compliance scan data from the database and returns it as either:
//   - CSV:  text/csv with structured sections (summary, frameworks, sensitivity, findings)
//   - JSON: application/json with the full compliance-scan response payload
//
// Reuses the same scan engine pattern from /api/compliance-scan but keeps the
// route minimal by calling that endpoint internally.
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
// BUILD CSV PAYLOAD
// ═══════════════════════════════════════════════════════════════════════════

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
}

function buildCSV(data: ComplianceResponse): string {
  const lines: string[] = [];
  const s = data.summary;
  const fw = data.frameworks;
  const sens = data.sensitivityBreakdown;
  const findings = data.topFindings.slice(0, 10);

  // Header
  lines.push(csvRow("Compliance Export Report"));
  lines.push(csvRow("Generated", data.scanTimestamp));
  lines.push(csvRow("Total Columns Analyzed", s.totalColumns));

  // --- Summary Section ---
  lines.push(csvSection("Summary"));
  lines.push(csvRow("Metric", "Value"));
  lines.push(csvRow("Total Columns", s.totalColumns));
  lines.push(csvRow("PII Fields", s.piiFields));
  lines.push(csvRow("PHI Fields", s.phiFields));
  lines.push(csvRow("Financial Fields", s.financialFields));
  lines.push(csvRow("PCI Fields", s.pciFields));
  lines.push(csvRow("Encryption Required", s.encryptionRequired));
  lines.push(csvRow("Masking Required", s.maskingRequired));
  lines.push(csvRow("Audit Required", s.auditRequired));
  lines.push(csvRow("Consent Required", s.consentRequired));

  // --- Frameworks Section ---
  lines.push(csvSection("Frameworks"));
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

  // --- Sensitivity Breakdown Section ---
  lines.push(csvSection("Sensitivity Breakdown"));
  lines.push(csvRow("Level", "Column Count"));
  lines.push(csvRow("Public", sens.public));
  lines.push(csvRow("Internal", sens.internal));
  lines.push(csvRow("Confidential", sens.confidential));
  lines.push(csvRow("Restricted", sens.restricted));

  // --- Top 10 Findings Section ---
  lines.push(csvSection("Top Findings"));
  lines.push(csvRow("Table", "Column", "Classification", "Sensitivity", "Confidence %", "Action"));
  for (const f of findings) {
    lines.push(
      csvRow(
        f.table,
        f.column,
        f.classification,
        f.sensitivity,
        f.confidence,
        f.action
      )
    );
  }

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

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === "json") {
      // Return full compliance-scan response as downloadable JSON
      const jsonPayload = JSON.stringify(data, null, 2);
      return new NextResponse(jsonPayload, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="compliance-report-${timestamp}.json"`,
        },
      });
    }

    // Default: CSV format
    const csvPayload = buildCSV(data);
    return new NextResponse(csvPayload, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compliance-report-${timestamp}.csv"`,
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
