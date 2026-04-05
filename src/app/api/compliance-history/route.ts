// =============================================================================
// Compliance Scan History API — Store and retrieve compliance scan snapshots
// =============================================================================
//
// POST /api/compliance-history  — Save a new compliance scan record
// GET  /api/compliance-history  — Retrieve all records with trend analysis
//
// The history is capped at 50 records; oldest records are auto-deleted.
// Uses raw SQL queries for reliable schema evolution compatibility.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// ─── Maximum records to keep ─────────────────────────────────────────────────
const MAX_RECORDS = 50;

// ─── POST: Save a new scan record ───────────────────────────────────────────

interface ComplianceScanInput {
  totalColumns: number;
  piiFields: number;
  phiFields: number;
  soxFields: number;
  pciFields: number;
  hipaaScore: number;
  gdprScore: number;
  soxScore: number;
  pciScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  summaryJson: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ComplianceScanInput = await request.json();

    const {
      totalColumns,
      piiFields,
      phiFields,
      soxFields,
      pciFields,
      hipaaScore,
      gdprScore,
      soxScore,
      pciScore,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      summaryJson,
    } = body;

    // Validate required fields
    if (
      totalColumns === undefined ||
      piiFields === undefined ||
      phiFields === undefined ||
      soxFields === undefined ||
      pciFields === undefined ||
      hipaaScore === undefined ||
      gdprScore === undefined ||
      soxScore === undefined ||
      pciScore === undefined ||
      criticalCount === undefined ||
      highCount === undefined ||
      mediumCount === undefined ||
      lowCount === undefined ||
      !summaryJson
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields in request body" },
        { status: 400 }
      );
    }

    // Generate a unique ID (CUID-like)
    const id = `csr_${Date.now()}_${randomUUID().replace(/-/g, "").substring(0, 12)}`;

    // Use raw SQL to insert (avoids stale Prisma client model cache)
    await db.$executeRawUnsafe(
      `INSERT INTO ComplianceScanRecord (
        id, totalColumns, piiFields, phiFields, soxFields, pciFields,
        hipaaScore, gdprScore, soxScore, pciScore,
        criticalCount, highCount, mediumCount, lowCount, summaryJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      totalColumns,
      piiFields,
      phiFields,
      soxFields,
      pciFields,
      hipaaScore,
      gdprScore,
      soxScore,
      pciScore,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      summaryJson
    );

    // Auto-prune: keep only the last MAX_RECORDS
    const countResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ComplianceScanRecord`
    ) as Array<{ count: number }>;
    const count = countResult[0]?.count ?? 0;

    if (count > MAX_RECORDS) {
      const deleteCount = count - MAX_RECORDS;
      await db.$executeRawUnsafe(
        `DELETE FROM ComplianceScanRecord WHERE id IN (
          SELECT id FROM ComplianceScanRecord ORDER BY scanTimestamp ASC LIMIT ?
        )`,
        deleteCount
      );
    }

    // Fetch the inserted record to return it
    const records = await db.$queryRawUnsafe(
      `SELECT * FROM ComplianceScanRecord WHERE id = ?`,
      id
    ) as ScanRecord[];
    const record = records.length > 0 ? records[0] : null;

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Error saving compliance scan record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save compliance scan record" },
      { status: 500 }
    );
  }
}

// ─── GET: Retrieve all records with trend analysis ──────────────────────────

interface ScoreTrend {
  current: number;
  previous: number;
  change: number;
  direction: "up" | "down" | "stable";
}

interface ScanRecord {
  id: string;
  scanTimestamp: string;
  totalColumns: number;
  piiFields: number;
  phiFields: number;
  soxFields: number;
  pciFields: number;
  hipaaScore: number;
  gdprScore: number;
  soxScore: number;
  pciScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  summaryJson: string;
}

function computeTrends(
  records: ScanRecord[]
): { hipaa: ScoreTrend; gdpr: ScoreTrend; sox: ScoreTrend; pci: ScoreTrend } {
  const emptyTrend = (score: number): ScoreTrend => ({
    current: score,
    previous: score,
    change: 0,
    direction: "stable",
  });

  if (records.length < 2) {
    const r = records[0];
    if (!r) {
      return {
        hipaa: { current: 0, previous: 0, change: 0, direction: "stable" },
        gdpr: { current: 0, previous: 0, change: 0, direction: "stable" },
        sox: { current: 0, previous: 0, change: 0, direction: "stable" },
        pci: { current: 0, previous: 0, change: 0, direction: "stable" },
      };
    }
    return {
      hipaa: emptyTrend(r.hipaaScore),
      gdpr: emptyTrend(r.gdprScore),
      sox: emptyTrend(r.soxScore),
      pci: emptyTrend(r.pciScore),
    };
  }

  // Records are ordered DESC (most recent first)
  const current = records[0];
  const previous = records[1];

  const calc = (curr: number, prev: number): ScoreTrend => {
    const change = curr - prev;
    return {
      current: curr,
      previous: prev,
      change,
      direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
    };
  };

  return {
    hipaa: calc(current.hipaaScore, previous.hipaaScore),
    gdpr: calc(current.gdprScore, previous.gdprScore),
    sox: calc(current.soxScore, previous.soxScore),
    pci: calc(current.pciScore, previous.pciScore),
  };
}

export async function GET() {
  try {
    // Fetch all records using raw SQL, most recent first
    const records = await db.$queryRawUnsafe(
      `SELECT * FROM ComplianceScanRecord ORDER BY scanTimestamp DESC`
    ) as ScanRecord[];

    // Compute trend data from the records
    const trends = computeTrends(records);

    return NextResponse.json({
      success: true,
      totalRecords: records.length,
      records,
      trends,
    });
  } catch (error) {
    console.error("Error fetching compliance scan history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch compliance scan history" },
      { status: 500 }
    );
  }
}
