# Planning — Phase 2: Framework Activation (Admin Configures)

## The Core Concept

```
Phase 1 detected WHAT exists in the database
Phase 2 decides WHICH RULES apply to what was detected

Without Phase 2:
  System knows "email field exists"
  But doesn't know: "GDPR applies because users are from EU"
  
With Phase 2:
  Admin says "This is a healthcare app serving EU patients"
  System now knows:
    ├── Apply HIPAA to all PHI fields
    ├── Apply GDPR to all PII fields  
    ├── EU data residency rules apply
    └── Both frameworks active simultaneously
```

---

## The Admin Configuration Journey

### How It Should Feel To The Admin

```
Step 1: Tell us about your PROJECT
  → What industry are you in?
  
Step 2: Tell us about your USERS
  → Where does your data come from?
  
Step 3: Tell us about your OBLIGATIONS
  → Which compliance frameworks apply?
  
Step 4: Tell us your INTERNAL POLICIES
  → How sensitive do you want to be?

Step 5: REVIEW what the system will enforce
  → See exactly what rules will apply and why

Step 6: ACTIVATE
  → System begins enforcing selected frameworks
```

---

## CONFIGURATION BLOCK 1 — INDUSTRY SELECTION

### Why Industry Matters

```
Industry determines:
  ├── Which frameworks are MANDATORY by law
  ├── Which fields get auto-elevated sensitivity
  ├── Which regulations the system pre-loads
  └── What "normal" looks like for this domain
```

### Industry Categories

```
HEALTHCARE & LIFE SCIENCES
  ├── Hospital / Clinic / Medical Practice
  ├── Pharmacy / Drug Store
  ├── Health Insurance / Payer
  ├── Medical Device Manufacturer
  ├── Pharmaceutical Company
  ├── Mental Health / Behavioral Health
  ├── Dental Practice
  ├── Laboratory / Diagnostics
  ├── Telehealth / Digital Health
  └── Home Health / Hospice

  Auto-activates:
    ├── HIPAA (USA) — MANDATORY
    ├── HITECH (USA) — MANDATORY
    ├── 21 CFR Part 11 (if pharma) — MANDATORY
    ├── HL7/FHIR standards
    └── PHI detection on ALL fields

---

FINANCIAL SERVICES & BANKING
  ├── Retail Bank / Credit Union
  ├── Investment Bank / Brokerage
  ├── Insurance Company
  ├── Payment Processor
  ├── Fintech / Digital Bank
  ├── Mortgage / Lending
  ├── Accounting / Audit Firm
  ├── Wealth Management
  ├── Cryptocurrency Exchange
  └── Credit Rating Agency

  Auto-activates:
    ├── PCI-DSS (if processing payments) — MANDATORY
    ├── SOX (if publicly traded USA) — MANDATORY
    ├── GLBA (USA banking privacy) — MANDATORY
    ├── BASEL III (if bank) — MANDATORY
    ├── MiFID II (if EU investments) — MANDATORY
    └── PAN/CVV detection elevated to CRITICAL

---

RETAIL & E-COMMERCE
  ├── Online Retailer
  ├── Brick and Mortar Retail
  ├── Marketplace Platform
  ├── Subscription Commerce
  ├── Wholesale / Distribution
  ├── Luxury Goods
  ├── Food & Beverage
  └── Fashion / Apparel

  Auto-activates:
    ├── PCI-DSS (payment cards) — MANDATORY
    ├── GDPR (if EU customers) — likely
    ├── CCPA (if California customers) — likely
    └── Consumer protection regulations

---

TECHNOLOGY & SOFTWARE
  ├── SaaS Platform
  ├── Enterprise Software
  ├── Mobile App Company
  ├── Cloud Services Provider
  ├── Cybersecurity Company
  ├── AI / Machine Learning Company
  ├── IoT Platform
  └── Developer Tools

  Auto-activates:
    ├── GDPR (if EU users) — very likely
    ├── CCPA (if California users) — very likely
    ├── SOC 2 (if B2B SaaS) — strongly recommended
    ├── ISO 27001 — strongly recommended
    └── COPPA (if under-13 users possible)

---

GOVERNMENT & PUBLIC SECTOR
  ├── Federal Government Agency
  ├── State / Provincial Government
  ├── Local / Municipal Government
  ├── Military / Defense
  ├── Law Enforcement
  ├── Public Education Institution
  └── Public Healthcare System

  Auto-activates:
    ├── FedRAMP (USA federal cloud) — MANDATORY
    ├── FISMA (USA federal security) — MANDATORY
    ├── FERPA (if education records) — MANDATORY
    ├── ITAR (if defense/military) — MANDATORY
    └── Government-specific data classification

---

EDUCATION
  ├── K-12 School / School District
  ├── Higher Education / University
  ├── Online Learning Platform
  ├── EdTech Company
  ├── Tutoring / Test Prep
  └── Corporate Training

  Auto-activates:
    ├── FERPA (USA student records) — MANDATORY
    ├── COPPA (if under-13) — MANDATORY
    ├── GDPR (if EU students) — likely
    └── State student privacy laws

---

LEGAL & PROFESSIONAL SERVICES
  ├── Law Firm
  ├── Accounting Firm
  ├── Consulting Firm
  ├── HR / Recruitment Agency
  ├── Real Estate
  └── Management Consulting

  Auto-activates:
    ├── Attorney-client privilege rules
    ├── SOX (if serving public companies)
    ├── GDPR (if EU clients)
    └── Professional licensing regulations

---

NONPROFIT & CHARITY
  ├── Charitable Organization
  ├── Foundation
  ├── NGO
  ├── Religious Organization
  └── Political Organization

  Auto-activates:
    ├── GDPR (if EU donors/beneficiaries)
    ├── CCPA (if California)
    ├── Charitable solicitation laws
    └── Political data regulations (if political)

---

HOSPITALITY & TRAVEL
  ├── Hotel / Resort Chain
  ├── Airline
  ├── Travel Agency / OTA
  ├── Restaurant Chain
  ├── Cruise Line
  └── Car Rental

  Auto-activates:
    ├── PCI-DSS (payment) — MANDATORY
    ├── GDPR (international travelers) — likely
    ├── CCPA (USA travelers)
    └── Loyalty program data regulations

---

MANUFACTURING & INDUSTRIAL
  ├── General Manufacturing
  ├── Automotive
  ├── Aerospace
  ├── Chemical / Materials
  ├── Energy / Utilities
  └── Construction

  Auto-activates:
    ├── ITAR (if defense contracts) — check
    ├── ISO 9001 (quality management)
    ├── Environmental data regulations
    └── Worker safety data regulations
```

---

## CONFIGURATION BLOCK 2 — GEOGRAPHIC DATA ORIGIN

### Why Geography Matters

```
Where your DATA COMES FROM determines:
  ├── Which privacy laws have jurisdiction
  ├── Which data residency rules apply
  ├── Where data can legally be stored
  ├── Cross-border transfer restrictions
  └── Right to erasure, portability requirements
```

### Geographic Selection Structure

