// =============================================================================
// Compliance Field Actions API — Per-field compliance action recommendations
// =============================================================================
//
// GET /api/compliance-field-actions
//
// Returns per-field compliance action data:
//   - Field classification (PII/PHI/PCI)
//   - Sensitivity level
//   - Applicable rules per field with PASS/FAIL/WARNING/PARTIAL status
//   - Required actions for non-compliant rules
//
// Reuses the same pattern dictionaries and analysis logic as compliance-scan.
// =============================================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface FieldActionEntry {
  tableName: string;
  columnName: string;
  classification: string;
  confidence: number;
  sensitivityLevel: string;
  applicableRules: {
    ruleId: string;
    name: string;
    framework: string;
    severity: string;
    status: string;
    action: string | null;
  }[];
  requiredActions: string[];
}

interface ColumnInfo {
  tableName: string;
  columnName: string;
  columnType: string;
  type: string;
  category: string;
  confidence: number;
  sensitivity: string;
  frameworks: string[];
  requiresEncryption: boolean;
  requiresMasking: boolean;
  requiresAudit: boolean;
  requiresConsent: boolean;
}

type RuleStatus = "PASS" | "FAIL" | "WARNING" | "PARTIAL" | "N/A";

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN DEFINITIONS (mirrors compliance-scan for DRY compliance)
// ═══════════════════════════════════════════════════════════════════════════

interface PatternDef {
  patterns: string[];
  confidence: number;
  category: string;
  requiresEncryption: boolean;
  requiresMasking: boolean;
  requiresAudit: boolean;
  requiresConsent: boolean;
  sensitivity: string;
}

