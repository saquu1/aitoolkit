# AI Enterprise Architect - Compliance Detection Rules

> This document defines the compliance rule engine for automated PII/PHI/Financial data detection,
> regulatory framework mapping, and compliance scoring across HIPAA, GDPR, SOX, and PCI-DSS.

---

## 1. HIPAA (Health Insurance Portability and Accountability Act)

### 1.1 Protected Health Information (PHI) Identifiers

The following 18 HIPAA identifiers trigger PHI classification:

| # | Identifier Type | Pattern Keywords | Confidence | Required Actions |
|---|----------------|-----------------|------------|-----------------|
| 1 | Name | `first_name`, `last_name`, `full_name`, `middle_name`, `maiden_name`, `patient_name` | 95% | Encrypt, Audit, Access Log |
| 2 | Geographic Data | `address`, `street`, `city`, `state`, `zip`, `postal`, `latitude`, `longitude` | 90% | Encrypt, Mask, Audit |
| 3 | Dates (Health-Related) | `dob`, `birth_date`, `admission_date`, `discharge_date`, `appointment_date`, `death_date` | 95% | Encrypt, Audit, Minimum Necessary |
| 4 | Phone Numbers | `phone`, `mobile`, `fax`, `telephone`, `contact_number` | 90% | Encrypt, Mask |
| 5 | Fax Numbers | `fax`, `fax_number` | 90% | Encrypt, Mask |
| 6 | Email Address | `email`, `email_address` | 95% | Encrypt, Audit |
| 7 | SSN | `ssn`, `social_security`, `national_id` | 99% | Encrypt, Mask, Audit, Restricted Access |
| 8 | MRN (Medical Record Number) | `mrn`, `medical_record`, `patient_id`, `patient_number`, `encounter_id` | 98% | Encrypt, Audit, Role-Based Access |
| 9 | Health Plan Beneficiary | `insurance_id`, `policy_number`, `subscriber_id`, `beneficiary_id` | 95% | Encrypt, Audit |
| 10 | Account Numbers | `account_number`, `patient_account`, `billing_account` | 90% | Encrypt, Audit |
| 11 | Certificate/License | `license_number`, `certification`, `provider_license` | 90% | Encrypt, Audit |
| 12 | Device Identifiers | `device_id`, `serial_number`, `implant_id` | 85% | Encrypt, Audit |
| 13 | Web URLs | `url`, `website`, `portal_url` (when health-related) | 70% | Audit |
| 14 | IP Addresses | `ip_address`, `ip` (in healthcare context) | 80% | Audit |
| 15 | Biometric Identifiers | `fingerprint`, `iris`, `face`, `retina`, `voice_print`, `dna` | 99% | Encrypt, Restricted Access, Consent |
| 16 | Full-Face Photos | `photo`, `portrait`, `image` (patient context) | 85% | Encrypt, Consent, Access Log |
| 17 | Any Other Unique Identifying Number | `unique_id`, `identifier` (healthcare context) | 80% | Audit |
| 18 | Clinical Information | `diagnosis`, `icd_code`, `icd`, `symptom`, `complaint`, `condition`, `prognosis` | 95% | Encrypt, Audit, Minimum Necessary |

### 1.2 PHI Category Classifications

```
PHI_CATEGORIES:
  patient_identifier: MRN, SSN, Patient ID, Encounter ID
  clinical: Diagnosis, Symptoms, Lab Results, Vitals, Allergies
  treatment: Prescription, Medication, Procedure, Surgery, Therapy
  financial_health: Insurance, Claim, Billing, Co-pay, Deductible
  demographic_health: Name + DOB + Gender (combined), Ethnicity, Language
  provider: Doctor, Nurse, Attending, Referring Physician
  administrative: Admission, Discharge, Transfer, Appointment
  biometric: Fingerprint, Iris, Face, DNA, Voice Print
```

### 1.3 HIPAA Security Rule Requirements

- **Encryption**: AES-256 for data at rest; TLS 1.2+ for data in transit
- **Access Control**: Role-based access with minimum necessary standard
- **Audit Trails**: All access to PHI must be logged with timestamp, user, action
- **Integrity Controls**: Data cannot be altered without detection
- **Transmission Security**: End-to-end encryption for electronic PHI
- **Backup & Recovery**: Encrypted backups with documented recovery procedures

---

## 2. GDPR (General Data Protection Regulation)

### 2.1 Personal Data Categories

