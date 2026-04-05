# Planning — PII & PHI Field Detection Rule System

## The Goal

> Build a rule system that looks at ANY field name, data type, context, and automatically classifies it as PII or PHI — with confidence score, evidence, and recommended actions.

---

## How Detection Should Work — The Logic Chain

```
When a field enters the system:

Step 1: Check field NAME against known patterns
Step 2: Check field DATA TYPE for clues
Step 3: Check field CONTEXT (what table is it in?)
Step 4: Check field RELATIONSHIPS (what does it link to?)
Step 5: Check field VALUES (if sample data available)
Step 6: Combine all signals → assign classification
Step 7: Assign confidence score
Step 8: Recommend actions based on classification
```

---

## PART 1 — PII DETECTION

### What Is PII?

```
Personally Identifiable Information =
Any data that can identify a specific living person,
either directly or when combined with other data.

Direct PII    → Identifies person alone (SSN, passport)
Indirect PII  → Identifies when combined (name + zipcode + dob)
```

---

### PII Category 1 — NAME IDENTIFIERS

**Fields that directly contain a person's name**

```
Detection Patterns:

Exact Matches:
  ├── firstName
  ├── lastName  
  ├── fullName
  ├── middleName
  ├── maidenName
  ├── preferredName
  └── displayName

Partial Matches (contains these words):
  ├── *_first_name, *_last_name
  ├── *_full_name, *_name_*
  ├── name_* (if in user/person context)
  └── *Name (camelCase variants)

Abbreviation Patterns:
  ├── fname, lname, mname
  ├── f_name, l_name
  └── first_nm, last_nm

Confidence: HIGH (0.90)
PII Type: DIRECT
GDPR Article: Art. 4(1) — basic personal data
Action Required: Mask in logs, encrypt at rest recommended
```

---

### PII Category 2 — CONTACT IDENTIFIERS

**Fields that contain ways to reach a person**

```
Email Patterns:
  ├── email, emailAddress, email_address
  ├── userEmail, contactEmail, workEmail
  ├── personalEmail, primaryEmail
  ├── *_email, email_*
  └── mail, mailAddress

Phone Patterns:
  ├── phone, phoneNumber, phone_number
  ├── mobile, mobileNumber, cellPhone
  ├── homePhone, workPhone, fax
  ├── telephone, tel, tele
  ├── *_phone, phone_*, *_mobile
  └── contactNumber, contactNo

Confidence: HIGH (0.95)
PII Type: DIRECT
GDPR Article: Art. 4(1)
Action Required: Encrypt at rest, mask in logs, validate format
```

---

### PII Category 3 — LOCATION IDENTIFIERS

**Fields that reveal where a person is or lives**

```
Physical Address Patterns:
  ├── address, address1, address2
  ├── streetAddress, street, streetName
  ├── houseNumber, apartmentNumber, unitNumber
  ├── buildingName, floorNumber
  ├── *_address, address_*
  └── residentialAddress, mailingAddress

City / Region Patterns:
  ├── city, cityName, town
  ├── suburb, district, borough
  ├── county, region, province
  ├── state, stateName, stateCode
  └── *_city, *_state, *_region

Postal Patterns:
  ├── zipCode, zip, postalCode
  ├── postCode, pinCode
  └── *_zip, *_postal, *_postcode

Country Patterns:
  ├── country, countryName, countryCode
  ├── nationality
  └── *_country

Note: Country alone = LOW PII risk
      Country + City + Street = HIGH PII risk
      (Combination rule applies)

Confidence:
  ├── Full address: 0.95 (DIRECT PII)
  ├── City alone: 0.40 (INDIRECT PII)
  ├── Country alone: 0.15 (very low risk)
  └── Lat/Long: 0.90 (DIRECT PII — precise location)

Geographic Coordinate Patterns:
  ├── latitude, longitude, lat, lng, lon
  ├── geoLocation, coordinates, gps
  ├── *_lat, *_lng, *_coordinates
  └── locationData (JSON — inspect contents)

GDPR Article: Art. 4(1), Recital 30
Action Required: Restrict access, do not expose in public APIs
```

---

### PII Category 4 — GOVERNMENT IDENTIFIERS

**Official identification numbers — highest risk PII**

```
National ID Patterns:
  ├── ssn, socialSecurityNumber, social_security
  ├── nationalId, nationalIdNumber, national_id
  ├── nin, nationalInsuranceNumber
  ├── taxId, taxNumber, taxFileNumber
  ├── tfn, tin, vatNumber
  └── citizenId, citizenshipNumber

Passport / Travel:
  ├── passportNumber, passport_number, passportNo
  ├── passportId, travelDocument
  ├── visaNumber, visaId
  └── driverLicense, drivingLicense, driversLicense

Immigration:
  ├── alienRegistrationNumber
  ├── permanentResidentId
  └── workPermitNumber

Confidence: VERY HIGH (0.99)
PII Type: DIRECT — SENSITIVE CATEGORY
GDPR Article: Art. 87 — national identification numbers
Action Required:
  ├── MUST encrypt at rest
  ├── MUST encrypt in transit
  ├── MUST mask completely in logs
  ├── MUST restrict API access
  └── MUST have audit trail on every access
```

---

### PII Category 5 — FINANCIAL IDENTIFIERS

**Personal financial information**

```
Bank Account Patterns:
  ├── bankAccount, accountNumber, bank_account
  ├── iban, bic, swift, routingNumber
  ├── sortCode, bsbNumber
  └── *_account_number, *_iban

Note: Payment card patterns handled in PCI-DSS separately
      But personal bank details = PII

Income / Financial Status:
  ├── salary, income, annualIncome
  ├── creditScore, creditRating
  ├── netWorth, assets, liabilities
  └── *_salary, *_income

Confidence: HIGH (0.92)
PII Type: DIRECT — FINANCIAL SENSITIVE
GDPR Article: Art. 9 (special category if combined with other data)
Action Required: Encrypt, restrict, audit trail
```

---

### PII Category 6 — DIGITAL IDENTIFIERS

**Online identifiers that can trace back to a person**

```
Device Identifiers:
  ├── ipAddress, ip_address, clientIp
  ├── deviceId, deviceIdentifier
  ├── macAddress, mac_address
  ├── imei, imsi (mobile device)
  └── *_ip, *_device_id

Browser / Session:
  ├── cookieId, sessionId, browserId
  ├── fingerprint, browserFingerprint
  ├── userAgent (combined with other data)
  └── *_cookie, *_session_id

Online Account Identifiers:
  ├── username, userName, userHandle
  ├── screenName, alias, handle
  ├── socialProfileUrl, linkedinUrl
  └── *_username, *_handle

Confidence:
  ├── IP Address alone: 0.75 (INDIRECT PII — GDPR Recital 30)
  ├── Device ID: 0.80
  ├── Cookie ID: 0.70
  └── Username: 0.65 (depends on if real name used)

GDPR Article: Recital 30 — online identifiers
Action Required: Hash or pseudonymize, consent for tracking
```

---

### PII Category 7 — DEMOGRAPHIC IDENTIFIERS

**Personal characteristics that can identify or profile**

```
Age / Birth:
  ├── dateOfBirth, dob, birthDate, birth_date
  ├── age, ageGroup, ageRange
  ├── birthYear, birthMonth, birthDay
  └── *_dob, *_birth_date

Gender:
  ├── gender, sex, genderIdentity
  ├── *_gender, *_sex
  └── pronouns

Ethnicity / Race:
  ├── ethnicity, race, nationality
  ├── *_ethnicity, *_race
  └── culturalBackground

Religion:
  ├── religion, religiousBeliefs, faith
  └── *_religion

Political:
  ├── politicalViews, politicalAffiliation
  └── partyMembership

Confidence:
  ├── Date of birth: 0.95 (DIRECT PII)
  ├── Gender: 0.70 (INDIRECT, context dependent)
  ├── Ethnicity/Religion: 0.99 (SPECIAL CATEGORY)
  └── Age alone: 0.40 (LOW risk)

GDPR Article:
  ├── DOB/Gender: Art. 4(1)
  └── Ethnicity/Religion/Political: Art. 9 SPECIAL CATEGORY
      (Highest protection — processing usually prohibited)
```

---

### PII Category 8 — BIOMETRIC IDENTIFIERS

**Physical characteristics unique to a person**

```
Biometric Data Patterns:
  ├── fingerprint, fingerprintData, fingerprintHash
  ├── faceId, facialRecognition, faceData
  ├── retinaScan, irisScan, eyeScan
  ├── voiceprint, voiceData, voiceSample
  ├── dnaData, geneticData, genome
  ├── palmPrint, handGeometry
  ├── signature, digitalSignature
  └── *_biometric, *_biometrics

Photo / Video:
  ├── photo, photograph, profilePhoto
  ├── avatar, profilePicture
  ├── videoId, videoCapture
  └── *_photo, *_image (person context)

Confidence: VERY HIGH (0.99)
PII Type: SPECIAL CATEGORY BIOMETRIC
GDPR Article: Art. 9(1) — biometric data for identification
Action Required:
  ├── Explicit consent REQUIRED
  ├── Cannot process without legal basis
  ├── Must have Data Protection Impact Assessment
  └── Cannot transfer outside EU without safeguards
```

---

### PII Category 9 — RELATIONSHIP IDENTIFIERS

**Fields that link records to a person indirectly**

```
User Reference Fields:
  ├── userId, user_id, createdBy
  ├── updatedBy, deletedBy, approvedBy
  ├── ownerId, assignedTo, managerId
  ├── customerId, clientId, memberId
  └── *_user_id, *_created_by

These are NOT PII themselves BUT:
  → They LINK to PII records
  → Must be treated as sensitive
  → Deleting user requires cascade consideration
  → GDPR right to erasure affects these

Confidence: MEDIUM (0.60)
PII Type: INDIRECT LINK
Action Required:
  ├── Ensure FK integrity
  ├── Handle in GDPR erasure flows
  └── Include in data subject access requests
```

---

## PART 2 — PHI DETECTION

### What Is PHI?

```
Protected Health Information =
Any health information that can be linked to a specific individual.

PHI = PII + Health Context

All 18 HIPAA identifiers must be protected.
PHI is a SUBSET of PII with stricter rules.

De-identified data = PHI with all 18 identifiers removed
                   = No longer regulated as PHI
```

---

### PHI Category 1 — PATIENT IDENTIFIERS (HIPAA 18)

**The 18 identifiers defined by HIPAA that make data PHI**

```
The 18 HIPAA Identifiers:

1. Names
   ├── patientName, patientFirstName, patientLastName
   └── (same as PII name patterns BUT in health context)

2. Geographic data (smaller than state)
   ├── patientAddress, patientCity, patientZip
   └── Any zip code with population < 20,000

3. Dates (except year) related to individual
   ├── admissionDate, dischargeDate, dateOfService
   ├── appointmentDate, procedureDate
   ├── birthDate (in health records)
   └── deathDate, dateOfDeath

4. Phone numbers
   └── patientPhone, emergencyContactPhone

5. Fax numbers
   └── patientFax

6. Email addresses
   └── patientEmail

7. Social Security Numbers
   └── ssn, patientSsn

8. Medical Record Numbers
   ├── mrn, medicalRecordNumber, medical_record_no
   ├── patientId (in EHR context)
   └── chartNumber, chartNo

9. Health Plan Beneficiary Numbers
   ├── insuranceId, insuranceNumber, memberId
   ├── beneficiaryNumber, policyNumber
   └── groupNumber, planId

10. Account Numbers
    └── patientAccountNumber, billingAccountId

11. Certificate / License Numbers
    ├── licenseNumber, certificateNumber
    └── providerLicenseNumber

12. Vehicle Identifiers
    ├── vehicleId, licensePlate
    └── (in context of accident/injury records)

13. Device Identifiers
    ├── deviceSerialNumber (medical devices)
    └── implantId, deviceId (medical context)

14. Web URLs
    └── patientPortalUrl, healthRecordUrl

15. IP Addresses
    └── patientIpAddress (in health system context)

16. Biometric Identifiers
    ├── fingerprint, retina, voiceprint
    └── (same as PII biometric BUT in health context)

17. Full-face photographs
    └── patientPhoto, patientImage

18. Any unique identifying number or code
    └── Any field that uniquely identifies patient

Confidence: VERY HIGH (0.98)
HIPAA Rule: Privacy Rule 45 CFR § 164.514
Action Required:
  ├── HIPAA Business Associate Agreement required
  ├── Minimum necessary standard applies
  ├── Access logging mandatory
  └── 60-day breach notification required
```

---

### PHI Category 2 — DIAGNOSIS & CONDITION

**Medical conditions and diagnoses**

```
Diagnosis Patterns:
  ├── diagnosis, diagnoses, primaryDiagnosis
  ├── secondaryDiagnosis, admittingDiagnosis
  ├── diagnosisCode, icd10Code, icd9Code
  ├── condition, medicalCondition
  ├── disease, disorder, syndrome
  └── *_diagnosis, *_condition, *_disease

Problem List Patterns:
  ├── problemList, activeProblem
  ├── chronicCondition, acuteCondition
  └── comorbidity, coMorbidity

Mental Health Specific:
  ├── mentalHealthDiagnosis, psychiatricDiagnosis
  ├── dsm5Code, dsmCode
  └── psychologicalCondition

Note: Mental health PHI has EXTRA protection
      under 42 CFR Part 2 (substance abuse)
      and many state laws

Confidence: VERY HIGH (0.97)
PHI Type: CLINICAL — DIAGNOSIS
Action Required:
  ├── Role-based access (treating clinicians only)
  ├── Full audit trail
  └── Mental health: stricter access rules
```