```
Question: Where do your users / data subjects come from?
(Select ALL that apply)

EUROPE
  ├── European Union (28 member states)
  │     → Activates: GDPR (MANDATORY)
  │     → Data residency: prefer EU servers
  │     → Cross-border: Standard Contractual Clauses needed
  │
  ├── United Kingdom (post-Brexit)
  │     → Activates: UK GDPR (similar to EU GDPR)
  │     → Adequacy decision with EU: exists
  │
  └── Switzerland
        → Activates: Swiss Federal Data Protection Act (nFADP)
        → Similar to GDPR but separate

NORTH AMERICA
  ├── United States (general)
  │     → No single federal privacy law
  │     → Activates: sector-specific (HIPAA, GLBA, FERPA)
  │
  ├── California, USA
  │     → Activates: CCPA / CPRA (MANDATORY for eligible companies)
  │     → Threshold: >$25M revenue OR >50K consumers OR >50% revenue from data
  │
  ├── Virginia, USA
  │     → Activates: CDPA (Consumer Data Protection Act)
  │
  ├── Colorado, USA
  │     → Activates: CPA (Colorado Privacy Act)
  │
  ├── Connecticut, USA
  │     → Activates: CTDPA
  │
  ├── Texas, USA
  │     → Activates: TDPSA (Texas Data Privacy and Security Act)
  │
  ├── Other US States
  │     → System tracks emerging state privacy laws
  │     → Currently 20+ states have or are passing laws
  │
  └── Canada
        → Activates: PIPEDA (federal)
        → Quebec: Law 25 (stricter than PIPEDA)
        → Alberta/BC: provincial laws also apply

LATIN AMERICA
  ├── Brazil
  │     → Activates: LGPD (Lei Geral de Proteção de Dados)
  │     → Similar structure to GDPR
  │
  ├── Mexico
  │     → Activates: LFPDPPP
  │
  └── Argentina
        → Activates: Personal Data Protection Law 25.326

ASIA PACIFIC
  ├── Australia
  │     → Activates: Privacy Act 1988 + Australian Privacy Principles
  │     → Health: My Health Records Act also
  │
  ├── Singapore
  │     → Activates: PDPA (Personal Data Protection Act)
  │
  ├── Japan
  │     → Activates: APPI (Act on Protection of Personal Information)
  │
  ├── South Korea
  │     → Activates: PIPA (Personal Information Protection Act)
  │     → One of strictest in Asia
  │
  ├── India
  │     → Activates: DPDP Act 2023 (Digital Personal Data Protection)
  │     → Recently enacted, phased implementation
  │
  ├── China
  │     → Activates: PIPL (Personal Information Protection Law)
  │     → Data localization: sensitive data MUST stay in China
  │     → Cybersecurity Law also applies
  │
  ├── Thailand
  │     → Activates: PDPA Thailand
  │
  ├── Indonesia
  │     → Activates: PDP Law 2022
  │
  ├── Philippines
  │     → Activates: Data Privacy Act 2012
  │
  └── New Zealand
        → Activates: Privacy Act 2020

MIDDLE EAST & AFRICA
  ├── United Arab Emirates
  │     → Activates: DIFC Data Protection Law
  │     → ADGM Data Protection Regulations
  │
  ├── Saudi Arabia
  │     → Activates: PDPL (Personal Data Protection Law)
  │
  ├── South Africa
  │     → Activates: POPIA (Protection of Personal Information Act)
  │
  ├── Kenya
  │     → Activates: Data Protection Act 2019
  │
  └── Nigeria
        → Activates: NDPR (Nigeria Data Protection Regulation)

GLOBAL / MULTINATIONAL
  ├── "We operate globally"
  │     → Activates: Strictest applicable framework per field
  │     → Uses GDPR as baseline (most comprehensive)
  │     → Adds country-specific rules on top
  │
  └── "We don't know yet"
        → Default to GDPR-level protection
        → Safer than under-protecting
```

### Data Residency Rules Generated

```
Based on geographic selection, system generates:

If EU selected:
  ├── Data MUST be stored in EU or adequate country
  ├── Adequate countries: UK, Switzerland, Canada, etc.
  ├── Transfers to USA: need SCCs or Binding Corporate Rules
  └── Transfers to China: generally prohibited

If China selected:
  ├── Important personal information MUST stay in China
  ├── Cross-border transfer: security assessment required
  └── Critical information infrastructure: strict localization

If India selected:
  ├── DPDP: data localization for sensitive data
  └── Cross-border: only to approved countries

Multi-region projects:
  ├── Flag: "Data from EU users cannot be stored on US servers"
  ├── Flag: "Data from China users must stay in China"
  └── Recommendation: Multi-region database architecture
```

---

## CONFIGURATION BLOCK 3 — COMPLIANCE FRAMEWORK SELECTION

### Framework Selection Interface

```
How it works:
  ├── Some frameworks are AUTO-ACTIVATED (mandatory based on industry/geography)
  ├── Some frameworks are RECOMMENDED (based on context)
  ├── Some frameworks are OPTIONAL (admin chooses)
  └── Admin can override any recommendation with justification
```

### Framework Status Types

```
MANDATORY — Cannot be deactivated
  (Legal requirement based on industry + geography)

RECOMMENDED — Strongly suggested
  (Best practice for your context)

OPTIONAL — Admin choice
  (May apply, admin decides)

NOT APPLICABLE — Hidden or greyed out
  (Doesn't apply to this industry/geography)
```

### Full Framework Configuration Table

```
DATA PRIVACY FRAMEWORKS

GDPR (EU General Data Protection Regulation)
  Status depends on: EU geography selected
  If EU selected:     MANDATORY
  If non-EU only:     OPTIONAL (good practice)
  
  What it enforces:
    ├── PII field classification
    ├── Consent tracking requirement
    ├── Right to erasure flow
    ├── Data portability export
    ├── Data retention limits
    ├── Breach notification (72 hours)
    └── Data Protection Impact Assessment for high-risk

  Configuration options when active:
    ├── Data Protection Officer email (for reports)
    ├── Legal basis for processing (consent/contract/legitimate interest)
    ├── Retention period per data category
    └── Supervisory authority (which EU country)

---

CCPA/CPRA (California Consumer Privacy Act)
  Status depends on: California geography + revenue threshold
  If threshold met:   MANDATORY
  If below threshold: OPTIONAL
  
  What it enforces:
    ├── "Do Not Sell My Personal Information" flag
    ├── Consumer rights: know, delete, opt-out, correct
    ├── Sensitive personal information categories
    └── Opt-in for under-16 data sharing

  Configuration options:
    ├── Is your revenue > $25M? (YES/NO)
    ├── Do you process > 50,000 consumers? (YES/NO)
    └── Do you sell data? (YES/NO)

---

UK GDPR
  Status depends on: UK geography
  If UK selected:     MANDATORY
  
  What it enforces:
    Same as EU GDPR but under UK ICO jurisdiction
  
  Configuration options:
    ├── ICO registration number (if registered)
    └── UK representative details

---

LGPD (Brazil)
  Status depends on: Brazil geography
  If Brazil selected: MANDATORY
  
  What it enforces:
    ├── Similar to GDPR
    ├── DPA: ANPD (Autoridade Nacional de Proteção de Dados)
    └── Legal bases for processing

---

PIPEDA (Canada)
  Status depends on: Canada geography
  If Canada selected: MANDATORY
  
  Additional:
    Quebec Law 25: stricter, separate configuration

---

HEALTHCARE FRAMEWORKS

HIPAA Privacy Rule
  Status depends on: Healthcare industry selected
  If healthcare:      MANDATORY
  
  What it enforces:
    ├── PHI field classification and protection
    ├── Minimum necessary standard
    ├── Business Associate Agreements
    ├── Patient access rights
    └── Breach notification (60 days)

  Configuration options:
    ├── Covered Entity type (provider/payer/clearinghouse)
    ├── Business Associate status (YES/NO)
    ├── PHI storage location
    └── Breach notification contact

---

HIPAA Security Rule
  Status depends on: HIPAA Privacy Rule active
  If HIPAA active:    MANDATORY
  
  What it enforces:
    ├── Administrative safeguards
    ├── Physical safeguards
    ├── Technical safeguards
    └── Encryption requirements for PHI

---

HITECH Act
  Status depends on: HIPAA active
  If HIPAA active:    MANDATORY
  
  What it enforces:
    ├── Extends HIPAA to Business Associates
    ├── Stricter breach notification
    └── Increased penalties

---

42 CFR Part 2 (Substance Use Disorder)
  Status depends on: Mental health / addiction treatment
  If SUD treatment:   MANDATORY
  
  What it enforces:
    ├── Stricter than HIPAA for addiction records
    ├── Cannot share without explicit consent
    └── Separate consent required per disclosure

---

FINANCIAL FRAMEWORKS

PCI-DSS (Payment Card Industry)
  Status depends on: Payment processing capability
  If accepting cards: MANDATORY
  
  Configuration options:
    ├── Merchant level (1/2/3/4 based on transaction volume)
    │     Level 1: >6M transactions/year
    │     Level 2: 1-6M transactions/year
    │     Level 3: 20K-1M e-commerce transactions
    │     Level 4: <20K e-commerce transactions
    ├── Payment processor (Stripe, Square, etc.)
    ├── Card brands accepted
    └── Is cardholder data stored? (YES → higher requirements)
    
  What it enforces:
    ├── PAN field classification
    ├── CVV storage prohibition
    ├── Encryption requirements
    ├── Network segmentation recommendations
    └── Quarterly vulnerability scans

---

SOX (Sarbanes-Oxley Act)
  Status depends on: Publicly traded USA company
  If public company:  MANDATORY
  If private:         OPTIONAL (good practice)
  
  Configuration options:
    ├── Are you a public company? (YES/NO)
    ├── SEC filing requirements
    └── External auditor information
    
  What it enforces:
    ├── Financial data integrity controls
    ├── Audit trail on financial records
    ├── Change management controls
    └── Access controls on financial systems

---

GLBA (Gramm-Leach-Bliley Act)
  Status depends on: Financial institution in USA
  If USA financial:   MANDATORY

---

SECURITY FRAMEWORKS

SOC 2 (Service Organization Control 2)
  Status depends on: B2B SaaS / service provider
  Recommended for:   Any SaaS serving enterprise clients
  
  Trust Service Criteria:
    ├── Security (Common Criteria) — always required
    ├── Availability — optional
    ├── Processing Integrity — optional
    ├── Confidentiality — optional
    └── Privacy — optional
    
  Configuration options:
    ├── Type I or Type II audit?
    ├── Which trust criteria?
    └── Auditor firm

---

ISO 27001
  Status: OPTIONAL (globally recognized)
  Recommended for: Any organization handling sensitive data
  
  What it enforces:
    ├── Information Security Management System
    ├── Risk assessment and treatment
    ├── Security controls (114 controls in Annex A)
    └── Continuous improvement

---

NIST Cybersecurity Framework
  Status: OPTIONAL (USA best practice)
  Mandatory for: Federal agencies (via FISMA)
  
  Five Functions:
    ├── Identify
    ├── Protect
    ├── Detect
    ├── Respond
    └── Recover

---

OWASP Top 10
  Status: RECOMMENDED for all web applications
  
  What it enforces:
    ├── Injection vulnerability checks
    ├── Authentication weakness detection
    ├── Sensitive data exposure checks
    └── Security misconfiguration detection

---

GOVERNMENT FRAMEWORKS

FedRAMP
  Status depends on: Cloud service for US federal
  If federal cloud:   MANDATORY
  
  Impact levels:
    ├── Low (public data)
    ├── Moderate (most government data)
    └── High (law enforcement, emergency services)

---

FERPA (Family Educational Rights and Privacy Act)
  Status depends on: Education industry + USA
  If USA education:   MANDATORY
  
  What it enforces:
    ├── Student record protection
    ├── Parent/student access rights
    └── Disclosure restrictions

---

COPPA (Children's Online Privacy Protection Act)
  Status depends on: Users under 13 possible
  If under-13 users:  MANDATORY
  
  Configuration options:
    ├── Do you knowingly collect data from under-13? (YES/NO)
    ├── Age verification method
    └── Parental consent mechanism
```

