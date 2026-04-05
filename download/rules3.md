# Planning — Phase 3: Automatic Rule Application

## The Core Concept

```
Phase 1: DETECTED what fields exist
         "Found: email, cardNumber, diagnosis, ssn"

Phase 2: CONFIGURED which rules apply
         "This is healthcare + EU + USA, HIPAA + GDPR + PCI active"

Phase 3: APPLIES rules automatically
         "Therefore: email gets these 8 rules,
                     cardNumber gets these 6 rules,
                     diagnosis gets these 11 rules"

No human needed in Phase 3
It runs automatically the moment Phase 2 is activated
And re-runs whenever anything changes
```

---

## How Phase 3 Works — The Engine Logic

```
For EVERY field in the Intelligence Bank:

  Step 1: Get field classification (from Phase 1)
            Is it PII? PHI? PCI? Multiple?
            
  Step 2: Get active frameworks (from Phase 2)
            Which rules are active for this project?
            
  Step 3: Match field to applicable rule sets
            PII field + GDPR active = apply GDPR rules
            PHI field + HIPAA active = apply HIPAA rules
            PCI field + PCI-DSS active = apply PCI rules
            
  Step 4: For each matching rule — evaluate compliance
            Does the field currently meet this rule?
            PASS / FAIL / WARNING / UNKNOWN
            
  Step 5: Generate required actions for each FAIL
            What exactly needs to be done?
            
  Step 6: Calculate compliance score
            Per field / per table / per framework / overall
            
  Step 7: Write everything to Intelligence Bank
            Store results, gaps, actions, scores
            
  Step 8: Generate compliance gap report
            Summarize everything for humans to act on
```

---

## RULE APPLICATION SET 1 — GDPR RULES TO PII FIELDS

### What GDPR Requires Per PII Field

```
When a field is classified as PII and GDPR is active,
the system checks ALL of the following rules:
```

### GDPR Rule G1 — Lawful Basis For Processing

```
Rule: Every PII field must have a documented 
      legal basis for processing

GDPR Article: Art. 6 — Lawfulness of processing

Legal Basis Options:
  ├── Consent — user gave explicit permission
  ├── Contract — necessary to fulfill contract with user
  ├── Legal Obligation — required by law
  ├── Vital Interests — to protect someone's life
  ├── Public Task — public authority function
  └── Legitimate Interests — balancing test passed

Evaluation:
  Check: Is lawful basis documented for this field?
  
  If YES:
    ├── Which basis is documented?
    └── Is it appropriate for this data type?
    
  If NO:
    └── FAIL — No lawful basis documented

Examples:
  email field:
    ├── Basis: Contract (needed to send account emails)
    └── Result: PASS — appropriate basis
    
  marketingEmail field:
    ├── Basis: not documented
    └── Result: FAIL — marketing requires CONSENT basis
    
  ipAddress field:
    ├── Basis: Legitimate Interests (security monitoring)
    └── Result: PASS — if balancing test documented

Severity: HIGH
Action if FAIL:
  ├── Document lawful basis in Intelligence Bank
  ├── Update privacy policy to reflect basis
  └── Add basis metadata to field record
```

---

### GDPR Rule G2 — Data Minimization

```
Rule: Only collect PII fields that are NECESSARY
      for the stated purpose

GDPR Article: Art. 5(1)(c) — Data minimisation

Evaluation:
  Check 1: Is this field actually used anywhere?
    ├── Query: Is field referenced in any API?
    ├── Query: Is field displayed in any UI?
    └── Query: Is field used in any stored procedure?
    
  Check 2: If used — is it necessary for the purpose?
    ├── middleName — is it needed for the service?
    ├── dateOfBirth — is it needed or just nice to have?
    └── gender — is it needed or collected "just in case"?
    
  Check 3: Is the data collected at appropriate detail?
    ├── Full birthdate when only age needed? → WARNING
    ├── Full address when only country needed? → WARNING
    └── Exact location when only city needed? → WARNING

Examples:
  middleName (collected but never used):
    ├── API usage: 0
    ├── UI display: 0
    └── Result: WARNING — possible unnecessary collection
    
  email (collected and used for login + notifications):
    ├── API usage: 12 endpoints
    ├── UI display: 4 components
    └── Result: PASS — clearly necessary

Severity: MEDIUM
Action if FAIL:
  ├── Flag field as "potentially unnecessary"
  ├── Request justification from admin
  └── Suggest removal or anonymization if unused
```

---

### GDPR Rule G3 — Storage Limitation (Retention)

```
Rule: PII must not be kept longer than necessary

GDPR Article: Art. 5(1)(e) — Storage limitation

Evaluation:
  Check 1: Does a retention period exist for this field?
    ├── Is retention period set in Phase 2 config?
    └── Is there a deletion/expiry mechanism?
    
  Check 2: Is there a deletion mechanism?
    ├── Is there a scheduled job to delete old records?
    ├── Is there a soft-delete flow?
    └── Is there an anonymization flow?
    
  Check 3: Is retention period appropriate?
    ├── Too long for the purpose?
    └── Does it meet minimum retention laws?
    
  Retention Rules Applied:
    ├── Active user data → retain while account active
    ├── Deleted user data → max 30 days after deletion
    ├── Marketing data → until consent withdrawn
    ├── Transaction data → 7 years (legal minimum)
    └── Log data → 90 days (GDPR guidance)

Evaluation Results:
  email field:
    ├── Retention set: YES (lifetime of account + 30 days)
    ├── Deletion mechanism: YES (user delete flow)
    └── Result: PASS
    
  oldIpAddress (log table, no deletion):
    ├── Retention set: NO
    ├── Deletion mechanism: NO
    └── Result: FAIL — logs kept indefinitely

Severity: HIGH
Action if FAIL:
  ├── Create retention policy for this field
  ├── Add scheduled cleanup job
  └── Implement anonymization alternative
```

---

### GDPR Rule G4 — Right To Erasure (Right To Be Forgotten)

```
Rule: When user requests deletion, ALL their PII
      must be deleted or anonymized

GDPR Article: Art. 17 — Right to erasure

Evaluation:
  Check 1: Is this field included in erasure flow?
    ├── Is there an erasure/deletion API?
    ├── Does the erasure API cover this field?
    └── Does erasure cascade to related tables?
    
  Check 2: Anonymization alternative?
    ├── Can data be anonymized instead of deleted?
    ├── Is anonymization truly irreversible?
    └── Does anonymization remove ALL identifiers?
    
  Check 3: Erasure exceptions documented?
    ├── Legal obligation to retain? (tax, compliance)
    ├── Exception documented in privacy policy?
    └── Retention limit during exception period?
    
  Cascade Check (CRITICAL):
    email in users table deleted
      → Does it cascade to:
        ├── email in orders table? CHECK
        ├── email in newsletters table? CHECK
        ├── email in audit_logs table? CHECK (anonymize)
        ├── email in backup tables? CHECK
        └── email in third-party processors? NOTIFY

Examples:
  email field:
    ├── In erasure flow: YES
    ├── Cascades checked: 3/5 tables covered
    ├── Missing: newsletter_emails table
    └── Result: PARTIAL FAIL — missing cascade

  transactionAmount field:
    ├── In erasure flow: NO
    ├── Exception: legal obligation (7 year retention)
    ├── Exception documented: YES
    └── Result: PASS — exempt with documentation

Severity: CRITICAL
Action if FAIL:
  ├── Map all tables containing this PII field
  ├── Add missing tables to erasure flow
  ├── Generate erasure cascade script
  └── Test erasure completeness
```

---

### GDPR Rule G5 — Right To Data Portability

```
Rule: User must be able to export their personal data
      in machine-readable format

GDPR Article: Art. 20 — Right to data portability

Evaluation:
  Check 1: Is this field included in data export?
    ├── Is there a "download my data" feature?
    ├── Does export include this field?
    └── Is export format machine-readable? (JSON/CSV)
    
  Check 2: Export completeness?
    ├── All PII fields included in export?
    └── Related records included?

Examples:
  email, name, address fields:
    ├── Export feature exists: YES
    ├── These fields in export: YES
    └── Result: PASS
    
  purchaseHistory PII fields:
    ├── Export feature exists: YES
    ├── Purchase history included: NO
    └── Result: FAIL — incomplete export

Severity: MEDIUM
Action if FAIL:
  ├── Add missing fields to export endpoint
  ├── Test export completeness
  └── Document what is and is not exported
```

---

### GDPR Rule G6 — Encryption At Rest

```
Rule: Personal data should be protected
      with appropriate technical measures

GDPR Article: Art. 32 — Security of processing

Encryption requirement by sensitivity:
  Level 3 (SENSITIVE — direct PII):    MUST encrypt
  Level 4 (HIGHLY SENSITIVE — PHI/PCI): MUST encrypt
  Level 5 (RESTRICTED):                MUST encrypt + hash
  Level 2 (CONFIDENTIAL):              SHOULD encrypt
  Level 1 (INTERNAL):                  RECOMMENDED
  Level 0 (PUBLIC):                    NOT required

Evaluation:
  Check 1: Is the field encrypted at rest?
    ├── Is DB-level encryption enabled?
    ├── Is column-level encryption applied?
    └── Is application-level encryption applied?
    
  Check 2: Key management?
    ├── Are encryption keys stored separately from data?
    ├── Is key rotation configured?
    └── Who has access to encryption keys?

Examples:
  ssn field (sensitivity level 4):
    ├── DB encryption: YES (transparent data encryption)
    ├── Column encryption: NO
    ├── Key management: basic
    └── Result: PARTIAL — needs column-level encryption
    
  email field (sensitivity level 3):
    ├── DB encryption: YES
    ├── Column encryption: NO (acceptable for email)
    └── Result: PASS — DB encryption sufficient for email

Severity: CRITICAL for Level 4-5, HIGH for Level 3
Action if FAIL:
  ├── Implement column-level encryption
  ├── Set up key management system
  └── Rotate keys on schedule
```

---

### GDPR Rule G7 — Masking In Logs

```
Rule: Personal data must not appear in plain text
      in application logs, error logs, or debug output

GDPR Article: Art. 32 — Security of processing

Evaluation:
  Check 1: Is this field masked in application logs?
  Check 2: Is this field masked in error logs?
  Check 3: Is this field masked in API request logs?
  Check 4: Is this field masked in debug output?
  
  Masking Patterns Required:
    ├── email: john@example.com → j***@e******.com
    ├── phone: +1234567890 → +1*******90
    ├── cardNumber: 4111111111111111 → ****1111
    ├── ssn: 123-45-6789 → ***-**-6789
    └── name: John Smith → J*** S****

Examples:
  email field:
    ├── API logs: shows full email → FAIL
    ├── Error logs: masked → PASS
    ├── Debug logs: shows full email → FAIL
    └── Result: FAIL — 2 of 3 log types expose data

Severity: HIGH
Action if FAIL:
  ├── Add masking middleware to logging layer
  ├── Create field masking rules in log config
  ├── Audit existing logs for exposed PII
  └── Add log scrubbing job for historical logs
```

---

### GDPR Rule G8 — Consent Tracking

```
Rule: If lawful basis is CONSENT, then consent must
      be recorded, timestamped, and withdrawable

GDPR Article: Art. 7 — Conditions for consent

Evaluation:
  Check 1: Is lawful basis = Consent for this field?
    If YES → consent tracking required
    If NO  → skip this check
    
  Check 2: Is consent record stored?
    ├── When consent given (timestamp)
    ├── What was consented to (purpose)
    ├── How consent was given (checkbox, signature)
    └── Which version of privacy policy at time
    
  Check 3: Is consent withdrawal mechanism in place?
    ├── Can user withdraw consent easily?
    ├── What happens to data when consent withdrawn?
    └── Is withdrawal logged?

Examples:
  marketingEmail (lawful basis = consent):
    ├── Consent record: YES
    ├── Withdrawal mechanism: YES (unsubscribe)
    ├── Withdrawal logged: NO
    └── Result: PARTIAL FAIL — withdrawal not logged
    
  email (lawful basis = contract):
    ├── Consent check: SKIPPED (not consent-based)
    └── Result: N/A — different lawful basis

Severity: HIGH
Action if FAIL:
  ├── Add consent logging to withdrawal flow
  ├── Store withdrawal timestamp per field/purpose
  └── Link consent records to data records
```

---

### GDPR Rule G9 — Cross-Border Transfer Compliance