---

### PHI Category 3 — MEDICATION & TREATMENT

**What was prescribed or administered**

```
Medication Patterns:
  ├── medication, medicationName, drugName
  ├── prescription, prescriptionId
  ├── dosage, dose, doseAmount, doseUnit
  ├── frequency, sig, directions
  ├── ndc, ndcCode (National Drug Code)
  ├── rxNumber, prescriptionNumber
  └── *_medication, *_drug, *_prescription

Administration Patterns:
  ├── administeredBy, administeredAt
  ├── administrationRoute, routeOfAdmin
  └── administrationSite

Treatment Patterns:
  ├── treatment, treatmentPlan, carePlan
  ├── therapy, therapyType
  ├── intervention, procedure
  ├── surgicalProcedure, procedureCode
  └── cptCode (Current Procedural Terminology)

Substance Use (EXTRA PROTECTION — 42 CFR Part 2):
  ├── substanceUse, alcoholUse, drugUse
  ├── addictionHistory, recoveryStatus
  └── methadone, suboxone, naltrexone

Confidence: HIGH (0.95)
PHI Type: CLINICAL — TREATMENT
Action Required:
  ├── Pharmacy systems: PCI + HIPAA combined
  └── Substance use: CANNOT share without explicit consent
```

---

### PHI Category 4 — CLINICAL MEASUREMENTS

**Vital signs, lab results, clinical observations**

```
Vital Signs Patterns:
  ├── bloodPressure, systolic, diastolic
  ├── heartRate, pulse, pulseRate
  ├── temperature, bodyTemperature
  ├── respiratoryRate, breathingRate
  ├── oxygenSaturation, spo2, o2Sat
  ├── weight, bodyWeight, height
  ├── bmi, bodyMassIndex
  └── *_vitals, *_vital_sign

Lab Results Patterns:
  ├── labResult, labValue, testResult
  ├── labTestName, testName
  ├── referenceRange, normalRange
  ├── glucose, bloodGlucose, hba1c
  ├── cholesterol, ldl, hdl, triglycerides
  ├── hemoglobin, hematocrit, wbc, rbc
  ├── creatinine, bun, egfr
  ├── sodium, potassium, chloride
  └── *_result, *_lab_*, *_level (clinical context)

Imaging Patterns:
  ├── imagingStudy, imagingResult
  ├── xray, mri, ct_scan, ultrasound
  ├── ecg, eeg, echocardiogram
  └── pathologyReport, biopsyResult

Confidence: HIGH (0.93)
PHI Type: CLINICAL — MEASUREMENTS
Action Required:
  ├── Clinician access only
  ├── Patient portal: patient can view own results
  └── Research use: requires de-identification
```

---

### PHI Category 5 — PROVIDER & FACILITY INFORMATION

**Who provided care and where**

```
Provider Patterns:
  ├── providerId, providerName, physicianId
  ├── doctorId, doctorName, attendingPhysician
  ├── npi, npiNumber (National Provider Identifier)
  ├── renderingProvider, referringProvider
  ├── speciality, specialty
  └── *_provider, *_physician, *_doctor

Facility Patterns:
  ├── facilityId, facilityName, hospitalId
  ├── clinicId, clinicName
  ├── departmentId, ward, unit
  ├── room, roomNumber, bedNumber
  └── *_facility, *_hospital, *_clinic

Note: Provider info alone is NOT PHI
      But Provider + Patient + Date = PHI
      (Reveals patient was treated by that provider)

Confidence: MEDIUM (0.65) — context dependent
PHI Type: CONTEXTUAL — becomes PHI when linked to patient
Action Required: Treat as PHI when linked to patient record
```

---

### PHI Category 6 — INSURANCE & BILLING

**Health insurance and financial health data**

```
Insurance Patterns:
  ├── insurerId, insuranceName, payerId
  ├── memberId, memberNumber, policyId
  ├── groupId, groupNumber, planId
  ├── coverageType, benefitLevel
  ├── deductible, copay, coinsurance
  └── *_insurance, *_payer, *_coverage

Billing Patterns:
  ├── claimId, claimNumber, claimStatus
  ├── billingCode, revenueCode
  ├── chargeAmount, allowedAmount, paidAmount
  ├── eob, explanationOfBenefits
  └── *_claim, *_billing, *_charge

Authorization Patterns:
  ├── authorizationId, authCode, priorAuth
  ├── referralId, referralCode
  └── approvalCode

Confidence: HIGH (0.90)
PHI Type: FINANCIAL — HEALTH INSURANCE
Action Required:
  ├── HIPAA + state insurance regulations
  └── Cannot share with employer without consent
```

---

### PHI Category 7 — MENTAL HEALTH & SENSITIVE CONDITIONS

**Conditions with extra legal protection**

```
Mental Health Patterns:
  ├── mentalHealth, psychiatricHistory
  ├── therapyNotes, psychotherapy, counseling
  ├── suicidalIdeation, selfHarm
  ├── mentalStatus, cognitiveAssessment
  └── *_psychiatric, *_mental_health

Substance Use Patterns (42 CFR Part 2):
  ├── alcoholHistory, alcoholUse, aud
  ├── drugHistory, substanceUse, sud
  ├── addictionTreatment, rehabilitation
  ├── opioidUse, opioidTreatment
  └── *_substance, *_addiction

HIV/AIDS (Extra Protection in Many States):
  ├── hivStatus, hivResult, hivTest
  ├── aidsStatus, aidsRelated
  ├── antiretroviral, art
  └── cd4Count, viralLoad

Reproductive Health:
  ├── pregnancyStatus, pregnant
  ├── abortionHistory, reproductiveHistory
  ├── fertilityTreatment, ivf
  └── contraception, familyPlanning

Genetic Information (GINA Protection):
  ├── geneticTest, geneticResult
  ├── dnaTest, genomeSequence
  ├── hereditaryRisk, familyGeneticHistory
  └── *_genetic, *_gene_*

Confidence: VERY HIGH (0.99)
PHI Type: SENSITIVE — EXTRA LEGAL PROTECTION
Action Required:
  ├── Separate consent required (beyond HIPAA)
  ├── Cannot share with family without patient consent
  ├── Many state laws add additional restrictions
  └── Genetic: GINA prohibits use in employment/insurance
```

---

## The Detection Engine Logic — How It All Works Together

### Step by Step For Any Field

```
Input: field named "patientEmail" in table "appointments"

Step 1 — Name Pattern Check
  ├── Contains "Email" → PII Category 2 (Contact) match
  ├── Contains "patient" prefix → Health context signal
  └── Signal: PII + possible PHI

Step 2 — Table Context Check
  ├── Table name: "appointments"
  ├── Table is in: Health module
  ├── Table has: patientId FK
  └── Signal: DEFINITELY PHI context

Step 3 — Relationship Check
  ├── patientId → links to patients table
  ├── This field is LINKED to a patient record
  └── Signal: Combined with patient = PHI

Step 4 — Data Type Check
  ├── Type: VARCHAR(255)
  ├── Matches expected email format
  └── Signal: Confirms email field

Step 5 — Combine All Signals
  ├── PII: YES (email = direct PII)
  ├── PHI: YES (in health context, linked to patient)
  ├── HIPAA Identifier: YES (#5 — email addresses)
  └── Combined confidence: 0.97

Step 6 — Final Classification
  ├── PII Level: SENSITIVE (Level 3)
  ├── PHI Status: YES — HIPAA protected
  ├── Compliance: HIPAA, GDPR both apply
  └── Sensitivity: HIGH

Step 7 — Recommended Actions
  ├── MUST: Encrypt at rest
  ├── MUST: Encrypt in transit
  ├── MUST: Mask in application logs
  ├── MUST: Include in GDPR data export
  ├── MUST: Include in HIPAA audit trail
  ├── MUST: Remove/anonymize on patient deletion
  └── SHOULD: Add access control (treating staff only)
```

---

## Classification Output Structure

**What the Intelligence Bank stores per field after detection:**

```
Field: patientEmail (appointments table)

PII Detection Result:
  ├── isPII: true
  ├── piiCategory: CONTACT_IDENTIFIER
  ├── piiType: DIRECT
  ├── piiConfidence: 0.97
  ├── detectedBy: [name_pattern, context_check, relationship_check]
  └── gdprArticle: "Art. 4(1)"

PHI Detection Result:
  ├── isPHI: true
  ├── phiCategory: PATIENT_IDENTIFIER
  ├── hipaaIdentifier: 5 (email addresses)
  ├── phiConfidence: 0.97
  └── detectedBy: [context_check, table_module, patient_link]

Combined Classification:
  ├── sensitivityLevel: 3 (SENSITIVE)
  ├── complianceFrameworks: [HIPAA, GDPR]
  ├── requiresEncryption: true
  ├── requiresAuditTrail: true
  ├── maskInLogs: true
  ├── includeInDataExport: true
  └── includeInErasure: true

Evidence Trail:
  ├── evidence_1: "Field name contains 'Email' → PII contact pattern"
  ├── evidence_2: "Table 'appointments' is in health module → PHI context"
  ├── evidence_3: "Table has patientId FK → linked to patient record"
  └── evidence_4: "Data type VARCHAR(255) matches email format"

Required Actions:
  ├── action_1: "Encrypt at rest" [MANDATORY]
  ├── action_2: "Encrypt in transit" [MANDATORY]
  ├── action_3: "Mask in logs" [MANDATORY]
  ├── action_4: "Add to GDPR export flow" [MANDATORY]
  ├── action_5: "Add to HIPAA audit trail" [MANDATORY]
  └── action_6: "Add to erasure/anonymization flow" [MANDATORY]
```

---

## Summary — All PII & PHI Categories

### PII Categories (9 Total)

| # | Category | Example Fields | Risk Level | GDPR Article |
|---|----------|---------------|------------|--------------|
| 1 | Name Identifiers | firstName, lastName, fullName | HIGH | Art. 4(1) |
| 2 | Contact Identifiers | email, phone, mobile | HIGH | Art. 4(1) |
| 3 | Location Identifiers | address, zipCode, lat/lng | HIGH | Art. 4(1) |
| 4 | Government Identifiers | ssn, passportNumber, taxId | CRITICAL | Art. 87 |
| 5 | Financial Identifiers | bankAccount, iban, creditScore | HIGH | Art. 9 |
| 6 | Digital Identifiers | ipAddress, cookieId, deviceId | MEDIUM | Recital 30 |
| 7 | Demographic Identifiers | dob, gender, ethnicity, religion | SPECIAL | Art. 9 |
| 8 | Biometric Identifiers | fingerprint, faceId, dna | CRITICAL | Art. 9(1) |
| 9 | Relationship Identifiers | userId, customerId, createdBy | MEDIUM | Art. 4(1) |

### PHI Categories (7 Total)

| # | Category | Example Fields | Risk Level | HIPAA Rule |
|---|----------|---------------|------------|------------|
| 1 | Patient Identifiers (18) | mrn, patientId, memberId | CRITICAL | § 164.514 |
| 2 | Diagnosis & Condition | diagnosis, icd10Code, condition | CRITICAL | Privacy Rule |
| 3 | Medication & Treatment | medication, dosage, prescription | CRITICAL | Privacy Rule |
| 4 | Clinical Measurements | bloodPressure, labResult, vitals | HIGH | Privacy Rule |
| 5 | Provider & Facility | providerId, facilityId, npi | MEDIUM | Contextual |
| 6 | Insurance & Billing | memberId, claimId, policyId | HIGH | Privacy Rule |
| 7 | Sensitive Conditions | hivStatus, mentalHealth, geneticTest | CRITICAL | + Extra laws |

---

## The One Rule That Ties It All Together

```
COMBINATION RULE:
  Data that is NOT PII alone
  CAN BECOME PII when combined

  Example:
    gender alone      → NOT PII (0.15 confidence)
    zipCode alone     → NOT PII (0.30 confidence)
    dateOfBirth alone → MAYBE PII (0.50 confidence)
    
    gender + zipCode + dateOfBirth TOGETHER
    → 87% chance of uniquely identifying a person
    → BECOMES PII by combination
    → GDPR applies
    → Called "Quasi-identifier" problem

  The Intelligence Bank must:
    → Track which fields are quasi-identifiers
    → Flag when a table has 3+ quasi-identifiers
    → Warn: "This combination can identify individuals"
```

> This combination detection is what separates a basic field scanner from a true intelligence system — it understands that **context and combination matter as much as the field name itself**.

# Rule Application System - Phase 1: PII & PHI Field Detection

## Rule Hierarchy Structure