---

## CONFIGURATION BLOCK 4 — SENSITIVITY LEVEL POLICY

### What Sensitivity Policy Controls

```
This determines HOW STRICT the system is
in applying protections to detected fields.

Same field (e.g., "username") could be:
  ├── CONSERVATIVE policy → treated as PII (protect it)
  ├── BALANCED policy → treated as low-risk PII
  └── PERMISSIVE policy → treated as public (no protection)

Admin chooses the default stance
Then can override per field
```

### The Four Policy Levels

```
POLICY 1: CONSERVATIVE (Maximum Protection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Philosophy: "When in doubt, protect it"

Rules:
  ├── Any field with confidence > 0.40 → classified as PII
  ├── Indirect PII treated same as direct PII
  ├── Quasi-identifiers always flagged
  ├── All user-linked fields require audit trail
  ├── Encryption recommended for all personal fields
  └── Access logging on all sensitive tables

Best for:
  ├── Healthcare organizations
  ├── Financial institutions
  ├── Government agencies
  ├── Companies with history of breaches
  └── High-risk data processors

What the system does:
  ├── Flags more fields as sensitive
  ├── Generates more warnings
  ├── Requires more justification to downgrade
  └── Produces strictest compliance reports

---

POLICY 2: BALANCED (Standard Protection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Philosophy: "Protect what matters, allow what's safe"

Rules:
  ├── Fields with confidence > 0.65 → classified as PII
  ├── Direct PII: full protection
  ├── Indirect PII: moderate protection
  ├── Quasi-identifiers: flagged but not blocked
  ├── Encryption for direct PII only
  └── Audit trail for sensitive tables

Best for:
  ├── General SaaS applications
  ├── E-commerce platforms
  ├── Standard business applications
  └── Most technology companies

What the system does:
  ├── Reasonable number of warnings
  ├── Focuses on clear violations
  └── Balanced approach to compliance

---

POLICY 3: PERMISSIVE (Minimal Protection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Philosophy: "Protect only what regulations require"

Rules:
  ├── Fields with confidence > 0.85 → classified as PII
  ├── Only direct, obvious PII flagged
  ├── Indirect PII → informational only
  ├── Encryption only for government IDs and financials
  └── Audit trail only for regulated data

Best for:
  ├── Internal business tools (no external users)
  ├── B2B platforms with no consumer data
  ├── Development and testing environments
  └── Low-risk data applications

What the system does:
  ├── Fewer warnings
  ├── Only flags clear violations
  └── Minimal compliance overhead

---

POLICY 4: CUSTOM (Admin Defines Rules)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Philosophy: "We know exactly what we need"

Rules: Admin defines each threshold manually

Custom settings:
  ├── PII confidence threshold: [slider 0.0 - 1.0]
  ├── PHI confidence threshold: [slider 0.0 - 1.0]
  ├── PCI confidence threshold: [slider 0.0 - 1.0]
  ├── Auto-classify quasi-identifiers: [YES/NO]
  ├── Require encryption for: [checkboxes]
  ├── Require audit trail for: [checkboxes]
  └── Masking rules: [per category]

Best for:
  ├── Organizations with existing compliance programs
  ├── Companies with legal team input
  └── Complex multi-regulation environments
```

---

## CONFIGURATION BLOCK 5 — DATA RETENTION POLICY

```
Question: How long do you keep different types of data?

The system needs to know retention periods to:
  ├── Flag fields that need deletion schedules
  ├── Generate GDPR right-to-erasure flows
  └── Ensure compliance with minimum retention laws

RETENTION CATEGORIES:

User Account Data:
  ├── Active: while account exists
  ├── After deletion: [X] days (GDPR: as short as possible)
  └── Backup copies: [X] days after deletion

Transaction Records:
  ├── Financial: [7 years] (SOX, tax law)
  ├── Healthcare: [6 years] (HIPAA)
  ├── General business: [3-7 years]
  └── Custom: admin defines

Activity / Log Data:
  ├── Application logs: [90 days] default
  ├── Security logs: [1 year] minimum
  ├── Audit trails: [7 years] for regulated data
  └── Custom: admin defines

Marketing Data:
  ├── Email lists: until consent withdrawn
  ├── Campaign data: [2 years]
  └── Analytics: [2 years] (GDPR guidance)

Employee Data:
  ├── Active employment: duration of employment
  ├── Post-employment: [7 years] (legal claims)
  └── Payroll: [7 years] (tax requirements)
```

---

## CONFIGURATION BLOCK 6 — SPECIAL CIRCUMSTANCES

```
Additional Questions That Affect Rule Application:

Q1: Do you process data on behalf of others?
    (Are you a Data Processor under GDPR?)
    YES → Need Data Processing Agreements with controllers
    NO  → You are a Data Controller (different obligations)

Q2: Do you use automated decision making?
    (AI/ML that makes decisions about people?)
    YES → GDPR Article 22 applies
          → Right to explanation required
          → Human review option required
    NO  → Standard processing rules

Q3: Do you transfer data internationally?
    YES → Which countries receive data?
          → Transfer mechanism needed per country pair
    NO  → Simpler compliance

Q4: Do you use third-party processors?
    (Cloud providers, analytics tools, etc.)
    YES → List processors:
          ├── AWS / Azure / GCP → data residency matters
          ├── Google Analytics → GDPR consent needed
          ├── Stripe → PCI shared responsibility
          └── Others → need Data Processing Agreements
    NO  → Self-hosted only

Q5: Do you process children's data?
    Under 13 USA → COPPA mandatory
    Under 16 EU  → GDPR parental consent
    YES → Age verification mechanism required

Q6: Are you a publicly traded company?
    YES → SOX mandatory (USA)
    NO  → SOX optional

Q7: Do you have a Data Protection Officer?
    YES → DPO email / contact (required by GDPR if mandatory)
    NO  → Do you need one?
          GDPR requires DPO if:
            ├── Public authority
            ├── Large scale systematic monitoring
            └── Large scale special category processing
```

---