```
Rule: PII cannot be transferred outside EU/EEA
      without adequate protection mechanism

GDPR Article: Art. 44-49 — Transfers to third countries

Evaluation:
  Check 1: Where is this field's data stored?
    ├── Server location vs EU users?
    └── Cloud provider region?
    
  Check 2: Is data transferred to third countries?
    ├── Third-party analytics (Google Analytics)?
    ├── Third-party email (SendGrid, Mailchimp)?
    ├── Third-party CRM (Salesforce, HubSpot)?
    └── Cloud storage outside EU?
    
  Check 3: Is transfer mechanism in place?
    ├── Adequacy decision (UK, Canada, etc.)?
    ├── Standard Contractual Clauses (SCCs)?
    ├── Binding Corporate Rules?
    └── Explicit consent (rare)?

Examples:
  email field:
    ├── Server: US-East → ISSUE (EU users' data in USA)
    ├── Transfer mechanism: SCCs in place → PASS
    └── Result: PASS — SCCs cover transfer
    
  userData sent to Google Analytics:
    ├── Transfer to USA: YES
    ├── Transfer mechanism: NOT DOCUMENTED
    └── Result: FAIL — undocumented transfer

Severity: CRITICAL
Action if FAIL:
  ├── Document all third-party data transfers
  ├── Implement SCCs with each processor
  ├── Consider EU-region server deployment
  └── Review third-party DPAs
```

---

### GDPR Rule G10 — Privacy By Design Check

```
Rule: Data protection built into system design
      not added as afterthought

GDPR Article: Art. 25 — Data protection by design

Evaluation:
  Check 1: Is this field collected at point of need only?
  Check 2: Is default setting privacy-protective?
    ├── Default: private (not public) profile?
    ├── Default: opt-out of marketing?
    └── Default: minimal data collection?
  Check 3: Can the purpose be achieved with less data?

Severity: MEDIUM
Action if FAIL:
  ├── Review data collection points
  ├── Change defaults to privacy-protective
  └── Implement pseudonymization where possible
```

---

## RULE APPLICATION SET 2 — HIPAA RULES TO PHI FIELDS

### HIPAA Rule H1 — Minimum Necessary Standard

```
Rule: Only access/disclose the minimum PHI
      necessary for the purpose

HIPAA Reference: 45 CFR § 164.502(b)

Evaluation:
  Check 1: Who has access to this PHI field?
    ├── List all roles with read access
    ├── Is access limited to treating clinicians?
    ├── Do billing staff see clinical fields they don't need?
    └── Do admin staff see PHI they don't need?
    
  Check 2: Are access controls role-appropriate?
    ├── Receptionist: needs name, appointment, contact
    ├── Nurse: needs vitals, medications, allergies
    ├── Doctor: needs full clinical record
    ├── Billing: needs insurance, diagnosis codes (not clinical notes)
    └── Admin: needs scheduling, not clinical details

Examples:
  diagnosis field:
    ├── Roles with access: all_staff (15 roles)
    ├── Should have access: clinical_staff (5 roles)
    └── Result: FAIL — too many roles have access
    
  appointmentDate field:
    ├── Roles with access: all_staff (15 roles)
    ├── Should have access: all_staff is appropriate
    └── Result: PASS

Severity: CRITICAL
Action if FAIL:
  ├── Map field to appropriate role set
  ├── Implement field-level access control
  └── Audit existing access logs for violations
```

---

### HIPAA Rule H2 — PHI Encryption (In Transit + At Rest)

```
Rule: PHI must be encrypted both when stored
      and when transmitted

HIPAA Reference: 45 CFR § 164.312 — Technical safeguards

Encryption Requirements:
  At Rest:
    ├── AES-256 minimum
    ├── TDE (Transparent Data Encryption) acceptable
    └── Column-level preferred for highest sensitivity
    
  In Transit:
    ├── TLS 1.2 minimum
    ├── TLS 1.3 preferred
    └── No unencrypted API transmission of PHI

Evaluation:
  Check 1: Is PHI field encrypted at rest?
  Check 2: Is PHI encrypted in transit?
  Check 3: Are encryption keys properly managed?
  Check 4: Is encryption standard sufficient?

Examples:
  medicalRecordNumber field:
    ├── At rest: AES-128 → WARNING (use AES-256)
    ├── In transit: TLS 1.2 → PASS
    ├── Key management: HSM → PASS
    └── Result: WARNING — upgrade encryption strength
    
  diagnosis field:
    ├── At rest: no encryption → FAIL
    ├── In transit: TLS 1.3 → PASS
    └── Result: FAIL — needs at-rest encryption

Severity: CRITICAL
Action if FAIL:
  ├── Implement AES-256 for PHI columns
  ├── Enable TDE on database
  ├── Upgrade TLS to 1.3
  └── Document encryption in Security Risk Assessment
```

---

### HIPAA Rule H3 — Audit Controls (Access Logging)

```
Rule: Hardware, software, and procedural mechanisms
      to record and examine access to PHI

HIPAA Reference: 45 CFR § 164.312(b)

Every PHI field access must log:
  ├── WHO accessed (userId, role)
  ├── WHAT was accessed (field, record ID)
  ├── WHEN accessed (timestamp, timezone)
  ├── FROM WHERE (IP address, device)
  ├── WHY accessed (purpose code)
  └── WHAT ACTION (read/write/delete/export)

Evaluation:
  Check 1: Is access to this field logged?
  Check 2: Does log capture all 6 required elements?
  Check 3: Are logs tamper-proof?
  Check 4: Are logs retained for 6 years?
  Check 5: Are logs regularly reviewed?

Examples:
  patientDiagnosis field:
    ├── Access logging: YES (partial)
    ├── Logs WHO: YES
    ├── Logs WHAT: YES  
    ├── Logs WHEN: YES
    ├── Logs FROM WHERE: NO → FAIL
    ├── Logs WHY: NO → FAIL
    ├── Logs ACTION: YES
    ├── Log retention: 2 years → FAIL (need 6 years)
    └── Result: FAIL — 3 requirements missing

Severity: CRITICAL
Action if FAIL:
  ├── Add IP/device capture to audit log
  ├── Add purpose code to PHI access requests
  ├── Extend log retention to 6 years
  └── Set up log review schedule
```

---

### HIPAA Rule H4 — Automatic Logoff

```
Rule: Sessions accessing PHI must auto-terminate
      after period of inactivity

HIPAA Reference: 45 CFR § 164.312(a)(2)(iii)

Evaluation:
  Check 1: Does system have session timeout?
  Check 2: Is timeout appropriate?
    ├── Clinical workstations: 15 minutes recommended
    ├── Administrative: 30 minutes acceptable
    └── Patient portal: 30 minutes acceptable
  Check 3: Is PHI cleared from screen on timeout?

Severity: HIGH
Action if FAIL:
  ├── Implement session timeout
  ├── Set appropriate timeout duration
  └── Clear PHI from screen/cache on timeout
```

---

### HIPAA Rule H5 — PHI De-identification Standards

```
Rule: PHI can only be considered de-identified
      when ALL 18 HIPAA identifiers are removed
      OR statistical expert certifies re-identification
      risk is very small

HIPAA Reference: 45 CFR § 164.514(b)

The 18 identifiers that MUST be removed:
  1.  Names
  2.  Geographic data < state level
  3.  All dates (except year) for individuals
  4.  Phone numbers
  5.  Fax numbers
  6.  Email addresses
  7.  Social security numbers
  8.  Medical record numbers
  9.  Health plan beneficiary numbers
  10. Account numbers
  11. Certificate/license numbers
  12. Vehicle identifiers
  13. Device identifiers
  14. Web URLs
  15. IP addresses
  16. Biometric identifiers
  17. Full-face photographs
  18. Any unique identifying numbers/codes

Evaluation:
  Check: If data is shared for research/analytics,
         have all 18 identifiers been removed?

Examples:
  Research dataset export:
    ├── Names removed: YES
    ├── Dates generalized to year only: YES
    ├── ZIP codes truncated to 3 digits: YES
    ├── MRN removed: YES
    ├── IP addresses removed: NO → FAIL
    └── Result: FAIL — not fully de-identified

Severity: CRITICAL (if shared without authorization)
Action if FAIL:
  ├── Remove all 18 identifier types
  ├── Use safe harbor method checklist
  └── Get expert determination if needed
```

---

### HIPAA Rule H6 — Business Associate Compliance

```
Rule: Any third party receiving PHI must have
      a signed Business Associate Agreement (BAA)

HIPAA Reference: 45 CFR § 164.308(b)

Evaluation:
  Check 1: Which third parties receive this PHI field?
    ├── Cloud storage provider
    ├── Email service provider
    ├── Analytics platform
    ├── Backup service
    └── Any SaaS tool that processes data
    
  Check 2: Does each have a BAA?
    ├── AWS: BAA available → check if signed
    ├── Google Workspace: BAA available → check if signed
    ├── Stripe: BAA not needed (payment only) → N/A
    └── Custom analytics: BAA needed → check

Severity: CRITICAL
Action if FAIL:
  ├── Identify all Business Associates
  ├── Obtain BAA from each
  ├── Store BAA copies in compliance vault
  └── Review BAAs annually
```

---

### HIPAA Rule H7 — Breach Notification Readiness

```
Rule: If PHI is breached, covered entity must notify:
      ├── Affected individuals: within 60 days
      ├── HHS: within 60 days
      └── Media: if >500 individuals in a state

HIPAA Reference: 45 CFR §§ 164.400-414

Evaluation:
  Check 1: Can the system identify WHICH records
           were accessed in a breach?
  Check 2: Can the system identify WHO was affected?
  Check 3: Can the system generate breach notification list?
  Check 4: Is there a breach response procedure?

Evaluation on PHI fields:
  patientEmail + patientName fields:
    ├── Breach detection: YES (audit logs exist)
    ├── Affected patient list: YES (can query)
    ├── Notification generation: NO → FAIL
    └── Result: PARTIAL — notification system missing

Severity: CRITICAL
Action if FAIL:
  ├── Build breach notification report generator
  ├── Test ability to identify affected records
  └── Document breach response procedure
```

---

### HIPAA Rule H8 — Mental Health Extra Protection

```
Rule: Mental health and substance use records
      have additional restrictions beyond HIPAA

References:
  ├── 42 CFR Part 2 (substance use)
  ├── State mental health privacy laws
  └── Psychotherapy notes: stricter than general PHI

Evaluation for mental health fields:
  mentalHealthDiagnosis, therapyNotes, substanceUse:
  
  Check 1: Separated from general medical record?
  Check 2: Extra consent required for disclosure?
  Check 3: Cannot be shared with employer?
  Check 4: Cannot be shared with family without consent?
  Check 5: Even with subpoena — extra protections apply?

Severity: CRITICAL
Action if FAIL:
  ├── Separate mental health module with extra controls
  ├── Add extra consent layer for these fields
  └── Restrict disclosure to treating providers only
```

---

## RULE APPLICATION SET 3 — PCI-DSS RULES TO PAYMENT FIELDS

### PCI Rule P1 — CVV/CVC Absolute Prohibition

```
Rule: Security codes MUST NEVER be stored
      after authorization — not even encrypted

PCI-DSS: Requirement 3.2.1

Evaluation:
  Check 1: Does CVV/CVC/CID field exist in schema?
    → If YES: IMMEDIATE CRITICAL VIOLATION
    
  Check 2: Is any value stored in this column?
    → Query: SELECT COUNT(*) WHERE cvv IS NOT NULL
    → If count > 0: CRITICAL BREACH
    
  Check 3: Is there any backup/log with CVV data?
    → Check application logs
    → Check database backups
    → Check API request logs

Result Outputs:
  Field exists but empty:
    ├── Status: CRITICAL WARNING
    ├── Action: Remove field from schema entirely
    └── Risk: Field existing creates audit finding
    
  Field exists with data:
    ├── Status: CRITICAL VIOLATION
    ├── Action: Immediate purge + schema removal
    └── Risk: Automatic PCI audit failure

Severity: CRITICAL — blocks PCI compliance entirely
Action:
  ├── Remove CVV field from database schema
  ├── Remove CVV from all API request/response bodies
  ├── Remove CVV from all logs immediately
  ├── Purge any stored CVV values
  └── Document remediation for PCI auditor
```

---

### PCI Rule P2 — PAN Protection

```
Rule: Primary Account Number must be protected
      when stored. Render unreadable using:
      strong cryptography, truncation, tokenization,
      or one-way hashing

PCI-DSS: Requirement 3.4

Evaluation:
  Check 1: Is PAN stored?
    ├── If YES → must be protected
    └── If NO → PASS (no storage = no risk)
    
  Check 2: How is PAN stored?
    ├── Plain text → CRITICAL FAIL
    ├── Weak encryption (DES, RC4) → CRITICAL FAIL
    ├── AES-128 → WARNING (use AES-256)
    ├── AES-256 → PASS
    ├── Tokenized (token stored, not PAN) → PASS (best)
    ├── Truncated (last 4 only) → PASS
    └── Hashed (one-way) → PASS
    
  Check 3: Is only the minimum PAN stored?
    ├── Storing full 16 digits? → Is that necessary?
    ├── Could last 4 digits work for the use case?
    └── Is tokenization available?

Examples:
  cardNumber field:
    ├── Storage: plain text → CRITICAL FAIL
    └── Action: Implement tokenization immediately
    
  last4Digits field:
    ├── Storage: plain text → PASS (truncated is allowed)
    └── Result: PASS
    
  cardToken field (from Stripe):
    ├── Storage: token (not actual PAN) → PASS
    └── Result: PASS — tokenization is best practice

Severity: CRITICAL
Action if FAIL:
  ├── Implement tokenization (Stripe, Braintree, etc.)
  ├── Or implement AES-256 with key management
  ├── Truncate to last 4 for display purposes
  └── Never store full PAN without protection
```