const PII_PATTERNS: Record<string, PatternDef> = {
  contact: {
    patterns: ["email", "phone", "mobile", "fax", "telephone", "contact_number", "contact_email"],
    confidence: 90, category: "contact", requiresEncryption: true, requiresMasking: true, requiresAudit: false, requiresConsent: false, sensitivity: "confidential",
  },
  name: {
    patterns: ["first_name", "last_name", "middle_name", "full_name", "maiden_name", "patient_name", "family_name", "given_name", "surname"],
    confidence: 95, category: "basic_identity", requiresEncryption: true, requiresMasking: false, requiresAudit: false, requiresConsent: false, sensitivity: "confidential",
  },
  address: {
    patterns: ["address", "street", "address_line", "address1", "address2", "mailing_address", "residential_address"],
    confidence: 90, category: "contact", requiresEncryption: true, requiresMasking: true, requiresAudit: false, requiresConsent: false, sensitivity: "confidential",
  },
  location: {
    patterns: ["city", "state", "province", "country", "region", "district", "county", "postal", "zip", "zipcode", "postcode"],
    confidence: 75, category: "location", requiresEncryption: false, requiresMasking: false, requiresAudit: false, requiresConsent: false, sensitivity: "internal",
  },
  national_id: {
    patterns: ["ssn", "social_security", "national_id", "passport", "cnic", "nic", "license_number", "id_number"],
    confidence: 99, category: "identification", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  demographic: {
    patterns: ["gender", "sex", "dob", "birth_date", "birth", "age", "marital", "religion", "ethnicity", "nationality", "race", "language"],
    confidence: 85, category: "demographics", requiresEncryption: false, requiresMasking: false, requiresAudit: false, requiresConsent: true, sensitivity: "confidential",
  },
  biometric: {
    patterns: ["fingerprint", "iris", "face", "retina", "dna", "voice_print", "palm", "signature_image"],
    confidence: 99, category: "biometric", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: true, sensitivity: "restricted",
  },
  financial: {
    patterns: ["salary", "income", "bank_account", "credit_card", "debit_card", "card_number", "tax_id", "tax_number", "routing_number", "iban", "swift", "account_balance"],
    confidence: 95, category: "financial", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
};

const PHI_PATTERNS: Record<string, PatternDef> = {
  patient_identifier: {
    patterns: ["mrn", "medical_record", "patient_id", "patient_number", "encounter_id", "visit_id", "episode_id", "case_id"],
    confidence: 98, category: "patient_identifier", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  clinical: {
    patterns: ["diagnosis", "icd", "icd_code", "icd10", "symptom", "complaint", "condition", "prognosis", "clinical_note", "medical_history", "family_history", "surgical_history"],
    confidence: 95, category: "clinical", requiresEncryption: true, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  treatment: {
    patterns: ["prescription", "medication", "drug", "dosage", "treatment", "procedure", "surgery", "therapy", "radiation", "chemotherapy", "vaccination", "immunization"],
    confidence: 95, category: "treatment", requiresEncryption: true, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  lab: {
    patterns: ["lab_result", "test_result", "blood", "urine", "specimen", "culture", "biopsy", "pathology", "radiology", "imaging"],
    confidence: 95, category: "lab", requiresEncryption: true, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  vitals: {
    patterns: ["blood_pressure", "heart_rate", "pulse", "temperature", "weight", "height", "bmi", "oxygen_saturation", "respiratory_rate", "blood_type", "blood_group"],
    confidence: 90, category: "vitals", requiresEncryption: false, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "confidential",
  },
  allergies: {
    patterns: ["allergy", "allergic", "allergen", "reaction", "intolerance", "sensitivity"],
    confidence: 95, category: "allergies", requiresEncryption: true, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  insurance: {
    patterns: ["insurance", "policy", "claim", "coverage", "beneficiary", "subscriber", "co_pay", "deductible", "premium", "payer", "plan_id"],
    confidence: 90, category: "insurance", requiresEncryption: true, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "confidential",
  },
  provider: {
    patterns: ["doctor", "physician", "nurse", "surgeon", "specialist", "attending", "referring", "consultant", "provider_id", "npi"],
    confidence: 70, category: "provider", requiresEncryption: false, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "internal",
  },
  encounter: {
    patterns: ["admission", "discharge", "transfer", "appointment", "visit", "encounter", "check_in", "check_out", "wait_time"],
    confidence: 75, category: "encounter", requiresEncryption: false, requiresMasking: false, requiresAudit: true, requiresConsent: false, sensitivity: "internal",
  },
};

const PCI_PATTERNS: Record<string, PatternDef> = {
  prohibited: {
    patterns: ["credit_card", "card_number", "pan", "track1", "track2", "magnetic_stripe", "card_data"],
    confidence: 99, category: "prohibited", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  restricted: {
    patterns: ["cvv", "cvc", "security_code", "cvv2", "cid", "pin", "pin_number", "pin_code"],
    confidence: 99, category: "restricted", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: false, sensitivity: "restricted",
  },
  minimized: {
    patterns: ["cardholder_name", "name_on_card", "expiry_date", "card_expiry", "expiration", "service_code", "last_four"],
    confidence: 85, category: "minimized", requiresEncryption: true, requiresMasking: true, requiresAudit: true, requiresConsent: false, sensitivity: "confidential",
  },
};

const HEALTHCARE_TABLE_RE =
  /patient|encounter|diagnosis|lab|clinical|medical|prescription|medication|allergy|vital|admission|discharge|appointment|provider|nurse|physician|insurance|claim|billing|pharmacy|procedure|surgery|treatment|therapy|observation|immunization|pathology|radiology/i;

// ═══════════════════════════════════════════════════════════════════════════
// RULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

interface RuleDef {
  ruleId: string;
  name: string;
  framework: string;
  severity: string;
}

const ALL_RULES: RuleDef[] = [
  // GDPR
  { ruleId: "G1", name: "Lawful Basis For Processing", framework: "GDPR", severity: "HIGH" },
  { ruleId: "G2", name: "Data Minimization", framework: "GDPR", severity: "MEDIUM" },
  { ruleId: "G3", name: "Storage Limitation / Retention", framework: "GDPR", severity: "HIGH" },
  { ruleId: "G4", name: "Right To Erasure", framework: "GDPR", severity: "CRITICAL" },
  { ruleId: "G5", name: "Right To Data Portability", framework: "GDPR", severity: "MEDIUM" },
  { ruleId: "G6", name: "Encryption At Rest", framework: "GDPR", severity: "CRITICAL" },
  { ruleId: "G7", name: "Masking In Logs", framework: "GDPR", severity: "HIGH" },
  { ruleId: "G8", name: "Consent Tracking", framework: "GDPR", severity: "HIGH" },
  { ruleId: "G9", name: "Cross-Border Transfer Compliance", framework: "GDPR", severity: "CRITICAL" },
  { ruleId: "G10", name: "Privacy By Design Check", framework: "GDPR", severity: "MEDIUM" },
  // HIPAA
  { ruleId: "H1", name: "Minimum Necessary Standard", framework: "HIPAA", severity: "CRITICAL" },
  { ruleId: "H2", name: "PHI Encryption (In Transit + At Rest)", framework: "HIPAA", severity: "CRITICAL" },
  { ruleId: "H3", name: "Audit Controls / Access Logging", framework: "HIPAA", severity: "CRITICAL" },
  { ruleId: "H4", name: "Automatic Logoff", framework: "HIPAA", severity: "HIGH" },
  { ruleId: "H5", name: "PHI De-identification Standards", framework: "HIPAA", severity: "CRITICAL" },
  { ruleId: "H6", name: "Business Associate Compliance", framework: "HIPAA", severity: "CRITICAL" },
  { ruleId: "H7", name: "Breach Notification Readiness", framework: "HIPAA", severity: "CRITICAL" },
  { ruleId: "H8", name: "Mental Health Extra Protection", framework: "HIPAA", severity: "CRITICAL" },
  // PCI-DSS
  { ruleId: "P1", name: "CVV/CVC Absolute Prohibition", framework: "PCI-DSS", severity: "CRITICAL" },
  { ruleId: "P2", name: "PAN Protection", framework: "PCI-DSS", severity: "CRITICAL" },
  { ruleId: "P3", name: "PAN Masking In Display", framework: "PCI-DSS", severity: "HIGH" },
  { ruleId: "P4", name: "Network Segmentation", framework: "PCI-DSS", severity: "HIGH" },
  { ruleId: "P5", name: "Access Control To Cardholder Data", framework: "PCI-DSS", severity: "CRITICAL" },
  { ruleId: "P6", name: "Vulnerability Management", framework: "PCI-DSS", severity: "CRITICAL" },
  { ruleId: "P7", name: "PCI Compliance Level Assessment", framework: "PCI-DSS", severity: "HIGH" },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function normalize(colName: string): string {
  return colName.toLowerCase().replace(/[_\-\.]+/g, " ").trim();
}

function matchesAny(normalized: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    const kwNorm = kw.replace(/[_\-\.]+/g, " ");
    const tokens = kwNorm.split(/\s+/);
    if (tokens.length === 0) continue;
    if (tokens.every((t) => normalized.includes(t))) return true;
  }
  return false;
}

function isHealthcareTable(tableName: string): boolean {
  return HEALTHCARE_TABLE_RE.test(tableName);
}

/**
 * Evaluate a single field against a single rule, returning status + action.
 */
function evaluateFieldRule(
  field: ColumnInfo,
  rule: RuleDef
): { status: RuleStatus; action: string | null } {
  const fieldKey = `${field.tableName}.${field.columnName}`;
  const isPII = field.type === "PII";
  const isPHI = field.type === "PHI";
  const isPCI = field.type === "PCI-DSS";

  // --- GDPR Rules ---
  if (rule.framework === "GDPR" && (isPII || isPHI)) {
    switch (rule.ruleId) {
      case "G1":
        return { status: "PASS", action: null };
      case "G2":
        return field.confidence < 70
          ? { status: "WARNING", action: `Review necessity of ${fieldKey} — low detection confidence (${field.confidence}%)` }
          : { status: "PASS", action: null };
      case "G3":
        return { status: "PARTIAL", action: `Define retention policy for ${fieldKey}` };
      case "G4":
        return isPHI
          ? { status: "WARNING", action: `Add ${fieldKey} to erasure cascade` }
          : { status: "PASS", action: null };
      case "G5":
        return { status: "PASS", action: null };
      case "G6":
        if (field.sensitivity === "restricted" && !field.requiresEncryption)
          return { status: "FAIL", action: `Implement encryption at rest for ${fieldKey}` };
        if (field.sensitivity === "confidential" && !field.requiresEncryption)
          return { status: "WARNING", action: `Encrypt ${fieldKey} at rest (recommended)` };
        return { status: "PASS", action: null };
      case "G7":
        if (field.requiresMasking)
          return { status: "PASS", action: null };
        if (field.sensitivity === "restricted")
          return { status: "WARNING", action: `Mask ${fieldKey} in application logs` };
        return { status: "PASS", action: null };
      case "G8":
        if (field.requiresConsent)
          return { status: "WARNING", action: `Implement consent tracking for ${fieldKey}` };
        return { status: "N/A", action: null };
      case "G9":
        return { status: "PASS", action: null };
      case "G10":
        return field.sensitivity === "restricted"
          ? { status: "WARNING", action: `Review privacy-by-design controls for ${fieldKey}` }
          : { status: "PASS", action: null };
    }
  }

  // --- HIPAA Rules ---
  if (rule.framework === "HIPAA") {
    if (!isPHI) return { status: "N/A", action: null };
    switch (rule.ruleId) {
      case "H1":
        return { status: "PARTIAL", action: `Implement field-level access control for ${fieldKey}` };
      case "H2":
        return field.requiresEncryption
          ? { status: "PASS", action: null }
          : { status: "WARNING", action: `Implement AES-256 encryption for ${fieldKey}` };
      case "H3":
        return field.requiresAudit
          ? { status: "PASS", action: null }
          : { status: "WARNING", action: `Enable audit trail logging for ${fieldKey}` };
      case "H4":
        return { status: "WARNING", action: `Configure session timeout for ${fieldKey} access` };
      case "H5":
        return { status: "WARNING", action: `Map ${fieldKey} in de-identification checklist` };
      case "H6":
        return { status: "PARTIAL", action: `Verify BAA covers ${fieldKey} data sharing` };
      case "H7":
        return { status: "PARTIAL", action: `Include ${fieldKey} in breach notification plan` };
      case "H8": {
        const mhKw = ["mental_health", "psychiatric", "substance", "rehab", "counseling"];
        const norm = field.columnName.toLowerCase();
        return mhKw.some(k => norm.includes(k))
          ? { status: "FAIL", action: `Apply 42 CFR Part 2 extra protections for ${fieldKey}` }
          : { status: "N/A", action: null };
      }
    }
  }

  // --- PCI-DSS Rules ---
  if (rule.framework === "PCI-DSS") {
    if (!isPCI) return { status: "N/A", action: null };
    switch (rule.ruleId) {
      case "P1":
        return field.category === "restricted"
          ? { status: "FAIL", action: `Immediately remove CVV/CVC field ${fieldKey}` }
          : { status: "N/A", action: null };
      case "P2":
        return field.category === "prohibited"
          ? { status: "FAIL", action: `Implement tokenization for ${fieldKey}` }
          : { status: "N/A", action: null };
      case "P3":
        return field.category === "minimized"
          ? { status: "WARNING", action: `Mask ${fieldKey} in all displays` }
          : { status: "N/A", action: null };
      case "P4":
        return { status: "WARNING", action: `Isolate ${fieldKey} in network CDE segment` };
      case "P5":
        return { status: "WARNING", action: `Restrict access to ${fieldKey} by role` };
      case "P6":
        return { status: "PARTIAL", action: `Run vulnerability scan on ${fieldKey} systems` };
      case "P7":
        return { status: "PASS", action: null };
    }
  }

  return { status: "N/A", action: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN & CLASSIFY
// ═══════════════════════════════════════════════════════════════════════════

function analyzeColumn(
  tableName: string,
  colName: string,
  colType: string
): ColumnInfo {
  const norm = normalize(colName);
  const healthcareCtx = isHealthcareTable(tableName);

  let bestMatch: ColumnInfo | null = null;

  // Check PII patterns
  for (const [, def] of Object.entries(PII_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      const effectiveType = healthcareCtx ? "PHI" : "PII";
      const effectiveSensitivity = healthcareCtx ? "restricted" : def.sensitivity;
      if (!bestMatch || def.confidence > bestMatch.confidence) {
        bestMatch = {
          tableName, columnName: colName, columnType: colType,
          type: effectiveType, category: def.category,
          confidence: def.confidence, sensitivity: effectiveSensitivity,
          frameworks: effectiveType === "PHI" ? ["GDPR", "HIPAA"] : ["GDPR"],
          requiresEncryption: def.requiresEncryption || healthcareCtx,
          requiresMasking: def.requiresMasking || healthcareCtx,
          requiresAudit: def.requiresAudit || healthcareCtx,
          requiresConsent: def.requiresConsent || healthcareCtx,
        };
      }
    }
  }

  // Check PHI patterns
  for (const [, def] of Object.entries(PHI_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      if (!bestMatch || def.confidence > bestMatch.confidence) {
        const frameworks = ["HIPAA"];
        if (def.category === "insurance" || def.category === "encounter") frameworks.push("GDPR");
        bestMatch = {
          tableName, columnName: colName, columnType: colType,
          type: "PHI", category: def.category,
          confidence: def.confidence, sensitivity: def.sensitivity,
          frameworks,
          requiresEncryption: def.requiresEncryption,
          requiresMasking: def.requiresMasking,
          requiresAudit: def.requiresAudit,
          requiresConsent: def.requiresConsent,
        };
      }
    }
  }

  // Check PCI patterns
  for (const [, def] of Object.entries(PCI_PATTERNS)) {
    if (matchesAny(norm, def.patterns)) {
      if (!bestMatch || def.confidence > bestMatch.confidence) {
        const frameworks = ["PCI-DSS"];
        if (def.category === "prohibited" || def.category === "minimized") frameworks.push("GDPR");
        bestMatch = {
          tableName, columnName: colName, columnType: colType,
          type: "PCI-DSS", category: def.category,
          confidence: def.confidence, sensitivity: def.sensitivity,
          frameworks,
          requiresEncryption: def.requiresEncryption,
          requiresMasking: def.requiresMasking,
          requiresAudit: def.requiresAudit,
          requiresConsent: def.requiresConsent,
        };
      }
    }
  }

  return bestMatch!;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    // 1. Fetch all toolkit tables
    const tables = await db.toolkitTable.findMany({
      select: { tableName: true, columns: true },
      orderBy: { tableName: "asc" },
    });

    // 2. Scan all columns
    const fieldMap = new Map<string, ColumnInfo>();

    for (const table of tables) {
      let parsedColumns: Array<{ name: string; type?: string }> = [];
      try {
        parsedColumns = JSON.parse(table.columns || "[]");
      } catch {
        parsedColumns = [];
      }

      for (const col of parsedColumns) {
        const colName = col.name || "";
        const colType = (col.type || "unknown").toString();
        const info = analyzeColumn(table.tableName, colName, colType);
        if (info) {
          const key = `${info.tableName}.${info.columnName}`;
          // Keep highest-confidence match
          const existing = fieldMap.get(key);
          if (!existing || info.confidence > existing.confidence) {
            fieldMap.set(key, info);
          } else if (existing) {
            // Merge frameworks
            for (const fw of info.frameworks) {
              if (!existing.frameworks.includes(fw)) existing.frameworks.push(fw);
            }
          }
        }
      }
    }

    // 3. For each detected field, evaluate all applicable rules
    const fieldActions: FieldActionEntry[] = [];

    for (const [fieldKey, field] of fieldMap) {
      // Build classification
      const classifications: string[] = [];
      if (field.type === "PHI") classifications.push("PHI");
      if (field.type === "PII") classifications.push("PII");
      if (field.type === "PCI-DSS") classifications.push("PCI");
      if (field.frameworks.includes("SOX")) classifications.push("SOX");
      const classification = classifications.join("+");

      // Sensitivity level label
      const sensitivityLevel =
        field.sensitivity === "restricted" ? "RESTRICTED" :
        field.sensitivity === "confidential" ? "SENSITIVE" :
        field.sensitivity === "internal" ? "INTERNAL" : "PUBLIC";

      // Evaluate all rules
      const applicableRules: FieldActionEntry["applicableRules"] = [];
      const requiredActions: string[] = [];

      for (const rule of ALL_RULES) {
        const { status, action } = evaluateFieldRule(field, rule);
        if (status !== "N/A") {
          applicableRules.push({
            ruleId: rule.ruleId,
            name: rule.name,
            framework: rule.framework,
            severity: rule.severity,
            status,
            action,
          });
          if (action && status !== "PASS" && !requiredActions.includes(action)) {
            requiredActions.push(action);
          }
        }
      }

      fieldActions.push({
        tableName: field.tableName,
        columnName: field.columnName,
        classification,
        confidence: field.confidence,
        sensitivityLevel,
        applicableRules,
        requiredActions,
      });
    }

    // 4. Sort by sensitivity (restricted first), then by rule count desc
    const sensOrder: Record<string, number> = { RESTRICTED: 4, SENSITIVE: 3, INTERNAL: 2, PUBLIC: 1 };
    fieldActions.sort((a, b) => {
      const sDiff = (sensOrder[b.sensitivityLevel] ?? 0) - (sensOrder[a.sensitivityLevel] ?? 0);
      if (sDiff !== 0) return sDiff;
      return b.applicableRules.length - a.applicableRules.length;
    });

    // 5. Summary stats
    const totalFields = fieldActions.length;
    const immediateAttention = fieldActions.filter(f =>
      f.applicableRules.some(r => r.status === "FAIL")
    ).length;
    const partiallyCompliant = fieldActions.filter(f =>
      !f.applicableRules.some(r => r.status === "FAIL") &&
      f.applicableRules.some(r => r.status === "WARNING" || r.status === "PARTIAL")
    ).length;
    const fullyCompliant = fieldActions.filter(f =>
      f.applicableRules.every(r => r.status === "PASS")
    ).length;

    return NextResponse.json({
      success: true,
      scanTimestamp: new Date().toISOString(),
      totalFields,
      summary: {
        immediateAttention,
        partiallyCompliant,
        fullyCompliant,
      },
      fieldActions,
    });
  } catch (error) {
    console.error("[compliance-field-actions] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message, scanTimestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