## CONFIGURATION REVIEW SCREEN

### What Admin Sees Before Activating

```
FRAMEWORK ACTIVATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: Healthcare Management System
Industry: Healthcare — Hospital / Clinic
Geography: USA + European Union

MANDATORY FRAMEWORKS (cannot disable):
  ✅ HIPAA Privacy Rule
     Reason: Healthcare industry in USA
     
  ✅ HIPAA Security Rule  
     Reason: HIPAA Privacy Rule active
     
  ✅ HITECH Act
     Reason: HIPAA active
     
  ✅ GDPR
     Reason: EU geography selected
     
  ✅ PCI-DSS (Level 4)
     Reason: Payment processing detected
     
RECOMMENDED FRAMEWORKS (enabled by default, can disable):
  ✅ SOC 2 (Security criteria)
     Reason: SaaS platform serving healthcare enterprises
     [Disable with justification]
     
  ✅ ISO 27001
     Reason: Healthcare data requires strong ISMS
     [Disable with justification]
     
  ✅ OWASP Top 10
     Reason: Web application with PHI
     [Disable with justification]

OPTIONAL FRAMEWORKS (disabled by default):
  ☐ CCPA — Enable if serving California patients
  ☐ 42 CFR Part 2 — Enable if treating substance use disorders
  ☐ COPPA — Enable if treating minors

SENSITIVITY POLICY: CONSERVATIVE
  Reason: Healthcare industry auto-selects conservative
  [Change policy]

FIELDS THAT WILL BE AFFECTED:
  ├── PHI Fields Detected:     47 fields
  ├── PII Fields Detected:     23 fields
  ├── PCI Fields Detected:     8 fields
  ├── Fields requiring encryption: 55 fields
  ├── Fields requiring masking: 38 fields
  ├── Fields requiring audit trail: 71 fields
  └── Fields requiring consent tracking: 23 fields

COMPLIANCE GAPS THAT WILL BE FLAGGED:
  ├── 12 PHI fields with no encryption → CRITICAL
  ├── 3 PCI fields at risk (cvv stored) → CRITICAL
  ├── 8 tables missing audit columns → HIGH
  ├── 15 PII fields not in erasure flow → HIGH
  └── 0 consent tracking records → MEDIUM

DATA RESIDENCY RULES:
  ├── EU patient data: MUST stay in EU servers
  ├── USA patient data: Can stay in USA
  └── Cross-border: SCCs required for EU→USA transfer

RETENTION RULES THAT WILL APPLY:
  ├── Patient health records: 6 years minimum (HIPAA)
  ├── Financial/billing: 7 years (SOX)
  ├── Application logs: 1 year minimum
  └── EU patient data: deleted within 30 days of request

[CONFIRM & ACTIVATE FRAMEWORKS]
[SAVE AS DRAFT]
[GO BACK AND EDIT]
```

---

## What Happens When Admin Clicks ACTIVATE

```
Step 1: Save Configuration
  ├── Store all framework selections
  ├── Store industry and geography
  ├── Store sensitivity policy
  └── Store retention rules
  
  → Saved to: ProjectComplianceConfig table

Step 2: Apply Rules to Detected Fields (from Phase 1)
  ├── Take all PII fields detected in Phase 1
  ├── Apply GDPR rules to each
  ├── Take all PHI fields detected in Phase 1
  ├── Apply HIPAA rules to each
  ├── Take all PCI fields detected in Phase 1
  └── Apply PCI-DSS rules to each
  
  → Updated in: IntelligenceEntry table (Layer 3)

Step 3: Generate Compliance Gap Report
  ├── What needs to be fixed (CRITICAL first)
  ├── What needs to be added (audit columns, encryption)
  └── What needs to be documented
  
  → Stored in: ComplianceGapReport table

Step 4: Set Up Monitoring Rules
  ├── Any new field added → re-scan against frameworks
  ├── Any framework changes → re-evaluate all fields
  └── Any geography changes → re-apply rules
  
  → Configured in: ComplianceMonitoringRule table

Step 5: Notify
  ├── Show dashboard: compliance score per framework
  ├── Show: X critical issues need immediate attention
  └── Show: Estimated effort to reach compliance
```

---

## The Intelligence Bank Records For Each Config

```
ProjectComplianceConfig
  ├── projectId
  ├── industry (selected industry)
  ├── industrySubType
  ├── geographies [ ] (array of selected countries/regions)
  ├── activeFrameworks [ ] (array of framework codes)
  ├── mandatoryFrameworks [ ] (cannot be changed)
  ├── sensitivityPolicy (conservative/balanced/permissive/custom)
  ├── customThresholds (JSON if custom policy)
  ├── retentionRules (JSON per category)
  ├── isDataProcessor (boolean)
  ├── usesAutomatedDecisionMaking (boolean)
  ├── hasInternationalTransfers (boolean)
  ├── processesChildrenData (boolean)
  ├── isPubliclyTraded (boolean)
  ├── dpoEmail (if required)
  ├── activatedAt (timestamp)
  ├── activatedBy (userId)
  └── lastReviewedAt (timestamp)
```

---

## Summary — The Four Configuration Blocks

```
Block 1: INDUSTRY
  → Determines mandatory frameworks
  → Auto-elevates field sensitivity for domain
  → Sets domain-specific rules

Block 2: GEOGRAPHY
  → Determines which privacy laws apply
  → Sets data residency requirements
  → Identifies cross-border transfer needs

Block 3: FRAMEWORKS
  → Explicitly activates each compliance framework
  → Mandatory ones cannot be disabled
  → Optional ones require justification to enable/disable

Block 4: SENSITIVITY POLICY
  → Sets HOW STRICT the rule application is
  → Conservative / Balanced / Permissive / Custom
  → Determines confidence thresholds for classification
```

> The key insight is: **Phase 2 transforms Phase 1 from a list of facts into a list of obligations**. Without Phase 2, the system knows "email exists." With Phase 2, it knows "this email field must be encrypted, included in GDPR exports, deleted within 30 days of user request, masked in logs, and audited on every access — because this project serves EU healthcare patients."

# Phase 2 — Framework Activation Configuration System

## Architecture Overview

```
INTELLIGENCE BANK ADMIN CONFIGURATION
│
├── CONFIGURATION LAYER (Admin Controls)
│   ├── Framework Selector
│   ├── Industry Vertical
│   ├── Geographic Jurisdiction
│   └── Sensitivity Policy
│
├── DECISION ENGINE (Rules Activated Based on Config)
│   ├── Applicable Rules (from Config)
│   ├── Rule Priority Overrides
│   └── Custom Rule Definitions
│
├── COMPLIANCE CALCULATOR (Generates Scores)
│   ├── Per-Framework Scores
│   ├── Overall Compliance %
│   └── Gap Analysis
│
└── ACTION GENERATOR (Remediation Workflows)
    ├── Priority Queue
    ├── Deadline Calendar
    └── Approval Workflows
```

---

# SECTION 1: Framework Selector

## Available Compliance Frameworks

```
FRAMEWORK CATALOG
│
├── PRIVACY & DATA PROTECTION
│   ├── GDPR      → European Union
│   ├── CCPA      → California, USA
│   ├── CPRA      → California (enhanced CCPA)
│   ├── LGPD      → Brazil
│   ├── POPIA     → South Africa
│   ├── PIPEDA    → Canada
│   ├── PDPA      → Thailand
│   ├── APPI      → Japan
│   └── UK GDPR   → United Kingdom
│
├── FINANCIAL COMPLIANCE
│   ├── PCI-DSS   → Payment Card Industry
│   ├── SOX       → US Sarbanes-Oxley
│   ├── GLBA      → US Gramm-Leach-Bliley
│   ├── MiFID II  → EU Financial Markets
│   ├── Basel III  → International Banking
│   └── Dodd-Frank → US Financial Reform
│
├── HEALTHCARE & LIFE SCIENCES
│   ├── HIPAA     → US Healthcare
│   ├── HITECH    → US Health IT (enhanced HIPAA)
│   ├── 21 CFR 11 → FDA Electronic Records
│   ├── GxP       → Pharma/Manufacturing
│   └── PIPL       → China Personal Information
│
├── GOVERNMENT & DEFENSE
│   ├── FedRAMP   → US Cloud Security
│   ├── ITAR      → US Export Controls
│   ├── FISMA     → US Federal Info Security
│   └── NIST 800-53 → US Federal Standards
│
├── ACCESSIBILITY & CONSUMER
│   ├── WCAG 2.1  → Web Accessibility
│   ├── ADA       → US Disability Access
│   ├── COPPA     → US Children's Privacy
│   └── EAA       → EU Accessibility Act
│
└── AI & ALGORITHMIC
    ├── EU AI Act → Artificial Intelligence
    ├── NYC AEDT  → NYC Automated Decision Tools
    └── Algorithmic Accountability → US Proposed
```