---

### PCI Rule P3 — PAN Masking In Display

```
Rule: When displaying PAN, only show
      first 6 OR last 4 digits maximum

PCI-DSS: Requirement 3.3

Evaluation:
  Check 1: Where is cardNumber displayed in UI?
    ├── Scan all UI components for card display
    └── Scan all API responses for full PAN
    
  Check 2: Is display properly masked?
    ├── Showing: 4111 1111 1111 1111 → FAIL
    ├── Showing: ****-****-****-1111 → PASS
    └── Showing: 411111******1111 → PASS (first 6 + last 4)
    
  Check 3: Are API responses masked?
    ├── GET /api/payment returns full PAN → FAIL
    └── GET /api/payment returns masked → PASS

Severity: HIGH
Action if FAIL:
  ├── Add masking to all card display components
  ├── Mask PAN in all API responses
  └── Never return full PAN to frontend
```

---

### PCI Rule P4 — Network Segmentation

```
Rule: Systems storing/processing cardholder data
      must be in isolated network segment (CDE)

PCI-DSS: Requirement 1 — Network security controls

Evaluation:
  Check 1: Is payment database in separate segment?
  Check 2: Is access to CDE restricted?
  Check 3: Are firewalls documented?
  Check 4: Is CDE scoped correctly?

Evaluation on schema level:
  If payment tables are in same DB as non-payment tables:
    ├── WARNING: Consider separating CDE database
    └── Or: Use column encryption to compensate

Severity: HIGH
Action if FAIL:
  ├── Separate payment data to isolated database
  ├── Or implement compensating controls
  └── Document network architecture for PCI auditor
```

---

### PCI Rule P5 — Access Control To Cardholder Data

```
Rule: Access to cardholder data restricted
      to need-to-know basis

PCI-DSS: Requirement 7 — Restrict access by need to know

Evaluation:
  Check 1: Which roles have access to PAN fields?
  Check 2: Which roles actually need access?
    ├── Payment processing system: YES
    ├── Customer service: last 4 only
    ├── Developers: NO (use test cards)
    ├── Analysts: NO (use tokenized data)
    └── Admins: only if explicitly required
    
  Check 3: Are access controls enforced at DB level?
  Check 4: Is access logged?

Severity: CRITICAL
Action if FAIL:
  ├── Remove unnecessary role access
  ├── Implement row-level security
  └── Log all cardholder data access
```

---

### PCI Rule P6 — Vulnerability Management

```
Rule: Protect systems against known vulnerabilities
      with regular patching and security testing

PCI-DSS: Requirements 5-6

Schema-level evaluation:
  Check 1: Are there SQL injection risks?
    ├── Raw SQL queries with user input → FAIL
    ├── Parameterized queries only → PASS
    └── ORM usage (Prisma) → PASS
    
  Check 2: Are there fields that accept dangerous input?
    ├── Fields with no sanitization
    ├── Fields that allow HTML/script input
    └── Fields used in dynamic queries

Severity: CRITICAL
Action if FAIL:
  ├── Replace raw SQL with parameterized queries
  ├── Add input sanitization
  └── Run quarterly vulnerability scans
```

---

### PCI Rule P7 — PCI Compliance Level Assessment

```
Rule: Different merchant levels have different
      validation requirements

Merchant Levels (from Phase 2 config):
  Level 1: >6M transactions/year
    └── Annual Report on Compliance (ROC) by QSA
    
  Level 2: 1-6M transactions/year
    └── Annual SAQ (Self-Assessment Questionnaire)
    
  Level 3: 20K-1M e-commerce transactions
    └── Annual SAQ
    
  Level 4: <20K e-commerce transactions
    └── Annual SAQ (recommended)

Evaluation:
  Based on merchant level → generate appropriate
  validation checklist and requirements

Severity: HIGH (compliance path depends on level)
Action:
  ├── Confirm merchant level in Phase 2 config
  ├── Generate appropriate SAQ questions
  └── Flag gaps against SAQ requirements
```

---

## PART 4 — COMPLIANCE GAP REPORT GENERATION

### What The Gap Report Contains

```
The Gap Report is the OUTPUT of Phase 3.
It tells humans EXACTLY what needs to be fixed,
in what ORDER, with what PRIORITY.
```

### Gap Report Structure

```
COMPLIANCE GAP REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: Healthcare Management System
Generated: 2025-04-03 14:32:00
Frameworks Active: HIPAA, GDPR, PCI-DSS
Fields Evaluated: 847 fields across 81 tables

EXECUTIVE SUMMARY:
━━━━━━━━━━━━━━━━━

Overall Compliance Score: 34/100 ❌

By Framework:
  ├── HIPAA:   28/100 ❌ (47 violations)
  ├── GDPR:    41/100 ❌ (31 violations)
  └── PCI-DSS: 22/100 ❌ (8 violations)

By Severity:
  ├── CRITICAL: 23 violations → Fix immediately
  ├── HIGH:     38 violations → Fix within 30 days
  ├── MEDIUM:   19 violations → Fix within 90 days
  └── LOW:      6 violations  → Fix when possible
```

---

### Gap Report Section 1 — CRITICAL VIOLATIONS

```
CRITICAL VIOLATIONS (Must Fix Immediately)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CRIT-001] CVV Field Found In Database
  Framework: PCI-DSS 3.2.1
  Table: payment_methods
  Field: cvv
  Finding: CVV field exists and contains 1,247 records
  
  Impact:
    ├── Automatic PCI audit failure
    ├── Potential fines: $5,000-$100,000/month
    └── Card brand penalties possible
    
  Required Action:
    ├── Step 1: Purge all CVV values immediately
    ├── Step 2: Remove CVV column from schema
    ├── Step 3: Remove CVV from all API endpoints
    ├── Step 4: Remove CVV from all logs
    └── Step 5: Document remediation for auditor
    
  Estimated Effort: 4 hours
  Owner: Database Administrator + Security Team
  Deadline: IMMEDIATE

---

[CRIT-002] PHI Fields Not Encrypted At Rest
  Framework: HIPAA Security Rule 45 CFR § 164.312
  Tables Affected: patients, appointments, diagnoses
  Fields Affected: 12 fields
    ├── patients.diagnosis
    ├── patients.medications
    ├── patients.ssn
    ├── appointments.clinicalNotes
    └── ... 8 more fields
    
  Finding: 12 PHI fields stored without encryption
  
  Impact:
    ├── HIPAA Security Rule violation
    ├── Risk of PHI exposure in breach
    └── Potential HHS fine: $100-$50,000 per violation
    
  Required Action:
    ├── Step 1: Enable Transparent Data Encryption (TDE)
    ├── Step 2: Add column-level encryption for ssn, diagnosis
    ├── Step 3: Implement key management
    └── Step 4: Document in Security Risk Assessment
    
  Estimated Effort: 3 days
  Owner: Database Administrator
  Deadline: Within 7 days

---

[CRIT-003] No Audit Trail On PHI Access
  Framework: HIPAA 45 CFR § 164.312(b)
  Tables Affected: 8 tables with PHI
  Finding: PHI access is not logged
  
  Impact:
    ├── Cannot detect unauthorized access
    ├── Cannot prove HIPAA compliance
    └── Cannot generate breach impact report
    
  Required Action:
    ├── Step 1: Implement PHI access audit table
    ├── Step 2: Add audit triggers to all PHI tables
    ├── Step 3: Log: who, what, when, where, why, action
    └── Step 4: Set 6-year log retention
    
  Estimated Effort: 5 days
  Owner: Backend Development Team
  Deadline: Within 14 days

---

[CRIT-004] PAN Stored In Plain Text
  Framework: PCI-DSS Requirement 3.4
  Table: payment_methods
  Field: cardNumber
  Finding: 3,421 card numbers stored unencrypted
  
  Required Action:
    ├── Step 1: Implement tokenization (Stripe/Braintree)
    ├── Step 2: Replace stored PANs with tokens
    ├── Step 3: Purge plain text card numbers
    └── Step 4: Verify no PAN in logs
    
  Estimated Effort: 2 weeks
  Owner: Backend + Payment Team
  Deadline: Within 7 days
```

---

### Gap Report Section 2 — HIGH VIOLATIONS

```
HIGH VIOLATIONS (Fix Within 30 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HIGH-001] PII Fields Not In Erasure Flow
  Framework: GDPR Art. 17 — Right to Erasure
  Fields Affected: 15 PII fields across 6 tables
  
  Tables missing from erasure flow:
    ├── newsletter_subscriptions.email
    ├── audit_logs.userEmail (should anonymize)
    ├── chat_logs.userId
    └── ... 12 more fields
    
  Required Action:
    ├── Map all PII field locations
    ├── Add missing tables to erasure cascade
    ├── Implement anonymization for log tables
    └── Test complete erasure flow

---

[HIGH-002] No Lawful Basis Documented
  Framework: GDPR Art. 6
  Fields Affected: 23 PII fields
  Finding: No legal basis recorded for processing
  
  Required Action:
    ├── Document lawful basis per field
    ├── Update privacy policy
    └── Add basis metadata to Intelligence Bank

---

[HIGH-003] Session Timeout Not Configured
  Framework: HIPAA 45 CFR § 164.312(a)(2)(iii)
  Finding: No automatic session timeout on PHI screens
  
  Required Action:
    ├── Implement 15-minute timeout on clinical screens
    ├── Implement 30-minute timeout on admin screens
    └── Clear PHI from screen on timeout

---

[HIGH-004] PAN Displayed Without Masking
  Framework: PCI-DSS Requirement 3.3
  Components Affected: 3 UI components
    ├── PaymentHistory.tsx — shows full card number
    ├── CheckoutConfirm.tsx — shows full card number
    └── AdminPayments.tsx — shows full card number
    
  Required Action:
    ├── Mask all card displays to show last 4 only
    └── Update API responses to return masked PAN
```

---

### Gap Report Section 3 — MEDIUM VIOLATIONS

```
MEDIUM VIOLATIONS (Fix Within 90 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[MED-001] PII In Application Logs
  Framework: GDPR Art. 32
  Finding: Email addresses appear in plain text in logs
  
  Fields exposed in logs:
    ├── email (appears in 3 log categories)
    ├── name (appears in error logs)
    └── userId (appears in debug logs)
    
  Required Action:
    ├── Add log masking middleware
    └── Scrub historical logs

---

[MED-002] Retention Policy Not Configured
  Framework: GDPR Art. 5(1)(e)
  Tables Missing Retention Rules:
    ├── user_sessions — no cleanup job
    ├── temp_uploads — no expiry
    └── notification_logs — kept indefinitely
    
  Required Action:
    ├── Define retention period per table
    └── Implement scheduled cleanup jobs

---

[MED-003] Data Export Incomplete
  Framework: GDPR Art. 20 — Data Portability
  Finding: User data export missing 8 fields
  
  Missing from export:
    ├── purchaseHistory fields
    ├── activityLog fields
    └── preferences fields

---

[MED-004] Missing Business Associate Agreements
  Framework: HIPAA 45 CFR § 164.308(b)
  Third Parties Without BAA:
    ├── Analytics provider (receives user data)
    └── Email service (receives PHI notifications)
    
  Required Action:
    ├── Contact providers for BAA
    ├── Or stop sending PHI to these services
    └── Store signed BAAs in compliance vault
```

---

### Gap Report Section 4 — COMPLIANCE SCORES

```
COMPLIANCE SCORES BY TABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━

Table                  HIPAA   GDPR   PCI    Overall
─────────────────────────────────────────────────────
patients               15/100  42/100  N/A    29/100 ❌
payment_methods        N/A     35/100  8/100  22/100 ❌
appointments           22/100  51/100  N/A    37/100 ❌
users                  N/A     61/100  N/A    61/100 ⚠️
diagnoses              12/100  38/100  N/A    25/100 ❌
orders                 N/A     72/100  45/100 59/100 ⚠️
audit_logs             45/100  31/100  N/A    38/100 ❌

COMPLIANCE SCORES BY FIELD (Bottom 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Field                  Score   Issues
─────────────────────────────────────
payment_methods.cvv    0/100   CRITICAL: must not exist
patients.diagnosis     8/100   4 critical violations
payment_methods.pan    12/100  3 critical violations
patients.ssn           15/100  3 critical violations
diagnoses.icd10Code    18/100  3 high violations
patients.medications   21/100  2 critical, 1 high
appointments.notes     24/100  2 critical, 2 high
patients.dateOfBirth   31/100  1 critical, 3 high
users.email            42/100  2 high, 2 medium
users.phone            48/100  1 high, 3 medium
```

