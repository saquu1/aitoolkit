// =============================================================================
// Compliance Snapshot API — One-click scan capture for history tracking
// =============================================================================
//
// GET /api/compliance-snapshot
//
// Calls the compliance-scan API internally, extracts scores and violation
// counts, and saves a snapshot via POST to /api/compliance-history.
// This allows one-click snapshot creation for tracking history over time.
// =============================================================================

import { NextResponse } from "next/server";

const BASE_URL = "http://localhost:3000";

export async function GET() {
  try {
    // Step 1: Call the compliance-scan API internally
    const scanResponse = await fetch(`${BASE_URL}/api/compliance-scan`, {
      cache: "no-store",
    });

    if (!scanResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Compliance scan returned ${scanResponse.status}` },
        { status: 502 }
      );
    }

    const scanData = await scanResponse.json();

    if (!scanData.success) {
      return NextResponse.json(
        { success: false, error: "Compliance scan returned unsuccessful response" },
        { status: 502 }
      );
    }

    // Step 2: Extract scores and violation counts from the scan response
    const summary = scanData.summary || {};
    const frameworks = scanData.frameworks || {};

    const hipaaScore = frameworks.HIPAA?.score ?? 0;
    const gdprScore = frameworks.GDPR?.score ?? 0;
    const soxScore = frameworks.SOX?.score ?? 0;
    const pciScore = frameworks["PCI-DSS"]?.score ?? 0;

    // Extract violation counts from gap report if available
    const gapReport = scanData.gapReport || {};
    const bySeverity = gapReport.bySeverity || {};

    const criticalCount = bySeverity.critical ?? 0;
    const highCount = bySeverity.high ?? 0;
    const mediumCount = bySeverity.medium ?? 0;
    const lowCount = bySeverity.low ?? 0;

    // Step 3: Save the snapshot via POST to /api/compliance-history
    const historyPayload = {
      totalColumns: summary.totalColumns ?? 0,
      piiFields: summary.piiFields ?? 0,
      phiFields: summary.phiFields ?? 0,
      soxFields: summary.soxFields ?? 0,
      pciFields: summary.pciFields ?? 0,
      hipaaScore,
      gdprScore,
      soxScore,
      pciScore,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      summaryJson: JSON.stringify(scanData),
    };

    const historyResponse = await fetch(`${BASE_URL}/api/compliance-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(historyPayload),
    });

    if (!historyResponse.ok) {
      const errorBody = await historyResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save history record: ${historyResponse.status} - ${errorBody}`,
        },
        { status: 500 }
      );
    }

    const historyResult = await historyResponse.json();

    // Step 4: Return the saved record
    return NextResponse.json({
      success: true,
      message: "Compliance snapshot captured and saved to history",
      snapshot: historyResult.record,
      scores: {
        hipaa: hipaaScore,
        gdpr: gdprScore,
        sox: soxScore,
        pci: pciScore,
      },
      violations: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    });
  } catch (error) {
    console.error("Error creating compliance snapshot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create compliance snapshot" },
      { status: 500 }
    );
  }
}
