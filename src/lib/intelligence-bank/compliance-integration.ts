// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - Compliance Integration Service
// =============================================================================
// Integrates Compliance Scanner with UnifiedField records
// =============================================================================

import { db } from '@/lib/db';
import { createDefaultComplianceLayer, ComplianceLayer, SensitivityLevel } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ComplianceIntegrationResult {
  totalFieldsProcessed: number;
  piiFieldsDetected: number;
  phiFieldsDetected: number;
  financialFieldsDetected: number;
  encryptionRequired: number;
  maskingRequired: number;
  auditRequired: number;
  enrichmentLogsCreated: number;
}

// =============================================================================
// COMPLIANCE PATTERNS
// =============================================================================

const PII_PATTERNS: Record<string, { category: string; confidence: number }> = {
  // Contact Information
  'email': { category: 'contact', confidence: 95 },
  'phone': { category: 'contact', confidence: 90 },
  'mobile': { category: 'contact', confidence: 90 },
  'fax': { category: 'contact', confidence: 85 },
  
  // Names
  'first_name': { category: 'name', confidence: 95 },
  'last_name': { category: 'name', confidence: 95 },
  'middle_name': { category: 'name', confidence: 95 },
  'full_name': { category: 'name', confidence: 90 },
  'maiden_name': { category: 'name', confidence: 95 },
  
  // Address
  'address': { category: 'address', confidence: 90 },
  'street': { category: 'address', confidence: 85 },
  'city': { category: 'location', confidence: 70 },
  'state': { category: 'location', confidence: 70 },
  'country': { category: 'location', confidence: 60 },
  'postal': { category: 'address', confidence: 85 },
  'zip': { category: 'address', confidence: 85 },
  
  // Identity
  'ssn': { category: 'national_id', confidence: 99 },
  'cnic': { category: 'national_id', confidence: 99 },
  'nic': { category: 'national_id', confidence: 95 },
  'passport': { category: 'national_id', confidence: 98 },
  'license': { category: 'license', confidence: 90 },
  'national_id': { category: 'national_id', confidence: 98 },
  
  // Demographics
  'gender': { category: 'demographics', confidence: 90 },
  'sex': { category: 'demographics', confidence: 90 },
  'dob': { category: 'dob', confidence: 95 },
  'birth': { category: 'dob', confidence: 90 },
  'age': { category: 'demographics', confidence: 85 },
  'marital': { category: 'demographics', confidence: 85 },
  'religion': { category: 'demographics', confidence: 90 },
  'ethnicity': { category: 'demographics', confidence: 90 },
  'nationality': { category: 'demographics', confidence: 85 },
  
  // Biometric
  'fingerprint': { category: 'biometric', confidence: 99 },
  'iris': { category: 'biometric', confidence: 99 },
  'face': { category: 'biometric', confidence: 95 },
  'photo': { category: 'biometric', confidence: 80 },
  'avatar': { category: 'biometric', confidence: 70 },
};