```
INTELLIGENCE BANK RULE ENGINE
│
├── PII DETECTION RULES
│   ├── Level 1: Direct Identifiers
│   │   ├── 🔴 CRITICAL (High Confidence)
│   │   │   ├── SSN Pattern (XXX-XX-XXXX)
│   │   │   ├── Email Address (RFC 5322)
│   │   │   ├── Phone Number (E.164 / Intl formats)
│   │   │   └── IP Address (v4 / v6)
│   │   │
│   │   ├── 🟠 HIGH (Medium Confidence)
│   │   │   ├── Full Name Patterns
│   │   │   ├── Date of Birth
│   │   │   ├── Physical Address
│   │   │   ├── Passport Number
│   │   │   └── Driver's License
│   │   │
│   │   └── 🟡 MEDIUM (Lower Confidence)
│   │       ├── Username / Handle
│   │       ├── Employee ID
│   │       └── Vehicle ID / VIN
│   │
│   ├── Level 2: Quasi-Identifiers (Re-identification Risk)
│   │   ├── ZIP Code + Birthdate combination
│   │   ├── Gender + Age + Location
│   │   └── Race/Religion inferred from context
│   │
│   └── Level 3: Behavioral / Derived
│       ├── Fingerprint / Device Hash
│       ├── Behavioral Pattern IDs
│       └── Pseudonymous Identifiers
│
└── PHI DETECTION RULES
    ├── Level 1: Direct Medical Identifiers (HIPAA Critical)
    │   ├── 🔴 CRITICAL (Highest Risk)
    │   │   ├── Medical Record Number (MRN)
    │   │   ├── Health Insurance Account Number
    │   │   ├── Social Security Number (Medical Context)
    │   │   └── Patient Account Number
    │   │
    │   ├── 🟠 HIGH
    │   │   ├── Diagnosis Codes (ICD-10)
    │   │   ├── Procedure Codes (CPT / HCPCS)
    │   │   ├── Prescription Codes (NDC)
    │   │   └── Lab Test Identifiers (LOINC)
    │   │
    │   └── 🟡 MEDIUM
    │       ├── Provider NPI Number
    │       ├── Facility ID
    │       └── Device Serial Numbers (Medical)
    │
    ├── Level 2: Medical Context Data
    │   ├── Physician Notes
    │   ├── Treatment Plans
    │   ├── Lab Results
    │   └── Prescription History
    │
    └── Level 3: Genetic / Biometric
        ├── DNA / Genetic Sequences
        ├── Biometric Templates (Medical Use)
        └── Mental Health Records
```

---

## Column Name Pattern Rules

### PII Name Patterns (Regex-Based Detection)

```
RULE: pii_name_fields
├── Trigger Conditions (Column Name Matches ANY):
│   ├── exact: [first_name, last_name, full_name, surname, given_name]
│   ├── contains: [name, username, login, credential, user_id, userid]
│   ├── contains: [email, mail, e_mail]
│   ├── contains: [phone, mobile, tel, fax, cellphone]
│   ├── contains: [ssn, social_security, tax_id, ein, national_id]
│   ├── contains: [address, street, city, state, zip, postal, country]
│   ├── contains: [dob, birth_date, birthdate, birthday, date_of_birth]
│   ├── contains: [ip_address, ip_addr, client_ip, remote_ip]
│   └── contains: [passport, driver_license, dl_number, license_no]
│
└── Confidence Scoring:
    ├── Exact Match (ssn, email): 0.95
    ├── Contains Match (first_name): 0.85
    └── Partial Match (name): 0.60
```

### PHI Name Patterns (Medical Context)

```
RULE: phi_medical_fields
├── Trigger Conditions (Column Name Matches ANY):
│   ├── exact: [mrn, medical_record_number, patient_id, patient_num]
│   ├── contains: [patient, medical, health, clinical, diagnosis]
│   ├── contains: [prescription, rx, drug, medication, pharma]
│   ├── contains: [lab, test, specimen, result, report]
│   ├── contains: [treatment, therapy, procedure, surgery, operation]
│   ├── contains: [insurance, payer, claim, coverage, benefit]
│   ├── contains: [provider, physician, doctor, nurse, clinician]
│   ├── contains: [npi, ndc, icd, cpt, loinc, snomed]
│   └── contains: [biometric, fingerprint, retina, genetic, dna]
│
└── Confidence Scoring:
    ├── Exact MRN Match: 0.98
    ├── Contains patient_* : 0.90
    ├── Contains *_code (icd, cpt): 0.85
    └── Contains medical_*: 0.75
```

---

## Data Value Pattern Rules (Regex)

### PII Value Patterns

```
RULE: pii_value_patterns
├── SSN (US):
│   Pattern: ^\d{3}-\d{2}-\d{4}$
│   Sample: 123-45-6789
│   Confidence: 0.99
│
├── Email:
│   Pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
│   Sample: john.doe@example.com
│   Confidence: 0.95
│
├── Phone (International E.164):
│   Pattern: ^\+[1-9]\d{1,14}$
│   Sample: +14155551234
│   Confidence: 0.90
│
├── Phone (US):
│   Pattern: ^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$
│   Sample: (415) 555-1234
│   Confidence: 0.85
│
├── IP Address v4:
│   Pattern: ^(\d{1,3}\.){3}\d{1,3}$
│   Sample: 192.168.1.1
│   Confidence: 0.80 (needs validation range)
│
└── Date of Birth:
    Pattern: ^\d{4}-\d{2}-\d{2}$ (ISO)
    Sample: 1990-01-15
    Context Check: Value < current_date - 13 years (adult threshold)
    Confidence: 0.75 (needs column context)
```

### PHI Value Patterns

```
RULE: phi_value_patterns
├── ICD-10 Diagnosis Code:
│   Pattern: ^[A-Z]\d{2}(\.\d{1,4})?$
│   Sample: J44.0, M54.5, Z23
│   Confidence: 0.95
│
├── CPT Procedure Code:
│   Pattern: ^[0-9]{5}$
│   Sample: 99213, 90834, 99395
│   Confidence: 0.90
│
├── NDC (National Drug Code):
│   Pattern: ^\d{4}-\d{4}-\d{2}$ OR ^\d{5}-\d{4}-\d{2}$ OR ^\d{11}$
│   Sample: 0002-4462-01
│   Confidence: 0.95
│
├── LOINC Lab Code:
│   Pattern: ^\d{1,5}-\d{1,3}$
│   Sample: 4548-4, 2339-0
│   Confidence: 0.95
│
├── NPI (National Provider Identifier):
│   Pattern: ^[0-9]{10}$
│   Sample: 1234567890
│   Luhn Check: Required
│   Confidence: 0.98
│
└── MRN (Medical Record Number):
    Pattern: Varies by institution (6-12 digits common)
    Heuristic: 6-12 digit number in patient_* context
    Confidence: 0.70 (needs column context)
```

---

## Cross-Field Context Rules

### PII Composite Detection

```
RULE: pii_composite_fields
├── Trigger: 3+ PII-adjacent columns in same table
│   Example: [first_name, last_name, email, phone, address] in table 'contacts'
│   Confidence Boost: +0.10 per additional PII field
│   → If table has 5 PII fields: Likely customer contact table
│
├── Trigger: SSN column + Date of Birth column
│   → Flag as "High Risk PII Cluster"
│   → Auto-enable: encryption_required = true
│
└── Trigger: Email pattern in column named *_hash OR *_token
    → May be pseudonymous but still personal
    → Confidence: 0.70 (could be hashed identifier)
```

### PHI Composite Detection

```
RULE: phi_composite_fields
├── Trigger: MRN column + Any Diagnosis/Treatment column
│   → Confirms medical context
│   → Confidence: 0.99 (HIPAA Critical)
│
├── Trigger: Patient ID + Insurance columns
│   → Insurance claim data
│   → Flag as: PHI + Financial
│
├── Trigger: Medical context + Physician identifier
│   → Treatment record
│   → Audit trail required
│
└── Trigger: Any PHI column + Genetic/Biometric prefix
    → Highest sensitivity category
    → Manual review recommended
```

---

## Detection Output Schema

```
DETECTED FIELD → INTELLIGENCE BANK ENTRY

{
  "entity_ref": "patients.ssn",
  "detection_source": "value_pattern",        // name_pattern | value_pattern | context_inference
  "pii_phi_classification": {
    "category": "PII",                         // PII | PHI | PCI | SPII | NONE
    "sub_category": "direct_identifier",
    "specific_type": "ssn",
    "confidence": 0.99,
    "detection_method": "regex_value_match"
  },
  "naming_analysis": {
    "column_name": "ssn",
    "pattern_match": "exact",
    "fuzzy_score": 1.0
  },
  "value_analysis": {
    "pattern_detected": "^\\d{3}-\\d{2}-\\d{4}$",
    "sample_value_hash": "SHA256(first_3_chars)",  // Don't store actual SSN
    "format_valid": true
  },
  "context_analysis": {
    "table_name": "patients",
    "related_columns": ["dob", "first_name", "last_name", "insurance_id"],
    "cluster_risk": "critical",
    "table_context": "medical_patient_record"
  },
  "compliance_flags": {
    "requires_encryption": true,
    "audit_logging_required": true,
    "access_control_level": "restricted",
    "retention_policy": "legal_obligation_7years"
  },
  "next_rules_to_evaluate": [
    "phi_composite_fields",
    "phi_value_patterns"
  ]
}
```

---

## Rule Evaluation Order (Processing Pipeline)

```
STEP 1: Column Name Scan (Fast, High Coverage)
├── Run: pii_name_fields
├── Run: phi_medical_fields
├── Output: Candidate list with base confidence
└── Time: ~10ms per table

STEP 2: Value Sampling (Medium Speed, Confirmation)
├── Sample: First 100 non-null values per candidate
├── Run: pii_value_patterns
├── Run: phi_value_patterns
├── Output: Confidence boost or override
└── Time: ~50ms per column

STEP 3: Context Aggregation (Slow, High Accuracy)
├── Analyze: Table-level column clustering
├── Analyze: Related tables (FK relationships)
├── Analyze: Table naming conventions
├── Output: Composite risk scores
└── Time: ~200ms per table

STEP 4: Compliance Mapping (Rule Engine)
├── Match: Detected types → Regulatory requirements
├── Generate: Encryption/audit flags
├── Generate: Retention policy suggestions
└── Output: Actionable recommendations
```

---

## Next Steps After PII/PHI Detection

Once PII and PHI are classified, **subsequent rules** can cascade:

```
PII DETECTED → Apply:
├── Rule: pii_encryption_check
├── Rule: pii_consent_tracking
├── Rule: pii_data_minimization_audit
└── Rule: pii_retention_policy_enforcement

PHI DETECTED → Apply:
├── Rule: hipaa_access_control
├── Rule: hipaa_audit_trail
├── Rule: phi_consent_chain
├── Rule: phi_minimum_necessary_check
└── Rule: phi_differential_privacy_check (for analytics exports)
```

---

## Questions Before Implementation

1. **Source Priority**: Should the system prioritize **column name patterns** (fast, infer from schema) or **data value sampling** (accurate, requires DB access)?

2. **Initial Confidence**: For the first scan, should we start with **strict rules only** (confidence >0.90) or **inclusive rules** (capture everything, let human review)?

3. **Existing Taxonomy**: Does your Schema Builder already have **any** classification system for fields? (e.g., "sensitive" flag in column metadata)

4. **Immediate Use Case**: Is this for **compliance reporting** (generate audit reports) or **proactive protection** (auto-encrypt flagged fields)?

Once you answer these, I can draft the **Rule Definition JSON Schema** that the Intelligence Bank will store and execute.

# Planning — PCI Field Detection & DB Standard Compliance

## PART 1 — PCI-DSS FIELD DETECTION

### What Is PCI-DSS?

```
Payment Card Industry Data Security Standard =
A set of security standards designed to ensure that
ALL companies that accept, process, store, or transmit
credit card information maintain a secure environment.

Governed by: PCI Security Standards Council
Founded by: Visa, Mastercard, American Express, 
            Discover, JCB International

Non-compliance penalties:
  ├── Fines: $5,000 to $100,000 per month
  ├── Increased transaction fees
  ├── Card processing termination
  └── Legal liability for breaches
```

### The Core PCI Concept — Cardholder Data Environment (CDE)

```
CDE = Any system that stores, processes, or transmits
      cardholder data or sensitive authentication data

Cardholder Data (CD):
  ├── PAN (Primary Account Number) — card number
  ├── Cardholder Name
  ├── Expiration Date
  └── Service Code

Sensitive Authentication Data (SAD):
  ├── Full magnetic stripe data
  ├── CAV2/CVC2/CVV2/CID (security codes)
  └── PINs / PIN blocks

CRITICAL RULE:
  SAD must NEVER be stored after authorization
  Even if encrypted — NEVER store CVV/CVV2
  PAN can be stored but MUST be protected
```

---

## PCI Category 1 — PRIMARY ACCOUNT NUMBER (PAN)

**The card number itself — highest sensitivity**