| Category | Pattern Keywords | Legal Basis | Rights Applicable |
|----------|-----------------|-------------|-------------------|
| Basic Identity | `first_name`, `last_name`, `full_name`, `username` | Legitimate Interest | Access, Rectification, Erasure |
| Contact | `email`, `phone`, `mobile`, `address`, `fax` | Consent | Access, Rectification, Portability, Erasure |
| Identification | `ssn`, `passport`, `national_id`, `cnic`, `nic` | Legal Obligation | Access, Restriction |
| Location | `city`, `state`, `country`, `latitude`, `longitude`, `ip_address` | Consent | Access, Erasure |
| Demographics | `dob`, `age`, `gender`, `sex`, `marital_status`, `religion`, `ethnicity` | Consent | Access, Rectification |
| Financial | `salary`, `income`, `bank_account`, `credit_card`, `tax_id` | Legal Obligation | Access, Restriction |
| Professional | `job_title`, `department`, `employer`, `license` | Legitimate Interest | Access, Rectification |
| Online | `ip_address`, `cookie_id`, `device_id`, `browser_fingerprint` | Consent | Access, Erasure, Portability |
| Health (Special) | `diagnosis`, `blood_type`, `allergy`, `medication`, `disability` | Explicit Consent | All GDPR rights + Art.9 restrictions |
| Biometric (Special) | `fingerprint`, `iris`, `face`, `dna`, `voice_print` | Explicit Consent | All GDPR rights + Art.9 restrictions |

### 2.2 GDPR Data Subject Rights

1. **Right to Access** (Art.15) - Data portability
2. **Right to Rectification** (Art.16) - Correction of inaccurate data
3. **Right to Erasure** (Art.17) - Right to be forgotten
4. **Right to Restriction** (Art.18) - Limit processing
5. **Right to Data Portability** (Art.20) - Machine-readable format
6. **Right to Object** (Art.21) - Object to processing
7. **Rights re: Automated Decisions** (Art.22) - Human intervention

### 2.3 GDPR Compliance Checklist

- [ ] Data Processing Register maintained
- [ ] Privacy Impact Assessment (DPIA) conducted
- [ ] Consent management implemented
- [ ] Data Retention Policy defined and enforced
- [ ] Right to Erasure (deletion) capability
- [ ] Data Portability export functionality
- [ ] Breach notification procedure (<72 hours)
- [ ] Data Protection Officer (DPO) designated
- [ ] Cross-border transfer mechanisms (SCCs, BCRs)
- [ ] Cookie consent banner implemented

---

## 3. SOX (Sarbanes-Oxley Act)

### 3.1 Financial Data Categories

| Category | Pattern Keywords | Control Requirement |
|----------|-----------------|-------------------|
| Revenue | `revenue`, `sales_amount`, `income`, `billing_amount` | Segregation of Duties |
| Expense | `expense`, `cost`, `payment_amount`, `purchase_price` | Approval Workflow |
| Asset | `asset_value`, `depreciation`, `book_value`, `inventory_value` | Physical Verification |
| Liability | `liability`, `debt`, `loan_amount`, `payable` | Reconciliation |
| Equity | `equity`, `shareholder`, `capital`, `retained_earnings` | Board Approval |
| Journal Entry | `journal_entry`, `gl_entry`, `posting`, `adjustment` | Maker-Checker |
| Financial Report | `financial_statement`, `balance_sheet`, `income_statement`, `pnl` | Management Review |
| Audit Trail | `audit_log`, `change_log`, `modification_history` | Immutable Logging |

### 3.2 SOX Section 404 Requirements

- **Internal Controls**: Documented and tested internal control over financial reporting
- **Audit Trail**: Immutable logs for all financial transactions
- **Segregation of Duties**: No single person can initiate, approve, and record transactions
- **Change Management**: All system changes to financial systems require approval
- **Access Controls**: Role-based access with regular access reviews
- **Data Integrity**: Checksums and validation for financial data

### 3.3 SOX Applicable Table Patterns

Tables containing financial transaction data in healthcare context:
- `Billing`, `Payment`, `Charge`, `Claim`, `Invoice`
- `JournalEntry`, `GeneralLedger`, `TrialBalance`
- `Account`, `Transaction`, `Posting`

---

## 4. PCI-DSS (Payment Card Industry Data Security Standard)

### 4.1 Cardholder Data Elements

| Level | Data Element | Pattern Keywords | Storage Rule |
|-------|-------------|-----------------|-------------|
| Prohibited | Full PAN | `credit_card`, `card_number`, `pan` | Never store raw |
| Restricted | CVV/CVC | `cvv`, `cvc`, `security_code` | Never store |
| Restricted | PIN | `pin`, `pin_number`, `pin_code` | Never store |
| Encrypted | Track Data | `track1`, `track2`, `magnetic_stripe` | Never store |
| Minimized | Cardholder Name | `cardholder_name`, `name_on_card` | Mask display |
| Minimized | Expiry | `expiry_date`, `card_expiry`, `expiration` | Mask display |
| Minimized | Service Code | `service_code` | Minimize |