const PHI_PATTERNS: Record<string, { category: string; confidence: number }> = {
  // Patient Identifiers
  'mrn': { category: 'patient_id', confidence: 98 },
  'medical_record': { category: 'patient_id', confidence: 98 },
  'patient_id': { category: 'patient_id', confidence: 95 },
  'patient_number': { category: 'patient_id', confidence: 95 },
  
  // Clinical Information
  'diagnosis': { category: 'clinical', confidence: 95 },
  'icd': { category: 'clinical', confidence: 95 },
  'symptom': { category: 'clinical', confidence: 90 },
  'complaint': { category: 'clinical', confidence: 85 },
  'condition': { category: 'clinical', confidence: 85 },
  
  // Treatment
  'prescription': { category: 'treatment', confidence: 95 },
  'medication': { category: 'treatment', confidence: 95 },
  'drug': { category: 'treatment', confidence: 90 },
  'treatment': { category: 'treatment', confidence: 90 },
  'procedure': { category: 'treatment', confidence: 85 },
  'surgery': { category: 'treatment', confidence: 90 },
  
  // Lab Results
  'lab_result': { category: 'lab', confidence: 95 },
  'test_result': { category: 'lab', confidence: 90 },
  'blood': { category: 'lab', confidence: 85 },
  'urine': { category: 'lab', confidence: 85 },
  'specimen': { category: 'lab', confidence: 80 },
  
  // Vitals
  'blood_pressure': { category: 'vitals', confidence: 95 },
  'heart_rate': { category: 'vitals', confidence: 95 },
  'temperature': { category: 'vitals', confidence: 85 },
  'weight': { category: 'vitals', confidence: 80 },
  'height': { category: 'vitals', confidence: 80 },
  'bmi': { category: 'vitals', confidence: 85 },
  'blood_type': { category: 'vitals', confidence: 95 },
  'blood_group': { category: 'vitals', confidence: 95 },
  
  // Allergies
  'allergy': { category: 'allergies', confidence: 95 },
  'allergic': { category: 'allergies', confidence: 90 },
  
  // Health Insurance
  'insurance': { category: 'insurance', confidence: 90 },
  'policy': { category: 'insurance', confidence: 85 },
  'claim': { category: 'insurance', confidence: 80 },
  
  // Provider Information
  'doctor': { category: 'provider', confidence: 70 },
  'physician': { category: 'provider', confidence: 70 },
  'nurse': { category: 'provider', confidence: 70 },
  'admission': { category: 'encounter', confidence: 75 },
  'discharge': { category: 'encounter', confidence: 75 },
};

const FINANCIAL_PATTERNS: Record<string, { category: string; confidence: number }> = {
  'credit_card': { category: 'payment', confidence: 99 },
  'card_number': { category: 'payment', confidence: 99 },
  'cvv': { category: 'payment', confidence: 99 },
  'expiry': { category: 'payment', confidence: 95 },
  'bank_account': { category: 'banking', confidence: 98 },
  'routing': { category: 'banking', confidence: 95 },
  'swift': { category: 'banking', confidence: 95 },
  'iban': { category: 'banking', confidence: 95 },
  'salary': { category: 'income', confidence: 90 },
  'income': { category: 'income', confidence: 85 },
  'tax_id': { category: 'tax', confidence: 95 },
};

// =============================================================================
// COMPLIANCE INTEGRATION SERVICE
// =============================================================================

export class ComplianceIntegrationService {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Run compliance integration for all fields
   */
  async runIntegration(): Promise<ComplianceIntegrationResult> {
    const result: ComplianceIntegrationResult = {
      totalFieldsProcessed: 0,
      piiFieldsDetected: 0,
      phiFieldsDetected: 0,
      financialFieldsDetected: 0,
      encryptionRequired: 0,
      maskingRequired: 0,
      auditRequired: 0,
      enrichmentLogsCreated: 0,
    };

    // Get all fields
    const fields = await db.unifiedField.findMany({
      where: { projectId: this.projectId },
    });

    for (const field of fields) {
      const compliance = this.analyzeField(field);

      if (compliance) {
        result.totalFieldsProcessed++;

        if (compliance.isPII) {
          result.piiFieldsDetected++;
        }

        if (compliance.isPHI) {
          result.phiFieldsDetected++;
        }

        if (compliance.isFinancial) {
          result.financialFieldsDetected++;
        }

        if (compliance.requiresEncryption) {
          result.encryptionRequired++;
        }

        if (compliance.requiresMasking) {
          result.maskingRequired++;
        }

        if (compliance.auditRequired) {
          result.auditRequired++;
        }

        // Apply updates
        await this.applyCompliance(field.id, compliance);
        result.enrichmentLogsCreated++;
      }
    }

    return result;
  }