```
Direct Field Name Patterns:
  ├── cardNumber, card_number, cardNo
  ├── pan, panNumber, primaryAccountNumber
  ├── creditCardNumber, creditCard
  ├── debitCardNumber, debitCard
  ├── accountNumber (payment context)
  └── *_card_number, *_pan

Masked/Tokenized Variants:
  ├── maskedCardNumber, maskedPan
  ├── tokenizedCard, cardToken
  ├── lastFourDigits, last4, cardLast4
  ├── firstSixDigits, bin, cardBin
  └── *_token, *_masked_*

Context Signals That Confirm PAN:
  ├── Table named: payments, transactions, cards
  ├── Table named: billing, invoices, orders
  ├── Data type: VARCHAR(16-19) numeric
  └── Has related fields: expiry, cvv, cardHolder

PCI Classification:
  ├── Raw PAN:           MUST PROTECT — storage restricted
  ├── Masked PAN:        SAFE to store (show last 4 only)
  ├── Tokenized PAN:     SAFE to store (no card data)
  └── Encrypted PAN:     CAN store with key management

Confidence:
  ├── cardNumber exact match: 0.99
  ├── pan exact match: 0.98
  ├── last4/masked variant: 0.85
  └── accountNumber (payment context): 0.80

PCI-DSS Requirement: Req 3 — Protect stored cardholder data
Action Required:
  ├── NEVER store raw PAN without encryption
  ├── Mask when displaying (show only last 4)
  ├── Use tokenization when possible
  ├── Strong cryptography if storing
  └── Restrict access to minimum necessary
```

---

## PCI Category 2 — CARD SECURITY CODES

**CVV/CVC/CID — the most restricted PCI data**

```
Security Code Field Patterns:
  ├── cvv, cvv2, cvc, cvc2
  ├── cid, csc (Card Security Code)
  ├── cardVerificationValue
  ├── cardVerificationCode
  ├── securityCode, card_security_code
  ├── verificationCode (payment context)
  └── *_cvv, *_cvc, *_cid, *_security_code

Magnetic Stripe Data Patterns:
  ├── trackData, track1, track2, track3
  ├── magneticStripe, magstripe
  ├── fullTrackData, rawTrackData
  └── *_track_data, *_magnetic_*

PIN Related Patterns:
  ├── pin, pinNumber, pinCode
  ├── pinBlock, encryptedPin
  └── *_pin (payment context)

THE ABSOLUTE RULE:
  ┌─────────────────────────────────────────────┐
  │  CVV / CVV2 / CVC2 / CID                   │
  │  MUST NEVER BE STORED                       │
  │  Not even encrypted                         │
  │  Not even hashed                            │
  │  Not in logs                                │
  │  Not in database                            │
  │  Not anywhere — PERIOD                      │
  │                                             │
  │  PCI-DSS Requirement 3.2.1                  │
  └─────────────────────────────────────────────┘

Confidence:
  ├── cvv/cvc exact match: 1.00 (absolute detection)
  ├── securityCode (payment context): 0.95
  └── verificationCode (payment context): 0.85

Action Required:
  ├── FLAG immediately if field exists in schema
  ├── Check if data is actually being stored
  ├── BLOCK storage at application layer
  ├── Alert: "This field violates PCI-DSS 3.2.1"
  └── Remove field from schema if found
```

---

## PCI Category 3 — CARDHOLDER NAME

**The name as it appears on the card**

```
Cardholder Name Patterns:
  ├── cardholderName, cardholder_name
  ├── nameOnCard, name_on_card
  ├── cardName, cardOwnerName
  ├── billingName, payerName
  └── *_cardholder_name, *_name_on_card

Context Detection:
  ├── name field in payments/billing table
  ├── Adjacent to cardNumber or pan field
  ├── Adjacent to expiry or cvv field
  └── In card/payment related form

Note:
  Cardholder name alone = LOW PCI risk
  Cardholder name + PAN = HIGH PCI risk
  (Combination rule applies — same as PII)

Confidence:
  ├── cardholderName exact: 0.97
  ├── nameOnCard exact: 0.97
  ├── name (adjacent to card fields): 0.80
  └── billingName (billing table): 0.75

PCI-DSS Requirement: Req 3.3
Action Required:
  ├── Can store but should encrypt
  ├── Mask in logs and display
  └── Include in cardholder data inventory
```

---

## PCI Category 4 — CARD EXPIRATION DATE

**When the card expires**

```
Expiry Field Patterns:
  ├── expiryDate, expiry_date, expirationDate
  ├── cardExpiry, cardExpiration
  ├── expMonth, expiryMonth, expYear, expiryYear
  ├── validThrough, validUntil
  ├── mmyy, mmyyyy (format-named fields)
  └── *_expiry, *_expiration, *_exp_date

Context Signals:
  ├── In same table as cardNumber
  ├── Data type: DATE or VARCHAR(4-7)
  ├── Format hint: MM/YY or MM/YYYY
  └── Adjacent to cardholderName

Confidence:
  ├── expiryDate (payment context): 0.96
  ├── expMonth + expYear together: 0.95
  └── validThrough (payment context): 0.85

PCI-DSS Requirement: Req 3.3
Action Required:
  ├── Can store — considered less sensitive than PAN
  ├── Encrypt when stored with PAN
  └── Never log in plaintext
```

---

## PCI Category 5 — BANK ACCOUNT & TRANSFER DATA

**ACH, wire transfer, direct debit information**

```
Bank Account Patterns:
  ├── bankAccountNumber, bank_account_number
  ├── accountNumber (banking context)
  ├── checkingAccount, savingsAccount
  ├── iban, ibanNumber
  └── *_bank_account, *_account_number

Routing / Sort Code Patterns:
  ├── routingNumber, routing_number, aba
  ├── sortCode, sort_code, bsb
  ├── transitNumber, institutionNumber
  └── *_routing, *_sort_code

Wire Transfer Patterns:
  ├── swiftCode, swift, bic
  ├── wireInstructions, wireDetails
  └── *_swift, *_bic

ACH Patterns:
  ├── achRoutingNumber, achAccountNumber
  ├── achTransactionCode
  └── *_ach_*

Note: Bank account data is regulated by:
  ├── PCI-DSS (if linked to payment processing)
  ├── GLBA (USA banking privacy)
  ├── PSD2 (EU payment services)
  └── Individual country banking regulations

Confidence:
  ├── bankAccountNumber exact: 0.97
  ├── iban exact: 0.98
  ├── routingNumber exact: 0.95
  └── accountNumber (banking context): 0.85

Action Required:
  ├── Encrypt at rest
  ├── Restrict API exposure
  ├── Audit trail on access
  └── Mask in display (show last 4 only)
```

---

## PCI Category 6 — PAYMENT TRANSACTION DATA

**Transaction records and payment history**

```
Transaction Identifier Patterns:
  ├── transactionId, transaction_id, txnId
  ├── paymentId, payment_id
  ├── authorizationCode, authCode
  ├── approvalCode, referenceNumber
  └── *_transaction_id, *_payment_id

Amount Patterns:
  ├── amount, paymentAmount, transactionAmount
  ├── chargeAmount, settlementAmount
  ├── refundAmount, disputeAmount
  ├── subtotal, totalAmount, grandTotal
  └── *_amount (payment context)

Status Patterns:
  ├── paymentStatus, transactionStatus
  ├── authorizationStatus, settlementStatus
  ├── chargeStatus, refundStatus
  └── *_payment_status, *_transaction_status

Gateway Patterns:
  ├── gatewayTransactionId, gatewayResponse
  ├── processorResponse, acquirerResponse
  ├── stripePaymentIntentId, stripeChargeId
  ├── paypalTransactionId, paypalOrderId
  └── *_gateway_*, *_processor_*

Note:
  Transaction records are NOT sensitive by themselves
  BUT combined with cardholder data = PCI scope
  Keep transaction IDs separate from card data

Confidence:
  ├── transactionId (payment context): 0.75
  ├── authorizationCode: 0.85
  ├── gatewayTransactionId: 0.90
  └── amount (payment table): 0.70

Action Required:
  ├── Separate from cardholder data where possible
  ├── Use tokenization to decouple card from transaction
  └── Retain per PCI requirement (1 year online, 3 years archive)
```

---

## PCI Category 7 — PAYMENT METHOD METADATA

**Non-sensitive card information safe to store**

```
Card Type Patterns:
  ├── cardType, card_type, cardBrand
  ├── cardNetwork, paymentNetwork
  ├── cardScheme (Visa, Mastercard, Amex, Discover)
  └── *_card_type, *_card_brand

BIN (Bank Identification Number):
  ├── bin, binNumber, cardBin
  ├── issuingBank, cardIssuer
  ├── issuerCountry, cardCountry
  └── *_bin (first 6 digits of card)

Funding Type:
  ├── fundingType (credit/debit/prepaid)
  ├── cardCategory, cardLevel
  └── cardTier (classic/gold/platinum)

Safe Storage Note:
  These fields are considered SAFE to store unencrypted
  They do NOT contain actual payment credentials
  Used for analytics, routing, display purposes
  BIN alone cannot reconstruct a card number

Confidence:
  ├── cardType/cardBrand: 0.70 (PCI adjacent, not PCI)
  ├── bin (payment context): 0.80 (low sensitivity)
  └── fundingType: 0.60 (metadata only)

Action Required:
  ├── No encryption required
  ├── Useful for payment analytics
  └── Still include in cardholder data inventory
```

---

## PCI Category 8 — DIGITAL WALLET & MODERN PAYMENT

**Newer payment methods that fall under PCI scope**

```
Digital Wallet Patterns:
  ├── walletToken, walletId
  ├── applePayToken, googlePayToken
  ├── samsungPayToken, paypalToken
  └── *_wallet_token, *_pay_token

Cryptocurrency Patterns:
  ├── walletAddress, cryptoAddress
  ├── publicKey, privateKey (crypto context)
  ├── bitcoinAddress, ethereumAddress
  └── *_wallet_address, *_crypto_*

Buy Now Pay Later:
  ├── bnplToken, klarnaToken, afterpayToken
  └── *_bnpl_*

Note:
  Crypto wallet addresses = NOT PCI-DSS regulated
  But private keys = MUST protect like passwords
  Digital wallet tokens = PCI scope if linked to card

Confidence:
  ├── applePayToken: 0.90 (PCI scope)
  ├── walletAddress (crypto): 0.70 (not PCI but sensitive)
  └── privateKey (crypto): 0.99 (MUST protect)

Action Required:
  ├── Digital wallet tokens: treat as PCI
  ├── Crypto private keys: treat as passwords (hash/encrypt)
  └── Crypto public addresses: can store plaintext
```

---

## PCI Detection Summary Table

| Category | Key Fields | Never Store | Must Encrypt | Can Store |
|----------|-----------|-------------|--------------|-----------|
| PAN | cardNumber, pan | Raw PAN (prefer tokenize) | If stored | Masked/Tokenized |
| Security Codes | cvv, cvc, pin | ✅ ALWAYS — never store | N/A | NEVER |
| Cardholder Name | cardholderName | No restriction | Recommended | Yes |
| Expiry Date | expiryDate, expMonth | No restriction | With PAN | Yes |
| Bank Account | iban, routingNumber | No restriction | Yes | Yes (encrypted) |
| Transaction Data | transactionId, authCode | No restriction | Recommended | Yes |
| Card Metadata | cardType, bin | Not needed | Not needed | Yes freely |
| Digital Wallet | applePayToken | No restriction | Yes | Yes (encrypted) |

---

## PART 2 — BASIC DB STANDARD COMPLIANCE CHECK

### What This Checks

```
Every table and field in the database is checked against
a set of standards that define what a "well-designed"
database looks like.

This is NOT about security — it's about:
  ├── Naming consistency
  ├── Structural completeness
  ├── Relationship integrity
  ├── Data quality foundations
  └── Maintainability standards
```

---

## DB Standard Check 1 — TABLE NAMING CONVENTIONS

```
Rule Set: Table Naming

Check 1.1 — Plural vs Singular Consistency
  Standard: All tables should use same convention
  
  Detect:
    ├── "user" and "orders" in same DB → INCONSISTENT
    ├── All plural → PASS
    └── All singular → PASS (as long as consistent)
  
  Severity: MEDIUM
  Auto-fixable: YES (rename with migration)

Check 1.2 — Case Convention
  Standard: snake_case for SQL databases
             PascalCase for Prisma models
  
  Detect:
    ├── "UserOrders" in SQL table → FAIL (use user_orders)
    ├── "userorders" in SQL table → FAIL (use user_orders)
    ├── "user_orders" in SQL table → PASS
    └── "UserOrders" in Prisma model → PASS
  
  Severity: MEDIUM
  Auto-fixable: YES

Check 1.3 — Reserved Word Usage
  Standard: Table names must not be SQL reserved words
  
  Detect:
    ├── Table named "order" → FAIL (reserved word)
    ├── Table named "group" → FAIL (reserved word)
    ├── Table named "user" → WARNING (reserved in some DBs)
    └── Table named "orders" → PASS
  
  Severity: HIGH
  Auto-fixable: YES (rename table)

Check 1.4 — Prefix / Suffix Anti-Patterns
  Standard: No Hungarian notation or redundant prefixes
  
  Detect:
    ├── "tbl_Users" → FAIL (tbl_ prefix unnecessary)
    ├── "t_Users" → FAIL (t_ prefix)
    ├── "UsersTable" → FAIL (Table suffix redundant)
    └── "users" → PASS
  
  Severity: LOW
  Auto-fixable: YES

Check 1.5 — Length Limit
  Standard: Table names ≤ 63 characters (PostgreSQL limit)
             Table names ≤ 128 characters (SQL Server limit)
  
  Detect: Any table name exceeding limit
  Severity: HIGH
  Auto-fixable: NO (requires human decision on rename)
```

