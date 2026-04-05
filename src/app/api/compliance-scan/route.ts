// =============================================================================
// Compliance Scan API — Full-schema analysis against HIPAA, GDPR, SOX, PCI-DSS
// =============================================================================
//
// GET /api/compliance-scan
//
// Scans ALL ToolkitTable records, parses column definitions, and returns
// a comprehensive compliance detection result including:
//   - Summary counts (total columns, PII/PHI/financial/PCI fields)
//   - Per-framework status (HIPAA, GDPR, SOX, PCI-DSS)
//   - Sensitivity breakdown (public / internal / confidential / restricted)
//   - Top findings sorted by confidence × severity
//
// The response is deterministic — identical data always yields identical output.
// =============================================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN DEFINITIONS (from rules.md)
// ═══════════════════════════════════════════════════════════════════════════

interface PatternDef {
  patterns: string[];
  confidence: number;
  category: string;
  requiresEncryption: boolean;
  requiresMasking: boolean;
  requiresAudit: boolean;
  requiresConsent: boolean;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
}

const PII_PATTERNS: Record<string, PatternDef> = {
  contact: {
    patterns: [
      "email", "phone", "mobile", "fax", "telephone",
      "contact_number", "contact_email",
    ],
    confidence: 90,
    category: "contact",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: false,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  name: {
    patterns: [
      "first_name", "last_name", "middle_name", "full_name",
      "maiden_name", "patient_name", "family_name",
      "given_name", "surname",
    ],
    confidence: 95,
    category: "basic_identity",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: false,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  address: {
    patterns: [
      "address", "street", "address_line", "address1", "address2",
      "mailing_address", "residential_address",
    ],
    confidence: 90,
    category: "contact",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: false,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  location: {
    patterns: [
      "city", "state", "province", "country", "region",
      "district", "county", "postal", "zip", "zipcode", "postcode",
    ],
    confidence: 75,
    category: "location",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: false,
    requiresConsent: false,
    sensitivity: "internal",
  },
  national_id: {
    patterns: [
      "ssn", "social_security", "national_id", "passport",
      "cnic", "nic", "license_number", "id_number",
    ],
    confidence: 99,
    category: "identification",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  demographic: {
    patterns: [
      "gender", "sex", "dob", "birth_date", "birth",
      "age", "marital", "religion", "ethnicity",
      "nationality", "race", "language",
    ],
    confidence: 85,
    category: "demographics",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: false,
    requiresConsent: true,
    sensitivity: "confidential",
  },
  biometric: {
    patterns: [
      "fingerprint", "iris", "face", "retina", "dna",
      "voice_print", "palm", "signature_image",
    ],
    confidence: 99,
    category: "biometric",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: true,
    sensitivity: "restricted",
  },
  financial: {
    patterns: [
      "salary", "income", "bank_account", "credit_card",
      "debit_card", "card_number", "tax_id", "tax_number",
      "routing_number", "iban", "swift", "account_balance",
    ],
    confidence: 95,
    category: "financial",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
};

const PHI_PATTERNS: Record<string, PatternDef> = {
  patient_identifier: {
    patterns: [
      "mrn", "medical_record", "patient_id", "patient_number",
      "encounter_id", "visit_id", "episode_id", "case_id",
    ],
    confidence: 98,
    category: "patient_identifier",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  clinical: {
    patterns: [
      "diagnosis", "icd", "icd_code", "icd10", "symptom",
      "complaint", "condition", "prognosis", "clinical_note",
      "medical_history", "family_history", "surgical_history",
    ],
    confidence: 95,
    category: "clinical",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  treatment: {
    patterns: [
      "prescription", "medication", "drug", "dosage", "treatment",
      "procedure", "surgery", "therapy", "radiation",
      "chemotherapy", "vaccination", "immunization",
    ],
    confidence: 95,
    category: "treatment",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  lab: {
    patterns: [
      "lab_result", "test_result", "blood", "urine", "specimen",
      "culture", "biopsy", "pathology", "radiology", "imaging",
    ],
    confidence: 95,
    category: "lab",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  vitals: {
    patterns: [
      "blood_pressure", "heart_rate", "pulse", "temperature",
      "weight", "height", "bmi", "oxygen_saturation",
      "respiratory_rate", "blood_type", "blood_group",
    ],
    confidence: 90,
    category: "vitals",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  allergies: {
    patterns: [
      "allergy", "allergic", "allergen", "reaction",
      "intolerance", "sensitivity",
    ],
    confidence: 95,
    category: "allergies",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  insurance: {
    patterns: [
      "insurance", "policy", "claim", "coverage", "beneficiary",
      "subscriber", "co_pay", "deductible", "premium",
      "payer", "plan_id",
    ],
    confidence: 90,
    category: "insurance",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  provider: {
    patterns: [
      "doctor", "physician", "nurse", "surgeon", "specialist",
      "attending", "referring", "consultant", "provider_id", "npi",
    ],
    confidence: 70,
    category: "provider",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "internal",
  },
  encounter: {
    patterns: [
      "admission", "discharge", "transfer", "appointment",
      "visit", "encounter", "check_in", "check_out", "wait_time",
    ],
    confidence: 75,
    category: "encounter",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "internal",
  },
};

const SOX_PATTERNS: Record<string, PatternDef> = {
  revenue: {
    patterns: [
      "revenue", "sales", "sales_amount", "invoice_amount",
      "billing_amount", "fee", "charge_amount",
    ],
    confidence: 90,
    category: "revenue",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  expense: {
    patterns: [
      "expense", "cost", "payment_amount", "purchase_price",
      "vendor_payment", "refund",
    ],
    confidence: 90,
    category: "expense",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  asset: {
    patterns: [
      "asset_value", "depreciation", "book_value",
      "inventory_value", "equipment_value", "property_value",
    ],
    confidence: 85,
    category: "asset",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "internal",
  },
  journal: {
    patterns: [
      "journal_entry", "gl_entry", "posting", "adjustment",
      "reversal", "correction", "trial_balance",
    ],
    confidence: 95,
    category: "journal",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
  audit: {
    patterns: [
      "audit_log", "change_log", "modification", "approval",
      "authorized_by", "review_status",
    ],
    confidence: 80,
    category: "audit_trail",
    requiresEncryption: false,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "internal",
  },
  financial_statement: {
    patterns: [
      "financial_statement", "balance_sheet", "income_statement", "pnl",
    ],
    confidence: 85,
    category: "financial_report",
    requiresEncryption: true,
    requiresMasking: false,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
};

const PCI_PATTERNS: Record<string, PatternDef> = {
  prohibited: {
    patterns: [
      "credit_card", "card_number", "pan", "track1", "track2",
      "magnetic_stripe", "card_data",
    ],
    confidence: 99,
    category: "prohibited",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  restricted: {
    patterns: [
      "cvv", "cvc", "security_code", "cvv2", "cid",
      "pin", "pin_number", "pin_code",
    ],
    confidence: 99,
    category: "restricted",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "restricted",
  },
  minimized: {
    patterns: [
      "cardholder_name", "name_on_card", "expiry_date",
      "card_expiry", "expiration", "service_code", "last_four",
    ],
    confidence: 85,
    category: "minimized",
    requiresEncryption: true,
    requiresMasking: true,
    requiresAudit: true,
    requiresConsent: false,
    sensitivity: "confidential",
  },
};

// Healthcare table name patterns (regex)
const HEALTHCARE_TABLE_RE =
  /patient|encounter|diagnosis|lab|clinical|medical|prescription|medication|allergy|vital|admission|discharge|appointment|provider|nurse|physician|insurance|claim|billing|pharmacy|procedure|surgery|treatment|therapy|observation|immunization|pathology|radiology/i;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnMatch {
  tableName: string;
  columnName: string;
  columnType: string;
  type: "PII" | "PHI" | "SOX" | "PCI-DSS";
  category: string;
  confidence: number;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  requiresEncryption: boolean;
  requiresMasking: boolean;
  requiresAudit: boolean;
  requiresConsent: boolean;
  frameworks: string[];
  action: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalise a column name for pattern matching.
 * Lower-cased, underscores/hyphens/dots become single spaces.
 */
function normalize(colName: string): string {
  return colName.toLowerCase().replace(/[_\-\.]+/g, " ").trim();
}

/**
 * Check whether a normalised column name contains any of the given keywords.
 * Uses word-boundary-aware matching so "dob" doesn't match "adobe".
 */
function matchesAny(normalized: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    // Build a regex from the keyword with word-boundary awareness
    const kwNorm = kw.replace(/[_\-\.]+/g, " ");
    // Split the keyword into tokens and match all tokens in order
    const tokens = kwNorm.split(/\s+/);
    if (tokens.length === 0) continue;

    // All tokens must appear as substrings (not necessarily as whole words,
    // because column names are already isolated). "ssn" should match "ssn".
    const allMatch = tokens.every((t) => normalized.includes(t));
    if (allMatch) return true;
  }
  return false;
}

/**
 * Determine the required protection action string for a finding.
 */
function buildAction(match: ColumnMatch): string {
  const parts: string[] = [];
  if (match.requiresEncryption) parts.push("Encrypt");
  if (match.requiresMasking) parts.push("Mask");
  if (match.requiresAudit) parts.push("Audit");
  if (match.requiresConsent) parts.push("Consent");
  return parts.length > 0 ? parts.join(" + ") : "Review";
}

/**
 * Check if a table name matches healthcare context patterns.
 */
function isHealthcareTable(tableName: string): boolean {
  return HEALTHCARE_TABLE_RE.test(tableName);
}

/**
 * Get the highest sensitivity from a set of matches for the same column.
 */
function highestSensitivity(
  a: "public" | "internal" | "confidential" | "restricted",
  b: "public" | "internal" | "confidential" | "restricted"
): "public" | "internal" | "confidential" | "restricted" {
  const order = { public: 0, internal: 1, confidential: 2, restricted: 3 };
  return order[b] > order[a] ? b : a;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyse a single column against all compliance pattern groups.
 * Returns an array of matches (usually 0 or 1, but can be multiple).
 */
function analyzeColumn(
  tableName: string,
  colName: string,
  colType: string
): ColumnMatch[] {
  const norm = normalize(colName);
  const matches: ColumnMatch[] = [];
  const healthcareCtx = isHealthcareTable(tableName);

  // --- PII ---
  for (const [, def] of Object.entries(PII_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      // Healthcare context override: PII → PHI
      const effectiveType: "PII" | "PHI" =
        healthcareCtx ? "PHI" : "PII";
      const effectiveSensitivity = healthcareCtx
        ? highestSensitivity(def.sensitivity, "restricted")
        : def.sensitivity;

      const frameworks = ["GDPR"];
      if (effectiveType === "PHI") frameworks.push("HIPAA");

      matches.push({
        tableName,
        columnName: colName,
        columnType: colType,
        type: effectiveType,
        category: def.category,
        confidence: def.confidence,
        sensitivity: effectiveSensitivity,
        requiresEncryption:
          def.requiresEncryption || healthcareCtx,
        requiresMasking:
          def.requiresMasking || healthcareCtx,
        requiresAudit:
          def.requiresAudit || healthcareCtx,
        requiresConsent:
          def.requiresConsent || healthcareCtx,
        frameworks,
        action: "", // filled below
      });
    }
  }

  // --- PHI (direct) ---
  for (const [, def] of Object.entries(PHI_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      const frameworks = ["HIPAA"];
      if (
        def.category === "insurance" ||
        def.category === "encounter"
      ) {
        frameworks.push("GDPR");
      }

      matches.push({
        tableName,
        columnName: colName,
        columnType: colType,
        type: "PHI",
        category: def.category,
        confidence: def.confidence,
        sensitivity: def.sensitivity,
        requiresEncryption: def.requiresEncryption,
        requiresMasking: def.requiresMasking,
        requiresAudit: def.requiresAudit,
        requiresConsent: def.requiresConsent,
        frameworks,
        action: "", // filled below
      });
    }
  }

  // --- SOX ---
  for (const [, def] of Object.entries(SOX_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      // If already marked as PHI (healthcare context), add SOX as extra
      const isAlsoPHI = matches.some(
        (m) => m.type === "PHI" && m.columnName === colName
      );
      const frameworks = ["SOX"];
      if (isAlsoPHI) frameworks.push("HIPAA", "GDPR");

      matches.push({
        tableName,
        columnName: colName,
        columnType: colType,
        type: "SOX",
        category: def.category,
        confidence: def.confidence,
        sensitivity: def.sensitivity,
        requiresEncryption: def.requiresEncryption,
        requiresMasking: def.requiresMasking,
        requiresAudit: def.requiresAudit,
        requiresConsent: def.requiresConsent,
        frameworks,
        action: "", // filled below
      });
    }
  }

  // --- PCI-DSS ---
  for (const [, def] of Object.entries(PCI_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      const frameworks = ["PCI-DSS"];
      // Credit card fields are also GDPR financial
      if (
        def.category === "prohibited" ||
        def.category === "minimized"
      ) {
        frameworks.push("GDPR");
      }
      // If already SOX
      const isAlsoSOX = matches.some(
        (m) => m.type === "SOX" && m.columnName === colName
      );
      if (isAlsoSOX) frameworks.push("SOX");

      matches.push({
        tableName,
        columnName: colName,
        columnType: colType,
        type: "PCI-DSS",
        category: def.category,
        confidence: def.confidence,
        sensitivity: def.sensitivity,
        requiresEncryption: def.requiresEncryption,
        requiresMasking: def.requiresMasking,
        requiresAudit: def.requiresAudit,
        requiresConsent: def.requiresConsent,
        frameworks,
        action: "", // filled below
      });
    }
  }

  // Deduplicate: if a column has both PII→PHI (via healthcare override)
  // and a direct PHI match, keep only the direct PHI match
  const deduped = deduplicateMatches(matches);

  // Fill action strings
  for (const m of deduped) {
    m.action = buildAction(m);
  }

  return deduped;
}

/**
 * Deduplicate matches for the same column.
 * If a column has multiple matches, keep the one with the highest confidence.
 * If tied, prefer PHI > PCI > SOX > PII.
 */
function deduplicateMatches(matches: ColumnMatch[]): ColumnMatch[] {
  const byColumn = new Map<string, ColumnMatch[]>();
  for (const m of matches) {
    const key = `${m.tableName}.${m.columnName}`;
    if (!byColumn.has(key)) byColumn.set(key, []);
    byColumn.get(key)!.push(m);
  }

  const result: ColumnMatch[] = [];
  for (const [, colMatches] of byColumn) {
    // Sort: highest confidence first, then type priority
    colMatches.sort((a, b) => {
      if (b.confidence !== a.confidence)
        return b.confidence - a.confidence;
      const typePriority: Record<string, number> = {
        PHI: 4,
        "PCI-DSS": 3,
        SOX: 2,
        PII: 1,
      };
      return (typePriority[b.type] ?? 0) - (typePriority[a.type] ?? 0);
    });

    // Keep the best match but merge frameworks
    const best = { ...colMatches[0] };
    const allFrameworks = new Set<string>();
    for (const m of colMatches) {
      for (const fw of m.frameworks) allFrameworks.add(fw);
      // Merge booleans (if any match says true, it's true)
      best.requiresEncryption =
        best.requiresEncryption || m.requiresEncryption;
      best.requiresMasking =
        best.requiresMasking || m.requiresMasking;
      best.requiresAudit =
        best.requiresAudit || m.requiresAudit;
      best.requiresConsent =
        best.requiresConsent || m.requiresConsent;
      best.sensitivity = highestSensitivity(
        best.sensitivity,
        m.sensitivity
      );
    }
    best.frameworks = Array.from(allFrameworks).sort();
    best.action = buildAction(best);
    result.push(best);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FRAMEWORK SCORE CALCULATIONS (from rules.md formulas)
// ═══════════════════════════════════════════════════════════════════════════

function calculateHIPAAScore(phiFields: ColumnMatch[]): {
  score: number;
  controls: Record<string, boolean>;
  status: string;
  coverage: string;
} {
  const totalPHI = phiFields.length;

  if (totalPHI === 0) {
    return {
      score: 100,
      controls: {
        encryptionEnabled: true,
        auditTrailConfigured: true,
        accessControlImplemented: true,
        consentTracking: true,
        breachNotificationReady: true,
      },
      status: "inactive",
      coverage: "100%",
    };
  }

  const phiEncrypted = phiFields.filter(
    (f) => f.requiresEncryption
  ).length;
  const phiAudit = phiFields.filter(
    (f) => f.requiresAudit
  ).length;
  const phiAccessControlled = phiFields.filter(
    (f) => f.sensitivity === "restricted"
  ).length;

  // Assume all controls are implemented (we are in scan-only mode)
  const consentTracking = true;
  const breachReady = true;

  const score = Math.round(
    (phiEncrypted / totalPHI) * 30 +
      (phiAudit / totalPHI) * 25 +
      (phiAccessControlled / totalPHI) * 20 +
      (consentTracking ? 15 : 0) +
      (breachReady ? 10 : 0)
  );

  const status =
    score >= 90
      ? "active"
      : score >= 70
        ? "active"
        : "partial";

  return {
    score,
    controls: {
      encryptionEnabled: true,
      auditTrailConfigured: true,
      accessControlImplemented: true,
      consentTracking: true,
      breachNotificationReady: true,
    },
    status,
    coverage: `${score}%`,
  };
}

function calculateGDPRScore(
  piiFields: ColumnMatch[]
): {
  score: number;
  controls: Record<string, boolean>;
  status: string;
  coverage: string;
} {
  const totalPII = piiFields.length;

  if (totalPII === 0) {
    return {
      score: 100,
      controls: {
        dataProcessingRegister: true,
        dpiaConducted: true,
        consentManagement: true,
        retentionPolicy: true,
        rightToErasure: true,
        breachNotification: true,
        dpoDesignated: true,
        dataPortability: true,
      },
      status: "inactive",
      coverage: "100%",
    };
  }

  const piiEncrypted = piiFields.filter(
    (f) => f.requiresEncryption
  ).length;

  const score = Math.round(
    (piiEncrypted / totalPII) * 25 +
      20 + // consentMechanism
      15 + // retentionPolicy
      15 + // rightToErasure
      15 + // DPIA completed
      10 // DPO designated
  );

  const status =
    score >= 90
      ? "active"
      : score >= 70
        ? "active"
        : "partial";

  return {
    score,
    controls: {
      dataProcessingRegister: true,
      dpiaConducted: true,
      consentManagement: true,
      retentionPolicy: true,
      rightToErasure: true,
      breachNotification: true,
      dpoDesignated: true,
      dataPortability: true,
    },
    status,
    coverage: `${score}%`,
  };
}

function calculateSOXScore(
  financialFields: ColumnMatch[]
): {
  score: number;
  controls: Record<string, boolean>;
  status: string;
  coverage: string;
} {
  const hasFinancialFields = financialFields.length > 0;

  if (!hasFinancialFields) {
    return {
      score: 100,
      controls: {
        auditTrail: true,
        segregationOfDuties: true,
        changeManagement: true,
        accessReviews: true,
        internalControlsDocumented: true,
      },
      status: "inactive",
      coverage: "100%",
    };
  }

  // Financial data exists, apply realistic scoring
  const auditTrail = true;
  const segregationOfDuties = true;
  const changeManagement = true;
  const accessReviews = false; // gap identified
  const internalControlsDocumented = true;

  const score =
    (auditTrail ? 30 : 0) +
    (segregationOfDuties ? 25 : 0) +
    (changeManagement ? 20 : 0) +
    (accessReviews ? 15 : 0) +
    (internalControlsDocumented ? 10 : 0);

  const status =
    score >= 90
      ? "active"
      : score >= 60
        ? "partial"
        : "inactive";

  return {
    score,
    controls: {
      auditTrail,
      segregationOfDuties,
      changeManagement,
      accessReviews,
      internalControlsDocumented,
    },
    status,
    coverage: `${score}%`,
  };
}

function calculatePCIScore(
  pciFields: ColumnMatch[]
): {
  score: number;
  controls: Record<string, boolean>;
  status: string;
  coverage: string;
} {
  const hasProhibited = pciFields.some(
    (f) => f.category === "prohibited"
  );
  const hasRestricted = pciFields.some(
    (f) => f.category === "restricted"
  );

  if (pciFields.length === 0) {
    return {
      score: 100,
      controls: {
        noStoredPAN: true,
        noStoredCVV: true,
        encryptionAtRest: true,
        encryptionInTransit: true,
        accessRestricted: true,
      },
      status: "inactive",
      coverage: "100%",
    };
  }

  const score =
    (hasProhibited ? 0 : 30) +
    (hasRestricted ? 0 : 25) +
    20 + // encryption at rest
    15 + // encryption in transit
    10; // access restricted

  const status = score >= 90 ? "active" : "partial";

  return {
    score,
    controls: {
      noStoredPAN: !hasProhibited,
      noStoredCVV: !hasRestricted,
      encryptionAtRest: true,
      encryptionInTransit: true,
      accessRestricted: true,
    },
    status,
    coverage: `${score}%`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — RULE DEFINITIONS & EVALUATION
// ═══════════════════════════════════════════════════════════════════════════

type RuleStatus = "PASS" | "FAIL" | "WARNING" | "PARTIAL" | "N/A";
type RuleSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface RuleDefinition {
  ruleId: string;
  name: string;
  reference: string;
  severity: RuleSeverity;
  framework: "GDPR" | "HIPAA" | "PCI-DSS";
  description: string;
}

interface RuleEvaluation {
  ruleId: string;
  name: string;
  reference: string;
  severity: RuleSeverity;
  status: RuleStatus;
  description: string;
  affectedFields: number;
  requiredActions: string[];
}

interface Violation {
  id: string;
  severity: RuleSeverity;
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

// ---------------------------------------------------------------------------
// Rule Definitions (from rules3.md — Phase 3)
// ---------------------------------------------------------------------------

const GDPR_RULES: RuleDefinition[] = [
  {
    ruleId: "G1",
    name: "Lawful Basis For Processing",
    reference: "Art. 6",
    severity: "HIGH",
    framework: "GDPR",
    description:
      "Verify a lawful basis (consent, contract, legal obligation, vital interests, public task, legitimate interests) is documented for all personal data processing activities.",
  },
  {
    ruleId: "G2",
    name: "Data Minimization",
    reference: "Art. 5(1)(c)",
    severity: "MEDIUM",
    framework: "GDPR",
    description:
      "Ensure personal data collected is adequate, relevant, and limited to what is necessary for processing purposes.",
  },
  {
    ruleId: "G3",
    name: "Storage Limitation / Retention",
    reference: "Art. 5(1)(e)",
    severity: "HIGH",
    framework: "GDPR",
    description:
      "Personal data must be kept no longer than necessary for processing purposes; retention policies must be defined and enforced.",
  },
  {
    ruleId: "G4",
    name: "Right To Erasure",
    reference: "Art. 17",
    severity: "CRITICAL",
    framework: "GDPR",
    description:
      "Data subjects have the right to request deletion of their personal data; cascading deletion across all related systems must be supported.",
  },
  {
    ruleId: "G5",
    name: "Right To Data Portability",
    reference: "Art. 20",
    severity: "MEDIUM",
    framework: "GDPR",
    description:
      "Data subjects must be able to receive their personal data in a structured, commonly used, and machine-readable format.",
  },
  {
    ruleId: "G6",
    name: "Encryption At Rest",
    reference: "Art. 32",
    severity: "CRITICAL",
    framework: "GDPR",
    description:
      "Appropriate technical measures including encryption must protect personal data stored in databases, backups, and file systems.",
  },
  {
    ruleId: "G7",
    name: "Masking In Logs",
    reference: "Art. 32",
    severity: "HIGH",
    framework: "GDPR",
    description:
      "Personal data must be masked or redacted in application logs, debug output, and monitoring systems to prevent accidental exposure.",
  },
  {
    ruleId: "G8",
    name: "Consent Tracking",
    reference: "Art. 7",
    severity: "HIGH",
    framework: "GDPR",
    description:
      "Consent must be freely given, specific, informed, and unambiguous; records of consent and withdrawal must be maintained.",
  },
  {
    ruleId: "G9",
    name: "Cross-Border Transfer Compliance",
    reference: "Art. 44-49",
    severity: "CRITICAL",
    framework: "GDPR",
    description:
      "Transfers of personal data to third countries require appropriate safeguards such as Standard Contractual Clauses (SCCs), adequacy decisions, or BCRs.",
  },
  {
    ruleId: "G10",
    name: "Privacy By Design Check",
    reference: "Art. 25",
    severity: "MEDIUM",
    framework: "GDPR",
    description:
      "Data protection must be embedded into the design and architecture of processing systems from the outset (privacy by design and by default).",
  },
];

const HIPAA_RULES: RuleDefinition[] = [
  {
    ruleId: "H1",
    name: "Minimum Necessary Standard",
    reference: "45 CFR § 164.502(b)",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "Protected Health Information (PHI) access must be limited to the minimum necessary for the intended purpose; role-based access controls required.",
  },
  {
    ruleId: "H2",
    name: "PHI Encryption (In Transit + At Rest)",
    reference: "45 CFR § 164.312",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "PHI must be encrypted both in transit (TLS 1.2+) and at rest (AES-256 or equivalent) to addressable encryption requirements.",
  },
  {
    ruleId: "H3",
    name: "Audit Controls / Access Logging",
    reference: "45 CFR § 164.312(b)",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "Comprehensive audit logging mechanisms must record all PHI access, modifications, and disclosures with user identity, timestamp, and action type.",
  },
  {
    ruleId: "H4",
    name: "Automatic Logoff",
    reference: "45 CFR § 164.312(a)(2)(iii)",
    severity: "HIGH",
    framework: "HIPAA",
    description:
      "Electronic systems containing PHI must automatically log off users after a period of inactivity to prevent unauthorized access.",
  },
  {
    ruleId: "H5",
    name: "PHI De-identification Standards",
    reference: "45 CFR § 164.514(b)",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "When PHI is de-identified for research or other purposes, all 18 HIPAA identifiers must be removed or obscured per Safe Harbor or Expert Determination methods.",
  },
  {
    ruleId: "H6",
    name: "Business Associate Compliance",
    reference: "45 CFR § 164.308(b)",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "All business associates handling PHI must have executed Business Associate Agreements (BAAs) with appropriate safeguards and compliance obligations.",
  },
  {
    ruleId: "H7",
    name: "Breach Notification Readiness",
    reference: "45 CFR §§ 164.400-414",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "Organizations must have a breach notification plan capable of notifying affected individuals within 60 days, the HHS, and media outlets when applicable.",
  },
  {
    ruleId: "H8",
    name: "Mental Health Extra Protection",
    reference: "42 CFR Part 2",
    severity: "CRITICAL",
    framework: "HIPAA",
    description:
      "Substance abuse and mental health records receive additional protections under 42 CFR Part 2, requiring separate consent for disclosure beyond HIPAA rules.",
  },
];

const PCI_RULES: RuleDefinition[] = [
  {
    ruleId: "P1",
    name: "CVV/CVC Absolute Prohibition",
    reference: "Req 3.2.1",
    severity: "CRITICAL",
    framework: "PCI-DSS",
    description:
      "Storage of Card Verification Values (CVV/CVC/CID) after authorization is strictly prohibited, even if encrypted.",
  },
  {
    ruleId: "P2",
    name: "PAN Protection",
    reference: "Req 3.4",
    severity: "CRITICAL",
    framework: "PCI-DSS",
    description:
      "Primary Account Numbers (PAN) must be rendered unreadable anywhere they are stored using one-way hashing, truncation, index tokens, or strong encryption.",
  },
  {
    ruleId: "P3",
    name: "PAN Masking In Display",
    reference: "Req 3.3",
    severity: "HIGH",
    framework: "PCI-DSS",
    description:
      "PAN must be masked when displayed, showing no more than the first six and last four digits to unauthorized personnel.",
  },
  {
    ruleId: "P4",
    name: "Network Segmentation",
    reference: "Req 1",
    severity: "HIGH",
    framework: "PCI-DSS",
    description:
      "Cardholder data environments must be isolated from the rest of the network via proper network segmentation and access controls.",
  },
  {
    ruleId: "P5",
    name: "Access Control To Cardholder Data",
    reference: "Req 7",
    severity: "CRITICAL",
    framework: "PCI-DSS",
    description:
      "Access to cardholder data must be restricted to authorized individuals on a need-to-know basis with unique user IDs and role-based permissions.",
  },
  {
    ruleId: "P6",
    name: "Vulnerability Management",
    reference: "Req 5-6",
    severity: "CRITICAL",
    framework: "PCI-DSS",
    description:
      "Systems must be protected from malicious software and have regular vulnerability scans and penetration tests performed by qualified parties.",
  },
  {
    ruleId: "P7",
    name: "PCI Compliance Level Assessment",
    reference: "PCI DSS",
    severity: "HIGH",
    framework: "PCI-DSS",
    description:
      "Determine the applicable PCI DSS compliance level based on transaction volume and ensure the appropriate validation requirements are met.",
  },
];

// ---------------------------------------------------------------------------
// Evaluation Context (aggregated data from scan)
// ---------------------------------------------------------------------------

interface EvaluationContext {
  allMatches: ColumnMatch[];
  piiFieldCount: number;     // uniquePIIColumns.size
  phiFieldCount: number;     // uniquePHIColumns.size
  pciFieldCount: number;     // uniquePCIColumns.size
  soxFieldCount: number;     // uniqueFinancialColumns.size
  encryptionRequired: number;
  maskingRequired: number;
  auditRequired: number;
  consentRequired: number;
  phiMatches: ColumnMatch[];  // raw PHI matches (may include dupes from allMatches)
  piiOnlyMatches: ColumnMatch[];
  pciMatches: ColumnMatch[];
}

// ---------------------------------------------------------------------------
// GDPR Rule Evaluation
// ---------------------------------------------------------------------------

function evaluateGDPRRules(ctx: EvaluationContext): RuleEvaluation[] {
  const { piiFieldCount, encryptionRequired, maskingRequired, consentRequired, allMatches } = ctx;
  const piiOrPhiMatches = allMatches.filter(m => m.type === "PII" || m.type === "PHI");

  const results: RuleEvaluation[] = [];

  // G1: Lawful Basis For Processing
  // If piiFields > 0 and piiFields > encryptionRequired → WARNING (basis not documented), else PASS
  const g1Status: RuleStatus = (piiFieldCount > 0 && piiFieldCount > encryptionRequired)
    ? "WARNING"
    : "PASS";
  results.push({
    ruleId: "G1",
    name: "Lawful Basis For Processing",
    reference: "Art. 6",
    severity: "HIGH",
    status: g1Status,
    description: "Verify a lawful basis is documented for all personal data processing activities.",
    affectedFields: piiFieldCount,
    requiredActions: g1Status === "WARNING"
      ? ["Document lawful basis for each data category", "Update privacy policy with legal basis references", "Implement processing activity register"]
      : ["Maintain documented lawful basis records"],
  });

  // G2: Data Minimization
  // Check if any PII/PHI fields have low confidence (< 0.70) → WARNING
  const lowConfidenceFields = piiOrPhiMatches.filter(m => m.confidence < 70);
  // Deduplicate by column key
  const lowConfKeys = new Set(lowConfidenceFields.map(m => `${m.tableName}.${m.columnName}`));
  const g2Status: RuleStatus = lowConfKeys.size > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "G2",
    name: "Data Minimization",
    reference: "Art. 5(1)(c)",
    severity: "MEDIUM",
    status: g2Status,
    description: "Ensure personal data collected is adequate, relevant, and limited to what is necessary.",
    affectedFields: lowConfKeys.size,
    requiredActions: g2Status === "WARNING"
      ? [`Review ${lowConfKeys.size} field(s) with low detection confidence`, "Assess necessity of each personal data field", "Remove unnecessary data collection points"]
      : ["Continue periodic data minimization reviews"],
  });

  // G3: Storage Limitation / Retention
  // If piiFields > 0 → PARTIAL (retention policy assumed not configured for all), else PASS
  const g3Status: RuleStatus = piiFieldCount > 0 ? "PARTIAL" : "PASS";
  results.push({
    ruleId: "G3",
    name: "Storage Limitation / Retention",
    reference: "Art. 5(1)(e)",
    severity: "HIGH",
    status: g3Status,
    description: "Personal data must be kept no longer than necessary; retention policies must be defined.",
    affectedFields: piiFieldCount,
    requiredActions: g3Status !== "PASS"
      ? ["Define retention periods for each data category", "Implement automated data retention enforcement", "Create data disposal procedures"]
      : [],
  });

  // G4: Right To Erasure
  // If piiFields > 0 and piiFields > 5 → WARNING (cascade check needed), else PASS
  const g4Status: RuleStatus = (piiFieldCount > 0 && piiFieldCount > 5) ? "WARNING" : "PASS";
  results.push({
    ruleId: "G4",
    name: "Right To Erasure",
    reference: "Art. 17",
    severity: "CRITICAL",
    status: g4Status,
    description: "Data subjects have the right to request deletion; cascading deletion across systems must be supported.",
    affectedFields: piiFieldCount,
    requiredActions: g4Status !== "PASS"
      ? ["Implement cascading delete across all related tables", "Build erasure request workflow for data subjects", "Verify no orphaned PII after deletion"]
      : ["Maintain erasure capability"],
  });

  // G5: Right To Data Portability
  // If piiFields > 0 → PASS (export feature assumed)
  results.push({
    ruleId: "G5",
    name: "Right To Data Portability",
    reference: "Art. 20",
    severity: "MEDIUM",
    status: "PASS",
    description: "Data subjects must be able to receive their data in a structured, machine-readable format.",
    affectedFields: piiFieldCount,
    requiredActions: piiFieldCount > 0
      ? ["Ensure data export supports JSON/CSV formats", "Test portability workflow end-to-end"]
      : [],
  });

  // G6: Encryption At Rest
  // Use encryptionRequired count vs piiFields → ratio determines PASS/WARNING/FAIL
  let g6Status: RuleStatus;
  if (piiFieldCount === 0) {
    g6Status = "PASS";
  } else {
    const encRatio = encryptionRequired / piiFieldCount;
    if (encRatio > 0.9) g6Status = "PASS";
    else if (encRatio > 0.6) g6Status = "WARNING";
    else g6Status = "FAIL";
  }
  results.push({
    ruleId: "G6",
    name: "Encryption At Rest",
    reference: "Art. 32",
    severity: "CRITICAL",
    status: g6Status,
    description: "Appropriate technical measures including encryption must protect stored personal data.",
    affectedFields: piiFieldCount - encryptionRequired,
    requiredActions: g6Status === "FAIL"
      ? ["Implement AES-256 encryption for all personal data at rest", "Encrypt database backups and file storage", "Review encryption key management practices"]
      : g6Status === "WARNING"
        ? ["Encrypt remaining unencrypted personal data fields", "Verify encryption covers all data stores"]
        : ["Maintain encryption coverage"],
  });

  // G7: Masking In Logs
  // Use maskingRequired count vs piiFields → ratio determines status
  let g7Status: RuleStatus;
  if (piiFieldCount === 0) {
    g7Status = "PASS";
  } else {
    const maskRatio = maskingRequired / piiFieldCount;
    if (maskRatio > 0.9) g7Status = "PASS";
    else if (maskRatio > 0.6) g7Status = "WARNING";
    else g7Status = "FAIL";
  }
  results.push({
    ruleId: "G7",
    name: "Masking In Logs",
    reference: "Art. 32",
    severity: "HIGH",
    status: g7Status,
    description: "Personal data must be masked in application logs, debug output, and monitoring systems.",
    affectedFields: piiFieldCount > 0 ? piiFieldCount - maskingRequired : 0,
    requiredActions: g7Status === "FAIL"
      ? ["Implement log masking for all sensitive fields", "Configure logging frameworks to redact PII", "Audit existing logs for personal data exposure"]
      : g7Status === "WARNING"
        ? ["Extend log masking to remaining sensitive fields", "Review log aggregation pipelines"]
        : ["Maintain log masking configuration"],
  });

  // G8: Consent Tracking
  // If consentRequired > 0 → WARNING (withdrawal not logged), else PASS
  const g8Status: RuleStatus = consentRequired > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "G8",
    name: "Consent Tracking",
    reference: "Art. 7",
    severity: "HIGH",
    status: g8Status,
    description: "Consent records and withdrawal tracking must be maintained for all consent-required data processing.",
    affectedFields: consentRequired,
    requiredActions: g8Status !== "PASS"
      ? ["Implement consent logging with timestamps", "Build consent withdrawal mechanism", "Map consent records to specific data categories"]
      : [],
  });

  // G9: Cross-Border Transfer Compliance
  // PASS (assumed SCCs in place)
  results.push({
    ruleId: "G9",
    name: "Cross-Border Transfer Compliance",
    reference: "Art. 44-49",
    severity: "CRITICAL",
    status: "PASS",
    description: "Transfers to third countries require appropriate safeguards such as SCCs or adequacy decisions.",
    affectedFields: piiFieldCount,
    requiredActions: ["Verify SCCs are in place for all international data flows", "Maintain Transfer Impact Assessments (TIAs)"],
  });

  // G10: Privacy By Design
  // If piiFields > 10 → WARNING, else PASS
  const g10Status: RuleStatus = piiFieldCount > 10 ? "WARNING" : "PASS";
  results.push({
    ruleId: "G10",
    name: "Privacy By Design Check",
    reference: "Art. 25",
    severity: "MEDIUM",
    status: g10Status,
    description: "Data protection must be embedded into system design and architecture from the outset.",
    affectedFields: piiFieldCount,
    requiredActions: g10Status !== "PASS"
      ? ["Conduct Data Protection Impact Assessment (DPIA)", "Review system architecture for privacy by design gaps", "Document privacy controls per data category"]
      : ["Maintain privacy by design documentation"],
  });

  return results;
}

// ---------------------------------------------------------------------------
// HIPAA Rule Evaluation
// ---------------------------------------------------------------------------

function evaluateHIPAARules(ctx: EvaluationContext): RuleEvaluation[] {
  const { phiFieldCount, encryptionRequired, maskingRequired, auditRequired, phiMatches, allMatches } = ctx;

  const results: RuleEvaluation[] = [];

  // H1: Minimum Necessary Standard
  // If phiFields > 0 → PARTIAL (role-based access assumed basic), else PASS
  const h1Status: RuleStatus = phiFieldCount > 0 ? "PARTIAL" : "PASS";
  results.push({
    ruleId: "H1",
    name: "Minimum Necessary Standard",
    reference: "45 CFR § 164.502(b)",
    severity: "CRITICAL",
    status: h1Status,
    description: "PHI access must be limited to the minimum necessary for the intended purpose.",
    affectedFields: phiFieldCount,
    requiredActions: h1Status !== "PASS"
      ? ["Implement role-based access control (RBAC) for PHI", "Define minimum necessary access levels per role", "Audit current PHI access permissions"]
      : [],
  });

  // H2: PHI Encryption
  // Based on encryptionRequired vs phiFields ratio
  let h2Status: RuleStatus;
  if (phiFieldCount === 0) {
    h2Status = "PASS";
  } else {
    // Count unique PHI fields that require encryption
    const phiEncKeys = new Set(phiMatches.filter(m => m.requiresEncryption).map(m => `${m.tableName}.${m.columnName}`));
    const ratio = phiEncKeys.size / phiFieldCount;
    if (ratio > 0.9) h2Status = "PASS";
    else if (ratio > 0.6) h2Status = "WARNING";
    else h2Status = "FAIL";
  }
  results.push({
    ruleId: "H2",
    name: "PHI Encryption (In Transit + At Rest)",
    reference: "45 CFR § 164.312",
    severity: "CRITICAL",
    status: h2Status,
    description: "PHI must be encrypted both in transit and at rest with strong cryptographic standards.",
    affectedFields: phiFieldCount,
    requiredActions: h2Status === "FAIL"
      ? ["Implement AES-256 encryption for PHI at rest", "Enforce TLS 1.2+ for all PHI in transit", "Review cryptographic key rotation policies"]
      : h2Status === "WARNING"
        ? ["Encrypt remaining unencrypted PHI fields", "Verify TLS configuration across all services"]
        : ["Maintain PHI encryption standards"],
  });

  // H3: Audit Controls / Access Logging
  // Based on auditRequired vs phiFields ratio
  let h3Status: RuleStatus;
  if (phiFieldCount === 0) {
    h3Status = "PASS";
  } else {
    const phiAuditKeys = new Set(phiMatches.filter(m => m.requiresAudit).map(m => `${m.tableName}.${m.columnName}`));
    const ratio = phiAuditKeys.size / phiFieldCount;
    if (ratio > 0.9) h3Status = "PASS";
    else if (ratio > 0.6) h3Status = "WARNING";
    else h3Status = "FAIL";
  }
  results.push({
    ruleId: "H3",
    name: "Audit Controls / Access Logging",
    reference: "45 CFR § 164.312(b)",
    severity: "CRITICAL",
    status: h3Status,
    description: "Comprehensive audit logging must record all PHI access and modifications.",
    affectedFields: phiFieldCount,
    requiredActions: h3Status === "FAIL"
      ? ["Implement audit trail for all PHI access", "Log user identity, timestamp, and action type", "Deploy centralized log aggregation and monitoring"]
      : h3Status === "WARNING"
        ? ["Extend audit logging to uncovered PHI data", "Configure real-time audit alerting"]
        : ["Maintain audit logging and monitoring"],
  });

  // H4: Automatic Logoff
  // If phiFields > 0 → WARNING (timeout not verified), else PASS
  const h4Status: RuleStatus = phiFieldCount > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "H4",
    name: "Automatic Logoff",
    reference: "45 CFR § 164.312(a)(2)(iii)",
    severity: "HIGH",
    status: h4Status,
    description: "Systems containing PHI must automatically log off users after a period of inactivity.",
    affectedFields: phiFieldCount,
    requiredActions: h4Status !== "PASS"
      ? ["Configure automatic session timeout (recommended: 15 minutes)", "Implement session management across all PHI-accessing applications", "Test logoff behavior across all access points"]
      : [],
  });

  // H5: PHI De-identification Standards
  // If phiFields > 0 → WARNING (18 identifiers check needed), else PASS
  const h5Status: RuleStatus = phiFieldCount > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "H5",
    name: "PHI De-identification Standards",
    reference: "45 CFR § 164.514(b)",
    severity: "CRITICAL",
    status: h5Status,
    description: "All 18 HIPAA identifiers must be removed or obscured when de-identifying PHI.",
    affectedFields: phiFieldCount,
    requiredActions: h5Status !== "PASS"
      ? ["Map all 18 HIPAA identifiers in the data schema", "Implement Safe Harbor de-identification method", "Validate de-identification output with a qualified expert"]
      : [],
  });

  // H6: Business Associate Compliance
  // If phiFields > 0 → PARTIAL (BAA verification needed), else PASS
  const h6Status: RuleStatus = phiFieldCount > 0 ? "PARTIAL" : "PASS";
  results.push({
    ruleId: "H6",
    name: "Business Associate Compliance",
    reference: "45 CFR § 164.308(b)",
    severity: "CRITICAL",
    status: h6Status,
    description: "All business associates handling PHI must have executed Business Associate Agreements (BAAs).",
    affectedFields: phiFieldCount,
    requiredActions: h6Status !== "PASS"
      ? ["Inventory all business associates with PHI access", "Verify BAA execution and compliance terms", "Schedule annual BAA review and renewal"]
      : [],
  });

  // H7: Breach Notification Readiness
  // If phiFields > 0 → PARTIAL (notification system assumed partial), else PASS
  const h7Status: RuleStatus = phiFieldCount > 0 ? "PARTIAL" : "PASS";
  results.push({
    ruleId: "H7",
    name: "Breach Notification Readiness",
    reference: "45 CFR §§ 164.400-414",
    severity: "CRITICAL",
    status: h7Status,
    description: "Organizations must have a breach notification plan capable of notifying affected parties within 60 days.",
    affectedFields: phiFieldCount,
    requiredActions: h7Status !== "PASS"
      ? ["Develop formal breach notification procedures", "Define breach severity assessment workflow", "Test notification timeline (target: < 60 days)", "Designate breach response team members"]
      : [],
  });

  // H8: Mental Health Extra Protection
  // Check if any mental_health fields exist → if yes FAIL, else N/A
  const mentalHealthKeywords = ["mental_health", "psychiatric", "substance_abuse", "rehabilitation", "counseling", "therapy_session", "psychologist", "psychiatrist"];
  const mentalHealthMatches = allMatches.filter(m => {
    const norm = normalize(m.columnName);
    return mentalHealthKeywords.some(kw => norm.includes(kw));
  });
  const mentalHealthKeys = new Set(mentalHealthMatches.map(m => `${m.tableName}.${m.columnName}`));
  const h8Status: RuleStatus = mentalHealthKeys.size > 0 ? "FAIL" : "N/A";
  results.push({
    ruleId: "H8",
    name: "Mental Health Extra Protection",
    reference: "42 CFR Part 2",
    severity: "CRITICAL",
    status: h8Status,
    description: "Substance abuse and mental health records receive additional protections under 42 CFR Part 2.",
    affectedFields: mentalHealthKeys.size,
    requiredActions: h8Status !== "PASS" && h8Status !== "N/A"
      ? ["Implement separate consent workflow for mental health records", "Restrict access to 42 CFR Part 2 covered data", "Audit system for unauthorized mental health data access"]
      : h8Status === "N/A"
        ? ["No mental health fields detected — verify if 42 CFR Part 2 applies"]
        : [],
  });

  return results;
}

// ---------------------------------------------------------------------------
// PCI-DSS Rule Evaluation
// ---------------------------------------------------------------------------

function evaluatePCIRules(ctx: EvaluationContext): RuleEvaluation[] {
  const { pciFieldCount, pciMatches } = ctx;

  const results: RuleEvaluation[] = [];

  // P1: CVV/CVC Absolute Prohibition
  // If pciFields has restricted category → CRITICAL FAIL, else PASS
  const restrictedPCIMatches = pciMatches.filter(m => m.category === "restricted");
  const p1Status: RuleStatus = restrictedPCIMatches.length > 0 ? "FAIL" : "PASS";
  results.push({
    ruleId: "P1",
    name: "CVV/CVC Absolute Prohibition",
    reference: "Req 3.2.1",
    severity: "CRITICAL",
    status: p1Status,
    description: "Storage of CVV/CVC/CID after authorization is strictly prohibited.",
    affectedFields: new Set(restrictedPCIMatches.map(m => `${m.tableName}.${m.columnName}`)).size,
    requiredActions: p1Status !== "PASS"
      ? ["Immediately remove all stored CVV/CVC values", "Audit payment processing flows for CVV retention", "Implement preventive controls to block CVV storage"]
      : [],
  });

  // P2: PAN Protection
  // If pciFields has prohibited category → CRITICAL FAIL, else PASS
  const prohibitedPCIMatches = pciMatches.filter(m => m.category === "prohibited");
  const p2Status: RuleStatus = prohibitedPCIMatches.length > 0 ? "FAIL" : "PASS";
  results.push({
    ruleId: "P2",
    name: "PAN Protection",
    reference: "Req 3.4",
    severity: "CRITICAL",
    status: p2Status,
    description: "PAN must be rendered unreadable using hashing, truncation, or strong encryption.",
    affectedFields: new Set(prohibitedPCIMatches.map(m => `${m.tableName}.${m.columnName}`)).size,
    requiredActions: p2Status !== "PASS"
      ? ["Implement PAN tokenization or hashing", "Verify no full PAN stored in databases or logs", "Deploy payment card industry approved encryption"]
      : [],
  });

  // P3: PAN Masking In Display
  // If pciFields has minimized category → WARNING, else PASS
  const minimizedPCIMatches = pciMatches.filter(m => m.category === "minimized");
  const p3Status: RuleStatus = minimizedPCIMatches.length > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "P3",
    name: "PAN Masking In Display",
    reference: "Req 3.3",
    severity: "HIGH",
    status: p3Status,
    description: "PAN must be masked when displayed, showing only first 6 and last 4 digits.",
    affectedFields: new Set(minimizedPCIMatches.map(m => `${m.tableName}.${m.columnName}`)).size,
    requiredActions: p3Status !== "PASS"
      ? ["Implement PAN display masking (show first 6 and last 4 only)", "Audit all UI screens for PAN exposure", "Restrict unmasked PAN access to authorized roles"]
      : [],
  });

  // P4: Network Segmentation
  // If pciFields > 0 → WARNING, else PASS
  const p4Status: RuleStatus = pciFieldCount > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "P4",
    name: "Network Segmentation",
    reference: "Req 1",
    severity: "HIGH",
    status: p4Status,
    description: "Cardholder data environments must be isolated from the rest of the network.",
    affectedFields: pciFieldCount,
    requiredActions: p4Status !== "PASS"
      ? ["Implement network segmentation for cardholder data", "Deploy firewall rules restricting CDE access", "Verify segmentation with annual penetration test"]
      : [],
  });

  // P5: Access Control
  // If pciFields > 0 → WARNING, else PASS
  const p5Status: RuleStatus = pciFieldCount > 0 ? "WARNING" : "PASS";
  results.push({
    ruleId: "P5",
    name: "Access Control To Cardholder Data",
    reference: "Req 7",
    severity: "CRITICAL",
    status: p5Status,
    description: "Access to cardholder data must be restricted with unique user IDs and role-based permissions.",
    affectedFields: pciFieldCount,
    requiredActions: p5Status !== "PASS"
      ? ["Implement unique user ID requirement for all CDE access", "Configure role-based access control for cardholder data", "Conduct quarterly access reviews"]
      : [],
  });

  // P6: Vulnerability Management
  // If pciFields > 0 → PARTIAL, else PASS
  const p6Status: RuleStatus = pciFieldCount > 0 ? "PARTIAL" : "PASS";
  results.push({
    ruleId: "P6",
    name: "Vulnerability Management",
    reference: "Req 5-6",
    severity: "CRITICAL",
    status: p6Status,
    description: "Systems must be protected from malware with regular vulnerability scans and penetration tests.",
    affectedFields: pciFieldCount,
    requiredActions: p6Status !== "PASS"
      ? ["Deploy anti-malware on all CDE systems", "Schedule quarterly vulnerability scans", "Conduct annual penetration testing by qualified party"]
      : [],
  });

  // P7: PCI Compliance Level Assessment
  // PASS (Level 4 assumed)
  results.push({
    ruleId: "P7",
    name: "PCI Compliance Level Assessment",
    reference: "PCI DSS",
    severity: "HIGH",
    status: "PASS",
    description: "Determine applicable PCI DSS compliance level based on transaction volume.",
    affectedFields: pciFieldCount,
    requiredActions: pciFieldCount > 0
      ? ["Confirm PCI DSS compliance level (assumed Level 4)", "Complete Self-Assessment Questionnaire (SAQ)", "Submit compliance attestation annually"]
      : [],
  });

  return results;
}

// ---------------------------------------------------------------------------
// Gap Report Generation
// ---------------------------------------------------------------------------

function generateGapReport(evaluations: {
  GDPR: RuleEvaluation[];
  HIPAA: RuleEvaluation[];
  "PCI-DSS": RuleEvaluation[];
}): GapReport {
  const severityOrder: Record<RuleSeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  const violations: Violation[] = [];
  let violId = 1;

  for (const [framework, rules] of Object.entries(evaluations)) {
    for (const rule of rules as RuleEvaluation[]) {
      // Include non-PASS evaluations as violations
      if (rule.status !== "PASS") {
        const idPrefix = rule.severity === "CRITICAL"
          ? "CRIT"
          : rule.severity === "HIGH"
            ? "HIGH"
            : rule.severity === "MEDIUM"
              ? "MED"
              : "LOW";

        violations.push({
          id: `${idPrefix}-${String(violId).padStart(3, "0")}`,
          severity: rule.severity,
          framework,
          ruleId: rule.ruleId,
          title: rule.name,
          description: rule.description,
          affectedFields: rule.affectedFields,
          requiredActions: rule.requiredActions,
          estimatedEffort: rule.severity === "CRITICAL"
            ? "2-4 weeks"
            : rule.severity === "HIGH"
              ? "1-2 weeks"
              : rule.severity === "MEDIUM"
                ? "3-5 days"
                : "1-2 days",
        });
        violId++;
      }
    }
  }

  // Sort violations by severity (CRITICAL first), then by framework
  violations.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
    if (sevDiff !== 0) return sevDiff;
    return a.framework.localeCompare(b.framework);
  });

  const bySeverity = {
    critical: violations.filter(v => v.severity === "CRITICAL").length,
    high: violations.filter(v => v.severity === "HIGH").length,
    medium: violations.filter(v => v.severity === "MEDIUM").length,
    low: violations.filter(v => v.severity === "LOW").length,
  };

  return {
    totalViolations: violations.length,
    bySeverity,
    violations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    // 1. Fetch ALL toolkit tables
    const tables = await db.toolkitTable.findMany({
      select: {
        tableName: true,
        columns: true,
      },
      orderBy: { tableName: "asc" },
    });

    // 2. Parse columns and analyze each
    const allMatches: ColumnMatch[] = [];
    let totalColumns = 0;

    for (const table of tables) {
      let parsedColumns: Array<{ name: string; type?: string }> = [];
      try {
        parsedColumns = JSON.parse(table.columns || "[]");
      } catch {
        parsedColumns = [];
      }

      for (const col of parsedColumns) {
        totalColumns++;
        const colName = col.name || "";
        const colType = (col.type || "unknown").toString();
        const matches = analyzeColumn(
          table.tableName,
          colName,
          colType
        );
        allMatches.push(...matches);
      }
    }

    // 3. Classify matches by type
    const phiFields = allMatches.filter(
      (m) => m.type === "PHI"
    );
    const piiOnlyFields = allMatches.filter(
      (m) => m.type === "PII"
    );
    const soxFields = allMatches.filter(
      (m) => m.type === "SOX"
    );
    const pciFields = allMatches.filter(
      (m) => m.type === "PCI-DSS"
    );

    // Count unique columns affected by each framework
    const uniquePIIColumns = new Set(
      allMatches
        .filter(
          (m) =>
            m.type === "PII" || m.type === "PHI"
        )
        .map((m) => `${m.tableName}.${m.columnName}`)
    );
    const uniquePHIColumns = new Set(
      phiFields.map(
        (m) => `${m.tableName}.${m.columnName}`
      )
    );
    const uniqueFinancialColumns = new Set(
      soxFields.map(
        (m) => `${m.tableName}.${m.columnName}`
      )
    );
    const uniquePCIColumns = new Set(
      pciFields.map(
        (m) => `${m.tableName}.${m.columnName}`
      )
    );

    // 4. Protection requirement counts
    const encryptionRequired = new Set(
      allMatches
        .filter((m) => m.requiresEncryption)
        .map((m) => `${m.tableName}.${m.columnName}`)
    ).size;
    const maskingRequired = new Set(
      allMatches
        .filter((m) => m.requiresMasking)
        .map((m) => `${m.tableName}.${m.columnName}`)
    ).size;
    const auditRequired = new Set(
      allMatches
        .filter((m) => m.requiresAudit)
        .map((m) => `${m.tableName}.${m.columnName}`)
    ).size;
    const consentRequired = new Set(
      allMatches
        .filter((m) => m.requiresConsent)
        .map((m) => `${m.tableName}.${m.columnName}`)
    ).size;

    // 5. Sensitivity breakdown
    const sensitivityMap: Record<
      string,
      Set<string>
    > = {
      public: new Set(),
      internal: new Set(),
      confidential: new Set(),
      restricted: new Set(),
    };
    for (const m of allMatches) {
      sensitivityMap[m.sensitivity].add(
        `${m.tableName}.${m.columnName}`
      );
    }
    // Columns with no matches are "public"
    const matchedColumns = new Set(
      allMatches.map(
        (m) => `${m.tableName}.${m.columnName}`
      )
    );
    // Count all unmatched columns as public
    let publicCount = 0;
    for (const table of tables) {
      let parsedColumns: Array<{ name: string }> = [];
      try {
        parsedColumns = JSON.parse(
          table.columns || "[]"
        );
      } catch {
        parsedColumns = [];
      }
      for (const col of parsedColumns) {
        const key = `${table.tableName}.${col.name}`;
        if (!matchedColumns.has(key)) {
          publicCount++;
        }
      }
    }

    // 6. Calculate framework scores
    const hipaaResult = calculateHIPAAScore(phiFields);
    const gdprResult = calculateGDPRScore([
      ...piiOnlyFields,
      ...phiFields, // PHI also counts for GDPR
    ]);
    const soxResult = calculateSOXScore(soxFields);
    const pciResult = calculatePCIScore(pciFields);

    // 7. Build framework findings
    const hipaaFindings = phiFields
      .sort((a, b) => b.confidence - a.confidence)
      .map((m) => ({
        table: m.tableName,
        column: m.columnName,
        type: m.type,
        category: m.category,
        confidence: m.confidence,
        action: m.action,
      }));

    const gdprFindings = [
      ...piiOnlyFields,
      ...phiFields,
    ]
      .sort((a, b) => b.confidence - a.confidence)
      .map((m) => ({
        table: m.tableName,
        column: m.columnName,
        type: m.type,
        category: m.category,
        confidence: m.confidence,
        action: m.action,
      }));

    const soxFindings = soxFields
      .sort((a, b) => b.confidence - a.confidence)
      .map((m) => ({
        table: m.tableName,
        column: m.columnName,
        type: m.type,
        category: m.category,
        confidence: m.confidence,
        action: m.action,
      }));

    const pciFindings = pciFields
      .sort((a, b) => b.confidence - a.confidence)
      .map((m) => ({
        table: m.tableName,
        column: m.columnName,
        type: m.type,
        category: m.category,
        confidence: m.confidence,
        action: m.action,
      }));

    // 8. Top findings (across all frameworks, sorted by confidence desc)
    const topFindings = allMatches
      .sort((a, b) => {
        // Sort by sensitivity first (restricted first), then confidence
        const sensOrder: Record<string, number> = {
          restricted: 4,
          confidential: 3,
          internal: 2,
          public: 1,
        };
        if (
          sensOrder[b.sensitivity] !==
          sensOrder[a.sensitivity]
        )
          return (
            sensOrder[b.sensitivity] -
            sensOrder[a.sensitivity]
          );
        return b.confidence - a.confidence;
      })
      .slice(0, 50)
      .map((m) => ({
        table: m.tableName,
        column: m.columnName,
        classification: m.type,
        sensitivity: m.sensitivity,
        frameworks: m.frameworks,
        confidence: m.confidence,
        action: m.action,
      }));

    // 9. Phase 3 — Rule Evaluations
    const evalContext: EvaluationContext = {
      allMatches,
      piiFieldCount: uniquePIIColumns.size,
      phiFieldCount: uniquePHIColumns.size,
      pciFieldCount: uniquePCIColumns.size,
      soxFieldCount: uniqueFinancialColumns.size,
      encryptionRequired,
      maskingRequired,
      auditRequired,
      consentRequired,
      phiMatches: phiFields,
      piiOnlyMatches: piiOnlyFields,
      pciMatches: pciFields,
    };

    const gdprEvaluations = evaluateGDPRRules(evalContext);
    const hipaaEvaluations = evaluateHIPAARules(evalContext);
    const pciEvaluations = evaluatePCIRules(evalContext);

    const ruleEvaluations = {
      GDPR: gdprEvaluations,
      HIPAA: hipaaEvaluations,
      "PCI-DSS": pciEvaluations,
    };

    const gapReport = generateGapReport(ruleEvaluations);

    // 10. Build response
    const response = {
      success: true,
      scanTimestamp: new Date().toISOString(),
      summary: {
        totalColumns,
        piiFields: uniquePIIColumns.size,
        phiFields: uniquePHIColumns.size,
        financialFields: uniqueFinancialColumns.size,
        soxFields: uniqueFinancialColumns.size,
        pciFields: uniquePCIColumns.size,
        encryptionRequired,
        maskingRequired,
        auditRequired,
        consentRequired,
      },
      frameworks: {
        HIPAA: {
          status: hipaaResult.status,
          score: hipaaResult.score,
          phiFields: uniquePHIColumns.size,
          controls: hipaaResult.controls,
          coverage: hipaaResult.coverage,
          findings: hipaaFindings,
        },
        GDPR: {
          status: gdprResult.status,
          score: gdprResult.score,
          piiFields: uniquePIIColumns.size,
          controls: gdprResult.controls,
          coverage: gdprResult.coverage,
          findings: gdprFindings,
        },
        SOX: {
          status: soxResult.status,
          score: soxResult.score,
          financialFields: uniqueFinancialColumns.size,
          controls: soxResult.controls,
          coverage: soxResult.coverage,
          findings: soxFindings,
        },
        "PCI-DSS": {
          status: pciResult.status,
          score: pciResult.score,
          cardFields: uniquePCIColumns.size,
          controls: pciResult.controls,
          coverage: pciResult.coverage,
          findings: pciFindings,
        },
      },
      sensitivityBreakdown: {
        public: publicCount,
        internal: sensitivityMap.internal.size,
        confidential: sensitivityMap.confidential.size,
        restricted: sensitivityMap.restricted.size,
      },
      topFindings,
      ruleEvaluations,
      gapReport,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[compliance-scan] Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";
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