  /**
   * Analyze field for compliance
   */
  private analyzeField(field: any): Partial<ComplianceLayer> | null {
    const fieldName = field.fieldName.toLowerCase();
    const tableName = field.tableName.toLowerCase();
    
    // Also check semantic type from column intelligence
    const semanticType = (field.intelSemanticType || '').toLowerCase();
    
    // Initialize compliance layer
    const compliance: Partial<ComplianceLayer> = {
      sensitivityLevel: 'public',
      isPII: false,
      isPHI: false,
      isFinancial: false,
      requiresEncryption: false,
      requiresMasking: false,
      auditRequired: false,
      consentRequired: false,
      accessRestrictions: [],
      regulatoryFrameworks: [],
      confidence: 0,
    };

    let piiMatch: { category: string; confidence: number } | null = null;
    let phiMatch: { category: string; confidence: number } | null = null;
    let financialMatch: { category: string; confidence: number } | null = null;

    // Check PII patterns
    for (const [pattern, info] of Object.entries(PII_PATTERNS)) {
      if (fieldName.includes(pattern) || semanticType === pattern) {
        if (!piiMatch || info.confidence > piiMatch.confidence) {
          piiMatch = info;
        }
      }
    }

    // Check PHI patterns
    for (const [pattern, info] of Object.entries(PHI_PATTERNS)) {
      if (fieldName.includes(pattern) || semanticType === pattern) {
        if (!phiMatch || info.confidence > phiMatch.confidence) {
          phiMatch = info;
        }
      }
    }

    // Check financial patterns
    for (const [pattern, info] of Object.entries(FINANCIAL_PATTERNS)) {
      if (fieldName.includes(pattern)) {
        if (!financialMatch || info.confidence > financialMatch.confidence) {
          financialMatch = info;
        }
      }
    }

    // Healthcare table detection
    const healthcareTables = ['patient', 'encounter', 'diagnosis', 'prescription', 'lab', 'vital', 'allergy', 'insurance', 'claim', 'appointment', 'admission', 'discharge', 'medical', 'clinical'];
    const isHealthcareTable = healthcareTables.some(t => tableName.includes(t));

    // Apply PHI if healthcare context detected
    if (isHealthcareTable && piiMatch) {
      // In healthcare context, PII becomes PHI
      phiMatch = piiMatch;
      piiMatch = null;
    }

    // Build compliance layer
    if (phiMatch) {
      compliance.isPHI = true;
      compliance.phiCategory = phiMatch.category;
      compliance.sensitivityLevel = 'restricted';
      compliance.requiresEncryption = true;
      compliance.auditRequired = true;
      compliance.consentRequired = true;
      compliance.regulatoryFrameworks = ['HIPAA', 'HITECH'];
      compliance.confidence = phiMatch.confidence / 100;
    } else if (piiMatch) {
      compliance.isPII = true;
      compliance.piiCategory = piiMatch.category;
      compliance.sensitivityLevel = 'confidential';
      compliance.requiresEncryption = true;
      compliance.requiresMasking = this.needsMasking(piiMatch.category);
      compliance.auditRequired = piiMatch.confidence > 85;
      compliance.regulatoryFrameworks = ['GDPR'];
      compliance.confidence = piiMatch.confidence / 100;
    } else if (financialMatch) {
      compliance.isFinancial = true;
      compliance.sensitivityLevel = 'confidential';
      compliance.requiresEncryption = true;
      compliance.auditRequired = true;
      compliance.regulatoryFrameworks = ['PCI-DSS'];
      compliance.confidence = financialMatch.confidence / 100;
    }

    // Password/secret detection
    if (/password|secret|token|api_key|private_key/i.test(fieldName)) {
      compliance.sensitivityLevel = 'restricted';
      compliance.requiresEncryption = true;
      compliance.requiresMasking = true;
      compliance.maskingPattern = '*****';
      compliance.accessRestrictions = ['role:admin', 'role:system'];
      compliance.confidence = 0.99;
    }

    // Only return if we found compliance issues
    if (compliance.confidence === 0) {
      return null;
    }

    return compliance;
  }