### 4.2 PCI-DSS 12 Requirements (Summary)

1. Install and maintain network security controls
2. Apply secure configurations to all components
3. Protect stored account data
4. Protect cardholder data with strong cryptography
5. Protect data from malicious software
6. Develop secure systems and software
7. Restrict access by business need-to-know
8. Identify users and authenticate access
9. Restrict physical access to cardholder data
10. Log and monitor all access
11. Test security of systems regularly
12. Support information security with policies

---

## 5. Multi-Framework Detection Rules

### 5.1 Healthcare Context Override

When a column exists in a healthcare-related table (Patient, Encounter, Diagnosis, LabResult, etc.),
PII data is automatically upgraded to PHI status per HIPAA rules.

**Healthcare Tables** (regex pattern):
```
patient|encounter|diagnosis|lab|clinical|medical|prescription|medication|
allergy|vital|admission|discharge|appointment|provider|nurse|physician|
insurance|claim|billing|pharmacy|procedure|surgery|treatment|therapy|
observation|immunization|pathology|radiology|
```

### 5.2 Cross-Framework Mapping

| Field Pattern | HIPAA | GDPR | SOX | PCI-DSS |
|--------------|-------|------|-----|---------|
| `patient_name`, `first_name` (healthcare) | ✅ PHI | ✅ Identity | - | - |
| `email` | ✅ PHI | ✅ Contact | - | - |
| `phone`, `mobile` | ✅ PHI | ✅ Contact | - | - |
| `dob`, `birth_date` | ✅ PHI | ✅ Demographics | - | - |
| `diagnosis`, `icd` | ✅ PHI | ✅ Health(Special) | - | - |
| `medication`, `drug` | ✅ PHI | ✅ Health(Special) | - | - |
| `insurance_id`, `policy` | ✅ PHI | ✅ Financial | ✅ Audit | - |
| `billing_amount`, `charge` | ✅ PHI | ✅ Financial | ✅ Revenue | - |
| `ssn`, `national_id` | ✅ PHI | ✅ ID | - | - |
| `credit_card`, `card_number` | - | ✅ Financial | ✅ Journal | ✅ Prohibited |
| `cvv`, `security_code` | - | - | - | ✅ Restricted |
| `salary`, `income` | - | ✅ Financial | ✅ Expense | - |
| `revenue`, `sales` | - | - | ✅ Revenue | - |
| `journal_entry`, `gl_entry` | - | - | ✅ Journal | - |
| `fingerprint`, `dna` | ✅ PHI | ✅ Biometric | - | - |

### 5.3 Sensitivity Level Matrix

| Sensitivity | Description | Default Encryption | Default Masking | Audit Required | Access Level |
|-------------|-------------|-------------------|----------------|---------------|-------------|
| `public` | Non-sensitive reference data | No | No | No | All users |
| `internal` | Business operational data | Optional | No | Recommended | Staff+ |
| `confidential` | PII, financial, business-sensitive | Yes | Conditional | Yes | Role-based |
| `restricted` | PHI, biometric, credentials, PCI | Yes (AES-256) | Yes | Yes (immutable) | Minimum necessary |

### 5.4 Compliance Score Calculation

```
HIPAA Score = (
  (PHI_Encrypted / Total_PHI) * 30 +
  (PHI_Audit_Enabled / Total_PHI) * 25 +
  (PHI_Access_Controlled / Total_PHI) * 20 +
  (Consent_Tracking_Enabled ? 15 : 0) +
  (Breach_Notification_Ready ? 10 : 0)
)

GDPR Score = (
  (PII_Encrypted / Total_PII) * 25 +
  (Consent_Mechanism ? 20 : 0) +
  (Retention_Policy_Defined ? 15 : 0) +
  (Right_to_Erasure_Capable ? 15 : 0) +
  (DPIA_Completed ? 15 : 0) +
  (DPO_Designated ? 10 : 0)
)

SOX Score = (
  (Financial_Audit_Trail ? 30 : 0) +
  (Segregation_of_Duties ? 25 : 0) +
  (Change_Management ? 20 : 0) +
  (Access_Reviews ? 15 : 0) +
  (Internal_Controls_Documented ? 10 : 0)
)

PCI-DSS Score = (
  (No_Stored_PAN ? 30 : 0) +
  (No_Stored_CVV ? 25 : 0) +
  (Encryption_At_Rest ? 20 : 0) +
  (Encryption_In_Transit ? 15 : 0) +
  (Access_Restricted ? 10 : 0)
)
```