---

## Framework Configuration Schema

```
CONFIG: compliance_frameworks

{
  "project_id": "uuid",
  "frameworks": [
    {
      "framework_id": "gdpr",
      "name": "GDPR",
      "version": "2016/679",
      "status": "active",              // active | inactive | partial
      
      "scope": {
        "applies": true,
        "reason": "EU customers served",  // EU customers | EU employees | EU office
        "data_subject_count_estimate": 100000,
        "data_controller": true,          // You determine purposes
        "data_processor": false           // You process for others
      },
      
      "configured_at": "timestamp",
      "configured_by": "admin_user_id"
    }
  ],
  
  "exemptions": [
    {
      "framework_id": "ccpa",
      "exemption_type": "revenue_threshold",
      "threshold": "< $25M annual revenue",
      "evidence": "Self-attestation 2024-01-15",
      "expires": "2025-01-15"
    }
  ]
}
```

---

## Framework Activation Matrix

```
FRAMEWORK SELECTION → ACTIVATES RULES

┌─────────────────────────────────────────────────────────────────┐
│ FRAMEWORK          │ ACTIVATES                                 │
├─────────────────────────────────────────────────────────────────┤
│ GDPR               │ PII Detection + Consent + Retention        │
│                    │ + Right to Erasure + Data Portability      │
│                    │ + DPO Requirements + Breach Notification   │
├─────────────────────────────────────────────────────────────────┤
│ CCPA/CPRA          │ PII Detection + Sale Opt-Out                │
│                    │ + Do Not Share + Sensitive Data Limits     │
│                    │ + Privacy Notice Requirements              │
├─────────────────────────────────────────────────────────────────┤
│ HIPAA              │ PHI Detection + BAA Requirements           │
│                    │ + Minimum Necessary + Audit Trails         │
│                    │ + Encryption + Access Controls            │
├─────────────────────────────────────────────────────────────────┤
│ PCI-DSS            │ Card Data Detection + SAD Violation         │
│                    │ + Encryption + Access Logging              │
│                    │ + Network Segmentation + Key Management    │
├─────────────────────────────────────────────────────────────────┤
│ SOX                │ Audit Trail + Immutability                 │
│                    │ + Segregation of Duties                   │
│                    │ + Financial Record Integrity              │
├─────────────────────────────────────────────────────────────────┤
│ WCAG 2.1           │ Frontend Accessibility Rules                │
│                    │ + Color Contrast + ARIA Labels             │
│                    │ + Keyboard Navigation + Screen Reader      │
├─────────────────────────────────────────────────────────────────┤
│ FedRAMP            │ Security Controls + CSP Documentation      │
│                    │ + Continuous Monitoring + Incident Response│
└─────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: Industry Vertical Configuration

## Industry Catalog

```
INDUSTRY VERTICALS
│
├── E-COMMERCE & RETAIL
│   ├── Online Store
│   ├── Marketplace
│   ├── POS/Physical Retail
│   └── Subscription Services
│
├── FINANCIAL SERVICES
│   ├── Banking
│   ├── Insurance
│   ├── Investment/Trading
│   ├── Lending/Credit
│   ├── Payment Processing
│   ├── Wealth Management
│   └── Cryptocurrency/Blockchain
│
├── HEALTHCARE
│   ├── Hospital/Health System
│   ├── Practice Management
│   ├── Health Insurance
│   ├── Pharma/Biotech
│   ├── Medical Devices
│   ├── Mental Health
│   └── Telemedicine
│
├── EDUCATION
│   ├── K-12
│   ├── Higher Education
│   ├── EdTech
│   └── Training/LMS
│
├── GOVERNMENT
│   ├── Federal
│   ├── State/Local
│   ├── Law Enforcement
│   └── Public Records
│
├── TECHNOLOGY
│   ├── SaaS Platform
│   ├── Marketplace
│   ├── Social Media
│   ├── Gaming
│   └── AI/ML Services
│
├── MANUFACTURING
│   ├── Industrial IoT
│   ├── Supply Chain
│   └── Quality Control
│
└── PROFESSIONAL SERVICES
    ├── Legal
    ├── Accounting
    ├── Consulting
    └── Staffing/HR
```

---

## Industry → Default Framework Mapping

```
INDUSTRY TO FRAMEWORK DEFAULTS

┌─────────────────────────────────────────────────────────────────┐
│ INDUSTRY VERTICAL        │ DEFAULT FRAMEWORKS (Auto-Suggested)   │
├─────────────────────────────────────────────────────────────────┤
│ E-Commerce               │ PCI-DSS, GDPR (if EU), CCPA          │
├─────────────────────────────────────────────────────────────────┤
│ Financial Services      │ PCI-DSS, SOX, GLBA, GDPR             │
│   - Banking             │ + Basel III, MiFID II                 │
│   - Insurance           │ + State Insurance Regulations         │
│   - Lending             │ + Dodd-Frank                          │
├─────────────────────────────────────────────────────────────────┤
│ Healthcare              │ HIPAA, HITECH, 21 CFR 11 (if FDA)     │
│   - Hospital            │ + State Health Privacy Laws            │
│   - Mental Health       │ + 42 CFR Part 2 (Substance Abuse)     │
│   - Telemedicine        │ + Telehealth-Specific Rules            │
├─────────────────────────────────────────────────────────────────┤
│ Education               │ FERPA, GDPR (if EU students)          │
│   - K-12                │ + Student Privacy (State Laws)        │
│   - Higher Ed           │ + Title IV (Federal Aid)              │
├─────────────────────────────────────────────────────────────────┤
│ Government              │ FISMA, FedRAMP, ITAR (if defense)     │
│                         │ + Section 508 (Accessibility)         │
├─────────────────────────────────────────────────────────────────┤
│ Technology/SaaS         │ SOC 2, GDPR (if EU data)               │
│   - Social Media        │ + CCPA, COPPA (if children)           │
│   - AI/ML               │ + EU AI Act (when applicable)          │
├─────────────────────────────────────────────────────────────────┤
│ Manufacturing           │ Industry-specific (FDA, ISO, etc.)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Industry Configuration Schema

```
CONFIG: industry_vertical

{
  "project_id": "uuid",
  "primary_industry": {
    "category": "healthcare",
    "sub_category": "telemedicine",
    "description": "Virtual healthcare consultations with prescription services"
  },
  
  "secondary_industries": [
    {
      "category": "pharmacy",
      "sub_category": "retail_pharmacy",
      "data_sharing": "linked"              // none | linked | separate
    }
  ],
  
  "business_model": {
    "b2c": true,                           // Direct consumers
    "b2b": true,                            // Enterprise clients
    "b2b2c": false,                         // Platform serving businesses who serve consumers
    "marketplace": false                    // Multi-seller platform
  },
  
  "data_processing_activities": [
    "patient_health_records",
    "prescription_management",
    "telehealth_sessions",
    "payment_processing",
    "insurance_claims",
    "marketing_communications"
  ],
  
  "product_type": {
    "core_product": "telehealth_platform",
    "data_types_collected": [
      "demographics",
      "health_records",
      "biometric_data",
      "payment_info",
      "location_data"
    ],
    "ai_ml_enabled": true,
    "ai_purpose": "symptom_triage_recommendations"
  }
}
```

---

## Industry-Specific Rule Overrides