---

## DB Standard Check 2 — COLUMN NAMING CONVENTIONS

```
Rule Set: Column Naming

Check 2.1 — Case Convention
  Standard: snake_case in SQL, camelCase in Prisma
  
  Detect:
    ├── "FirstName" in SQL column → FAIL
    ├── "firstname" in SQL column → FAIL  
    ├── "first_name" in SQL column → PASS
    └── "firstName" in Prisma field → PASS
  
  Severity: MEDIUM
  Auto-fixable: YES

Check 2.2 — Boolean Field Naming
  Standard: Boolean fields should have is/has/can prefix
  
  Detect:
    ├── "active" (boolean) → WARNING (use "isActive")
    ├── "deleted" (boolean) → WARNING (use "isDeleted")
    ├── "verified" (boolean) → WARNING (use "isVerified")
    ├── "isActive" (boolean) → PASS
    ├── "hasChildren" (boolean) → PASS
    └── "canEdit" (boolean) → PASS
  
  Severity: LOW
  Auto-fixable: YES

Check 2.3 — Foreign Key Naming
  Standard: FK columns = referencedTableSingular + "Id"
  
  Detect:
    ├── "user" (FK to users) → FAIL (use "userId")
    ├── "user_ref" (FK to users) → FAIL
    ├── "userId" (FK to users) → PASS
    ├── "tenantId" (FK to tenants) → PASS
    └── "created_by_user_id" → WARNING (too verbose)
  
  Severity: MEDIUM
  Auto-fixable: YES

Check 2.4 — Date/Time Field Naming
  Standard: Date fields end with "At" (timestamp) or "Date"
  
  Detect:
    ├── "created" (timestamp) → FAIL (use "createdAt")
    ├── "updated" (timestamp) → FAIL (use "updatedAt")
    ├── "createdAt" → PASS
    ├── "updatedAt" → PASS
    ├── "birthDate" → PASS
    └── "appointmentDate" → PASS
  
  Severity: LOW
  Auto-fixable: YES

Check 2.5 — Abbreviation Consistency
  Standard: No unexplained abbreviations
  
  Detect:
    ├── "usr_nm" → FAIL (use "username")
    ├── "dept_cd" → FAIL (use "departmentCode")
    ├── "amt" → WARNING (use "amount")
    └── "id" → PASS (universally understood)
  
  Severity: LOW
  Auto-fixable: NO (requires human to know intent)
```

---

## DB Standard Check 3 — PRIMARY KEY STANDARDS

```
Rule Set: Primary Key

Check 3.1 — Every Table Has a Primary Key
  Standard: Every table MUST have a PK
  
  Detect:
    ├── Table with no PK defined → FAIL (CRITICAL)
    ├── Table with composite PK → WARNING (review needed)
    └── Table with single PK → PASS
  
  Severity: CRITICAL
  Auto-fixable: PARTIAL (can add id column, cannot choose type)

Check 3.2 — Primary Key Naming
  Standard: PK column should be named "id"
  
  Detect:
    ├── "userId" as PK in users table → WARNING
    ├── "user_id" as PK → WARNING
    ├── "pk_user" as PK → FAIL
    └── "id" as PK → PASS
  
  Severity: LOW
  Auto-fixable: YES

Check 3.3 — Primary Key Type
  Standard: PK should be auto-generated
             Options: INT IDENTITY, UUID, CUID
  
  Detect:
    ├── PK is user-provided string → WARNING
    ├── PK is composite natural key → WARNING
    ├── PK is INT IDENTITY → PASS
    ├── PK is UUID default → PASS
    └── PK is CUID default → PASS
  
  Severity: MEDIUM
  Auto-fixable: NO (major schema change)

Check 3.4 — No Business Data in Primary Key
  Standard: PK should have no business meaning
  
  Detect:
    ├── PK = email address → FAIL
    ├── PK = social security number → FAIL
    ├── PK = invoice number → WARNING
    └── PK = auto-generated UUID → PASS
  
  Severity: HIGH
  Auto-fixable: NO (requires data migration)
```

---

## DB Standard Check 4 — REQUIRED SYSTEM COLUMNS

```
Rule Set: Standard Columns Every Table Should Have

Check 4.1 — Audit Timestamps
  Standard: Every table needs createdAt and updatedAt
  
  Detect per table:
    ├── Missing "createdAt" → WARNING
    ├── Missing "updatedAt" → WARNING
    ├── Has "created_date" but not "createdAt" → NAMING issue
    └── Has both → PASS
  
  Severity: MEDIUM
  Auto-fixable: YES (add columns with defaults)

Check 4.2 — Soft Delete Column
  Standard: Tables that support soft delete need "deletedAt"
  
  Detect:
    ├── Has "isDeleted" boolean → WARNING (use deletedAt)
    ├── Has "deleted" boolean → WARNING (use deletedAt)
    ├── Has "deletedAt" timestamp → PASS
    └── No delete column → OK (if hard delete intended)
  
  Severity: LOW
  Auto-fixable: YES

Check 4.3 — Tenant Isolation Column
  Standard: In multi-tenant apps, every data table 
            needs "tenantId"
  
  Detect:
    ├── No tenantId in user-data table → FAIL (multi-tenant)
    ├── tenantId exists but no FK defined → WARNING
    ├── tenantId with proper FK → PASS
    └── System table (no tenant needed) → EXEMPT
  
  Severity: CRITICAL (in multi-tenant context)
  Auto-fixable: PARTIAL (add column, data migration needed)

Check 4.4 — Created By / Updated By
  Standard: Audited tables should track who made changes
  
  Detect:
    ├── Missing "createdBy" (userId FK) → WARNING
    ├── Missing "updatedBy" (userId FK) → WARNING
    ├── Has both with FK to users → PASS
    └── System table (no user context) → EXEMPT
  
  Severity: LOW
  Auto-fixable: YES
```

---

## DB Standard Check 5 — FOREIGN KEY STANDARDS

```
Rule Set: Foreign Key Integrity

Check 5.1 — All FK Columns Have Constraints Defined
  Standard: If column name ends in "Id" and references
            another table, it MUST have FK constraint
  
  Detect:
    ├── "userId" with no FK constraint → FAIL
    ├── "tenantId" with no FK constraint → FAIL
    ├── "userId" with FK to users.id → PASS
    └── "statusId" with FK to statuses.id → PASS
  
  Severity: HIGH
  Auto-fixable: PARTIAL (generate constraint, verify target)

Check 5.2 — FK Column Has Index
  Standard: Every FK column must be indexed
  
  Detect:
    ├── userId (FK) with no index → FAIL
    ├── tenantId (FK) with no index → FAIL
    ├── userId (FK) with index → PASS
    └── Composite FK with composite index → PASS
  
  Severity: HIGH (performance critical)
  Auto-fixable: YES (CREATE INDEX)

Check 5.3 — Cascade Rules Defined
  Standard: FK must have explicit ON DELETE behavior
  
  Detect:
    ├── FK with no ON DELETE → WARNING
    ├── FK with ON DELETE CASCADE → PASS (verify intended)
    ├── FK with ON DELETE RESTRICT → PASS
    ├── FK with ON DELETE SET NULL → PASS (check nullable)
    └── FK with ON DELETE SET DEFAULT → PASS
  
  Severity: MEDIUM
  Auto-fixable: NO (business decision required)

Check 5.4 — Circular FK References
  Standard: No circular FK dependencies
  
  Detect:
    ├── A → B → C → A (circular) → FAIL
    ├── A → B → C (no circle) → PASS
    └── Self-reference (parentId) → WARNING (document intent)
  
  Severity: HIGH
  Auto-fixable: NO (requires redesign)
```

---

## DB Standard Check 6 — DATA TYPE STANDARDS

```
Rule Set: Appropriate Data Types

Check 6.1 — String Length Appropriateness
  Standard: VARCHAR length should match business reality
  
  Detect:
    ├── email VARCHAR(50) → WARNING (too short, use 255)
    ├── email VARCHAR(MAX) → WARNING (too large)
    ├── email VARCHAR(255) → PASS
    ├── firstName VARCHAR(10) → WARNING (too short)
    ├── firstName VARCHAR(100) → PASS
    └── description VARCHAR(MAX) → PASS (ok for descriptions)
  
  Severity: MEDIUM
  Auto-fixable: YES (ALTER COLUMN)

Check 6.2 — Numeric Type Appropriateness
  Standard: Use right numeric type for the data
  
  Detect:
    ├── price as FLOAT → FAIL (use DECIMAL for money)
    ├── price as REAL → FAIL (rounding errors with money)
    ├── price as DECIMAL(10,2) → PASS
    ├── age as BIGINT → WARNING (INT is sufficient)
    ├── isActive as INT → WARNING (use BIT/BOOLEAN)
    └── quantity as DECIMAL → WARNING (use INT if whole numbers)
  
  Severity: MEDIUM-HIGH
  Auto-fixable: PARTIAL (safe for some, risky for others)

Check 6.3 — Date Type Appropriateness
  Standard: Use correct date type for the data
  
  Detect:
    ├── createdAt as DATE → WARNING (loses time, use DATETIME)
    ├── createdAt as VARCHAR → FAIL (use DATETIME)
    ├── createdAt as DATETIME → PASS
    ├── birthDate as DATETIME → WARNING (DATE is sufficient)
    ├── birthDate as DATE → PASS
    └── duration as VARCHAR("2 hours") → FAIL (use INT minutes)
  
  Severity: MEDIUM
  Auto-fixable: PARTIAL

Check 6.4 — JSON/Text Field Usage
  Standard: Avoid JSON blobs for queryable data
  
  Detect:
    ├── Storing array in VARCHAR as "1,2,3" → FAIL
    ├── Storing config as JSON (non-queryable) → OK
    ├── Storing address parts in one JSON field → WARNING
    ├── Storing separate address columns → PASS
    └── settings JSON (truly flexible config) → PASS
  
  Severity: MEDIUM
  Auto-fixable: NO (requires schema redesign)

Check 6.5 — Boolean Field Type
  Standard: Boolean fields should use BIT/BOOLEAN not INT
  
  Detect:
    ├── isActive INT (0/1) → WARNING (use BIT)
    ├── isActive TINYINT → WARNING (use BIT)
    ├── isActive BIT → PASS
    ├── isActive BOOLEAN → PASS
    └── isActive CHAR(1) ('Y'/'N') → FAIL
  
  Severity: LOW
  Auto-fixable: YES
```

---

## DB Standard Check 7 — NULL HANDLING STANDARDS

```
Rule Set: Nullable Column Rules

Check 7.1 — PK Must Never Be Nullable
  Standard: Primary key columns MUST be NOT NULL
  
  Detect:
    ├── id nullable → FAIL (CRITICAL)
    └── id NOT NULL → PASS
  
  Severity: CRITICAL
  Auto-fixable: YES

Check 7.2 — FK Nullability Must Match Business Rule
  Standard: Required FKs must be NOT NULL
             Optional FKs can be nullable
  
  Detect:
    ├── tenantId nullable (multi-tenant app) → FAIL
    ├── tenantId NOT NULL → PASS
    ├── parentId nullable (optional parent) → PASS
    ├── createdBy nullable → WARNING (who created it?)
    └── updatedBy nullable → OK (null until first update)
  
  Severity: HIGH
  Auto-fixable: PARTIAL

Check 7.3 — Unnecessary Nullable Columns
  Standard: Columns should only be nullable if 
            business logic allows empty values
  
  Detect:
    ├── email nullable (required for auth) → WARNING
    ├── name nullable (always required) → WARNING
    ├── description nullable (truly optional) → PASS
    └── notes nullable (truly optional) → PASS
  
  Severity: LOW
  Auto-fixable: NO (business decision)

Check 7.4 — Default Values for Non-Nullable Columns
  Standard: Non-nullable columns should have defaults
            where sensible
  
  Detect:
    ├── isActive NOT NULL, no default → WARNING
    ├── isActive NOT NULL DEFAULT 1 → PASS
    ├── createdAt NOT NULL, no default → FAIL
    ├── createdAt NOT NULL DEFAULT NOW() → PASS
    └── name NOT NULL, no default → PASS (user must provide)
  
  Severity: MEDIUM
  Auto-fixable: YES
```

---

## DB Standard Check 8 — INDEX STANDARDS