---

## 6. Column-Level Detection Rules

### 6.1 PII Patterns (44 patterns)

```json
{
  "contact": {
    "patterns": ["email", "phone", "mobile", "fax", "telephone", "contact_number", "contact_email"],
    "confidence": 90,
    "gdpr_category": "contact",
    "requires_encryption": true,
    "requires_masking": true
  },
  "name": {
    "patterns": ["first_name", "last_name", "middle_name", "full_name", "maiden_name", "patient_name", "family_name", "given_name", "surname"],
    "confidence": 95,
    "gdpr_category": "basic_identity",
    "requires_encryption": true,
    "requires_masking": false
  },
  "address": {
    "patterns": ["address", "street", "address_line", "address1", "address2", "mailing_address", "residential_address"],
    "confidence": 90,
    "gdpr_category": "contact",
    "requires_encryption": true,
    "requires_masking": true
  },
  "location": {
    "patterns": ["city", "state", "province", "country", "region", "district", "county", "postal", "zip", "zipcode", "postcode"],
    "confidence": 75,
    "gdpr_category": "location",
    "requires_encryption": false,
    "requires_masking": false
  },
  "national_id": {
    "patterns": ["ssn", "social_security", "national_id", "passport", "cnic", "nic", "license_number", "id_number"],
    "confidence": 99,
    "gdpr_category": "identification",
    "requires_encryption": true,
    "requires_masking": true,
    "access_restriction": "restricted"
  },
  "demographic": {
    "patterns": ["gender", "sex", "dob", "birth_date", "birth", "age", "marital", "religion", "ethnicity", "nationality", "race", "language"],
    "confidence": 85,
    "gdpr_category": "demographics",
    "requires_encryption": false,
    "requires_masking": false,
    "special_category": true
  },
  "biometric": {
    "patterns": ["fingerprint", "iris", "face", "retina", "dna", "voice_print", "palm", "signature_image"],
    "confidence": 99,
    "gdpr_category": "biometric",
    "requires_encryption": true,
    "requires_masking": true,
    "access_restriction": "restricted",
    "special_category": true
  },
  "financial": {
    "patterns": ["salary", "income", "bank_account", "credit_card", "debit_card", "card_number", "tax_id", "tax_number", "routing_number", "iban", "swift", "account_balance"],
    "confidence": 95,
    "gdpr_category": "financial",
    "requires_encryption": true,
    "requires_masking": true,
    "access_restriction": "restricted"
  }
}
```

### 6.2 PHI Patterns (38 patterns)

```json
{
  "patient_identifier": {
    "patterns": ["mrn", "medical_record", "patient_id", "patient_number", "encounter_id", "visit_id", "episode_id", "case_id"],
    "confidence": 98,
    "hipaa_identifier": true,
    "requires_encryption": true,
    "requires_audit": true
  },
  "clinical": {
    "patterns": ["diagnosis", "icd", "icd_code", "icd10", "symptom", "complaint", "condition", "prognosis", "clinical_note", "medical_history", "family_history", "surgical_history"],
    "confidence": 95,
    "hipaa_identifier": true,
    "requires_encryption": true,
    "requires_audit": true
  },
  "treatment": {
    "patterns": ["prescription", "medication", "drug", "dosage", "treatment", "procedure", "surgery", "therapy", "radiation", "chemotherapy", "vaccination", "immunization"],
    "confidence": 95,
    "hipaa_identifier": true,
    "requires_encryption": true,
    "requires_audit": true
  },
  "lab": {
    "patterns": ["lab_result", "test_result", "blood", "urine", "specimen", "culture", "biopsy", "pathology", "radiology", "imaging"],
    "confidence": 95,
    "hipaa_identifier": true,
    "requires_encryption": true,
    "requires_audit": true
  },
  "vitals": {
    "patterns": ["blood_pressure", "heart_rate", "pulse", "temperature", "weight", "height", "bmi", "oxygen_saturation", "respiratory_rate", "blood_type", "blood_group"],
    "confidence": 90,
    "hipaa_identifier": true,
    "requires_encryption": false,
    "requires_audit": true
  },
  "allergies": {
    "patterns": ["allergy", "allergic", "allergen", "reaction", "intolerance", "sensitivity"],
    "confidence": 95,
    "hipaa_identifier": true,
    "requires_encryption": true,
    "requires_audit": true
  },
  "insurance": {
    "patterns": ["insurance", "policy", "claim", "coverage", "beneficiary", "subscriber", "co_pay", "deductible", "premium", "payer", "plan_id"],
    "confidence": 90,
    "hipaa_identifier": true,
    "requires_encryption": true,
    "requires_audit": true
  },
  "provider": {
    "patterns": ["doctor", "physician", "nurse", "surgeon", "specialist", "attending", "referring", "consultant", "provider_id", "npi"],
    "confidence": 70,
    "hipaa_identifier": true,
    "requires_encryption": false,
    "requires_audit": true
  },
  "encounter": {
    "patterns": ["admission", "discharge", "transfer", "appointment", "visit", "encounter", "check_in", "check_out", "wait_time"],
    "confidence": 75,
    "hipaa_identifier": true,
    "requires_encryption": false,
    "requires_audit": true
  }
}
```