```
RULE OVERRIDE MATRIX

┌─────────────────────────────────────────────────────────────────┐
│ INDUSTRY              │ RULE OVERRIDES                          │
├─────────────────────────────────────────────────────────────────┤
│ Healthcare            │ PII Detection STRICT (HIPAA minimum)     │
│                       │ PHI Detection MANDATORY                  │
│                       │ → Add: 42 CFR Part 2 (Substance Abuse)  │
│                       │ → Add: State-specific health laws        │
├─────────────────────────────────────────────────────────────────┤
│ Financial             │ PCI STRICT (no CVV storage check)        │
│                       │ SOX Audit Trail IMMUTABLE               │
│                       │ → Add: Transaction integrity checks      │
│                       │ → Add: Anti-Money Laundering flags      │
├─────────────────────────────────────────────────────────────────┤
│ E-Commerce            │ PCI ACTIVE (payment flows)              │
│                       │ PII CONSUMER (customer data)             │
│                       │ → Add: Cart abandonment tracking rules  │
│                       │ → Add: Marketing consent rules          │
├─────────────────────────────────────────────────────────────────┤
│ EdTech (K-12)         │ COPPA MANDATORY (under 13)               │
│                       │ FERPA STRICT                            │
│                       │ → Block: Behavioral advertising         │
│                       │ → Require: Parental consent flows        │
├─────────────────────────────────────────────────────────────────┤
│ Social Media          │ COPPA if < 13 users detected             │
│                       │ CCPA if CA users detected               │
│                       │ → Add: Content moderation audit trail   │
│                       │ → Add: Biometric data (if face features) │
└─────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: Geographic Jurisdiction Configuration

## Jurisdiction Catalog

```
GEOGRAPHIC SCOPE
│
├── EUROPE
│   ├── European Union (GDPR)
│   │   ├── Austria, Belgium, Bulgaria, Croatia
│   │   ├── Cyprus, Czech Republic, Denmark
│   │   ├── Estonia, Finland, France, Germany
│   │   ├── Greece, Hungary, Ireland, Italy
│   │   ├── Latvia, Lithuania, Luxembourg
│   │   ├── Malta, Netherlands, Poland
│   │   ├── Portugal, Romania, Slovakia
│   │   ├── Slovenia, Spain, Sweden
│   │   └── 🇬🇧 United Kingdom (UK GDPR separate)
│   ├── Switzerland (n Adequacy)
│   ├── Norway, Iceland, Liechtenstein (EEA)
│   └── Belarus, Russia, Ukraine (limited adequacy)
│
├── NORTH AMERICA
│   ├── 🇺🇸 United States (Federal + State)
│   │   ├── California (CCPA/CPRA, CalOPPA)
│   │   ├── New York (SHIELD Act, DFS Reg)
│   │   ├── Texas, Florida, Illinois, etc.
│   │   └── Industry-specific (HIPAA, GLBA)
│   ├── 🇨🇦 Canada (PIPEDA + Provincial)
│   │   ├── Quebec (Law 25)
│   │   └── BC, Alberta, Ontario
│   └── 🇲🇽 Mexico (LFPDPPP)
│
├── ASIA PACIFIC
│   ├── 🇨🇳 China (PIPL, DSL)
│   ├── 🇯🇵 Japan (APPI amended)
│   ├── 🇰🇷 South Korea (PIPA)
│   ├── 🇸🇬 Singapore (PDPA)
│   ├── 🇦🇺 Australia (Privacy Act)
│   ├── 🇳🇿 New Zealand (Privacy Act)
│   ├── 🇮🇳 India (DPDP Act 2023)
│   ├── 🇹🇭 Thailand (PDPA)
│   ├── 🇻🇳 Vietnam (PDPD)
│   └── 🇲🇾 Malaysia (PDPA)
│
├── LATIN AMERICA
│   ├── 🇧🇷 Brazil (LGPD)
│   ├── 🇦🇷 Argentina (PDPA)
│   ├── 🇨🇴 Colombia (Habeas Data)
│   ├── 🇨🇱 Chile (Data Protection Law)
│   └── 🇺🇾 Uruguay (Data Protection Law)
│
├── MIDDLE EAST & AFRICA
│   ├── 🇿🇦 South Africa (POPIA)
│   ├── 🇮🇱 Israel (Privacy Protection)
│   ├── 🇦🇪 UAE (Federal PDPL)
│   ├── 🇸🇦 Saudi Arabia (PDPL)
│   └── 🇶🇦 Qatar (Data Protection)
│
└── GLOBAL/UNSPECIFIED
    └── Data subjects from unknown regions
```

---

## Data Sovereignty Rules by Region

```
JURISDICTION → DATA RESIDENCY REQUIREMENTS

┌─────────────────────────────────────────────────────────────────┐
│ REGION/COUNTRY        │ DATA MUST          │ TRANSFERS ALLOWED │
├─────────────────────────────────────────────────────────────────┤
│ EU/EEA                │ Stay in EU/EEA     │ Adequacy countries │
│                       │ (some exceptions)   │ + SCC + BCR        │
├─────────────────────────────────────────────────────────────────┤
│ UK                    │ Stay in UK/EEA     │ UK adequacy + SCC  │
├─────────────────────────────────────────────────────────────────┤
│ China                 │ Stay in China      │ Approval required  │
│                       │ (Data Localization Law) │ + CAC review │
├─────────────────────────────────────────────────────────────────┤
│ Russia                │ Stay in Russia      │ Roskomnadzor list  │
│                       │ (Data Localization)  │                    │
├─────────────────────────────────────────────────────────────────┤
│ Vietnam               │ Local storage preferred │ Approvals    │
├─────────────────────────────────────────────────────────────────┤
│ India                 │ Sensitive data local   │ Approval list │
│                       │ (DPDP rules)           │               │
├─────────────────────────────────────────────────────────────────┤
│ USA                   │ No federal residency   │ Self-regulate │
│                       │ (State laws vary)      │ + Sector laws  │
├─────────────────────────────────────────────────────────────────┤
│ Germany (extra)        │ Enhanced (Schrems II)  │ Stricter SCC  │
│                       │ + Telecom secrecy      │               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Jurisdiction Configuration Schema

```
CONFIG: geographic_scope

{
  "project_id": "uuid",
  
  "primary_jurisdiction": {
    "country": "US",
    "region": "california",
    "primary_data_center": "us-west-2",
    "backup_data_center": "us-east-1"
  },
  
  "data_subject_locations": [
    {
      "region": "EU",
      "countries": ["DE", "FR", "ES", "IT"],
      "estimated_data_subjects": 50000,
      "adequacy_status": "adequate",
      "data_transfer_mechanism": "standard_contractual_clauses"
    },
    {
      "region": "UK",
      "countries": ["GB"],
      "estimated_data_subjects": 10000,
      "adequacy_status": "adequate",
      "data_transfer_mechanism": "uk_adequacy_regulation"
    },
    {
      "region": "US",
      "countries": ["US-CA", "US-NY", "US-TX"],
      "estimated_data_subjects": 200000,
      "adequacy_status": "na",
      "data_transfer_mechanism": "domestic"
    },
    {
      "region": "APAC",
      "countries": ["AU", "SG"],
      "estimated_data_subjects": 5000,
      "adequacy_status": "partial",
      "data_transfer_mechanism": "standard_contractual_clauses"
    }
  ],
  
  "data_residency_requirements": {
    "enforce_local_storage": true,
    "enforced_regions": ["EU", "UK"],           // Must stay local
    "preferred_regions": ["AU", "SG"],           // Strongly preferred
    "restricted_regions": ["CN", "RU"],          // Blocked by policy
    "cross_border_transfers_allowed": true,
    "transfer_impact_assessment_required": true
  },
  
  "data_localization_violations": {
    "last_audit": "2024-01-15",
    "violations_detected": 0,
    "violations_resolved": 0
  }
}
```

---

## Jurisdiction → Compliance Activation

```
JURISDICTION → ACTIVATES FRAMEWORKS

GEOGRAPHIC SCOPE            ACTIVATES FRAMEWORKS
──────────────────────────────────────────────────────
EU + Any data subjects       → GDPR (mandatory)
UK + Any data subjects       → UK GDPR (mandatory)
California + consumers       → CCPA (if revenue/data thresholds)
California + medical data    → CMIA (Confidential Medical Info)
New York + financial data    → NY DFS Cybersecurity (500-seq)
Texas + medical data         → Texas Medical Records Privacy
Australia + any data         → Privacy Act 1988
Singapore + any data         → PDPA
India + any data             → DPDP Act 2023
China + any data             → PIPL + DSL
Russia + any data            → 152-FZ (data localization)
Brazil + any data            → LGPD

CROSS-BORDER TRANSFERS
──────────────────────────────────────────────────────
EU → US                     → SCC required (post-Schrems II)
EU → UK                     → UK adequacy (auto-approve)
EU → India                  → SCC + additional measures
Any → China                 → CAC approval likely required
Any → Russia                → Roskomnadzor approval required
```

---

# SECTION 4: Sensitivity Level Policy Configuration

## Sensitivity Tiers Definition