  /**
   * Determine if field needs masking
   */
  private needsMasking(piiCategory: string): boolean {
    const maskingCategories = ['contact', 'national_id', 'license', 'biometric', 'dob'];
    return maskingCategories.includes(piiCategory);
  }

  /**
   * Apply compliance updates to database
   */
  private async applyCompliance(fieldId: string, compliance: Partial<ComplianceLayer>): Promise<void> {
    await db.unifiedField.update({
      where: { id: fieldId },
      data: {
        compSensitivityLevel: compliance.sensitivityLevel,
        compIsPII: compliance.isPII || false,
        compIsPHI: compliance.isPHI || false,
        compIsFinancial: compliance.isFinancial || false,
        compPiiCategory: compliance.piiCategory || null,
        compPhiCategory: compliance.phiCategory || null,
        compRequiresEncryption: compliance.requiresEncryption || false,
        compRequiresMasking: compliance.requiresMasking || false,
        compMaskingPattern: compliance.maskingPattern || null,
        compAuditRequired: compliance.auditRequired || false,
        compConsentRequired: compliance.consentRequired || false,
        compAccessRestrictions: JSON.stringify(compliance.accessRestrictions || []),
        compRegulatoryFrameworks: JSON.stringify(compliance.regulatoryFrameworks || []),
        compConfidence: compliance.confidence || 0,
        updatedAt: new Date(),
      },
    });

    // Log enrichment
    await db.unifiedEnrichmentLog.create({
      data: {
        fieldId,
        projectId: this.projectId,
        agentName: 'ComplianceIntegrationService',
        layerEnriched: 'compliance',
        previousValue: JSON.stringify({ sensitivityLevel: 'public' }),
        newValue: JSON.stringify(compliance),
        confidenceAfter: compliance.confidence || 0,
        enrichmentMethod: 'pattern_match',
      },
    });
  }

  /**
   * Get compliance summary for project
   */
  async getComplianceSummary(): Promise<{
    totalFields: number;
    piiFields: number;
    phiFields: number;
    financialFields: number;
    encryptionRequired: number;
    auditRequired: number;
    byFramework: Record<string, number>;
    complianceScore: number;
  }> {
    const fields = await db.unifiedField.findMany({
      where: { projectId: this.projectId },
      select: {
        compIsPII: true,
        compIsPHI: true,
        compIsFinancial: true,
        compRequiresEncryption: true,
        compAuditRequired: true,
        compRegulatoryFrameworks: true,
      },
    });

    const byFramework: Record<string, number> = {
      HIPAA: 0,
      GDPR: 0,
      'PCI-DSS': 0,
      HITECH: 0,
    };

    let pii = 0;
    let phi = 0;
    let financial = 0;
    let encryption = 0;
    let audit = 0;

    for (const field of fields) {
      if (field.compIsPII) pii++;
      if (field.compIsPHI) phi++;
      if (field.compIsFinancial) financial++;
      if (field.compRequiresEncryption) encryption++;
      if (field.compAuditRequired) audit++;

      const frameworks = field.compRegulatoryFrameworks 
        ? JSON.parse(field.compRegulatoryFrameworks) 
        : [];
      for (const fw of frameworks) {
        byFramework[fw] = (byFramework[fw] || 0) + 1;
      }
    }

    // Calculate compliance score (0-100)
    const totalSensitive = pii + phi + financial;
    const totalProtected = encryption;
    const complianceScore = totalSensitive > 0 
      ? Math.round((totalProtected / totalSensitive) * 100) 
      : 100;

    return {
      totalFields: fields.length,
      piiFields: pii,
      phiFields: phi,
      financialFields: financial,
      encryptionRequired: encryption,
      auditRequired: audit,
      byFramework,
      complianceScore,
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createComplianceIntegrationService(projectId: string): ComplianceIntegrationService {
  return new ComplianceIntegrationService(projectId);
}

export async function runComplianceIntegration(projectId: string): Promise<ComplianceIntegrationResult> {
  const service = new ComplianceIntegrationService(projectId);
  return service.runIntegration();
}