```
Rule Set: Index Completeness

Check 8.1 — Primary Key Index Exists
  Standard: PK must always have an index (usually auto)
  
  Detect:
    ├── PK with no index → FAIL (CRITICAL)
    └── PK with index → PASS
  
  Severity: CRITICAL
  Auto-fixable: YES

Check 8.2 — FK Columns Are Indexed
  Standard: All FK columns must have indexes
  
  Detect:
    ├── userId (FK) with no index → FAIL
    ├── tenantId (FK) with no index → FAIL
    └── All FK columns indexed → PASS
  
  Severity: HIGH
  Auto-fixable: YES

Check 8.3 — Unique Constraints on Business Identifiers
  Standard: Columns that must be unique have UNIQUE index
  
  Detect:
    ├── email column with no UNIQUE constraint → WARNING
    ├── username with no UNIQUE constraint → WARNING
    ├── invoiceNumber with no UNIQUE constraint → WARNING
    ├── email with UNIQUE constraint → PASS
    └── (tenantId + invoiceNumber) composite UNIQUE → PASS
  
  Severity: HIGH
  Auto-fixable: YES (with risk check for existing duplicates)

Check 8.4 — Search Columns Are Indexed
  Standard: Columns used in WHERE clauses need indexes
  
  Detect (by analyzing API routes and SP patterns):
    ├── status column used in WHERE, no index → WARNING
    ├── createdAt used in ORDER BY, no index → WARNING
    ├── name used in LIKE search, no index → WARNING
    └── Frequently filtered columns indexed → PASS
  
  Severity: MEDIUM (performance)
  Auto-fixable: YES

Check 8.5 — Redundant Indexes
  Standard: No duplicate or redundant indexes
  
  Detect:
    ├── Index on (userId) AND index on (userId, tenantId)
        → First index is redundant if second covers it
    ├── Two indexes on same column → FAIL
    └── Composite index properly ordered → PASS
  
  Severity: LOW (performance/storage waste)
  Auto-fixable: YES (drop redundant index)
```

---

## DB Standard Check 9 — RELATIONSHIP INTEGRITY

```
Rule Set: Relationship Design Quality

Check 9.1 — Many-to-Many Without Junction Table
  Standard: M:M relationships need proper junction table
  
  Detect:
    ├── Comma-separated IDs in a column → FAIL
        Example: roles = "1,2,3" in users table
    ├── JSON array of IDs → WARNING
    ├── Proper junction table (userRoles) → PASS
    └── Junction table with both FKs → PASS
  
  Severity: HIGH
  Auto-fixable: NO (requires schema redesign)

Check 9.2 — Junction Table Has Composite Key
  Standard: M:M junction tables need composite PK
            or at minimum composite UNIQUE constraint
  
  Detect:
    ├── userRoles with only auto-id (no composite unique) → WARNING
    ├── userRoles with composite PK (userId + roleId) → PASS
    └── userRoles with composite UNIQUE → PASS
  
  Severity: MEDIUM
  Auto-fixable: YES

Check 9.3 — Orphaned Records Risk
  Standard: Child records cannot exist without parent
  
  Detect:
    ├── orders.userId with no FK constraint → FAIL
        (Can create order for non-existent user)
    ├── ON DELETE SET NULL but column NOT NULL → FAIL
    └── Proper FK with appropriate cascade → PASS
  
  Severity: HIGH
  Auto-fixable: PARTIAL

Check 9.4 — Self-Referential Tables Documented
  Standard: Tables that reference themselves must be 
            clearly documented
  
  Detect:
    ├── categories.parentId → categories.id
        No documentation/comment → WARNING
    ├── employees.managerId → employees.id
        With comment/metadata → PASS
    └── No self-reference → N/A
  
  Severity: LOW
  Auto-fixable: NO (needs documentation)
```

---

## DB Standard Check 10 — DOCUMENTATION COMPLETENESS

```
Rule Set: Database Documentation Standards

Check 10.1 — Table Has Description
  Standard: Every table should have a description
            explaining its business purpose
  
  Detect:
    ├── Table with no description → WARNING
    ├── Table with description → PASS
    └── Coverage metric: X% tables documented
  
  Severity: LOW
  Auto-fixable: NO (requires human input)

Check 10.2 — Columns Have Descriptions
  Standard: Key columns should have descriptions
  
  Detect:
    ├── PK with no description → WARNING
    ├── FK with no description → WARNING
    ├── Business columns no description → WARNING
    └── Coverage metric: X% columns documented
  
  Severity: LOW
  Auto-fixable: NO

Check 10.3 — Business Rules Documented
  Standard: Non-obvious constraints should be documented
  
  Detect:
    ├── Constraint with no explanation → WARNING
    ├── Trigger with no explanation → WARNING
    └── Complex default with no explanation → WARNING
  
  Severity: LOW
  Auto-fixable: NO
```

---

## Complete Compliance Output Per Table

**What the Intelligence Bank stores after running all checks:**

```
Table: orders

PCI Scan Result:
  ├── PCI Fields Found: 3
  │     ├── cardNumber (PAN) → CRITICAL — must encrypt
  │     ├── cvv → CRITICAL — MUST REMOVE (violates PCI 3.2.1)
  │     └── cardholderName → HIGH — should encrypt
  └── PCI Risk Level: CRITICAL

DB Standards Result:
  ├── Naming: PASS (snake_case, plural)
  ├── Primary Key: PASS (id, auto-generated UUID)
  ├── System Columns:
  │     ├── createdAt: PASS
  │     ├── updatedAt: PASS
  │     ├── deletedAt: MISSING → WARNING
  │     └── tenantId: MISSING → CRITICAL
  ├── Foreign Keys:
  │     ├── userId: FK defined → PASS
  │     ├── userId: indexed → PASS
  │     └── productId: FK missing → FAIL
  ├── Data Types:
  │     ├── amount FLOAT → FAIL (use DECIMAL)
  │     └── status VARCHAR(1) → WARNING (use ENUM/INT)
  ├── Nullability:
  │     ├── userId nullable → WARNING
  │     └── amount NOT NULL → PASS
  ├── Indexes:
  │     ├── PK indexed → PASS
  │     ├── userId indexed → PASS
  │     └── status not indexed → WARNING (used in queries)
  └── Documentation:
        ├── Table description: MISSING
        └── 2/8 columns documented (25%)

Overall Compliance Score:
  ├── PCI Score:        20/100 (CRITICAL — cvv field exists)
  ├── DB Standards:     58/100 (MEDIUM risk)
  ├── Combined Score:   39/100
  └── Status:          ❌ NEEDS IMMEDIATE ATTENTION
```

---

## All Checks Summary Table

| Check | Category | Rules | Severity Range | Auto-Fixable |
|-------|----------|-------|---------------|--------------|
| 1 | Table Naming | 5 rules | LOW-HIGH | Mostly YES |
| 2 | Column Naming | 5 rules | LOW-MEDIUM | Mostly YES |
| 3 | Primary Keys | 4 rules | LOW-CRITICAL | Partial |
| 4 | System Columns | 4 rules | LOW-CRITICAL | Mostly YES |
| 5 | Foreign Keys | 4 rules | MEDIUM-HIGH | Partial |
| 6 | Data Types | 5 rules | MEDIUM-HIGH | Partial |
| 7 | Null Handling | 4 rules | LOW-CRITICAL | Partial |
| 8 | Indexes | 5 rules | LOW-CRITICAL | Mostly YES |
| 9 | Relationships | 4 rules | MEDIUM-HIGH | Partial |
| 10 | Documentation | 3 rules | LOW | NO |
| PCI-1 | PAN Detection | 8 patterns | CRITICAL | NO |
| PCI-2 | Security Codes | 6 patterns | CRITICAL | FLAG ONLY |
| PCI-3 | Cardholder Name | 5 patterns | HIGH | NO |
| PCI-4 | Expiry Date | 6 patterns | HIGH | NO |
| PCI-5 | Bank Account | 8 patterns | HIGH | NO |
| PCI-6 | Transactions | 8 patterns | MEDIUM | NO |
| PCI-7 | Card Metadata | 6 patterns | LOW | NO |
| PCI-8 | Digital Wallet | 6 patterns | MEDIUM-HIGH | NO |

---

## The One Rule That Ties PCI + DB Standards Together

```
STORAGE PROHIBITION RULE:

  If ANY field is detected as CVV/CVC/PIN:
    ├── IMMEDIATELY flag as CRITICAL violation
    ├── Check if data actually exists in that column
    ├── Generate removal migration script
    ├── Block any new data from being written
    └── Alert: Cannot pass PCI audit with this field

  If ANY table has PAN without encryption:
    ├── Flag as CRITICAL
    ├── Generate encryption migration
    ├── Suggest tokenization as better alternative
    └── Cannot be in CDE without compensating controls

  DB Standards + PCI Combined:
    A table can have perfect DB standards
    but ONE CVV field = ENTIRE SYSTEM FAILS PCI audit
    
    Priority order:
      PCI violations → fix FIRST (legal requirement)
      DB Standards  → fix SECOND (quality requirement)
```

# Rule Application System - Phase 2: PCI-DSS Field Detection & DB Standard Compliance

---

## Rule Hierarchy Overview

```
INTELLIGENCE BANK RULE ENGINE
│
├── PHASE 1 (Completed)
│   ├── PII Field Detection
│   └── PHI Field Detection
│
├── PHASE 2 (Current)
│   ├── PCI-DSS Field Detection
│   │   ├── Cardholder Data Fields (CD)
│   │   ├── Sensitive Authentication Data (SAD)
│   │   └── Payment Metadata
│   │
│   └── Basic DB Standard Compliance
│       ├── Naming Conventions
│       ├── Data Type Standards
│       ├── Constraint Standards
│       ├── Index Standards
│       └── Security Standards
│
└── PHASE 3 (Next)
    └── SOX / Financial Compliance
```

---

# SECTION 1: PCI-DSS Field Detection

## PCI-DSS Data Classification

```
PCI-DSS v4.0 - Data Classification
│
├── CARDHOLDER DATA (CD) - Must Encrypt at Rest & Transit
│   ├── Primary Account Number (PAN)
│   ├── Cardholder Name
│   ├── Service Code
│   └── Expiration Date
│
├── SENSITIVE AUTHENTICATION DATA (SAD) - Never Store
│   ├── Full Track Data (Magnetic Stripe)
│   ├── CVV/CVC/CVV2 (3-digit)
│   ├── PIN/PIN Block
│   └── POS PIN Data
│
└── PAYMENT METADATA (Allowable Storage, Encrypted)
    ├── Transaction ID
    ├── Authorization Code
    ├── Transaction Amount
    ├── Merchant ID
    └── Transaction Timestamp
```

---

## PCI-DSS Name Pattern Rules

```
RULE: pci_cardholder_data_fields
├── CRITICAL (Card Numbers - PAN)
│   ├── exact: [pan, card_number, cardnumber, card_num, account_number]
│   ├── contains: [card_, _card, credit_card, debit_card, payment_card]
│   ├── contains: [primary_account, acct_num, account_no]
│   └── Pattern Match: "XXXX-XXXX-XXXX-1234" format
│
├── HIGH (Cardholder Info)
│   ├── exact: [cardholder_name, card_name, name_on_card, card_holder]
│   ├── contains: [card_owner, account_holder, holder_name]
│   └── Pattern Match: Alphanumeric + spaces
│
└── MEDIUM (Expiration & Service)
    ├── exact: [exp_date, expiry_date, expiration, exp, card_exp]
    ├── contains: [exp_month, exp_year, valid_from, valid_until]
    ├── exact: [service_code, svc_code]
    └── Pattern Match: MM/YY or MMYYYY format
```

```
RULE: pci_sad_fields (Never Store - Critical Violations)
├── 🚫 CRITICAL (MUST NOT EXIST IN DATABASE)
│   ├── contains: [cvv, cvc, cvv2, cid, card_verification]
│   ├── contains: [pin, pin_code, pin_number, pin_block]
│   ├── contains: [track_1, track_2, track_data, magnetic_stripe]
│   ├── contains: [full_track, stripe_data, emv_data]
│   └── contains: [pos_pin, atm_pin, debit_pin]
│
└── ⚠️ AUTO-FLAG: If detected = Immediate PCI violation
    └── Action: Alert + Block + Audit Log
```

```
RULE: pci_payment_metadata_fields
├── LOW (Transaction Metadata - Allowed)
│   ├── exact: [transaction_id, txn_id, ref_id, reference_id]
│   ├── contains: [transaction, txn, payment_id, charge_id]
│   ├── contains: [auth_code, authorization, auth_number]
│   ├── contains: [merchant_id, merchant, mcc_code]
│   ├── contains: [amount, total, charge_amount, payment_amount]
│   ├── contains: [currency, currency_code, iso_currency]
│   └── contains: [txn_date, txn_time, timestamp, payment_date]
│
└── MEDIUM (Risk Context)
    ├── contains: [risk_score, fraud_score, fraud_flag]
    ├── contains: [ip_address, device_fingerprint, user_agent]
    └── contains: [billing_address, shipping_address, AVS_result]
```

---

## PCI-DSS Value Pattern Rules

```
RULE: pci_value_patterns
│
├── PAN (Primary Account Number)
│   ├── Luhn Algorithm: Must pass MOD-10 check
│   ├── Length: 13-19 digits (15 for AMEX)
│   ├── Format: 4-4-4-4 or 4-6-5 or 13-19 plain digits
│   ├── Pattern: ^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,5}$
│   ├── Sample: 4111111111111111, 5500 0000 0000 0004
│   ├── Confidence: 0.98 (Luhn + length validation)
│   │
│   └── BIN/IIN First 6 digits mapping:
│       ├── 4xxxxx: Visa
│       ├── 51-55xxxx: Mastercard
│       ├── 34-37xxxx: American Express
│       ├── 6011-65xxxx: Discover
│       └── Detect card type from BIN
│
├── CVV/CVC/CVV2
│   ├── Pattern: ^\d{3}$ (Visa/MC/Discover)
│   ├── Pattern: ^\d{4}$ (Amex only)
│   ├── NEVER Store: Flag as SAD violation
│   └── Confidence: 0.99 (if found, violation detected)
│
├── Expiration Date
│   ├── Pattern: ^\d{2}/\d{2}$ OR ^\d{4}$
│   ├── Range: 01/00 to 12/99 or 2000-2099
│   ├── Validate: Not expired (if checking current date)
│   ├── Confidence: 0.85
│   └── Context: Must exist with PAN column
│
└── Track Data
    ├── Pattern: %B\d{13,19}\^[\w\s/]+\^\d{4}.*\?
    ├── Pattern: ;\d{13,19}=[\w=]+\?
    └── ANY Match = CRITICAL SAD VIOLATION
```