### 6.3 SOX Financial Patterns (18 patterns)

```json
{
  "revenue": {
    "patterns": ["revenue", "sales", "sales_amount", "invoice_amount", "billing_amount", "fee", "charge_amount"],
    "confidence": 90,
    "sox_control": "segregation_of_duties"
  },
  "expense": {
    "patterns": ["expense", "cost", "payment_amount", "purchase_price", "vendor_payment", "refund"],
    "confidence": 90,
    "sox_control": "approval_workflow"
  },
  "asset": {
    "patterns": ["asset_value", "depreciation", "book_value", "inventory_value", "equipment_value", "property_value"],
    "confidence": 85,
    "sox_control": "physical_verification"
  },
  "journal": {
    "patterns": ["journal_entry", "gl_entry", "posting", "adjustment", "reversal", "correction", "trial_balance"],
    "confidence": 95,
    "sox_control": "maker_checker"
  },
  "audit": {
    "patterns": ["audit_log", "change_log", "modification", "approval", "authorized_by", "review_status"],
    "confidence": 80,
    "sox_control": "immutable_logging"
  }
}
```

### 6.4 PCI-DSS Card Patterns (12 patterns)

```json
{
  "prohibited": {
    "patterns": ["credit_card", "card_number", "pan", "track1", "track2", "magnetic_stripe", "card_data"],
    "confidence": 99,
    "pci_rule": "never_store",
    "storage_compliance": "prohibited"
  },
  "restricted": {
    "patterns": ["cvv", "cvc", "security_code", "cvv2", "cid", "pin", "pin_number", "pin_code"],
    "confidence": 99,
    "pci_rule": "never_store",
    "storage_compliance": "restricted"
  },
  "minimized": {
    "patterns": ["cardholder_name", "name_on_card", "expiry_date", "card_expiry", "expiration", "service_code", "last_four"],
    "confidence": 85,
    "pci_rule": "minimize",
    "storage_compliance": "encrypted_if_stored"
  }
}
```

---

## 7. Implementation Notes

### 7.1 Detection Algorithm

```
1. Parse column name → lowercase, replace underscores/hyphens with spaces
2. Match against all pattern dictionaries (PII, PHI, SOX, PCI-DSS)
3. Apply healthcare context override:
   - If table name matches healthcare patterns AND column matches PII → upgrade to PHI
4. Assign sensitivity level based on highest-matching category
5. Calculate confidence as highest pattern match confidence
6. Map to applicable regulatory frameworks
7. Set required protections (encryption, masking, audit, access restriction)
```

### 7.2 Default Protections by Classification

| Classification | Encrypt | Mask | Audit | Consent | Access |
|---------------|---------|------|-------|---------|--------|
| Public | No | No | No | No | All |
| Internal | No | No | Recommended | No | Staff |
| PII (Non-Healthcare) | Yes | Conditional | Yes | Yes | Role-Based |
| PHI | Yes | Conditional | Yes | Yes | Minimum Necessary |
| Financial (SOX) | Yes | No | Yes (Immutable) | No | Maker-Checker |
| PCI Prohibited | N/A | N/A | N/A | N/A | NEVER STORE |
| Restricted | Yes (AES-256) | Yes | Yes (Immutable) | Yes | Named Individuals |

### 7.3 Scoring Thresholds

- **90-100%**: Fully Compliant - All controls implemented
- **70-89%**: Mostly Compliant - Minor gaps identified
- **50-69%**: Partially Compliant - Significant controls missing
- **25-49%**: At Risk - Major compliance gaps
- **0-24%**: Non-Compliant - Immediate action required

---

*Generated by AI Enterprise Architect Compliance Engine v2.0*
*Last Updated: 2026-04-05*