---

### Gap Report Section 5 — REMEDIATION ROADMAP

```
REMEDIATION ROADMAP
━━━━━━━━━━━━━━━━━━━

WEEK 1 (CRITICAL — Do Now):
  Day 1-2:
    ├── Remove CVV field from database
    ├── Purge all stored CVV values
    └── Estimated effort: 4 hours
    
  Day 2-4:
    ├── Begin PAN tokenization implementation
    ├── Enable database encryption (TDE)
    └── Estimated effort: 3 days
    
  Day 4-7:
    ├── Implement PHI audit logging
    └── Estimated effort: 2 days

WEEK 2-4 (HIGH — This Month):
  ├── Implement session timeout (2 days)
  ├── Fix PAN masking in UI (1 day)
  ├── Document lawful basis for all PII (3 days)
  └── Complete erasure flow coverage (5 days)

MONTH 2-3 (MEDIUM — This Quarter):
  ├── Add log masking middleware (2 days)
  ├── Implement retention cleanup jobs (3 days)
  ├── Complete data export feature (3 days)
  └── Obtain Business Associate Agreements (ongoing)

ESTIMATED COMPLIANCE SCORES AFTER REMEDIATION:
  ├── HIPAA:   28/100 → 85/100 ✅
  ├── GDPR:    41/100 → 88/100 ✅
  └── PCI-DSS: 22/100 → 92/100 ✅
  
  Overall: 34/100 → 88/100 ✅
```

---

### Gap Report Section 6 — WHAT GETS STORED IN INTELLIGENCE BANK

```
For each field evaluated, Intelligence Bank stores:

FieldComplianceRecord:
  ├── fieldId (→ UnifiedField)
  ├── frameworksEvaluated [ ]
  │     ├── HIPAA
  │     ├── GDPR
  │     └── PCI-DSS
  │
  ├── rulesEvaluated [ ]
  │     ├── { rule: "G1-LawfulBasis", result: "FAIL", severity: "HIGH" }
  │     ├── { rule: "G3-Retention", result: "PASS", severity: null }
  │     ├── { rule: "G6-Encryption", result: "FAIL", severity: "CRITICAL" }
  │     └── ... all rules evaluated
  │
  ├── complianceScore: 42
  ├── criticalViolations: 1
  ├── highViolations: 2
  ├── mediumViolations: 1
  ├── lowViolations: 0
  │
  ├── requiredActions [ ]
  │     ├── { action: "Encrypt at rest", priority: "CRITICAL", effort: "3 days" }
  │     └── { action: "Add to erasure flow", priority: "HIGH", effort: "1 day" }
  │
  ├── evaluatedAt: timestamp
  ├── evaluatedBy: "phase3_engine_v1"
  └── nextEvaluationAt: timestamp (re-run schedule)
```

---

## The Complete Phase 3 Flow

```
PHASE 3 ENGINE EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━

START
  │
  ▼
Load Phase 2 Config
  ├── Active frameworks: HIPAA, GDPR, PCI-DSS
  ├── Industry: Healthcare
  ├── Geography: USA + EU
  └── Sensitivity policy: CONSERVATIVE
  │
  ▼
Load All Fields From Intelligence Bank (Phase 1 results)
  └── 847 fields across 81 tables
  │
  ▼
For Each Field:
  │
  ├── Is it PII? → Apply all 10 GDPR rules → Score
  ├── Is it PHI? → Apply all 8 HIPAA rules → Score
  ├── Is it PCI? → Apply all 7 PCI rules → Score
  └── Store results back to Intelligence Bank
  │
  ▼
Calculate Scores
  ├── Per field scores
  ├── Per table scores
  ├── Per framework scores
  └── Overall project score
  │
  ▼
Generate Gap Report
  ├── Section 1: Critical violations
  ├── Section 2: High violations
  ├── Section 3: Medium violations
  ├── Section 4: Compliance scores
  ├── Section 5: Remediation roadmap
  └── Section 6: Store in Intelligence Bank
  │
  ▼
Notify Admin
  ├── Dashboard: compliance score updated
  ├── Alert: X critical violations need attention
  └── Report: available for download
  │
  ▼
Schedule Re-evaluation
  └── Re-run Phase 3 when:
        ├── New field added to schema
        ├── Framework configuration changed
        ├── Field classification changed
        ├── Admin marks violation as resolved
        └── Scheduled weekly re-scan
  │
  ▼
END
```

> **The key insight of Phase 3 is this:** It transforms the Intelligence Bank from a knowledge store into a **compliance engine**. Every field now has not just what it is — but what rules apply to it, whether it meets those rules, what needs to be fixed, how long it will take, and who should fix it. The gap report gives humans a **precise, prioritized action plan** rather than a vague warning that "compliance needs work."


# Phase 3 — Rule Application Engine

## Architecture Overview

```
PHASE 3 RULE APPLICATION ENGINE
│
├── RULE EXECUTION PIPELINE
│   ├── Rule Loader (reads Phase 2 config)
│   ├── Entity Scanner (scans all tables/columns)
│   ├── Pattern Matcher (name + value detection)
│   ├── Context Analyzer (table relationships)
│   ├── Compliance Evaluator (per framework)
│   └── Gap Detector (identifies violations)
│
├── RULE EXECUTORS
│   ├── GDPR Rule Executor
│   ├── HIPAA Rule Executor
│   ├── PCI-DSS Rule Executor
│   ├── SOX Rule Executor
│   └── Custom Framework Executor
│
├── SCORING ENGINE
│   ├── Per-Framework Scores
│   ├── Per-Entity Scores
│   ├── Aggregate Scores
│   └── Trend Analysis
│
└── REPORT GENERATOR
    ├── Executive Summary
    ├── Gap Report (detailed violations)
    ├── Remediation Plan
    └── Compliance Certificate Draft
```

---

# SECTION 1: Rule Execution Pipeline

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ RULE APPLICATION PIPELINE                                        │
└─────────────────────────────────────────────────────────────────┘

STEP 1: RULE LOADER
┌─────────────────┐
│ Phase 2 Config  │
│                 │
│ • Active GDPR   │────→ Load GDPR Rule Set
│ • Active HIPAA  │────→ Load HIPAA Rule Set
│ • Active PCI    │────→ Load PCI Rule Set
│ • Industry      │────→ Load Industry Rule Overrides
│ • Jurisdiction  │────→ Load Geographic Rules
│ • Sensitivity   │────→ Load Control Requirements
└────────┬────────┘
         │
         ▼
STEP 2: ENTITY SCANNER
┌─────────────────────────────────────────────────────────────────┐
│ Scan All Database Objects                                        │
│                                                                 │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│ │   Tables    │  │   Columns   │  │ Constraints │              │
│ │   (150)     │  │   (1,200)   │  │   (800)     │              │
│ └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│ │   Indexes   │  │  Foreign    │  │   Triggers  │              │
│ │   (400)     │  │   Keys (250)│  │   (100)     │              │
│ └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│ OUTPUT: Canonical Entity List                                    │
│ [Entity ID] [Table] [Column] [Type] [Constraints] [Context]     │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
STEP 3: CLASSIFICATION MATCHER
┌─────────────────────────────────────────────────────────────────┐
│ Match Entities Against Rule Patterns                             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ PII DETECTION                                            │      │
│ │ • Column Name: email, phone, ssn, first_name...         │      │
│ │ • Value Pattern: ssn_xxx_xx_xxxx, email@domain.com      │      │
│ │ • Context Clues: *_name, user_*, customer_*             │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ PHI DETECTION                                            │      │
│ │ • Column Name: mrn, patient_*, diagnosis, prescription  │      │
│ │ • Medical Codes: ICD-10, CPT, NDC, LOINC patterns       │      │
│ │ • Table Context: patient_*, medical_*, clinical_*       │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ PCI DETECTION                                            │      │
│ │ • Column Name: card_*, pan, credit_card, cvv            │      │
│ │ • Value Pattern: Luhn-valid 13-19 digit PAN            │      │
│ │ • SAD Violations: cvv, pin, track_data                  │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ OUTPUT: Classification Tags per Entity                            │
│ [Entity] [PII: High] [PHI: None] [PCI: Cardholder] [Confidence] │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
STEP 4: CONTEXT ANALYZER
┌─────────────────────────────────────────────────────────────────┐
│ Analyze Table/Column Relationships                               │
│                                                                 │
│ CLUSTER DETECTION                                               │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ Table: patients                                          │      │
│ │ Columns: [mrn, name, dob, address, insurance_id]       │      │
│ │ → Cluster: "Patient Identity Record"                   │      │
│ │ → PHI Risk: HIGH (all fields are quasi-identifiers)    │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ RELATIONSHIP MAPPING                                            │
│ patients.mrn ──FK──► insurance.member_id                       │
│ orders.user_id ──FK──► users.id                                │
│                                                                 │
│ → PHI propagates through FK relationships                       │
│ → If insurance_id is PHI, any table referencing it inherits     │
│                                                                 │
│ OUTPUT: Enhanced Entity Context                                  │
│ [Entity] [Primary Class] [Cluster] [Related PHI] [Propagation] │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
STEP 5: COMPLIANCE EVALUATOR
┌─────────────────────────────────────────────────────────────────┐
│ Apply Framework-Specific Rules                                   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ GDPR EVALUATION                                          │      │
│ │ FOR EACH PII Entity:                                    │      │
│ │   • Consent Mechanism?         → CHECK                  │      │
│ │   • Purpose Specification?     → CHECK                  │      │
│ │   • Retention Policy?          → CHECK                  │      │
│ │   • Right to Erasure Support?  → CHECK                  │      │
│ │   • Right to Portability?      → CHECK                  │      │
│ │   • Breach Notification Config? → CHECK                 │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ HIPAA EVALUATION                                         │      │
│ │ FOR EACH PHI Entity:                                    │      │
│ │   • Encryption at Rest?         → CHECK                  │      │
│ │   • Encryption in Transit?     → CHECK                  │      │
│ │   • Access Control (RBAC)?      → CHECK                  │      │
│ │   • Audit Trail Enabled?        → CHECK                  │      │
│ │   • Minimum Necessary Applied?  → CHECK                  │      │
│ │   • BAA in Place?               → CHECK                  │      │
│ │   • PHI Disclosure Controls?    → CHECK                  │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐      │
│ │ PCI-DSS EVALUATION                                       │      │
│ │ FOR EACH PCI Entity:                                    │      │
│ │   • SAD Present?                 → VIOLATION              │      │
│ │   • PAN Encrypted?               → CHECK                  │      │
│ │   • PAN Masked in Logs?          → CHECK                  │      │
│ │   • CVV Stored?                  → VIOLATION              │      │
│ │   • Access Logged?               → CHECK                  │      │
│ │   • Tokenization Available?      → CHECK                  │      │
│ └─────────────────────────────────────────────────────────┘      │
│                                                                 │
│ OUTPUT: Compliance Status per Entity per Framework              │
│ [Entity] [GDPR: PASS/FAIL/WARNING] [HIPAA: PASS/FAIL/WARNING]   │
│         [PCI: PASS/FAIL/WARNING] [Overall: XX%]                 │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
STEP 6: GAP DETECTOR
┌─────────────────────────────────────────────────────────────────┐
│ Identify Compliance Gaps                                        │
│                                                                 │
│ GAP TYPES                                                       │
│ • Missing Controls (encryption not enabled)                    │
│ • Missing Documentation (no BAA on file)                       │
│ • Missing Processes (no consent mechanism)                      │
│ • Missing Monitoring (no audit trail)                            │
│ • Structural Issues (SAD data present)                           │
│ • Configuration Drift (expected vs actual)                      │
│                                                                 │
│ GAP PRIORITIZATION                                              │
│ Severity × Impact × Exploitability = Risk Score                 │
│                                                                 │
│ OUTPUT: Gap Registry                                             │
│ [Gap ID] [Severity] [Entity] [Rule] [Status] [Owner]           │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
STEP 7: REPORT GENERATOR
┌─────────────────────────────────────────────────────────────────┐
│ Generate Compliance Documentation                               │
│                                                                 │
│ REPORTS                                                          │
│ • Executive Summary (1-page)                                   │
│ • Detailed Gap Report (full inventory)                          │
│ • Remediation Plan (prioritized actions)                        │
│ • Compliance Scorecard (by framework)                           │
│ • Certificate Draft (for auditors)                              │
│                                                                 │
│ OUTPUT: Compliance Report Package                               │
│ [PDF] [JSON] [CSV] [API Response]                               │
└─────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: GDPR Rule Application