---

## PCI-DSS Compliance Rule Checks

```
RULE: pci_compliance_checks
│
├── CHECK 1: SAD Presence (Zero Tolerance)
│   ├── IF CVV/CVC/PIN/Track found in ANY table
│   ├── THEN → VIOLATION: "SAD data detected"
│   └── Action: BLOCK + ALERT + PCI_QSA_NOTIFY
│
├── CHECK 2: PAN Masking
│   ├── IF column contains PAN data
│   ├── THEN → Must have *_masked or *_tokenized twin
│   └── Violation: "PAN stored without masking/tokenization"
│
├── CHECK 3: Encryption at Rest
│   ├── IF PAN column exists
│   ├── THEN → Check encryption_status = AES-256
│   ├── VIOLATION: "PAN in unencrypted column"
│   └── Check: DBE (Database Encryption) enabled
│
├── CHECK 4: Encryption in Transit
│   ├── IF payment API endpoints exist
│   ├── THEN → TLS 1.2+ enforced
│   └── Check: SSL/TLS certificate valid
│
├── CHECK 5: Access Control
│   ├── IF PAN column exists
│   ├── THEN → Role-based access only
│   ├── Audit: SELECT count on PAN columns
│   └── Violation: "PAN access not logged"
│
└── CHECK 6: Key Management
    ├── IF encryption keys exist
    ├── THEN → Check key rotation policy (90 days)
    └── Check: KMS (Key Management System) used
```

---

## PCI-DSS Detection Output Schema

```
DETECTED FIELD → INTELLIGENCE BANK ENTRY

{
  "entity_ref": "payments.card_number",
  "detection_source": "name_pattern + value_pattern",
  
  "pci_classification": {
    "category": "CARDHOLDER_DATA",          // CARDHOLDER_DATA | SAD | METADATA | NONE
    "sub_category": "pan",                  // pan | cardholder_name | expiration | sad_violation
    "specific_type": "credit_card_pan",
    "card_brand": "visa",                   // visa | mastercard | amex | discover | unknown
    "bin_prefix": "411111",
    "confidence": 0.98,
    "detection_method": "luhn_validation + name_match"
  },
  
  "naming_analysis": {
    "column_name": "card_number",
    "pattern_match": "contains",
    "fuzzy_score": 0.95
  },
  
  "value_analysis": {
    "luhn_valid": true,
    "length": 16,
    "masked_preview": "XXXX-XXXX-XXXX-1111",
    "sample_hash": "SHA256(first_4 + last_4)"
  },
  
  "pci_compliance_status": {
    "sad_violation": false,
    "encryption_required": true,
    "encryption_status": "UNKNOWN",         // UNKNOWN | ENCRYPTED | PLAINTEXT | TOKENIZED
    "masking_required": true,
    "masking_status": "UNKNOWN",            // UNKNOWN | MASKED | PLAINTEXT
    "access_control_required": true,
    "audit_logging_required": true,
    "tokenization_available": true,
    "tokenized_column": "payments.tokenized_card_id"
  },
  
  "required_actions": [
    {
      "action": "VERIFY_ENCRYPTION",
      "priority": "CRITICAL",
      "description": "Confirm AES-256 encryption at rest",
      "deadline": "IMMEDIATE"
    },
    {
      "action": "CONFIGURE_MASKING",
      "priority": "HIGH",
      "description": "Card number must be masked in logs and UI",
      "deadline": "7_DAYS"
    }
  ],
  
  "regulatory_links": {
    "pci_dss_v4_requirement": "3.4, 3.5, 4.1",
    "related_fields": ["payments.exp_date", "payments.cardholder_name"],
    "token_replacement": "payments.payment_token"
  }
}
```

---

# SECTION 2: Basic DB Standard Compliance

## DB Standard Categories

```
BASIC DB STANDARD COMPLIANCE
│
├── 1. NAMING CONVENTIONS
│   ├── Table Naming
│   ├── Column Naming
│   ├── Index Naming
│   ├── Constraint Naming
│   └── Foreign Key Naming
│
├── 2. DATA TYPE STANDARDS
│   ├── String Types
│   ├── Numeric Types
│   ├── Date/Time Types
│   └── UUID/Guid Types
│
├── 3. CONSTRAINT STANDARDS
│   ├── Primary Keys
│   ├── Not Null Rules
│   ├── Unique Constraints
│   └── Check Constraints
│
├── 4. INDEX STANDARDS
│   ├── Clustered Index
│   ├── Non-Clustered Index
│   ├── Composite Index
│   └── Index Naming
│
└── 5. SECURITY STANDARDS
    ├── Sensitive Field Handling
    ├── Audit Column Requirements
    └── Connection Security
```

---

## 1. NAMING CONVENTION RULES

```
RULE: naming_table_conventions
│
├── STANDARD: snake_case (recommended)
│   ├── ✅ Correct: users, order_items, payment_transactions
│   ├── ❌ Incorrect: Users, OrderItems, PaymentTransactions
│   ├── ❌ Incorrect: tbl_users, T_Users, tb_users
│   └── ❌ Incorrect: usr, ord, pay
│
├── PLURAL TABLE NAMES
│   ├── ✅ Correct: users (collection of user)
│   ├── ✅ Correct: orders (collection of order)
│   └── Exception: Junction tables → user_roles (plural both sides)
│
├── AVOIDED PATTERNS
│   ├── Prefixed: sp_, tbl_, tb_, vw_, sys_
│   ├── Hungarian: strName, intCount, boolActive
│   ├── Oracle artifacts: SYS_, ALL_, DBA_
│   └── Reserved words: select, table, index, user
│
└── MAX LENGTH
    └── Recommendation: ≤ 63 characters (PostgreSQL limit)
```

```
RULE: naming_column_conventions
│
├── STANDARD: snake_case
│   ├── ✅ Correct: first_name, created_at, is_active
│   ├── ❌ Incorrect: firstName, FirstName, FIRST_NAME
│   └── ❌ Incorrect: f_name, fname, name1
│
├── IDENTITY COLUMNS
│   ├── Primary Key: id (UUID or BIGINT)
│   ├── Foreign Key: {referenced_table_singular}_id
│   │   ├── ✅ Correct: user_id (references users.id)
│   │   ├── ✅ Correct: order_id (references orders.id)
│   │   └── ❌ Incorrect: userid, userId, FK_user
│   └── Tenant: tenant_id (multi-tenant tables)
│
├── BOOLEAN COLUMNS
│   ├── Prefix: is_, has_, does_, should_, can_
│   ├── ✅ Correct: is_active, has_children, is_deleted
│   ├── ❌ Incorrect: active, deleted, status
│   └── Suffix alternative: *_flag, *_active (acceptable)
│
├── TIMESTAMP COLUMNS
│   ├── Created: created_at, created_on
│   ├── Updated: updated_at, updated_on
│   ├── Deleted: deleted_at (soft delete)
│   └── Nullable versions: *_at, *_on with NULL = never
│
└── AMOUNT/VALUE COLUMNS
    ├── Amount: *_amount, *_total, *_balance
    ├── Currency: currency_code (ISO 4217)
    ├── Count: *_count, *_quantity
    └── Price: *_price, *_cost (singular)
```

```
RULE: naming_index_constraints
│
├── INDEX NAMING
│   ├── Single Column: idx_{table}_{column}
│   │   ├── ✅ idx_users_email, idx_users_tenant_id
│   ├── Composite: idx_{table}_{col1}_{col2}_{col3}
│   │   ├── ✅ idx_orders_user_id_created_at
│   ├── Unique: uk_{table}_{column} or uniq_{table}_{column}
│   │   ├── ✅ uk_users_email, idx_users_tenant_id_unique
│   └── Partial: idx_{table}_{column}_partial
│
├── CONSTRAINT NAMING
│   ├── Primary Key: pk_{table}
│   │   ├── ✅ pk_users, pk_orders
│   ├── Foreign Key: fk_{table}_{referenced_table}
│   │   ├── ✅ fk_orders_users (orders.user_id → users.id)
│   ├── Unique: uk_{table}_{column}
│   │   ├── ✅ uk_users_email
│   └── Check: ck_{table}_{column}_{condition}
│       └── ✅ ck_users_age_positive, ck_orders_total_nonnegative
```

---

## 2. DATA TYPE STANDARDS

```
RULE: datatype_string_standards
│
├── SHORT TEXT (≤ 255 chars)
│   ├── CHAR(n): Fixed length, padded (rarely used)
│   ├── VARCHAR(n): Variable length, preferred for names, codes
│   ├── ✅ Recommended: VARCHAR(255) for names, VARCHAR(50) for codes
│   └── ❌ Avoid: VARCHAR(MAX) for short text
│
├── LONG TEXT (> 255 chars)
│   ├── TEXT: Unlimited length (PostgreSQL)
│   ├── MEDIUMTEXT: Up to 16MB (MySQL)
│   ├── NVARCHAR(MAX): Large text (SQL Server)
│   └── ✅ Use: TEXT for descriptions, notes, comments
│
├── EMAIL
│   ├── Standard: VARCHAR(255) - RFC 5321 limit
│   ├── ✅ Recommended: VARCHAR(255) with CHECK constraint
│   └── ❌ Avoid: VARCHAR(320) - too long
│
├── PHONE
│   ├── E.164 Format: VARCHAR(15) for digits only
│   ├── With Formatting: VARCHAR(20)
│   └── ✅ Recommended: Separate columns or normalized storage
│
└── JSON DATA
    ├── JSONB: Binary JSON, indexed (PostgreSQL) ✅ RECOMMENDED
    ├── JSON: Text JSON, validated (PostgreSQL)
    ├── JSON: Text (MySQL 5.7+)
    └── ✅ Use JSONB for frequently queried nested data
```

```
RULE: datatype_numeric_standards
│
├── INTEGER FAMILY
│   ├── TINYINT: -128 to 127 (rarely needed)
│   ├── SMALLINT: -32,768 to 32,767 (limited counts)
│   ├── INT/BIGINT: Full range for IDs
│   │   ├── ✅ BIGINT for PRIMARY KEYS (UUID fallback)
│   │   ├── ✅ INT for counts, small IDs (non-PK)
│   │   └── ❌ Avoid: INT for monetary amounts
│   └── SERIAL/BIGSERIAL: Auto-increment (legacy, prefer UUID)
│
├── DECIMAL FOR MONEY (CRITICAL)
│   ├── DECIMAL(p,s): Exact precision, p=total digits, s=decimal places
│   ├── ✅ Standard: DECIMAL(19,4) for money (up to quadrillions)
│   │   └── Supports: 15 digits + 4 decimal places
│   ├── ❌ AVOID: FLOAT, REAL, DOUBLE (floating point errors)
│   ├── ❌ AVOID: INT (loses decimal precision)
│   └── Currency pair: Separate DECIMAL column per currency
│       └── ✅ amount_usd, amount_eur, amount_gbp
│
├── BOOLEAN
│   ├── BOOLEAN: Standard boolean (TRUE/FALSE/NULL)
│   ├── ✅ Recommended: is_active, has_permission
│   └── ❌ Avoid: TINYINT(1), CHAR(1), ENUM('Y','N')
│
└── BIT/FLAG FIELDS
    ├── Use BIT(n) for bitmasks
    ├── Use BOOLEAN for single flags
    └── ❌ Avoid: INT for binary flags (1/0 storage waste)
```

```
RULE: datatype_datetime_standards
│
├── TIMESTAMP TYPES
│   ├── TIMESTAMP WITHOUT TZ: Naive timestamp (no timezone)
│   │   └── ✅ Use for: created_at, updated_at (local time)
│   ├── TIMESTAMP WITH TZ (TIMESTAMPTZ): Timezone-aware
│   │   └── ✅ Use for: scheduled_at, expires_at (global)
│   ├── DATE: Calendar date (no time)
│   │   └── ✅ Use for: birth_date, hire_date
│   └── TIME: Time of day (no date)
│       └── ✅ Use for: opening_time, closing_time
│
├── MICROTIMESTAMP
│   ├── TIMESTAMPTZ(6): Microsecond precision
│   └── ✅ Use for: financial transaction timestamps
│
├── OFFSET vs NAMED TIMEZONE
│   ├── ✅ Better: TIMESTAMPTZ (stores as UTC, displays with offset)
│   ├── ❌ Worse: VARCHAR storing "+05:30"
│   └── Default: UTC storage, application-level conversion
│
└── SOFT DELETE PATTERN
    └── deleted_at TIMESTAMP NULL (NULL = not deleted)
```