```
SENSITIVITY LEVEL POLICY

Level 0: PUBLIC
───────────────
Definition:     Information intended for public disclosure
Examples:       Marketing content, public documentation, job postings
Risk:           Minimal (loss of confidentiality has no impact)
Access Control: None required
Encryption:     Optional
Audit Log:      Not required
Retention:      Business retention policy only

Level 1: INTERNAL
─────────────────
Definition:     Business operations data not meant for public
Examples:       Internal policies, org charts, meeting notes
Risk:           Low (disclosure could cause minor business impact)
Access Control: Employee authentication required
Encryption:     Optional (recommended for devices)
Audit Log:      Access logging recommended
Retention:      Business retention policy

Level 2: CONFIDENTIAL
──────────────────────
Definition:     Sensitive business data with significant value
Examples:       Customer contracts, pricing sheets, financial reports
Risk:           Medium (disclosure could harm business or customers)
Access Control: Role-based, need-to-know basis
Encryption:     Required at rest and in transit
Audit Log:      Required (who accessed what, when)
Retention:      Legal retention + business policy

Level 3: RESTRICTED
──────────────────────
Definition:     Highly sensitive data requiring strict controls
Examples:       PII, PHI, trade secrets, encryption keys
Risk:           High (serious harm if disclosed)
Access Control: Named individuals, MFA required, time-limited
Encryption:     AES-256 at rest, TLS 1.3 in transit
Audit Log:      Comprehensive (every access logged, immutable)
Retention:      Legal minimum, then secure deletion

Level 4: CRITICAL
──────────────────────
Definition:     Maximum sensitivity, severe consequences if compromised
Examples:       Authentication credentials, financial transactions, legal records
Risk:           Severe (could cause regulatory action, major harm)
Access Control: Break-glass procedures, dedicated authentication
Encryption:     AES-256 + HSM for keys, dedicated network segment
Audit Log:      Tamper-evident, WORM storage, third-party verification
Retention:      Legal requirement only, then certified destruction
```

---

## Default Sensitivity Mappings by Data Type

```
DEFAULT SENSITIVITY ASSIGNMENTS

SENSITIVITY LEVEL 0 (PUBLIC)
├── Product descriptions
├── Public documentation
├── Job postings
├── Press releases
└── Public pricing (if disclosed)

SENSITIVITY LEVEL 1 (INTERNAL)
├── Internal org charts
├── Employee handbook
├── Meeting notes
├── Internal Slack messages
└── Non-sensitive logs

SENSITIVITY LEVEL 2 (CONFIDENTIAL)
├── Customer names & contact info (non-sensitive)
├── Non-financial business plans
├── Vendor contracts
├── Internal presentations
├── Product roadmaps
└── Employee performance reviews

SENSITIVITY LEVEL 3 (RESTRICTED)
├── Full name + address combinations
├── Email addresses
├── Phone numbers
├── Date of birth
├── Financial account info
├── Health information (non-HIPAA context)
├── Government ID numbers (non-SSN)
├── Authentication credentials (hashed)
└── Purchase history

SENSITIVITY LEVEL 4 (CRITICAL)
├── SSN / National ID numbers
├── Credit card / Payment card numbers
├── Bank account numbers
├── Raw passwords / Tokens
├── Encryption keys / Private keys
├── Medical records (HIPAA PHI)
├── Biometric templates
├── Legal documents (privileged)
└── Financial transaction records
```

---

## Sensitivity Policy Configuration Schema

```
CONFIG: sensitivity_policy

{
  "project_id": "uuid",
  
  "policy_version": "1.0",
  "effective_date": "2024-01-01",
  
  "sensitivity_levels": {
    "level_0_public": {
      "enabled": true,
      "label": "Public",
      "auto_assign": ["public_*", "marketing_*", "blog_*"]
    },
    "level_1_internal": {
      "enabled": true,
      "label": "Internal",
      "auto_assign": ["internal_*", "org_*", "employee_handbook"]
    },
    "level_2_confidential": {
      "enabled": true,
      "label": "Confidential",
      "auto_assign": ["contract_*", "pricing_*", "plan_*"]
    },
    "level_3_restricted": {
      "enabled": true,
      "label": "Restricted",
      "auto_assign": ["pii_*", "email", "phone", "address", "dob"]
    },
    "level_4_critical": {
      "enabled": true,
      "label": "Critical",
      "auto_assign": ["ssn", "password", "secret_key", "credit_card", "mrn"]
    }
  },
  
  "override_rules": [
    {
      "condition": "table_name CONTAINS 'patient'",
      "apply": {
        "sensitivity_level": 3,
        "reason": "Healthcare context increases risk"
      }
    },
    {
      "condition": "column_name = 'ssn'",
      "apply": {
        "sensitivity_level": 4,
        "reason": "SSN always Critical per policy"
      }
    },
    {
      "condition": "framework = 'hipaa' AND column_type = 'medical'",
      "apply": {
        "sensitivity_level": 4,
        "reason": "HIPAA PHI requires Critical"
      }
    }
  ],
  
  "control_requirements": {
    "level_0_public": {
      "encryption_in_transit": false,
      "encryption_at_rest": false,
      "access_control": "none",
      "audit_log": false,
      "retention_days": 365
    },
    "level_1_internal": {
      "encryption_in_transit": true,
      "encryption_at_rest": false,
      "access_control": "authentication",
      "audit_log": false,
      "retention_days": 730
    },
    "level_2_confidential": {
      "encryption_in_transit": true,
      "encryption_at_rest": true,
      "access_control": "role_based",
      "audit_log": true,
      "retention_days": 2555
    },
    "level_3_restricted": {
      "encryption_in_transit": true,
      "encryption_at_rest": true,
      "access_control": "role_based + mfa",
      "audit_log": true,
      "retention_days": 2555,
      "consent_required": true
    },
    "level_4_critical": {
      "encryption_in_transit": true,
      "encryption_at_rest": true,
      "encryption_type": "aes_256",
      "access_control": "named + mfa + time_limited",
      "audit_log": "immutable",
      "audit_storage": "worm",
      "retention_days": "legal_minimum",
      "data_deletion_certification": true
    }
  },
  
  "consent_requirements": {
    "level_3_restricted": {
      "consent_required": true,
      "consent_types": ["explicit"],
      "consent_purposes": ["service_delivery", "legal_compliance"]
    },
    "level_4_critical": {
      "consent_required": true,
      "consent_types": ["explicit"],
      "consent_purposes": ["service_delivery", "legal_compliance", "fraud_prevention"]
    }
  }
}
```

---

## Combined Configuration → Rule Activation

```
FULL CONFIGURATION FLOW

┌─────────────────────────────────────────────────────────────────┐
│ ADMIN CONFIGURATION                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ Framework Select │    │ Industry Select │                   │
│  │                  │    │                  │                   │
│  │ □ GDPR           │    │ Healthcare       │                   │
│  │ ☑ HIPAA          │    │ Telemedicine     │                   │
│  │ □ PCI-DSS        │    │                  │                   │
│  │ □ CCPA           │    │ (Auto-suggests: │                   │
│  │ □ SOX            │    │  HIPAA default)  │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                        │                              │
│           └───────────┬────────────┘                              │
│                       ▼                                           │
│           ┌────────────────────────┐                              │
│           │  Geographic Scope      │                              │
│           │                        │                              │
│           │ Primary: US (California)│                              │
│           │ Data Subjects:         │                              │
│           │  • EU: 50,000          │                              │
│           │  • UK: 10,000          │                              │
│           │  • US: 200,000         │                              │
│           │  • AU: 5,000          │                              │
│           └───────────┬──────────┘                              │
│                       ▼                                           │
│           ┌────────────────────────┐                              │
│           │ Sensitivity Policy    │                              │
│           │                        │                              │
│           │ Level 4 (Critical):   │                              │
│           │  • SSN, Credit Cards  │                              │
│           │  • Medical Records     │                              │
│           │  • Encryption Keys     │                              │
│           │                        │                              │
│           │ Level 3 (Restricted): │                              │
│           │  • PII (name, email)   │                              │
│           │  • Phone, Address      │                              │
│           │  • Financial Accounts  │                              │
│           └───────────┬────────────┘                              │
│                       ▼                                           │
│           ┌─────────────────────────────────────┐                  │
│           │ ACTIVE RULE SET GENERATED           │                  │
│           └─────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

RULES ACTIVATED BY THIS CONFIG
──────────────────────────────────────────────────────────────────

GDPR ACTIVE (EU data subjects)
├── PII Detection (strict)
├── Consent Management Required
├── Right to Erasure Support
├── Data Portability Support
├── Breach Notification (72h)
└── DPO Appointment (if >250 employees)

HIPAA ACTIVE (Healthcare Industry)
├── PHI Detection (strict)
├── BAA Required for Vendors
├── Minimum Necessary Rule
├── Patient Access Rights
├── PHI Encryption (AES-256)
└── Audit Trail (6 years)

CCPA ACTIVE (California users)
├── Do Not Sell / Share
├── Sensitive Personal Info Limits
├── Privacy Notice Requirements
└── Consumer Rights Requests

PCI-DSS NOT ACTIVE (No direct payments)

SOX NOT ACTIVE (Not public company)

SENSITIVITY POLICIES ACTIVE
├── Level 4: Medical Records
│   ├── Encryption: AES-256 Required
│   ├── Access: MFA + Named + Time-limited
│   ├── Audit: Immutable, WORM storage
│   └── Retention: Legal minimum only
│
├── Level 3: Patient PII
│   ├── Encryption: AES-256 Required
│   ├── Access: RBAC + MFA
│   ├── Audit: Full logging
│   └── Consent: Explicit required

GEOGRAPHIC TRANSFERS
├── EU → US: SCC Required
├── EU → AU: Adequacy (partial)
└── UK → US: UK SCC Required
```