## GDPR Rule Set

```
GDPR COMPLIANCE RULES

┌─────────────────────────────────────────────────────────────────┐
│ GDPR Article 5: Principles                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: gdpr_lawfulness_basis                                      │
│ ├─ Condition: Field contains personal data (PII detected)       │
│ ├─ Check: legal_basis documented?                               │
│ ├─ Valid Values: consent | contract | legal_obligation |       │
│ │               vital_interests | public_task | legitimate      │
│ ├─ Severity: CRITICAL if missing                               │
│ └─ Remediation: Assign legal_basis to field                    │
│                                                                 │
│ RULE: gdpr_purpose_specification                                 │
│ ├─ Condition: Personal data field exists                       │
│ ├─ Check: purpose_of_processing documented?                    │
│ ├─ Valid Purposes: service_delivery | marketing | analytics |  │
│ │                 legal_compliance | fraud_prevention |         │
│ │                 legitimate_business                          │
│ ├─ Severity: HIGH if missing                                   │
│ └─ Remediation: Assign processing purpose to field             │
│                                                                 │
│ RULE: gdpr_data_minimization                                     │
│ ├─ Condition: Any personal data field exists                   │
│ ├─ Check: Is field necessary for stated purpose?               │
│ ├─ Heuristic: Check if field is queried in <5% of operations   │
│ ├─ Severity: MEDIUM if potentially unnecessary                │
│ └─ Remediation: Justify necessity or flag for removal          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR Article 6: Consent                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: gdpr_consent_required                                      │
│ ├─ Condition: legal_basis = 'consent'                          │
│ ├─ Check: consent_mechanism_exists?                            │
│ ├─ Valid Mechanisms: explicit_checkbox | embedded_consent |   │
│ │                   signature | documented_verbal              │
│ ├─ Severity: CRITICAL if consent field without mechanism      │
│ └─ Remediation: Implement consent collection flow             │
│                                                                 │
│ RULE: gdpr_consent_withdrawal                                    │
│ ├─ Condition: Consent-based processing exists                  │
│ ├─ Check: withdrawal_mechanism_exists?                         │
│ ├─ Requirement: As easy to withdraw as to give                │
│ ├─ Severity: HIGH if missing                                  │
│ └─ Remediation: Add consent withdrawal UI/API                  │
│                                                                 │
│ RULE: gdpr_consent_expiry                                        │
│ ├─ Condition: Consent-based processing exists                  │
│ ├─ Check: consent_expiry_policy configured?                    │
│ ├─ Default: 12 months, then re-collect                        │
│ ├─ Severity: MEDIUM if no expiry configured                   │
│ └─ Remediation: Set consent refresh policy                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR Article 17: Right to Erasure ("Right to be Forgotten")     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: gdpr_erasure_support                                      │
│ ├─ Condition: Personal data field exists                      │
│ ├─ Check: erasure_cascade_configured?                           │
│ ├─ Requirement: Deletion of field must cascade to:            │
│ │               • UI components using field                     │
│ │               • API responses containing field              │
│ │               • Search indexes                               │
│ │               • Backup systems (if recoverable)              │
│ │               • Third-party integrations                     │
│ ├─ Severity: HIGH if cascade incomplete                       │
│ └─ Remediation: Configure erasure cascade paths                │
│                                                                 │
│ RULE: gdpr_erasure_hard_delete                                  │
│ ├─ Condition: Erasure request for field                       │
│ ├─ Check: Physical deletion vs soft-delete?                   │
│ ├─ Requirement: Physical deletion within 30 days              │
│ ├─ Exceptions: Legal hold, regulatory retention               │
│ ├─ Severity: CRITICAL if hard delete not supported           │
│ └─ Remediation: Implement hard-delete capability              │
│                                                                 │
│ RULE: gdpr_anonymization_option                                  │
│ ├─ Condition: Legal retention required but no active use      │
│ ├─ Check: anonymization_available?                             │
│ ├─ Option: Replace with anonymized placeholder                │
│ ├─ Benefit: No longer subject to GDPR                        │
│ ├─ Severity: LOW (optional optimization)                       │
│ └─ Remediation: Offer anonymization for retention compliance  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR Article 20: Right to Data Portability                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: gdpr_portability_support                                  │
│ ├─ Condition: Personal data field exists (consent/contract)    │
│ ├─ Check: export_format_available?                              │
│ ├─ Required Formats: JSON | CSV | XML | Machine-readable     │
│ ├─ Scope: User's own data only                                │
│ ├─ Severity: HIGH if not available for consent-based data    │
│ └─ Remediation: Implement data export endpoint                │
│                                                                 │
│ RULE: gdpr_portability_direct_transfer                          │
│ ├─ Condition: User requests port to another provider          │
│ ├─ Check: direct_transfer_api_available?                       │
│ ├─ Requirement: Machine-readable format to user-specified    │
│ │               recipient                                      │
│ ├─ Severity: MEDIUM (nice-to-have, not mandatory)            │
│ └─ Remediation: Implement API-to-API transfer capability     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR Article 32: Security of Processing                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: gdpr_encryption_restricted                                │
│ ├─ Condition: Sensitivity Level ≥ 3                            │
│ ├─ Check: encryption_at_rest_enabled?                          │
│ ├─ Required: AES-256 or equivalent                             │
│ ├─ Severity: CRITICAL if not encrypted                         │
│ └─ Remediation: Enable encryption for field                    │
│                                                                 │
│ RULE: gdpr_encryption_transit                                   │
│ ├─ Condition: Any personal data transmitted                   │
│ ├─ Check: encryption_in_transit_enabled?                        │
│ ├─ Required: TLS 1.2+ minimum                                 │
│ ├─ Severity: CRITICAL if plaintext transmission               │
│ └─ Remediation: Enforce TLS, disable HTTP fallback            │
│                                                                 │
│ RULE: gdpr_access_control                                       │
│ ├─ Condition: Personal data field exists                      │
│ ├─ Check: role_based_access_configured?                        │
│ ├─ Requirement: Only authorized roles can access              │
│ ├─ Severity: HIGH if public/unrestricted access               │
│ └─ Remediation: Configure RBAC for field                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR Article 33/34: Breach Notification                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: gdpr_breach_notification                                   │
│ ├─ Condition: Personal data field exists                       │
│ ├─ Check: breach_notification_configured?                       │
│ ├─ Requirement: 72-hour notification to authority           │
│ │               72-hour notification to affected individuals  │
│ ├─ Severity: HIGH if process not documented                   │
│ └─ Remediation: Configure breach response plan                 │
│                                                                 │
│ RULE: gdpr_breach_detection                                     │
│ ├─ Condition: Any personal data system                        │
│ ├─ Check: intrusion_detection_configured?                       │
│ ├─ Requirement: Alerts on unauthorized access attempts        │
│ ├─ Severity: HIGH if monitoring not in place                  │
│ └─ Remediation: Enable SIEM/integrity monitoring             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## GDPR Rule Evaluation Output

```
GDPR RULE EVALUATION RESULT

Entity: customers.email
Classification: PII (email) | Sensitivity: 3 (Restricted)

┌─────────────────────────────────────────────────────────────────┐
│ GDPR ARTICLE 5: PRINCIPLES                                       │
├─────────────────────────────────────────────────────────────────┤
│ Lawfulness Basis           │ ✅ PASS                           │
│   └─ legal_basis           │ consent                          │
│   └─ documented_at         │ 2024-01-15                       │
│                                                                 │
│ Purpose Specification       │ ✅ PASS                           │
│   └─ purpose               │ service_delivery                 │
│   └─ documented_at         │ 2024-01-15                       │
│                                                                 │
│ Data Minimization          │ ⚠️ WARNING                         │
│   └─ query_frequency       │ 2% of operations                 │
│   └─ recommendation        │ Review if field is necessary   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR ARTICLE 6: CONSENT                                          │
├─────────────────────────────────────────────────────────────────┤
│ Consent Mechanism             │ ✅ PASS                           │
│   └─ mechanism               │ explicit_checkbox                │
│   └─ collected_at            │ signup_timestamp                 │
│                                                                 │
│ Consent Withdrawal           │ ✅ PASS                           │
│   └─ withdrawal_endpoint     │ DELETE /api/users/{id}/consent   │
│                                                                 │
│ Consent Expiry               │ ❌ FAIL                           │
│   └─ expiry_policy           │ NOT CONFIGURED                   │
│   └─ remediation             │ Set 12-month consent refresh    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR ARTICLE 17: ERASURE                                         │
├─────────────────────────────────────────────────────────────────┤
│ Erasure Cascade                │ ❌ FAIL                           │
│   └─ ui_cascade               │ ❌ Not configured                │
│   └─ api_cascade              │ ✅ Configured                    │
│   └─ search_index_cascade     │ ❌ Not configured                │
│   └─ backup_cascade           │ ⚠️ Partial (30-day delay)        │
│                                                                 │
│   Remediation Actions:                                       │
│   1. Add email field removal from search indexes              │
│   2. Configure immediate backup purge                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR ARTICLE 20: PORTABILITY                                     │
├─────────────────────────────────────────────────────────────────┤
│ Export Available              │ ✅ PASS                           │
│   └─ formats                  │ [json, csv]                      │
│   └─ endpoint                 │ GET /api/users/{id}/export      │
│                                                                 │
│ Direct Transfer              │ ⚠️ NOT IMPLEMENTED                │
│   └─ recommendation          │ Implement controller-to-ctrl   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GDPR ARTICLE 32: SECURITY                                        │
├─────────────────────────────────────────────────────────────────┤
│ Encryption at Rest            │ ✅ PASS                           │
│   └─ method                  │ AES-256                          │
│   └─ key_management          │ AWS KMS                          │
│                                                                 │
│ Encryption in Transit        │ ✅ PASS                           │
│   └─ protocol                │ TLS 1.3                          │
│                                                                 │
│ Access Control               │ ✅ PASS                           │
│   └─ allowed_roles           │ [admin, support_agent]          │
│   └─ mfa_required            │ true                             │
└─────────────────────────────────────────────────────────────────┘

OVERALL GDPR STATUS: 85% COMPLIANT
├── PASSED: 9 rules
├── WARNINGS: 2 rules
└── FAILED: 2 rules
```

---

# SECTION 3: HIPAA Rule Application

## HIPAA Rule Set

```
HIPAA COMPLIANCE RULES