```
RULE: datatype_uuid_standards
│
├── UUID v4 (Random)
│   ├── Format: 8-4-4-4-12 hex
│   ├── ✅ Use: gen_random_uuid() for PRIMARY KEYS
│   ├── Pros: No collision, no enumeration possible
│   └── Cons: 16 bytes vs 8 bytes for BIGINT
│
├── CUID v2 (Collision-resistant, URL-safe)
│   ├── Format: ck + timestamp + random
│   ├── ✅ Use: For distributed systems (Prisma default)
│   └── Pros: Shorter than UUID, time-sortable
│
├── BIGINT IDENTITY (Sequential)
│   ├── ✅ Use: For high-velocity writes (no UUID overhead)
│   └── Cons: Enumerable, predictable
│
└── RECOMMENDED HYBRID APPROACH
    ├── PRIMARY KEY: BIGINT IDENTITY (performance)
    ├── PUBLIC REFERENCE: CUID (exposable to clients)
    ├── CROSS-SYSTEM: UUID (guaranteed uniqueness)
    └── Audit/Token: UUID + timestamp encoding
```

---

## 3. CONSTRAINT STANDARDS

```
RULE: constraint_primary_key
│
├── STANDARD PK RULES
│   ├── ✅ Always have a PRIMARY KEY (surrogate recommended)
│   ├── ✅ BIGINT IDENTITY or UUID (no composite PKs on data tables)
│   ├── ✅ Never use natural keys (email, SSN) as PK
│   ├── ✅ Single column PK (joins are cleaner)
│   └── ❌ Avoid: Composite PKs, Natural key PKs
│
├── COMPOSITE PK EXCEPTIONS
│   ├── Junction tables: (user_id, role_id) is acceptable
│   ├── Audit logs: (entity_id, timestamp, sequence)
│   └── Ledger entries: (account_id, entry_id, post_date)
│
└── NAMING
    └── ✅ pk_{table_name} or PK_{table_name}
```

```
RULE: constraint_not_null
│
├── NOT NULL REQUIREMENTS
│   ├── ✅ NOT NULL: id, created_at, updated_at
│   ├── ✅ NOT NULL: Foreign keys (unless explicitly nullable relationship)
│   ├── ✅ NOT NULL: Required business fields (email in users)
│   ├── ✅ NOT NULL: Primary key, tenant_id (multi-tenant)
│   │
│   └── ⚠️ NULLABLE (Justify Each)
│       ├── Optional relationship: orders.shipped_at (NULL = not shipped)
│       ├── Soft delete: deleted_at
│       ├── Optional metadata: bio, avatar_url
│       └── Computed-like: calculated_total (NULL until computed)
│
└── DEFAULT VALUES
    ├── created_at: DEFAULT NOW()
    ├── updated_at: DEFAULT NOW()
    ├── is_active: DEFAULT TRUE
    ├── tenant_id: Populated via trigger/application
    └── id: Auto-generated (UUID/IDENTITY)
```

```
RULE: constraint_foreign_key
│
├── FK STANDARDS
│   ├── ✅ Name: fk_{child_table}_{parent_table}
│   ├── ✅ ON DELETE: RESTRICT (default) or SET NULL (with reason)
│   ├── ✅ ON UPDATE: CASCADE (for ID changes) or RESTRICT
│   ├── ✅ Always index foreign keys (performance)
│   │
│   └── ⚠️ AVOID:
│       ├── Circular FKs (A→B→C→A)
│       ├── ON DELETE CASCADE on multi-level deep chains
│       └── Multiple paths to same table (confusing)
│
└── SOFT REFERENCE (When FK Not Possible)
    ├── Column: *_id (the ID value exists)
    ├── Column: *_name (denormalized display value)
    ├── Constraint: CHECK {_id IS NOT NULL OR _name IS NOT NULL}
    └── Document: Rationale for soft reference
```

```
RULE: constraint_unique
│
├── UNIQUE CONSTRAINTS
│   ├── ✅ Column: email (per tenant) → UNIQUE(tenant_id, email)
│   ├── ✅ Column: code per context → UNIQUE(context_id, code)
│   ├── ✅ Composite: (tenant_id, slug) for URL-safe names
│   │
│   └── ❌ AVOID:
│       ├── Global unique on denormalized names (conflicts)
│       ├── Unique on very long text columns
│       └── Unique on NULLABLE columns (multiple NULLs issue)
│
└── PARTIAL UNIQUE (PostgreSQL)
    ├── ✅ Unique where not deleted: UNIQUE WHERE is_deleted = FALSE
    ├── For: Soft-delete-aware uniqueness
    └── Pattern: idx_users_email ON users UNIQUE WHERE deleted_at IS NULL
```

---

## 4. INDEX STANDARDS

```
RULE: index_clustering
│
├── CLUSTERED INDEX (SQL Server, InnoDB)
│   ├── ✅ One per table (defines physical order)
│   ├── ✅ Choose: Primary key column OR
│   │          Most frequent range query column
│   ├── ❌ Avoid: Random UUID as clustered (fragmentation)
│   └── Recommendation: BIGINT IDENTITY as clustered PK + UUID as secondary
│
└── HEAP TABLES (PostgreSQL, MySQL MyISAM)
    └── No clustering needed, use row-based storage
```

```
RULE: index_common_patterns
│
├── ✅ ALWAYS INDEX
│   ├── Primary Key (automatic)
│   ├── Foreign Keys (critical for joins)
│   ├── Unique constraints (automatic)
│   └── Columns in WHERE clause of frequent queries
│
├── ✅ COMPOSITE INDEX ORDER
│   ├── High cardinality first: tenant_id (high) before is_deleted (low)
│   ├── Equality predicates first: tenant_id = X
│   ├── Range predicates last: created_at > X
│   └── Example: (tenant_id, status, created_at) for filtered queries
│
├── ❌ AVOID
│   ├── Index on low-cardinality columns alone (is_deleted, status)
│   ├── Index on columns rarely in WHERE
│   ├── Too many indexes (write overhead)
│   └── Index on columns with functions (use expression index)
│
└── NAMING
    └── ✅ idx_{table}_{column1}_{column2}
         uniq_{table}_{column}
```

```
RULE: index_monitoring
│
├── INDEX EFFECTIVENESS
│   ├── ✅ Monitor: SELECT scan vs INDEX scan ratio
│   ├── ✅ Target: Index usage > 95% for read-heavy tables
│   ├── ✅ Flag: Unused indexes (removed after 90 days)
│   │
│   └── ⚠️ DEAD INDEX
│       └── Detected: Index not used in query plan for 90+ days
│       └── Action: Consider DROP (after verification)
│
└── INDEX BLOAT (PostgreSQL)
    ├── Monitor: pg_stat_user_indexes.idx_scan > 0
    ├── VACUUM: Regular maintenance
    └── REINDEX: After bulk deletes (>10% rows)
```

---

## 5. SECURITY STANDARDS

```
RULE: security_audit_columns
│
├── AUDIT TRAIL REQUIREMENTS
│   ├── ✅ Every table: created_at, updated_at
│   ├── ✅ Every table: created_by (user_id of creator)
│   ├── ✅ Every table: updated_by (user_id of last modifier)
│   ├── ✅ Multi-tenant: tenant_id (mandatory)
│   │
│   └── ✅ Sensitive tables: row_version (optimistic locking)
│       └── Type: SERIAL or INTEGER, increments on UPDATE
│
├── SOFT DELETE PATTERN
│   ├── Column: deleted_at TIMESTAMP NULL
│   ├── Column: deleted_by UUID NULL
│   └── NEVER physically delete: PII/PHI tables (legal hold)
│
└── ROW-LEVEL SECURITY
    ├── ✅ Multi-tenant: WHERE tenant_id = CURRENT_TENANT
    ├── ✅ User-scoped: WHERE user_id = CURRENT_USER
    └── ✅ Role-scoped: WHERE allowed_roles CONTAINS CURRENT_ROLE
```

```
RULE: security_sensitive_fields
│
├── ✅ ALWAYS ENCRYPT (at rest)
│   ├── Passwords: HASH (never encrypt, use bcrypt/argon2)
│   ├── SSN, Tax ID: AES-256
│   ├── Credit Card: Tokenized or AES-256
│   ├── API Keys: AES-256 (with KMS)
│   └── Health Data: AES-256 + Audit Log
│
├── ✅ ALWAYS MASK (in output)
│   ├── SSN: ***-**-1234
│   ├── Card: ****-****-****-1234
│   ├── Phone: (***) ***-1234
│   └── Email: j***@***.com
│
└── ✅ NEVER LOG
    ├── Passwords, Tokens, CVV
    ├── Full SSN, Full Card Number
    ├── API Keys in request/response
    └── Session IDs in URLs (use POST)
```

---

## Combined Detection Output Schema

```
INTELLIGENCE BANK ENTRY - Full Compliance Check

{
  "entity_ref": "payments.card_number",
  
  "pii_phi_classification": {
    "category": "PCI_CD",                  // PCI_CD | PCI_SAD | PCI_METADATA
    "sub_category": "pan",
    "confidence": 0.98
  },
  
  "db_standards_compliance": {
    "naming_convention": {
      "status": "PASS",
      "standard": "snake_case",
      "violation": null
    },
    "datatype_standard": {
      "status": "WARNING",
      "current": "VARCHAR(100)",
      "recommended": "VARCHAR(19)",
      "reason": "PAN max length is 19 digits"
    },
    "constraints": {
      "status": "FAIL",
      "missing": ["NOT NULL", "UNIQUE"],
      "violations": ["Plaintext storage detected"]
    },
    "indexes": {
      "status": "N/A",
      "relevant_indexes": []
    },
    "security": {
      "status": "FAIL",
      "encryption": "PLAINTEXT",
      "masking": "NONE",
      "audit_columns": "MISSING"
    }
  },
  
  "overall_compliance_score": {
    "pci_dss": 0.15,                        // 15% compliant
    "db_standards": 0.45,                  // 45% compliant
    "overall": 0.30                        // 30% compliant
  },
  
  "violations": [
    {
      "rule": "pci_sad_no_storage",
      "severity": "CRITICAL",
      "message": "SAD field (CVV) must never be stored"
    },
    {
      "rule": "db_encryption_required",
      "severity": "HIGH",
      "message": "PAN column requires AES-256 encryption"
    },
    {
      "rule": "db_masking_required",
      "severity": "HIGH",
      "message": "PAN must be masked in logs and UI"
    }
  ],
  
  "required_actions": [
    {
      "action": "REMOVE_CVV_COLUMNS",
      "priority": "CRITICAL",
      "deadline": "IMMEDIATE"
    },
    {
      "action": "ENABLE_ENCRYPTION",
      "priority": "HIGH",
      "deadline": "7_DAYS"
    },
    {
      "action": "ADD_AUDIT_COLUMNS",
      "priority": "MEDIUM",
      "deadline": "30_DAYS"
    }
  ]
}
```

---

## Rule Processing Order - Phase 2

```
STEP 1: PCI-DSS Scan (Critical Priority)
├── Rule: pci_sad_fields (SAD Violations First)
├── Rule: pci_cardholder_data_fields
├── Rule: pci_value_patterns (Luhn validation)
├── Rule: pci_compliance_checks
└── Time: ~100ms per table

STEP 2: Naming Convention Scan
├── Rule: naming_table_conventions
├── Rule: naming_column_conventions
├── Rule: naming_index_constraints
└── Time: ~20ms per table

STEP 3: Data Type Analysis
├── Rule: datatype_string_standards
├── Rule: datatype_numeric_standards
├── Rule: datatype_datetime_standards
├── Rule: datatype_uuid_standards
└── Time: ~50ms per table

STEP 4: Constraint Validation
├── Rule: constraint_primary_key
├── Rule: constraint_not_null
├── Rule: constraint_foreign_key
├── Rule: constraint_unique
└── Time: ~30ms per table

STEP 5: Security Audit
├── Rule: security_audit_columns
├── Rule: security_sensitive_fields
└── Time: ~40ms per table

STEP 6: Aggregate Scoring
├── Calculate: PCI-DSS compliance %
├── Calculate: DB Standards compliance %
├── Generate: Combined report
└── Output: Prioritized action list
```

---

## Next Steps After Phase 2

```
PHASE 3 (Next)
├── SOX / Financial Compliance
│   ├── Audit Trail Requirements
│   ├── Immutability Checks
│   └── Financial Record Integrity
│
PHASE 4
├── GDPR / Privacy Compliance
│   ├── Consent Tracking
│   ├── Data Retention Policies
│   └── Right to Erasure Support
│
PHASE 5
├── Custom Domain Rules
│   ├── Your Industry-Specific Rules
│   └── Organization-Specific Policies
```

---

## Questions Before Phase 3

1. **PCI Scope**: Is this system **in-scope** for PCI-DSS (takes payments directly) or **out-of-scope** (uses Stripe/PayPal iframe)? This determines which rules are mandatory.

2. **DB Engine**: Which database(s) are you targeting? (PostgreSQL, MySQL, SQL Server, SQLite, CockroachDB) — rules may differ slightly.

3. **Existing Schema**: Do you have an existing database that needs compliance scanning, or are you designing new tables with these rules as guardrails?

4. **Mandatory vs Advisory**: For DB Standards, which rules should be **blocking** (cannot deploy) vs **warning** (can deploy with justification)?