---

## Framework → Sensitivity Auto-Calculation

```
FRAMEWORK INFLUENCE ON SENSITIVITY

┌─────────────────────────────────────────────────────────────────┐
│ FRAMEWORK        │ COLUMN TYPE       │ SENSITIVITY ASSIGNED     │
├─────────────────────────────────────────────────────────────────┤
│ HIPAA            │ Medical Record #  │ Level 4 (Critical)       │
│ HIPAA            │ Diagnosis Code    │ Level 4 (Critical)       │
│ HIPAA            │ Treatment Date    │ Level 4 (Critical)       │
│ HIPAA            │ Provider Name    │ Level 3 (Restricted)     │
│ HIPAA            │ Room Number      │ Level 3 (Restricted)     │
├─────────────────────────────────────────────────────────────────┤
│ PCI-DSS          │ Full Card Number │ Level 4 (Critical)       │
│ PCI-DSS          │ Cardholder Name  │ Level 3 (Restricted)    │
│ PCI-DSS          │ Expiration Date  │ Level 3 (Restricted)    │
│ PCI-DSS          │ CVV              │ 🚫 VIOLATION (never store)│
├─────────────────────────────────────────────────────────────────┤
│ GDPR             │ Email            │ Level 3 (Restricted)     │
│ GDPR             │ Phone            │ Level 3 (Restricted)     │
│ GDPR             │ Location Data    │ Level 3 (Restricted)     │
│ GDPR             │ IP Address       │ Level 3 (Restricted)     │
│ GDPR             │ Cookie ID        │ Level 2 (Confidential)   │
├─────────────────────────────────────────────────────────────────┤
│ SOX              │ Financial Record │ Level 4 (Critical)       │
│ SOX              │ Audit Log        │ Level 4 (Critical)       │
│ SOX              │ Budget Data      │ Level 2 (Confidential)   │
├─────────────────────────────────────────────────────────────────┤
│ FERPA            │ Student Grades   │ Level 3 (Restricted)     │
│ FERPA            │ Student ID       │ Level 3 (Restricted)     │
│ FERPA            │ Disciplinary     │ Level 3 (Restricted)     │
│ FERPA            │ Directory Info   │ Level 2 (Confidential)   │
└─────────────────────────────────────────────────────────────────┘
```

---

# SECTION 5: Configuration Validation & Gaps

## Cross-Configuration Conflict Detection

```
CONFIGURATION VALIDATION RULES

┌─────────────────────────────────────────────────────────────────┐
│ CONFLICT TYPE          │ DETECTION LOGIC                       │
├─────────────────────────────────────────────────────────────────┤
│ Framework Mismatch     │ GDPR active but no EU data subjects   │
│                        │ → WARNING: GDPR may not apply         │
├─────────────────────────────────────────────────────────────────┤
│ Industry-Framework     │ Healthcare industry but HIPAA inactive │
│ Violation              │ → ERROR: Healthcare requires HIPAA    │
├─────────────────────────────────────────────────────────────────┤
│ Jurisdiction Gap       │ EU data subjects but no SCC configured │
│                        │ → ERROR: Cross-border transfer illegal│
├─────────────────────────────────────────────────────────────────┤
│ Sensitivity Override   │ Level 4 field but encryption disabled │
│                        │ → ERROR: Critical data must be enc.   │
├─────────────────────────────────────────────────────────────────┤
│ Retention Conflict     │ Legal minimum < Framework minimum      │
│                        │ → WARNING: Framework overrides policy │
├─────────────────────────────────────────────────────────────────┤
│ Scope Threshold        │ CCPA applies but <50k CA residents     │
│                        │ → INFO: Below CCPA threshold         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Output Example

```
CONFIGURATION VALIDATION REPORT

Project: Telehealth Platform Alpha
Validated: 2024-01-15 14:30:00 UTC

┌─────────────────────────────────────────────────────────────────┐
│ ✅ PASSED CHECKS (8)                                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Framework Selection: Valid combination                       │
│ 2. Industry Mapping: Healthcare correctly identified           │
│ 3. Geographic Scope: Primary + secondary jurisdictions set      │
│ 4. Sensitivity Policy: All 5 levels configured                  │
│ 5. Consent Requirements: GDPR/CCPA consent flows configured     │
│ 6. Transfer Mechanisms: SCC for EU-US configured                │
│ 7. Data Residency: EU/UK data residency enforced               │
│ 8. Framework Dependencies: HIPAA requires BAA tracking (enabled)│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ WARNINGS (3)                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. [GDPR-001] EU data subjects (50k) but website uses          │
│    cookies without explicit consent modal configured.          │
│    → ACTION: Configure cookie consent banner                    │
│                                                                 │
│ 2. [CCPA-002] California residents detected but "Do Not Sell"   │
│    link not found in footer.                                    │
│    → ACTION: Add "Do Not Sell/Share My Personal Information"   │
│                                                                 │
│ 3. [HIPAA-003] PHI detected in table 'appointments' but        │
│    Business Associate agreements not tracked for vendor 'AWS'.  │
│    → ACTION: Upload signed BAA for AWS                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ❌ ERRORS (1)                                                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. [PCI-001] Payment processing detected but PCI-DSS framework  │
│    is INACTIVE. Credit card data flows through your system.     │
│                                                                 │
│    Column: payments.card_number                                 │
│    Framework Required: PCI-DSS v4.0                            │
│    Compliance Impact: CRITICAL VIOLATION RISK                   │
│                                                                 │
│    → ACTION REQUIRED:                                           │
│       a) Activate PCI-DSS framework, OR                        │
│       b) Move payment processing to PCI-compliant processor     │
│          (Stripe/PayPal) and remove card data from your system  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 COMPLIANCE POSTURE SUMMARY                                   │
├─────────────────────────────────────────────────────────────────┤
│ GDPR:          85% (1 warning pending)                         │
│ HIPAA:         92% (1 warning pending)                         │
│ CCPA:          80% (1 warning pending)                         │
│ PCI-DSS:       ❌ INACTIVE (CRITICAL)                          │
│ Overall:       67% (Action Required)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps for Phase 3

```
PHASE 3: Rule Execution Engine
├── Rule Loader (based on activated frameworks)
├── Pattern Matcher (PII/PHI/PCI name + value patterns)
├── Context Analyzer (table clustering, FK relationships)
├── Compliance Calculator (scores per framework)
└── Action Generator (remediation workflows)
```

---

## Questions Before Phase 3

1. **Admin Interface**: Should this configuration be a **wizard** (step-by-step guided setup) or a **dashboard** (all settings visible, editable inline)?

2. **Defaults**: Should the system **auto-suggest** frameworks based on industry (current approach) or should admin have to **manually enable** everything?

3. **Conflict Resolution**: If GDPR and a US state law conflict, which takes precedence for that data subject? (Needs explicit hierarchy configuration)

4. **Configuration Persistence**: Should configurations be stored per **project** (multi-project) or per **deployment** (single system)?

5. **Audit Trail**: Should all configuration changes be logged with **who changed what and when**?