┌─────────────────────────────────────────────────────────────────┐
│ HIPAA §164.312: Technical Safeguards                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: hipaa_encryption_at_rest                                 │
│ ├─ Condition: PHI field detected                               │
│ ├─ Check: encryption_at_rest_enabled?                          │
│ ├─ Required: AES-256 or equivalent                             │
│ ├─ Standard: NIST FIPS 140-2 compliant                        │
│ ├─ Severity: CRITICAL - PHI cannot be stored unencrypted      │
│ └─ Remediation: Enable database-level encryption              │
│                                                                 │
│ RULE: hipaa_encryption_in_transit                              │
│ ├─ Condition: PHI field transmitted (API/UI)                 │
│ ├─ Check: encryption_in_transit_enabled?                       │
│ ├─ Required: TLS 1.2+ minimum                                 │
│ ├─ Required: Certificate pinning for mobile                   │
│ ├─ Severity: CRITICAL - PHI cannot be transmitted plaintext   │
│ └─ Remediation: Enforce HTTPS, disable TLS 1.0/1.1           │
│                                                                 │
│ RULE: hipaa_access_control                                      │
│ ├─ Condition: PHI field exists                                │
│ ├─ Check: unique_user_id_required?                             │
│ ├─ Check: role_based_access_enforced?                          │
│ ├─ Check: automatic_logoff_configured?                         │
│ ├─ Check: emergency_access_procedure?                          │
│ ├─ Severity: CRITICAL if any control missing                  │
│ └─ Remediation: Implement full access control suite           │
│                                                                 │
│ RULE: hipaa_audit_controls                                      │
│ ├─ Condition: PHI field exists                                 │
│ ├─ Check: access_log_enabled?                                  │
│ ├─ Required Log Fields:                                        │
│ │   • Who accessed (user_id)                                   │
│ │   • What was accessed (entity_id)                            │
│ │   • When accessed (timestamp)                                │
│ │   • Action taken (read/write/delete)                        │
│ │   • Source (IP, device, application)                        │
│ ├─ Retention: 6 years minimum                                 │
│ ├─ Immutability: Logs must be tamper-evident                  │
│ ├─ Severity: CRITICAL - audit trail required                  │
│ └─ Remediation: Configure comprehensive audit logging         │
│                                                                 │
│ RULE: hipaa_integrity_controls                                 │
│ ├─ Condition: PHI field exists                                │
│ ├─ Check: tamper_detection_enabled?                            │
│ ├─ Check: digital_signatures_configured?                       │
│ ├─ Required for: ePHI in transmission                         │
│ ├─ Severity: HIGH if missing                                 │
│ └─ Remediation: Implement message authentication              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HIPAA §164.308: Administrative Safeguards                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: hipaa_security_official                                  │
│ ├─ Condition: Any PHI processing                               │
│ ├─ Check: security_official_designated?                        │
│ ├─ Requirement: Named individual with authority               │
│ ├─ Severity: HIGH if missing                                 │
│ └─ Remediation: Designate Security Official                   │
│                                                                 │
│ RULE: hipaa_risk_analysis                                      │
│ ├─ Condition: Any PHI processing                               │
│ ├─ Check: risk_analysis_documented?                            │
│ ├─ Frequency: Annual minimum                                  │
│ ├─ Scope: Technical, Physical, Administrative                │
│ ├─ Severity: CRITICAL - Required for compliance              │
│ └─ Remediation: Conduct comprehensive risk analysis          │
│                                                                 │
│ RULE: hipaa_workforce_training                                 │
│ ├─ Condition: Any PHI processing                             │
│ ├─ Check: training_records_on_file?                           │
│ ├─ Requirement: All workforce members trained                │
│ ├─ Minimum Training: Security awareness + HIPAA specifics    │
│ ├─ Severity: HIGH if <100% trained                           │
│ └─ Remediation: Complete workforce training                  │
│                                                                 │
│ RULE: hipaa_baa_management                                     │
│ ├─ Condition: PHI shared with vendors/third parties          │
│ ├─ Check: signed_baa_on_file?                                  │
│ ├─ Check: baa_scope_matches_data_shared?                       │
│ ├─ Check: baa_expiration_tracked?                             │
│ ├─ Severity: CRITICAL - Business Associates need BAA        │
│ └─ Remediation: Execute BAA with all PHI-handling vendors   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HIPAA §164.310: Physical Safeguards                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: hipaa_workstation_security                               │
│ ├─ Condition: PHI access from workstations                    │
│ ├─ Check: workstation_security_policy?                        │
│ ├─ Requirement: Automatic logoff, screen lock                │
│ ├─ Severity: MEDIUM                                          │
│ └─ Remediation: Implement workstation security controls      │
│                                                                 │
│ RULE: hipaa_device_controls                                    │
│ ├─ Condition: PHI accessed on mobile devices                  │
│ ├─ Check: mobile_device_management?                            │
│ ├─ Required: Remote wipe capability                           │
│ ├─ Required: Encryption on device                             │
│ ├─ Severity: HIGH                                            │
│ └─ Remediation: Implement MDM for mobile access             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HIPAA §164.502: Uses and Disclosures                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: hipaa_minimum_necessary                                  │
│ ├─ Condition: PHI field used in API/UI                        │
│ ├─ Check: only_minimum_phi_exposed?                            │
│ ├─ Requirement: Do not use more PHI than necessary            │
│ ├─ Example: API returns full SSN when only last 4 needed     │
│ ├─ Severity: HIGH if over-disclosure detected                │
│ └─ Remediation: Audit API responses for minimum necessary   │
│                                                                 │
│ RULE: hipaa_consent_chain                                       │
│ ├─ Condition: Treatment/Payment/Operations (TPO)            │
│ ├─ Check: notice_of_privacy_practices?                        │
│ ├─ Required for: Healthcare providers                        │
│ ├─ Severity: HIGH if notice not displayed                   │
│ └─ Remediation: Display Notice of Privacy Practices         │
│                                                                 │
│ RULE: hipaa_authorization_required                             │
│ ├─ Condition: PHI beyond TPO                                 │
│ ├─ Check: valid_authorization_on_file?                        │
│ ├─ Required for: Marketing, Research, Sale of PHI           │
│ ├─ Must Include: Description, Expiration, Recipient          │
│ ├─ Severity: CRITICAL if unauthorized disclosure            │
│ └─ Remediation: Implement authorization workflow             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HIPAA §164.400+: Breach Notification Rules                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: hipaa_breach_notification_72h                            │
│ ├─ Condition: PHI field exists                                │
│ ├─ Check: breach_response_plan_documented?                    │
│ ├─ Requirement: 60-day notification to HHS (updated 2024)    │
│ ├─ Requirement: Individual notification if >500 affected    │
│ ├─ Severity: CRITICAL - Failure to notify is独立的 violation │
│ └─ Remediation: Document breach notification procedures       │
│                                                                 │
│ RULE: hipaa_breach_risk_assessment                             │
│ ├─ Condition: Suspected breach                               │
│ ├─ Check: risk_assessment_performed?                          │
│ ├─ Required: Assess probability of compromise                │
│ ├─ Factors: Encryption status, Nature of PHI, Unauthorized   │
│ │           recipient, Extent of compromise                  │
│ ├─ Severity: HIGH                                            │
│ └─ Remediation: Document breach risk assessment process      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## HIPAA Rule Evaluation Output

```
HIPAA RULE EVALUATION RESULT

Entity: medical_records.diagnosis_code
Classification: PHI (diagnosis) | Sensitivity: 4 (Critical)

┌─────────────────────────────────────────────────────────────────┐
│ §164.312: TECHNICAL SAFEGUARDS                                    │
├─────────────────────────────────────────────────────────────────┤
│ Encryption at Rest            │ ✅ PASS                           │
│   └─ method                  │ AES-256-NIST                     │
│   └─ verification            │ DBE enabled on table             │
│                                                                 │
│ Encryption in Transit        │ ✅ PASS                           │
│   └─ protocol                │ TLS 1.3 + HSTS                   │
│                                                                 │
│ Access Control               │ ✅ PASS                           │
│   └─ unique_user_id         │ Enabled                          │
│   └─ role_based             │ [physician, nurse, billing]      │
│   └─ mfa_required           │ true (for physician, nurse)       │
│   └─ auto_logoff            │ 15 minutes                       │
│   └─ emergency_access       │ Break-glass procedure exists     │
│                                                                 │
│ Audit Controls              │ ✅ PASS                           │
│   └─ access_logging         │ Enabled                          │
│   └─ log_immutability       │ Hash chain verified              │
│   └─ retention              │ 6 years (config verified)        │
│   └─ fields_logged          │ [who, what, when, action, source] │
│                                                                 │
│ Integrity Controls          │ ✅ PASS                           │
│   └─ tamper_detection       │ Digital signatures on records   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ §164.308: ADMINISTRATIVE SAFEGUARDS                              │
├─────────────────────────────────────────────────────────────────┤
│ Security Official            │ ✅ PASS                           │
│   └─ designated             │ Jane Smith, CISSP                  │
│   └─ contact                │ security@hospital.com           │
│                                                                 │
│ Risk Analysis                │ ❌ FAIL                           │
│   └─ last_analysis          │ 2023-01-15 (OVERDUE)             │
│   └─ next_due               │ 2024-01-15                       │
│   └─ remediation            │ Conduct annual risk analysis    │
│                                                                 │
│ Workforce Training           │ ⚠️ 95% COMPLETE                   │
│   └─ trained                │ 190 of 200 workforce members   │
│   └─ missing                │ 10 new hires not yet trained    │
│   └─ remediation            │ Complete training for remaining  │
│                                                                 │
│ BAA Management              │ ⚠️ WARNING                         │
│   └─ total_baas             │ 12                               │
│   └─ active_phis_vendors    │ 15                               │
│   └─ missing_baas           │ 3 vendors                        │
│   └─ missing_vendors        │ [CloudBackup Inc, Analytics.ai,  │
│                             │   MarketingPlatform.io]         │
│   └─ remediation            │ Execute BAAs with 3 vendors     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ §164.310: PHYSICAL SAFEGUARDS                                    │
├─────────────────────────────────────────────────────────────────┤
│ Workstation Security          │ ✅ PASS                           │
│   └─ auto_logoff             │ Configured                       │
│   └─ screen_lock             │ GPO enforced                     │
│                                                                 │
│ Device Controls              │ ✅ PASS                           │
│   └─ mdm_solution            │ Intune enrolled                  │
│   └─ remote_wipe             │ Enabled                          │
│   └─ device_encryption       │ Required                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ §164.502: USES AND DISCLOSURES                                   │
├─────────────────────────────────────────────────────────────────┤
│ Minimum Necessary            │ ⚠️ WARNING                         │
│   └─ api_response_audit      │ diagnosis_code returned in 8 APIs│
│   └─ necessary_apis          │ [getPatient, getRecord, audit]   │
│   └─ unnecessary_apis        │ [getBillingSummary]             │
│   └─ remediation            │ Review if billing API needs    │
│                               │ diagnosis codes or just ICD10  │
│                               │ billing codes                  │
│                                                                 │
│ Notice of Privacy Practices   │ ✅ PASS                           │
│   └─ displayed_at            │ Patient portal + registration  │
│   └─ version                 │ 2.0 (updated 2024-01-01)       │
│   └─ last_acknowledged       │ All active patients             │
│                                                                 │
│ Authorization Required        │ N/A                             │
│   └─ note                    │ TPO exception applies         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ §164.400+: BREACH NOTIFICATION                                    │
├─────────────────────────────────────────────────────────────────┤
│ Breach Response Plan           │ ✅ PASS                           │
│   └─ documented              │ Yes                              │
│   └─ last_tested             │ 2024-01-10                       │
│   └─ contact_info            │ breach@hospital.com             │
│                                                                 │
│ Breach Risk Assessment        │ ✅ PASS                           │
│   └─ methodology             │ NIST 800-66 compliant           │
└─────────────────────────────────────────────────────────────────┘

OVERALL HIPAA STATUS: 92% COMPLIANT
├── PASSED: 14 rules
├── WARNINGS: 3 rules (1 overdue, 1 BAA, 1 minimum necessary)
└── FAILED: 1 rule (risk analysis overdue)
```

---

# SECTION 4: PCI-DSS Rule Application

## PCI-DSS Rule Set

```
PCI-DSS v4.0 COMPLIANCE RULES

┌─────────────────────────────────────────────────────────────────┐
│ PCI-DSS Requirement 3: Protect Stored Cardholder Data           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: pci_sad_never_store                                      │
│ ├─ Condition: Column name matches SAD pattern                  │
│ ├─ SAD Fields:                                                 │
│ │   • CVV/CVC/CVV2 (3 digits)                                 │
│ │   • PIN/PIN Block                                            │
│ │   • Full Track Data (magnetic stripe)                       │
│ │   • EMV Tags (chip data)                                    │
│ ├─ Severity: CRITICAL - Immediate violation                  │
│ ├─ Required Action: DELETE data + Root cause analysis         │
│ └─ Remediation: Immediate deletion + forensic investigation  │
│                                                                 │
│ RULE: pci_pan_encryption_required                              │
│ ├─ Condition: PAN detected                                    │
│ ├─ Check: encryption_at_rest_enabled?                         │
│ ├─ Required: Strong cryptography (AES-256 equivalent)        │
│ ├─ Key Management: Keys must be separate from encrypted data  │
│ ├─ Severity: CRITICAL if plaintext PAN found                 │
│ └─ Remediation: Enable encryption + re-encrypt existing data │
│                                                                 │
│ RULE: pci_pan_key_management                                   │
│ ├─ Condition: PAN stored                                      │
│ ├─ Check: key_rotation_policy?                                │
│ ├─ Required: Key rotation every 90 days (v4.0)               │
│ ├─ Check: kms_in_use?                                          │
│ ├─ Required: Dedicated Key Management System                  │
│ ├─ Severity: CRITICAL if manual key management               │
│ └─ Remediation: Implement automated KMS                       │
│                                                                 │
│ RULE: pci_pan_masking_display                                  │
│ ├─ Condition: PAN in UI/API response                          │
│ ├─ Check: full_pan_displayed?                                  │
│ ├─ Allowed Display: First 6 + Last 4 (BIN + last 4)         │
│ ├─ Required Display: **** **** **** 1234 format             │
│ ├─ Severity: HIGH if full PAN exposed                        │
│ └─ Remediation: Implement masking in UI + API                 │
│                                                                 │
│ RULE: pci_pan_masking_logs                                     │
│ ├─ Condition: Logging contains payment data                  │
│ ├─ Check: pan_in_log_files?                                   │
│ ├─ Requirement: Never log full PAN, mask in logs            │
│ ├─ Allowed: SHA-256 hash for debugging (with key)           │
│ ├─ Severity: CRITICAL if full PAN in logs                    │
│ └─ Remediation: Implement log masking + purge existing logs  │
│                                                                 │
│ RULE: pci_pan_database_protection                              │
│ ├─ Condition: PAN stored in database                          │
│ ├─ Check: database_encryption_enabled?                        │
│ ├─ Check: column_level_encryption?                            │
│ ├─ Check: truncation_verified?                                 │
│ ├─ Truncation: Keep first 6 + last 4 only                    │
│ ├─ Severity: HIGH if DBE not enabled                         │
│ └─ Remediation: Enable DBE + column encryption                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PCI-DSS Requirement 8: Identify and Authenticate Access        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: pci_access_control                                        │
│ ├─ Condition: Payment system access                            │
│ ├─ Check: unique_user_ids?                                     │
│ ├─ Requirement: Each user has unique ID                       │
│ ├─ Severity: CRITICAL if shared accounts                     │
│ └─ Remediation: Implement unique authentication               │
│                                                                 │
│ RULE: pci_mfa_payment_system                                   │
│ ├─ Condition: Access to payment cardholder data               │
│ ├─ Check: mfa_enabled_for_admins?                             │
│ ├─ Required: MFA for all access to payment system            │
│ ├─ Severity: CRITICAL if MFA not enforced                    │
│ └─ Remediation: Enable MFA for all payment access             │
│                                                                 │
│ RULE: pci_user_authentication_payment                           │
│ ├─ Condition: Payment API access                              │
│ ├─ Check: authentication_required?                            │
│ ├─ Required: Authentication for all non-public endpoints     │
│ ├─ Severity: HIGH if unauthenticated access allowed          │
│ └─ Remediation: Implement API authentication                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PCI-DSS Requirement 10: Log and Monitor All Access              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: pci_audit_logging_payment                                 │
│ ├─ Condition: Payment data stored/processed                   │
│ ├─ Check: access_logging_enabled?                              │
│ ├─ Required Logs:                                              │
│ │   • All individual access to cardholder data               │
│ │   • All privileged commands (root, admin)                  │
│ │   • All authentication attempts                             │
│ │   • Initialization of audit logs                           │
│ │   • Creation/deletion of system components                  │
│ ├─ Retention: 90 days minimum (online), 1 year (archive)    │
│ ├─ Severity: CRITICAL if no logging                          │
│ └─ Remediation: Implement comprehensive audit logging         │
│                                                                 │
│ RULE: pci_audit_log_protection                                  │
│ ├─ Condition: Audit logs exist                               │
│ ├─ Check: logs_immutable?                                      │
│ ├─ Required: Prevent modification of audit logs              │
│ ├─ Required: File integrity monitoring                       │
│ ├─ Severity: CRITICAL if logs can be tampered                │
│ └─ Remediation: Implement WORM storage for logs               │
│                                                                 │
│ RULE: pci_audit_review_frequency                               │
│ ├─ Condition: Audit logs exist                               │
│ ├─ Check: automated_review_enabled?                           │
│ ├─ Required: Daily log review OR automated alerting          │
│ ├─ Severity: HIGH if manual review not documented            │
│ └─ Remediation: Implement automated log analysis             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PCI-DSS Requirement 11: Regularly Test Security Systems        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: pci_vulnerability_scan                                   │
│ ├─ Condition: Payment system in scope                         │
│ ├─ Check: quarterly_vulnerability_scan?                        │
│ ├─ Required: Approved ASV scan quarterly (external)         │
│ ├─ Required: Internal scans after significant change        │
│ ├─ Severity: HIGH if scans overdue                          │
│ └─ Remediation: Schedule quarterly scans                      │
│                                                                 │
│ RULE: pci_penetration_test                                      │
│ ├─ Condition: Payment system in scope                         │
│ ├─ Check: annual_penetration_test?                           │
│ ├─ Required: Annual pen test by qualified tester             │
│ ├─ Required: After significant infrastructure changes       │
│ ├─ Severity: HIGH if overdue                                │
│ └─ Remediation: Schedule annual pen test                      │
│                                                                 │
│ RULE: pci_file_integrity_monitoring                            │
│ ├─ Condition: Payment system in scope                         │
│ ├─ Check: fim_enabled?                                        │
│ ├─ Required: Monitor critical files for changes             │
│ ├─ Critical Files: CDE system files, configs, executables   │
│ ├─ Severity: HIGH if not enabled                             │
│ └─ Remediation: Implement file integrity monitoring           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PCI-DSS Requirement 12: Support Information Security           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RULE: pci_security_policy                                       │
│ ├─ Condition: Any payment processing                          │
│ ├─ Check: security_policy_documented?                         │
│ ├─ Required: Information security policy published           │
│ ├─ Required: Annual policy review                             │
│ ├─ Severity: HIGH if policy missing                         │
│ └─ Remediation: Document security policy                      │
│                                                                 │
│ RULE: pci_incident_response_plan                               │
│ ├─ Condition: Any payment processing                          │
│ ├─ Check: incident_response_plan_documented?                  │
│ ├─ Required: Documented plan for security incidents          │
│ ├─ Required: Tested annually                                  │
│ ├─ Severity: HIGH if plan missing                           │
│ └─ Remediation: Document and test incident response          │
│                                                                 │
│ RULE: pci_third_party_security                                 │
│ ├─ Condition: Third parties handle payment data             │
│ ├─ Check: third_party_agreements?                             │
│ ├─ Required: Written agreements with all third parties       │
│ ├─ Required: Third party compliance monitoring               │
│ ├─ Severity: HIGH if agreements missing                      │
│ └─ Remediation: Execute agreements + monitoring               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## PCI-DSS Rule Evaluation Output

```
PCI-DSS RULE EVALUATION RESULT

Entity: payments.card_number
Classification: PCI (PAN) | Sensitivity: 4 (Critical)

┌─────────────────────────────────────────────────────────────────┐
│ REQUIREMENT 3: PROTECT STORED CARDHOLDER DATA                   │
├─────────────────────────────────────────────────────────────────┤
│ SAD Never Stored             │ ✅ PASS                           │
│   └─ cvv_check               │ No CVV columns found             │
│   └─ pin_check               │ No PIN columns found            │
│   └─ track_check             │ No track data found             │
│                                                                 │
│ PAN Encryption               │ ✅ PASS                           │
│   └─ at_rest_encryption      │ AES-256 enabled                  │
│   └─ key_separation          │ Keys in AWS KMS, separate from   │
│                              │ encrypted data                   │
│                                                                 │
│ Key Management               │ ✅ PASS                           │
│   └─ kms_provider            │ AWS KMS (FIPS 140-2 L2)         │
│   └─ rotation_policy         │ 90-day automatic rotation       │
│   └─ last_rotation          │ 2024-01-10                        │
│                                                                 │
│ PAN Masking (Display)        │ ✅ PASS                           │
│   └─ ui_masking              │ **** **** **** 1234             │
│   └─ api_masking             │ Masked in all responses         │
│                                                                 │
│ PAN Masking (Logs)           │ ⚠️ WARNING                         │
│   └─ application_logs        │ Masked ✓                         │
│   └─ database_logs           │ Masked ✓                         │
│   └─ old_logs_found          │ 3 log files from 2023-06 contain │
│                              │ unmasked PANs                    │
│   └─ remediation             │ Purge or re-mask old logs       │
│                                                                 │
│ Database Protection          │ ✅ PASS                           │
│   └─ dbe_enabled             │ AWS RDS encryption enabled       │
│   └─ column_encryption       │ Additional column encryption    │
│                              │ for PAN column                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REQUIREMENT 8: IDENTIFY AND AUTHENTICATE ACCESS                 │
├─────────────────────────────────────────────────────────────────┤
│ Unique User IDs               │ ✅ PASS                           │
│   └─ shared_accounts         │ None in CDE                      │
│                                                                 │
│ MFA for Admins               │ ✅ PASS                           │
│   └─ payment_admin_access    │ MFA required + enforced         │
│   └─ database_admin           │ MFA required                     │
│                                                                 │
│ User Authentication          │ ✅ PASS                           │
│   └─ api_authentication       │ OAuth 2.0 + JWT required        │
│   └─ service_accounts        │ Certificates + rotation        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REQUIREMENT 10: LOG AND MONITOR ALL ACCESS                      │
├─────────────────────────────────────────────────────────────────┤
│ Audit Logging                 │ ✅ PASS                           │
│   └─ cardholder_access        │ Every SELECT logged              │
│   └─ privileged_commands      │ All admin actions logged        │
│   └─ authentication          │ All login attempts logged       │
│   └─ retention                │ 1 year online, archived 3 years │
│                                                                 │
│ Log Protection                │ ✅ PASS                           │
│   └─ immutability             │ WORM storage enabled             │
│   └─ integrity_monitoring    │ CloudTrail + tamper detection    │
│                                                                 │
│ Log Review Frequency          │ ✅ PASS                           │
│   └─ automated_review         │ SIEM with daily alerts          │
│   └─ anomaly_detection        │ ML-based anomaly alerts        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REQUIREMENT 11: REGULARLY TEST SECURITY SYSTEMS                 │
├─────────────────────────────────────────────────────────────────┤
│ Vulnerability Scanning        │ ✅ PASS                           │
│   └─ quarterly_external       │ Last scan: 2024-01-05          │
│   └─ next_due                 │ 2024-04-05                      │
│                                                                 │
│ Penetration Testing           │ ⚠️ WARNING                         │
│   └─ last_test               │ 2023-03-15 (OVERDUE - annual)  │
│   └─ next_due                │ 2024-03-15                      │
│   └─ remediation             │ Schedule annual pen test        │
│                                                                 │
│ File Integrity Monitoring     │ ✅ PASS                           │
│   └─ fim_enabled             │ AWS GuardDuty active            │
│   └─ critical_files          │ All CDE files monitored         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REQUIREMENT 12: SUPPORT INFORMATION SECURITY                     │
├─────────────────────────────────────────────────────────────────┤
│ Security Policy               │ ✅ PASS                           │
│   └─ documented              │ ISMS policy v3.0                │
│   └─ last_review             │ 2024-01-01                       │
│                                                                 │
│ Incident Response Plan        │ ✅ PASS                           │
│   └─ documented              │ IRP v2.1                         │
│   └─ last_tested             │ 2023-11-15 tabletop exercise    │
│                                                                 │
│ Third Party Agreements        │ ⚠️ WARNING                         │
│   └─ agreements_signed       │ 8 of 10 critical vendors        │
│   └─ missing                │ [LegacyProcessor, OldAnalytics] │
│   └─ remediation             │ Execute agreements with missing │
└─────────────────────────────────────────────────────────────────┘

OVERALL PCI-DSS STATUS: 94% COMPLIANT
├── PASSED: 16 rules
├── WARNINGS: 3 rules (log purge, pen test overdue, vendor BAA)
└── FAILED: 0 rules
```

---

# SECTION 5: Gap Report Generation

## Gap Report Structure

```
COMPLIANCE GAP REPORT

┌─────────────────────────────────────────────────────────────────┐
│ REPORT HEADER                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Project:                Telehealth Platform Alpha              │
│ Assessment Date:        2024-01-15                              │
│ Frameworks Assessed:    GDPR, HIPAA, PCI-DSS                    │
│ Overall Score:          91%                                      │
│ Report ID:              GAP-2024-0115-001                       │
│ Prepared By:            Intelligence Bank Engine                │
└─────────────────────────────────────────────────────────────────┘

EXECUTIVE SUMMARY
─────────────────
The assessment identified 15 compliance gaps across 3 frameworks.
2 gaps are CRITICAL severity requiring immediate action.
8 gaps are HIGH severity with 30-day remediation windows.
5 gaps are MEDIUM severity with 90-day remediation windows.

┌─────────────────────────────────────────────────────────────────┐
│ GAP SUMMARY BY FRAMEWORK                                         │
├─────────────────────────────────────────────────────────────────┤
│ Framework   │ Total │ Critical │ High │ Medium │ Low │ Score   │
├─────────────┼───────┼──────────┼──────┼────────┼─────┼─────────┤
│ GDPR        │   6   │    0     │  3   │   3    │  0  │  85%    │
│ HIPAA       │   5   │    1     │  2   │   2    │  0  │  92%    │
│ PCI-DSS     │   4   │    1     │  2   │   1    │  0  │  94%    │
├─────────────┼───────┼──────────┼──────┼────────┼─────┼─────────┤
│ TOTAL       │  15   │    2     │  7   │   6    │  0  │  91%    │
└─────────────┴───────┴──────────┴──────┴────────┴─────┴─────────┘
```

## Detailed Gap Registry

```
┌─────────────────────────────────────────────────────────────────┐
│ DETAILED GAP REGISTRY                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GAP-001                                                          │
├─────────────────────────────────────────────────────────────────┤
│ Severity:          CRITICAL                                      │
│ Framework:         PCI-DSS                                       │
│ Requirement:       Req 3.4 - Render PAN Unreadable               │
│                                                                 │
│ Finding:           Plaintext PAN detected in database table      │
│                    'orders.payment_details' column 'raw_card'    │
│                                                                 │
│ Evidence:          • Column contains full 16-digit PAN           │
│                    • No encryption detected                      │
│                    • Value visible in database exports          │
│                                                                 │
│ Risk:              Anyone with DB access can read card numbers  │
│ Impact:            CRITICAL - Cardholder data at risk          │
│ Exploitability:    High - Standard DB credentials suffice       │
│                                                                 │
│ Affected Entity:   orders.payment_details.raw_card              │
│ Detection Date:    2024-01-15                                    │
│                                                                 │
│ Required Actions:                                               │
│   1. IMMEDIATE: Remove plaintext PAN from column              │
│   2. Implement tokenization (replace with payment_token)        │
│   3. Enable AES-256 encryption for all PAN storage              │
│   4. Rotate any keys that may have been exposed                 │
│   5. Conduct forensic analysis to determine if data was accessed │
│                                                                 │
│ Owner:             John Smith (Security Team)                   │
│ Deadline:          IMMEDIATE (within 24 hours)                  │
│ Status:            OPEN                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GAP-002                                                          │
├─────────────────────────────────────────────────────────────────┤
│ Severity:          CRITICAL                                      │
│ Framework:         HIPAA                                         │
│ Requirement:       §164.308(a)(1) - Risk Analysis               │
│                                                                 │
│ Finding:           HIPAA-required risk analysis is overdue       │
│                    Last completed: 2023-01-15                    │
│                    Due date: 2024-01-15                          │
│                                                                 │
│ Evidence:          • Risk analysis record shows 2023 completion  │
│                    • Calendar reminder expired                    │
│                    • No evidence of 2024 analysis started       │
│                                                                 │
│ Risk:              Unknown vulnerabilities in PHI systems       │
│ Impact:            HIGH - Regulatory requirement not met       │
│ Exploitability:    Unknown - Cannot assess without analysis    │
│                                                                 │
│ Affected Entity:   All PHI systems                              │
│ Detection Date:    2024-01-15                                    │
│                                                                 │
│ Required Actions:                                               │
│   1. IMMEDIATE: Schedule risk analysis kickoff                  │
│   2. Scope all PHI systems and data flows                       │
│   3. Conduct technical vulnerability assessment                 │
│   4. Assess physical and administrative safeguards              │
│   5. Document findings and remediation plan                     │
│   6. Complete analysis within 60 days                           │
│                                                                 │
│ Owner:             Jane Doe (HIPAA Security Officer)             │
│ Deadline:          60 days (2024-03-15)                        │
│ Status:            OPEN                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GAP-003                                                          │
├─────────────────────────────────────────────────────────────────┤
│ Severity:          HIGH                                           │
│ Framework:         GDPR                                           │
│ Article:          Article 17 - Right to Erasure                 │
│                                                                 │
│ Finding:           Erasure cascade not configured for email      │
│                    field in search indexes                       │
│                                                                 │
│ Evidence:          • Database deletion configured ✓             │
│                    • API cascade configured ✓                    │
│                    • Search index cascade NOT configured         │
│                    • Old email values remain in Elasticsearch   │
│                                                                 │
│ Risk:              Deleted users' emails remain searchable      │
│ Impact:            MEDIUM - Right to erasure not fully honored │
│ Exploitability:    Low - Requires direct search access          │
│                                                                 │
│ Affected Entity:   users.email                                   │
│ Detection Date:    2024-01-15                                    │
│                                                                 │
│ Required Actions:                                               │
│   1. Configure Elasticsearch deletion on user erasure           │
│   2. Configure Algolia deletion on user erasure                 │
│   3. Add background job to purge orphaned index entries         │
│   4. Test erasure cascade with test user                        │
│                                                                 │
│ Owner:             Alice Johnson (Backend Team)                 │
│ Deadline:          30 days (2024-02-15)                        │
│ Status:            OPEN                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GAP-004                                                          │
├─────────────────────────────────────────────────────────────────┤
│ Severity:          HIGH                                           │
│ Framework:         GDPR                                           │
│ Article:          Article 6 - Consent Expiry                      │
│                                                                 │
│ Finding:           Consent expiry policy not configured          │
│                    Marketing emails sent based on initial       │
│                    consent without refresh                       │
│                                                                 │
│ Evidence:          • Consent collected at signup (2022)         │
│                    • No consent refresh mechanism               │
│                    • GDPR requires periodic consent refresh     │
│                                                                 │
│ Risk:              Processing based on stale consent           │
│ Impact:            HIGH - Consent may no longer be valid        │
│ Exploitability:    High - Affects entire user base              │
│                                                                 │
│ Affected Entity:   users.marketing_email_consent                 │
│ Detection Date:    2024-01-15                                    │
│                                                                 │
│ Required Actions:                                               │
│   1. Design consent refresh campaign                           │
│   2. Implement consent refresh API endpoint                    │
│   3. Schedule re-consent for users with 18+ month consent      │
│   4. Document consent refresh policy                            │
│                                                                 │
│ Owner:             Bob Williams (Marketing Team)                 │
│ Deadline:          30 days (2024-02-15)                        │
│ Status:            OPEN                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GAP-005                                                          │
├─────────────────────────────────────────────────────────────────┤
│ Severity:          HIGH                                           │
│ Framework:         HIPAA                                          │
│ Requirement:       §164.308(a)(3) - BAA Management             │
│                                                                 │
│ Finding:           Missing Business Associate Agreements        │
│                    for 3 vendors with PHI access                 │
│                                                                 │
│ Evidence:          • 15 vendors identified with PHI access       │
│                    • 12 have signed BAAs on file                │
│                    • 3 vendors without BAAs:                     │
│                      - CloudBackup Inc (backup storage)         │
│                      - Analytics.ai (analytics platform)        │
│                      - MarketingPlatform.io (email marketing)   │
│                                                                 │
│ Risk:              PHI shared with vendors without legal prot.  │
│ Impact:            HIGH - HIPAA violation if breach occurs       │
│ Exploitability:    Medium - PHI technically protected           │
│                                                                 │
│ Affected Entity:   Vendor integrations                           │
│ Detection Date:    2024-01-15                                    │
│                                                                 │
│ Required Actions:                                               │
│   1. Contact CloudBackup Inc for BAA execution                  │
│   2. Contact Analytics.ai for BAA execution                   │
│   3. Contact MarketingPlatform.io for BAA execution           │
│   4. If BAAs not executed in 30 days, suspend data sharing     │
│                                                                 │
│ Owner:             Jane Doe (Legal/Compliance)                   │
│ Deadline:          30 days (2024-02-15)                        │
│ Status:            OPEN                                         │
└─────────────────────────────────────────────────────────────────┘

[... Additional gaps continue ...]
```

## Remediation Plan

```
┌─────────────────────────────────────────────────────────────────┐
│ PRIORITIZED REMEDIATION PLAN                                     │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: IMMEDIATE (0-7 Days)
─────────────────────────────────────────────────────────────────
┌─────────┬──────────────────────────────────────────────────┐
│ GAP-001 │ Remove plaintext PAN from database               │
│ CRITICAL│ • Identify all affected records                   │
│ PCI     │ • Tokenize PANs (replace with payment tokens)    │
│         │ • Delete raw_card column                          │
│         │ • Forensic analysis of potential exposure         │
│         │ • Report to card brands if required               │
└─────────┴──────────────────────────────────────────────────┘

PHASE 2: CRITICAL PATH (7-30 Days)
─────────────────────────────────────────────────────────────────
┌─────────┬──────────────────────────────────────────────────┐
│ GAP-002 │ Complete HIPAA Risk Analysis                     │
│ CRITICAL│ • Kickoff meeting (Week 1)                       │
│ HIPAA   │ • Scope all PHI systems (Week 1-2)               │
│         │ • Conduct vulnerability assessment (Week 2-4)    │
│         │ • Document findings (Week 4)                     │
└─────────┼──────────────────────────────────────────────────┤
│ GAP-003 │ Configure erasure cascade                        │
│ HIGH    │ • Implement ES deletion hooks (Week 1)          │
│ GDPR    │ • Implement Algolia deletion (Week 1)           │
│         │ • Purge existing orphaned entries (Week 2)       │
│         │ • Test cascade end-to-end (Week 2)               │
└─────────┼──────────────────────────────────────────────────┤
│ GAP-004 │ Implement consent refresh                        │
│ HIGH    │ • Design consent refresh flow (Week 1)           │
│ GDPR    │ • Implement API endpoints (Week 2)              │
│         │ • Execute first refresh campaign (Week 3-4)     │
└─────────┼──────────────────────────────────────────────────┤
│ GAP-005 │ Execute missing BAAs                             │
│ HIGH    │ • Contact all 3 vendors (Week 1)                 │
│ HIPAA   │ • Negotiate terms (Week 1-2)                    │
│         │ • Execute agreements (Week 3-4)                  │
│         │ • If unsuccessful, suspend data sharing (Week 4) │
└─────────┴──────────────────────────────────────────────────┘

PHASE 3: SUSTAINABLE (30-90 Days)
─────────────────────────────────────────────────────────────────
┌─────────┬──────────────────────────────────────────────────┐
│ GAP-006 │ Schedule PCI Pen Test                           │
│ HIGH    │ • Engage ASV-certified pen test vendor           │
│ PCI     │ • Schedule for Q1 2024                          │
│         │ • Remediate any findings before annual QSA      │
└─────────┼──────────────────────────────────────────────────┤
│ GAP-007 │ Purge unmasked logs                              │
│ MEDIUM  │ • Identify all logs with unmasked PANs           │
│ PCI     │ • Securely purge or re-process                  │
│         │ • Verify no remnants remain                      │
└─────────┴──────────────────────────────────────────────────┘
```

---

## Compliance Scorecard

```
┌─────────────────────────────────────────────────────────────────┐
│ COMPLIANCE SCORECARD - EXECUTIVE VIEW                            │
└─────────────────────────────────────────────────────────────────┘

FRAMEWORK SCORES
═══════════════════════════════════════════════════════════════

GDPR Compliance Score
███████████████████████░░░░░░░░░░░░░░░  85%  ████████████████░░

  ████████████████████████░░░░░░░░░░░░░░░░  17/20 rules passed
  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3 rules in progress
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0 rules failed


HIPAA Compliance Score
███████████████████████████████░░░░░░░░  92%  ████████████████████

  ████████████████████████░░░░░░░░░░░░░░░░  14/15 rules passed
  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   1 rule in progress
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0 rules failed


PCI-DSS Compliance Score
███████████████████████████████░░░░░░░  94%  ████████████████████

  █████████████████████████████░░░░░░░░░░░░  16/17 rules passed
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   1 rule in progress
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0 rules failed


OVERALL COMPLIANCE SCORE
████████████████████████████████████░░░  91%  ████████████████████░

  ████████████████████████████████████░░░  47/52 rules passed
  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5 rules in progress
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0 rules failed


GAP DISTRIBUTION
═══════════════════════════════════════════════════════════════

Severity    │ Count │ Percentage │ Average Days to Remediation
────────────┼───────┼────────────┼────────────────────────────
🔴 CRITICAL │   2   │   13%      │   7 days
🟠 HIGH     │   7   │   47%      │   30 days
🟡 MEDIUM   │   6   │   40%      │   90 days
🟢 LOW      │   0   │    0%      │   N/A
────────────┴───────┴────────────┴────────────────────────────


TREND ANALYSIS
═══════════════════════════════════════════════════════════════

Score History (Last 6 Assessments)
─────────────────
Jan 2024:   91%  █████████████████████████████████████░░░  ↑
Dec 2023:   88%  ███████████████████████████████████░░░░░░  ↑
Nov 2023:   85%  ████████████████████████████████░░░░░░░  →
Oct 2023:   84%  ███████████████████████████████░░░░░░░░  ↓
Sep 2023:   86%  ████████████████████████████████░░░░░░░░  →
Aug 2023:   86%  ████████████████████████████████░░░░░░░░  

Trend:  Improving (+5% over 6 months)
Predicted Next Month: 93%
```


---

## Next Steps for Phase 4

```
PHASE 4: Remediation Tracking & Automation
├── Gap Assignment Workflow
├── Deadline Calendar Integration
├── Automated Re-scanning
├── Evidence Collection
└── Certificate Generation
```

---

## Questions Before Phase 4

1. **Remediation Workflow**: Should gaps automatically create tickets in your project management system (Jira, Linear, GitHub Issues)?

2. **Evidence Collection**: Should the system auto-collect evidence for passed rules (screenshots, config dumps) for audit readiness?

3. **Notification**: Should critical/high gaps trigger alerts to specific owners via email/Slack?

4. **Rescan Frequency**: Should the system automatically re-scan on a schedule (weekly/monthly) or only on-demand?

5. **Report Delivery**: Should compliance reports be auto-delivered to stakeholders (weekly digest, monthly executive summary)?