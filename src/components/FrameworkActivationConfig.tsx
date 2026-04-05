'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/hooks/useTheme';
import {
  Heart,
  Landmark,
  ShoppingCart,
  Code,
  Building,
  GraduationCap,
  Scale,
  HeartHandshake,
  Plane,
  Factory,
  Globe,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  FileCheck,
  Database,
  Brain,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff,
  Info,
  Settings,
  Zap,
  Target,
  TrendingUp,
  Users,
  Baby,
  Globe2,
  ArrowRightLeft,
  Server,
  BarChart3,
  ClipboardCheck,
  Fingerprint,
  BookOpen,
  Cpu,
  Accessibility,
  BadgeCheck,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type FrameworkStatus = 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL' | 'NOT_APPLICABLE';
type SensitivityPolicy = 'conservative' | 'balanced' | 'permissive' | 'custom';

interface Industry {
  id: string;
  name: string;
  icon: LucideIcon;
  subTypes: string[];
  autoFrameworks: string[];
}

interface Geography {
  id: string;
  name: string;
  flag: string;
  regulations: string[];
  details: string;
}

interface Framework {
  id: string;
  name: string;
  fullName: string;
  category: string;
  icon: LucideIcon;
  description: string;
  enforces: string[];
}

interface SensitivityPolicyConfig {
  id: SensitivityPolicy;
  name: string;
  icon: LucideIcon;
  philosophy: string;
  confidenceThreshold: string;
  protectionRules: string[];
  bestFor: string[];
  strictnessLevel: number;
}

interface SpecialCircumstance {
  id: string;
  question: string;
  description: string;
  icon: LucideIcon;
  impact: string;
}

interface WizardState {
  selectedIndustry: string | null;
  selectedGeographies: string[];
  frameworkToggles: Record<string, boolean>;
  sensitivityPolicy: SensitivityPolicy;
  specialCircumstances: Record<string, boolean>;
  currentStep: number;
  activated: boolean;
  savedAsDraft: boolean;
}

// =============================================================================
// CONSTANTS — Industry Data
// =============================================================================

const INDUSTRIES: Industry[] = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: Heart,
    subTypes: ['Hospitals & Health Systems', 'Pharmaceutical', 'Biotech', 'Health Insurance', 'Medical Devices', 'Telemedicine'],
    autoFrameworks: ['HIPAA Privacy', 'HIPAA Security', 'HITECH', 'HL7/FHIR'],
  },
  {
    id: 'financial',
    name: 'Financial Services',
    icon: Landmark,
    subTypes: ['Banking', 'Insurance', 'Investment Management', 'FinTech', 'Payment Processing', 'Lending'],
    autoFrameworks: ['PCI-DSS', 'SOX', 'GLBA', 'Basel III'],
  },
  {
    id: 'retail',
    name: 'Retail / E-Commerce',
    icon: ShoppingCart,
    subTypes: ['Online Retail', 'Brick & Mortar', 'Marketplace', 'D2C Brands', 'Grocery', 'Fashion & Apparel'],
    autoFrameworks: ['PCI-DSS', 'GDPR', 'CCPA/CPRA'],
  },
  {
    id: 'technology',
    name: 'Technology / Software',
    icon: Code,
    subTypes: ['SaaS', 'PaaS / IaaS', 'Mobile Apps', 'AI / ML Platforms', 'DevOps Tools', 'Cybersecurity'],
    autoFrameworks: ['GDPR', 'CCPA/CPRA', 'SOC 2', 'ISO 27001', 'COPPA'],
  },
  {
    id: 'government',
    name: 'Government / Public Sector',
    icon: Building,
    subTypes: ['Federal Agencies', 'State/Local Gov', 'Defense', 'Public Health', 'Education (Public)', 'Infrastructure'],
    autoFrameworks: ['FedRAMP', 'FISMA', 'FERPA', 'ITAR'],
  },
  {
    id: 'education',
    name: 'Education',
    icon: GraduationCap,
    subTypes: ['K-12 Schools', 'Higher Education', 'EdTech Platforms', 'Online Learning', 'Research Institutions', 'Vocational Training'],
    autoFrameworks: ['FERPA', 'COPPA', 'GDPR'],
  },
  {
    id: 'legal',
    name: 'Legal / Professional Services',
    icon: Scale,
    subTypes: ['Law Firms', 'Accounting', 'Consulting', 'Real Estate', 'HR Services', 'Audit Firms'],
    autoFrameworks: ['SOX', 'GDPR'],
  },
  {
    id: 'nonprofit',
    name: 'Nonprofit / Charity',
    icon: HeartHandshake,
    subTypes: ['Foundations', 'NGOs', 'Religious Orgs', 'Advocacy Groups', 'Community Orgs', 'Social Enterprises'],
    autoFrameworks: ['GDPR', 'CCPA/CPRA'],
  },
  {
    id: 'hospitality',
    name: 'Hospitality / Travel',
    icon: Plane,
    subTypes: ['Hotels & Resorts', 'Airlines', 'Restaurants', 'Tourism', 'Event Management', 'Transportation'],
    autoFrameworks: ['PCI-DSS', 'GDPR', 'CCPA/CPRA'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing / Industrial',
    icon: Factory,
    subTypes: ['Automotive', 'Aerospace & Defense', 'Electronics', 'Pharma Manufacturing', 'Chemical', 'Food & Beverage'],
    autoFrameworks: ['ITAR', 'ISO 9001'],
  },
];

// =============================================================================
// CONSTANTS — Geography Data
// =============================================================================

const GEOGRAPHIES: Geography[] = [
  {
    id: 'eu',
    name: 'Europe (EU)',
    flag: '🇪🇺',
    regulations: ['GDPR (MANDATORY)', 'Data Residency: EU Servers', 'SCCs for Transfers'],
    details: 'Full GDPR compliance required for any EU data subject',
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    flag: '🇬🇧',
    regulations: ['UK GDPR (MANDATORY)', 'ICO Registration'],
    details: 'Post-Brexit UK GDPR with independent enforcement',
  },
  {
    id: 'usa',
    name: 'United States',
    flag: '🇺🇸',
    regulations: ['Sector-specific: HIPAA, GLBA, FERPA'],
    details: 'Federal + state-level sector-specific regulations apply',
  },
  {
    id: 'california',
    name: 'California',
    flag: '🔶',
    regulations: ['CCPA/CPRA'],
    details: 'California Consumer Privacy Act with enhanced rights',
  },
  {
    id: 'canada',
    name: 'Canada',
    flag: '🇨🇦',
    regulations: ['PIPEDA'],
    details: 'Personal Information Protection and Electronic Documents Act',
  },
  {
    id: 'brazil',
    name: 'Brazil',
    flag: '🇧🇷',
    regulations: ['LGPD'],
    details: 'Lei Geral de Proteção de Dados Pessoais',
  },
  {
    id: 'australia',
    name: 'Australia',
    flag: '🇦🇺',
    regulations: ['Privacy Act 1988'],
    details: 'Australian Privacy Principles and APP compliance',
  },
  {
    id: 'japan',
    name: 'Japan',
    flag: '🇯🇵',
    regulations: ['APPI'],
    details: 'Act on the Protection of Personal Information',
  },
  {
    id: 'china',
    name: 'China',
    flag: '🇨🇳',
    regulations: ['PIPL', 'Data Localization Required'],
    details: 'Personal Information Protection Law with strict localization',
  },
  {
    id: 'south_korea',
    name: 'South Korea',
    flag: '🇰🇷',
    regulations: ['PIPA'],
    details: 'Personal Information Protection Act',
  },
  {
    id: 'india',
    name: 'India',
    flag: '🇮🇳',
    regulations: ['DPDP Act 2023'],
    details: 'Digital Personal Data Protection Act',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    flag: '🇸🇬',
    regulations: ['PDPA'],
    details: 'Personal Data Protection Act',
  },
  {
    id: 'global',
    name: 'Global / Multinational',
    flag: '🌍',
    regulations: ['GDPR Baseline (Strictest per Field)'],
    details: 'Applies strictest regulation for each data field globally',
  },
];

// =============================================================================
// CONSTANTS — Framework Catalog (30+)
// =============================================================================

const FRAMEWORK_CATEGORIES = [
  'Privacy & Data Protection',
  'Healthcare',
  'Financial',
  'Security',
  'Government',
  'Accessibility',
  'AI & Emerging',
];

const FRAMEWORKS: Framework[] = [
  // Privacy & Data Protection
  { id: 'gdpr', name: 'GDPR', fullName: 'General Data Protection Regulation', category: 'Privacy & Data Protection', icon: Shield, description: 'EU regulation governing data protection and privacy for individuals within the EU/EEA', enforces: ['Consent management', 'Right to erasure', 'Data portability', 'DPO appointment', 'Privacy by design'] },
  { id: 'ccpa', name: 'CCPA/CPRA', fullName: 'California Consumer Privacy Act', category: 'Privacy & Data Protection', icon: ShieldCheck, description: 'California law granting consumers rights over their personal information', enforces: ['Right to know', 'Right to delete', 'Right to opt-out', 'Data disclosure'] },
  { id: 'uk_gdpr', name: 'UK GDPR', fullName: 'UK General Data Protection Regulation', category: 'Privacy & Data Protection', icon: Shield, description: 'Post-Brexit UK equivalent of EU GDPR with ICO enforcement', enforces: ['Data protection principles', 'Lawful processing', 'Individual rights', 'Data breach notification'] },
  { id: 'lgpd', name: 'LGPD', fullName: 'Lei Geral de Proteção de Dados', category: 'Privacy & Data Protection', icon: Shield, description: 'Brazilian federal law governing personal data processing', enforces: ['Legal bases for processing', 'Data subject rights', 'ANPD oversight'] },
  { id: 'pipeda', name: 'PIPEDA', fullName: 'Personal Information Protection & Electronic Documents Act', category: 'Privacy & Data Protection', icon: Shield, description: 'Canadian federal privacy law for private sector organizations', enforces: ['Knowledge and consent', 'Limited collection', 'Accuracy', 'Safeguards'] },
  { id: 'popia', name: 'POPIA', fullName: 'Protection of Personal Information Act', category: 'Privacy & Data Protection', icon: Shield, description: 'South African data protection law aligned with GDPR principles', enforces: ['Processing conditions', 'Data subject participation', 'Information quality'] },
  { id: 'appi', name: 'APPI', fullName: 'Act on Protection of Personal Information', category: 'Privacy & Data Protection', icon: Shield, description: 'Japanese law protecting personal information of citizens', enforces: ['Purpose specification', 'Proper data management', 'Cross-border transfer rules'] },
  { id: 'pdpa', name: 'PDPA', fullName: 'Personal Data Protection Act (Singapore)', category: 'Privacy & Data Protection', icon: Shield, description: 'Singapore law governing collection, use, and disclosure of personal data', enforces: ['Consent obligation', 'Purpose limitation', 'DPIA requirement'] },
  // Healthcare
  { id: 'hipaa_privacy', name: 'HIPAA Privacy', fullName: 'HIPAA Privacy Rule', category: 'Healthcare', icon: Heart, description: 'US federal law protecting the privacy of patient health information', enforces: ['PHI safeguards', 'Patient rights', 'Minimum necessary standard', 'Notice of privacy practices'] },
  { id: 'hipaa_security', name: 'HIPAA Security', fullName: 'HIPAA Security Rule', category: 'Healthcare', icon: Lock, description: 'Standards for protecting electronic PHI (ePHI) in healthcare', enforces: ['Administrative safeguards', 'Physical safeguards', 'Technical safeguards', 'Risk analysis'] },
  { id: 'hitech', name: 'HITECH', fullName: 'Health Information Technology Act', category: 'Healthcare', icon: FileCheck, description: 'Strengthens HIPAA enforcement and promotes health IT adoption', enforces: ['Breach notification', 'Increased penalties', 'Business associate liability'] },
  { id: 'hl7_fhir', name: 'HL7/FHIR', fullName: 'HL7 Fast Healthcare Interoperability Resources', category: 'Healthcare', icon: Database, description: 'Standard for exchanging healthcare information electronically', enforces: ['Data interoperability', 'API standards', 'Resource definitions'] },
  { id: '21_cfr_11', name: '21 CFR 11', fullName: 'FDA 21 CFR Part 11', category: 'Healthcare', icon: ClipboardCheck, description: 'FDA regulation for electronic records and signatures in pharma', enforces: ['Audit trails', 'Electronic signatures', 'System validation', 'Access controls'] },
  { id: '42_cfr_2', name: '42 CFR Part 2', fullName: '42 CFR Part 2 — Substance Abuse Records', category: 'Healthcare', icon: Fingerprint, description: 'Federal regulation protecting substance use disorder patient records', enforces: ['Patient consent for disclosure', 'Restrictions on re-disclosure', 'Qualified service organization agreements'] },
  { id: 'gxp', name: 'GxP', fullName: 'Good Practice Regulations', category: 'Healthcare', icon: ClipboardCheck, description: 'Collection of quality guidelines for pharma and life sciences', enforces: ['Documentation standards', 'Change control', 'Training records', 'Batch records'] },
  // Financial
  { id: 'pci_dss', name: 'PCI-DSS', fullName: 'Payment Card Industry Data Security Standard', category: 'Financial', icon: CreditCard, description: 'Security standard for organizations handling credit card data', enforces: ['No stored PAN/CVV', 'Encryption at rest', 'Encryption in transit', 'Access restrictions'] },
  { id: 'sox', name: 'SOX', fullName: 'Sarbanes-Oxley Act', category: 'Financial', icon: FileCheck, description: 'US federal law mandating corporate financial reporting practices', enforces: ['Audit trail integrity', 'Segregation of duties', 'Change management', 'Internal controls'] },
  { id: 'glba', name: 'GLBA', fullName: 'Gramm-Leach-Bliley Act', category: 'Financial', icon: Landmark, description: 'US law requiring financial institutions to protect consumer data', enforces: ['Financial data safeguards', 'Privacy notices', 'Opt-out rights'] },
  { id: 'mifid_ii', name: 'MiFID II', fullName: 'Markets in Financial Instruments Directive II', category: 'Financial', icon: BarChart3, description: 'EU legislation for investment services and market regulation', enforces: ['Transaction reporting', 'Best execution', 'Client suitability', 'Record keeping'] },
  { id: 'basel_iii', name: 'Basel III', fullName: 'Basel III Framework', category: 'Financial', icon: BarChart3, description: 'International regulatory framework for bank capital adequacy', enforces: ['Capital requirements', 'Liquidity coverage', 'Leverage ratio', 'Disclosure requirements'] },
  { id: 'dodd_frank', name: 'Dodd-Frank', fullName: 'Dodd-Frank Wall Street Reform Act', category: 'Financial', icon: Landmark, description: 'US federal law promoting financial stability and consumer protection', enforces: ['Derivatives reporting', 'Stress testing', 'Risk management', 'Consumer protection'] },
  // Security
  { id: 'soc2', name: 'SOC 2', fullName: 'System and Organization Controls 2', category: 'Security', icon: ShieldCheck, description: 'Audit framework for evaluating service organization controls', enforces: ['Security', 'Availability', 'Processing integrity', 'Confidentiality', 'Privacy'] },
  { id: 'iso_27001', name: 'ISO 27001', fullName: 'ISO/IEC 27001 Information Security', category: 'Security', icon: ShieldAlert, description: 'International standard for information security management systems', enforces: ['ISMS framework', 'Risk assessment', 'Security controls', 'Continuous improvement'] },
  { id: 'nist_csf', name: 'NIST CSF', fullName: 'NIST Cybersecurity Framework', category: 'Security', icon: Shield, description: 'US framework for improving critical infrastructure cybersecurity', enforces: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'] },
  { id: 'owasp', name: 'OWASP Top 10', fullName: 'OWASP Top 10 Web Vulnerabilities', category: 'Security', icon: Zap, description: 'Standard awareness document for web application security', enforces: ['Injection prevention', 'Authentication', 'Data encryption', 'Access control', 'Security logging'] },
  // Government
  { id: 'fedramp', name: 'FedRAMP', fullName: 'Federal Risk & Authorization Management Program', category: 'Government', icon: Building, description: 'US government program for cloud service authorization', enforces: ['Security assessment', 'Continuous monitoring', 'Authorization to operate', 'Remediation'] },
  { id: 'itar', name: 'ITAR', fullName: 'International Traffic in Arms Regulations', category: 'Government', icon: ShieldAlert, description: 'US regulation controlling export of defense articles and services', enforces: ['Export controls', 'Technical data protection', 'Registration requirements'] },
  { id: 'fisma', name: 'FISMA', fullName: 'Federal Information Security Modernization Act', category: 'Government', icon: Building, description: 'US law requiring federal agencies to secure their information systems', enforces: ['Security programs', 'Risk management', 'Incident response', 'Continuous monitoring'] },
  { id: 'nist_800_53', name: 'NIST 800-53', fullName: 'NIST Special Publication 800-53', category: 'Government', icon: BookOpen, description: 'Comprehensive catalog of security and privacy controls', enforces: ['Access control', 'Awareness training', 'Configuration management', 'Contingency planning'] },
  { id: 'ferpa', name: 'FERPA', fullName: 'Family Educational Rights and Privacy Act', category: 'Government', icon: GraduationCap, description: 'US law protecting privacy of student education records', enforces: ['Student record access', 'Directory information', 'Parental rights', 'Record disclosure'] },
  { id: 'coppa', name: 'COPPA', fullName: 'Children\'s Online Privacy Protection Act', category: 'Government', icon: Baby, description: 'US law governing data collection from children under 13', enforces: ['Parental consent', 'Privacy policy', 'Data minimization', 'Security procedures'] },
  // Accessibility
  { id: 'wcag', name: 'WCAG 2.1', fullName: 'Web Content Accessibility Guidelines 2.1', category: 'Accessibility', icon: Eye, description: 'International standard for web accessibility', enforces: ['Perceivable', 'Operable', 'Understandable', 'Robust'] },
  { id: 'ada', name: 'ADA', fullName: 'Americans with Disabilities Act', category: 'Accessibility', icon: Accessibility, description: 'US federal civil rights law for people with disabilities', enforces: ['Non-discrimination', 'Reasonable accommodation', 'Digital accessibility'] },
  { id: 'eaa', name: 'EAA', fullName: 'European Accessibility Act', category: 'Accessibility', icon: Eye, description: 'EU directive ensuring accessibility of products and services', enforces: ['Web accessibility', 'Mobile accessibility', 'Document accessibility'] },
  // AI & Emerging
  { id: 'eu_ai_act', name: 'EU AI Act', fullName: 'European Union Artificial Intelligence Act', category: 'AI & Emerging', icon: Brain, description: 'EU regulation on AI systems classification and governance', enforces: ['Risk classification', 'Transparency', 'Human oversight', 'High-risk requirements'] },
  { id: 'nyc_aedt', name: 'NYC AEDT', fullName: 'NYC Automated Employment Decision Tools', category: 'AI & Emerging', icon: Users, description: 'NYC law requiring bias audits for automated hiring tools', enforces: ['Bias audits', 'Transparency notices', 'Candidate opt-out'] },
];

// =============================================================================
// CONSTANTS — Sensitivity Policies
// =============================================================================

const SENSITIVITY_POLICIES: SensitivityPolicyConfig[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    icon: ShieldAlert,
    philosophy: 'When in doubt, protect. Classify all fields as sensitive unless proven public. Maximum compliance posture.',
    confidenceThreshold: '> 0.40 (classify on low confidence)',
    protectionRules: [
      'All PII fields classified as RESTRICTED',
      'Full audit trail on all data access',
      'Encryption at rest AND in transit for all personal data',
      'Consent required for ANY data processing',
      'Default deny for data sharing',
    ],
    bestFor: ['Healthcare', 'Government', 'Legal', 'Financial Services'],
    strictnessLevel: 4,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    icon: Shield,
    philosophy: 'Risk-proportionate protection. Direct identifiers always protected, inferred data reviewed case-by-case.',
    confidenceThreshold: '> 0.65 (classify on moderate confidence)',
    protectionRules: [
      'Direct PII classified as CONFIDENTIAL',
      'Inferred PII classified as INTERNAL',
      'Encryption required for direct identifiers',
      'Audit trail on sensitive field modifications',
      'Consent for cross-border transfers',
    ],
    bestFor: ['Technology', 'Education', 'Retail', 'Hospitality'],
    strictnessLevel: 3,
  },
  {
    id: 'permissive',
    name: 'Permissive',
    icon: ShieldCheck,
    philosophy: 'Minimal overhead. Only protect obvious sensitive data. Trust in existing access controls.',
    confidenceThreshold: '> 0.85 (classify on high confidence only)',
    protectionRules: [
      'Only obvious PII classified (email, SSN, etc.)',
      'Encryption for HIGHLY sensitive fields only',
      'Minimal audit logging',
      'Rely on existing access controls',
      'No additional consent requirements',
    ],
    bestFor: ['Nonprofit', 'Internal Tools', 'Open Data Projects'],
    strictnessLevel: 2,
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Settings,
    philosophy: 'Admin-defined thresholds and rules. Tailor sensitivity classification to your organization\'s specific needs.',
    confidenceThreshold: 'Admin-defined (0.00 – 1.00)',
    protectionRules: [
      'Custom field classification rules',
      'Configurable confidence thresholds',
      'Organization-specific encryption policies',
      'Tailored audit logging scope',
      'Custom consent workflows',
    ],
    bestFor: ['Complex multi-regulation environments', 'Custom compliance programs'],
    strictnessLevel: 1,
  },
];

// =============================================================================
// CONSTANTS — Special Circumstances
// =============================================================================

const SPECIAL_CIRCUMSTANCES: SpecialCircumstance[] = [
  {
    id: 'data_processor',
    question: 'Do you process data on behalf of other organizations?',
    description: 'Acting as a data processor for clients/customers',
    icon: Server,
    impact: 'Requires Data Processing Agreements (DPAs), sub-processor management, and processor-specific obligations under GDPR/CCPA.',
  },
  {
    id: 'automated_decisions',
    question: 'Do you use AI/ML for decisions affecting individuals?',
    description: 'Automated profiling, credit scoring, hiring decisions, or recommendation systems',
    icon: Brain,
    impact: 'Triggers GDPR Article 22 (right to explanation), EU AI Act risk classification, and bias audit requirements.',
  },
  {
    id: 'international_transfers',
    question: 'Do you transfer data across international borders?',
    description: 'Cross-border data flows between different jurisdictions',
    icon: ArrowRightLeft,
    impact: 'Requires Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), or adequacy decisions. China PIPL requires security assessment.',
  },
  {
    id: 'third_party_processors',
    question: 'Do you use third-party cloud, analytics, or SaaS services?',
    description: 'AWS, Azure, GCP, analytics platforms, CRM systems, etc.',
    icon: Globe2,
    impact: 'Requires vendor assessments, DPAs with all sub-processors, data processing registers, and regular audit of processor compliance.',
  },
  {
    id: 'children_data',
    question: 'Do you collect data from children under 13 or under 16?',
    description: 'COPPA (under 13) or GDPR (under 16) child data collection',
    icon: Baby,
    impact: 'Requires verifiable parental consent, age-gating, data minimization, and special purpose limitations under COPPA/GDPR.',
  },
  {
    id: 'publicly_traded',
    question: 'Is your organization publicly traded?',
    description: 'Listed on any stock exchange (SEC regulated)',
    icon: BarChart3,
    impact: 'Triggers SOX Section 302/404 requirements, internal controls reporting, audit committee oversight, and financial data integrity rules.',
  },
  {
    id: 'dpo_designated',
    question: 'Have you designated a Data Protection Officer?',
    description: 'Formal DPO appointment required under GDPR Article 37',
    icon: Users,
    impact: 'Required under GDPR for public authorities, large-scale monitoring, or special category data processing. Must be registered with supervisory authority.',
  },
];

// =============================================================================
// COMPUTATION — Framework Recommendation Engine
// =============================================================================

const INDUSTRY_FRAMEWORK_MAP: Record<string, string[]> = {
  healthcare: ['hipaa_privacy', 'hipaa_security', 'hitech', 'hl7_fhir', '21_cfr_11'],
  financial: ['pci_dss', 'sox', 'glba', 'basel_iii', 'dodd_frank'],
  retail: ['pci_dss'],
  technology: ['soc2', 'iso_27001', 'owasp', 'nyc_aedt'],
  government: ['fedramp', 'fisma', 'itar', 'nist_800_53', 'ferpa'],
  education: ['ferpa', 'coppa'],
  legal: ['sox'],
  nonprofit: [],
  hospitality: ['pci_dss'],
  manufacturing: ['itar', '21_cfr_11', 'gxp'],
};

const GEOGRAPHY_FRAMEWORK_MAP: Record<string, { mandatory: string[]; recommended: string[] }> = {
  eu: { mandatory: ['gdpr'], recommended: ['wcag', 'eaa', 'eu_ai_act'] },
  uk: { mandatory: ['uk_gdpr'], recommended: ['wcag'] },
  usa: { mandatory: [], recommended: ['ada'] },
  california: { mandatory: ['ccpa'], recommended: [] },
  canada: { mandatory: ['pipeda'], recommended: [] },
  brazil: { mandatory: ['lgpd'], recommended: [] },
  australia: { mandatory: [], recommended: ['popia'] },
  japan: { mandatory: ['appi'], recommended: [] },
  china: { mandatory: ['pdpa'], recommended: [] },
  south_korea: { mandatory: ['appi'], recommended: [] },
  india: { mandatory: [], recommended: [] },
  singapore: { mandatory: ['pdpa'], recommended: [] },
  global: { mandatory: ['gdpr'], recommended: ['iso_27001', 'soc2', 'wcag', 'eaa', 'eu_ai_act'] },
};

function computeFrameworkStatus(
  industryId: string | null,
  selectedGeographies: string[],
  specialCircumstances: Record<string, boolean>,
): Record<string, FrameworkStatus> {
  const statusMap: Record<string, FrameworkStatus> = {};

  // Initialize all as NOT_APPLICABLE
  FRAMEWORKS.forEach((fw) => {
    statusMap[fw.id] = 'NOT_APPLICABLE';
  });

  // Industry-based activation
  if (industryId) {
    const industryFrameworks = INDUSTRY_FRAMEWORK_MAP[industryId] || [];
    industryFrameworks.forEach((fwId) => {
      statusMap[fwId] = 'MANDATORY';
    });
  }

  // Geography-based activation
  selectedGeographies.forEach((geoId) => {
    const mapping = GEOGRAPHY_FRAMEWORK_MAP[geoId];
    if (mapping) {
      mapping.mandatory.forEach((fwId) => {
        if (statusMap[fwId] === 'NOT_APPLICABLE') {
          statusMap[fwId] = 'MANDATORY';
        }
      });
      mapping.recommended.forEach((fwId) => {
        if (statusMap[fwId] === 'NOT_APPLICABLE') {
          statusMap[fwId] = 'RECOMMENDED';
        }
      });
    }
  });

  // Special circumstances modifiers
  if (specialCircumstances.automated_decisions) {
    if (statusMap['eu_ai_act'] === 'NOT_APPLICABLE') statusMap['eu_ai_act'] = 'RECOMMENDED';
    if (statusMap['nyc_aedt'] === 'NOT_APPLICABLE') statusMap['nyc_aedt'] = 'RECOMMENDED';
  }
  if (specialCircumstances.children_data) {
    if (statusMap['coppa'] === 'NOT_APPLICABLE') statusMap['coppa'] = 'MANDATORY';
  }
  if (specialCircumstances.publicly_traded) {
    if (statusMap['sox'] === 'NOT_APPLICABLE') statusMap['sox'] = 'MANDATORY';
  }
  if (specialCircumstances.international_transfers) {
    if (statusMap['gdpr'] === 'NOT_APPLICABLE') statusMap['gdpr'] = 'RECOMMENDED';
  }

  // Add some OPTIONAL frameworks based on context
  const optionalDefaults = ['nist_csf', 'owasp', 'wcag', 'ada'];
  optionalDefaults.forEach((fwId) => {
    if (statusMap[fwId] === 'NOT_APPLICABLE') {
      statusMap[fwId] = 'OPTIONAL';
    }
  });

  // For technology industry, make some more relevant
  if (industryId === 'technology') {
    if (statusMap['owasp'] === 'NOT_APPLICABLE') statusMap['owasp'] = 'RECOMMENDED';
    if (statusMap['nist_csf'] === 'NOT_APPLICABLE') statusMap['nist_csf'] = 'RECOMMENDED';
  }

  return statusMap;
}

// =============================================================================
// STEP LABELS
// =============================================================================

const STEPS = [
  { number: 1, label: 'Industry', icon: Building },
  { number: 2, label: 'Geography', icon: Globe },
  { number: 3, label: 'Frameworks', icon: Shield },
  { number: 4, label: 'Sensitivity', icon: Eye },
  { number: 5, label: 'Circumstances', icon: AlertTriangle },
  { number: 6, label: 'Review', icon: ClipboardCheck },
];

const STORAGE_KEY = 'framework-activation-config';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FrameworkActivationConfig() {
  const { colors, mounted } = useTheme();
  const alpha = useCallback(
    (color: string, opacity: number) =>
      `color-mix(in srgb, ${color} ${opacity}%, transparent)`,
    []
  );

  // ── State ──
  const [wizardState, setWizardState] = useState<WizardState>({
    selectedIndustry: null,
    selectedGeographies: [],
    frameworkToggles: {},
    sensitivityPolicy: 'balanced',
    specialCircumstances: {},
    currentStep: 1,
    activated: false,
    savedAsDraft: false,
  });

  const [animDirection, setAnimDirection] = useState<'forward' | 'backward'>('forward');
  const [showTransition, setShowTransition] = useState(true);

  // ── Derived Data ──
  const frameworkStatuses = useMemo(
    () =>
      computeFrameworkStatus(
        wizardState.selectedIndustry,
        wizardState.selectedGeographies,
        wizardState.specialCircumstances
      ),
    [wizardState.selectedIndustry, wizardState.selectedGeographies, wizardState.specialCircumstances]
  );

  const activeFrameworkCount = useMemo(() => {
    return Object.entries(frameworkStatuses).filter(
      ([id, status]) =>
        (status === 'MANDATORY' || status === 'RECOMMENDED') &&
        (wizardState.frameworkToggles[id] !== false)
    ).length;
  }, [frameworkStatuses, wizardState.frameworkToggles]);

  const mandatoryCount = useMemo(
    () => Object.values(frameworkStatuses).filter((s) => s === 'MANDATORY').length,
    [frameworkStatuses]
  );

  // ── localStorage Persistence ──
  const loadedRef = React.useRef(false);
  useEffect(() => {
    if (!mounted || loadedRef.current) return;
    loadedRef.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WizardState>;
        // Use rAF to avoid synchronous setState in effect (React 19 lint rule)
        const rafId = requestAnimationFrame(() => {
          setWizardState((prev) => ({
            ...prev,
            selectedIndustry: parsed.selectedIndustry ?? prev.selectedIndustry,
            selectedGeographies: parsed.selectedGeographies ?? prev.selectedGeographies,
            frameworkToggles: parsed.frameworkToggles ?? prev.frameworkToggles,
            sensitivityPolicy: parsed.sensitivityPolicy ?? prev.sensitivityPolicy,
            specialCircumstances: parsed.specialCircumstances ?? prev.specialCircumstances,
            currentStep: Math.min(parsed.currentStep || 1, 6),
            activated: parsed.activated ?? false,
            savedAsDraft: parsed.savedAsDraft ?? false,
          }));
        });
        return () => cancelAnimationFrame(rafId);
      }
    } catch {
      // ignore parse errors
    }
  }, [mounted]);

  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wizardState));
    } catch {
      // ignore storage errors
    }
  }, [wizardState]);

  useEffect(() => {
    if (mounted) saveToStorage();
  }, [wizardState, mounted, saveToStorage]);

  // ── Step Navigation ──
  const goToStep = useCallback(
    (step: number) => {
      setAnimDirection(step > wizardState.currentStep ? 'forward' : 'backward');
      setShowTransition(false);
      setTimeout(() => {
        setWizardState((prev) => ({
          ...prev,
          currentStep: step,
          activated: step === 6 ? false : prev.activated,
        }));
        setShowTransition(true);
      }, 150);
    },
    [wizardState.currentStep]
  );

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < 6) goToStep(wizardState.currentStep + 1);
  }, [wizardState.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (wizardState.currentStep > 1) goToStep(wizardState.currentStep - 1);
  }, [wizardState.currentStep, goToStep]);

  // ── Selection Handlers ──
  const selectIndustry = useCallback((industryId: string) => {
    setWizardState((prev) => ({ ...prev, selectedIndustry: industryId }));
  }, []);

  const toggleGeography = useCallback((geoId: string) => {
    setWizardState((prev) => ({
      ...prev,
      selectedGeographies: prev.selectedGeographies.includes(geoId)
        ? prev.selectedGeographies.filter((g) => g !== geoId)
        : [...prev.selectedGeographies, geoId],
    }));
  }, []);

  const toggleFramework = useCallback(
    (fwId: string, status: FrameworkStatus) => {
      if (status === 'MANDATORY') return; // Can't disable mandatory
      setWizardState((prev) => ({
        ...prev,
        frameworkToggles: {
          ...prev.frameworkToggles,
          [fwId]: status === 'NOT_APPLICABLE'
            ? true
            : !prev.frameworkToggles[fwId],
        },
      }));
    },
    []
  );

  const setSensitivityPolicy = useCallback((policy: SensitivityPolicy) => {
    setWizardState((prev) => ({ ...prev, sensitivityPolicy: policy }));
  }, []);

  const toggleCircumstance = useCallback((id: string) => {
    setWizardState((prev) => ({
      ...prev,
      specialCircumstances: {
        ...prev.specialCircumstances,
        [id]: !prev.specialCircumstances[id],
      },
    }));
  }, []);

  const handleActivate = useCallback(() => {
    setWizardState((prev) => ({ ...prev, activated: true }));
  }, []);

  const handleSaveDraft = useCallback(() => {
    saveToStorage();
    setWizardState((prev) => ({ ...prev, savedAsDraft: true }));
    setTimeout(() => setWizardState((prev) => ({ ...prev, savedAsDraft: false })), 2500);
  }, [saveToStorage]);

  const handleReset = useCallback(() => {
    setWizardState({
      selectedIndustry: null,
      selectedGeographies: [],
      frameworkToggles: {},
      sensitivityPolicy: 'balanced',
      specialCircumstances: {},
      currentStep: 1,
      activated: false,
      savedAsDraft: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── Can Proceed Logic ──
  const canProceed = useMemo(() => {
    switch (wizardState.currentStep) {
      case 1:
        return !!wizardState.selectedIndustry;
      case 2:
        return wizardState.selectedGeographies.length > 0;
      default:
        return true;
    }
  }, [wizardState.currentStep, wizardState.selectedIndustry, wizardState.selectedGeographies]);

  // ── Framework Status Helpers ──
  const isFrameworkEnabled = useCallback(
    (fwId: string, status: FrameworkStatus) => {
      if (status === 'MANDATORY') return true;
      if (status === 'RECOMMENDED') return wizardState.frameworkToggles[fwId] !== false;
      if (status === 'OPTIONAL') return wizardState.frameworkToggles[fwId] === true;
      return false;
    },
    [wizardState.frameworkToggles]
  );

  // ── Skeleton when not mounted ──
  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-80 rounded-lg" style={{ backgroundColor: alpha(colors.border, 30) }} />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 flex-1 rounded-lg" style={{ backgroundColor: alpha(colors.border, 20) }} />
          ))}
        </div>
        <div className="h-4 w-48 rounded mb-2" style={{ backgroundColor: alpha(colors.border, 20) }} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl" style={{ backgroundColor: alpha(colors.border, 20) }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──
  const selectedIndustryData = INDUSTRIES.find((i) => i.id === wizardState.selectedIndustry);

  return (
    <div className="space-y-6 content-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: colors.text }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
              <Sparkles className="h-6 w-6" style={{ color: colors.primary }} />
            </div>
            Phase 2 — Framework Activation
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Configure compliance frameworks based on your industry, geography, and data handling requirements
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wizardState.savedAsDraft && (
            <Badge className="text-xs" style={{ backgroundColor: alpha(colors.success, 15), color: colors.success, border: `1px solid ${alpha(colors.success, 30)}` }}>
              <Check className="h-3 w-3 mr-1" />
              Draft Saved
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleReset} style={{ color: colors.textMuted }}>
            <Settings className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div>
        <Progress
          value={(wizardState.currentStep / 6) * 100}
          className="h-2"
        />
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = wizardState.currentStep === step.number;
            const isCompleted = wizardState.currentStep > step.number;
            return (
              <button
                key={step.number}
                onClick={() => goToStep(step.number)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all cursor-pointer"
                style={{
                  color: isCompleted ? colors.success : isActive ? colors.primary : colors.textMuted,
                  backgroundColor: isActive ? alpha(colors.primary, 10) : 'transparent',
                }}
              >
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: alpha(colors.success, 20) }}>
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center border"
                    style={{
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? alpha(colors.primary, 20) : 'transparent',
                    }}
                  >
                    <StepIcon className="h-3 w-3" />
                  </div>
                )}
                <span className="hidden md:inline font-medium">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div
        className="transition-all duration-300"
        style={{
          opacity: showTransition ? 1 : 0,
          transform: showTransition ? 'translateY(0)' : animDirection === 'forward' ? 'translateY(12px)' : 'translateY(-12px)',
        }}
      >
        {wizardState.currentStep === 1 && (
          <StepIndustry
            colors={colors}
            alpha={alpha}
            selectedIndustry={wizardState.selectedIndustry}
            onSelect={selectIndustry}
          />
        )}
        {wizardState.currentStep === 2 && (
          <StepGeography
            colors={colors}
            alpha={alpha}
            selectedGeographies={wizardState.selectedGeographies}
            onToggle={toggleGeography}
          />
        )}
        {wizardState.currentStep === 3 && (
          <StepFrameworks
            colors={colors}
            alpha={alpha}
            frameworkStatuses={frameworkStatuses}
            isFrameworkEnabled={isFrameworkEnabled}
            onToggle={toggleFramework}
            selectedIndustry={selectedIndustryData}
          />
        )}
        {wizardState.currentStep === 4 && (
          <StepSensitivity
            colors={colors}
            alpha={alpha}
            selectedPolicy={wizardState.sensitivityPolicy}
            onSelect={setSensitivityPolicy}
          />
        )}
        {wizardState.currentStep === 5 && (
          <StepSpecialCircumstances
            colors={colors}
            alpha={alpha}
            circumstances={wizardState.specialCircumstances}
            onToggle={toggleCircumstance}
          />
        )}
        {wizardState.currentStep === 6 && (
          <StepReview
            colors={colors}
            alpha={alpha}
            wizardState={wizardState}
            selectedIndustry={selectedIndustryData}
            frameworkStatuses={frameworkStatuses}
            isFrameworkEnabled={isFrameworkEnabled}
            activeFrameworkCount={activeFrameworkCount}
            mandatoryCount={mandatoryCount}
            onActivate={handleActivate}
            onSaveDraft={handleSaveDraft}
          />
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${alpha(colors.border, 50)}` }}>
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={wizardState.currentStep === 1 || wizardState.activated}
          style={{
            color: colors.text,
            borderColor: colors.border,
            opacity: wizardState.currentStep === 1 || wizardState.activated ? 0.4 : 1,
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-2 text-xs" style={{ color: colors.textMuted }}>
          Step {wizardState.currentStep} of 6
          {wizardState.currentStep === 3 && (
            <Badge
              className="ml-2 text-xs"
              style={{
                backgroundColor: alpha(colors.primary, 15),
                color: colors.primary,
                border: `1px solid ${alpha(colors.primary, 30)}`,
              }}
            >
              {activeFrameworkCount} active · {mandatoryCount} mandatory
            </Badge>
          )}
        </div>

        {wizardState.currentStep < 6 ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed}
            style={{
              backgroundColor: canProceed ? colors.buttonPrimary : alpha(colors.primary, 30),
              color: canProceed ? '#fff' : colors.textMuted,
              cursor: canProceed ? 'pointer' : 'not-allowed',
            }}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : wizardState.activated ? (
          <Badge
            className="px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: alpha(colors.success, 15),
              color: colors.success,
              border: `1px solid ${alpha(colors.success, 30)}`,
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Configuration Activated
          </Badge>
        ) : (
          <Button
            onClick={nextStep}
            style={{ backgroundColor: colors.success, color: '#fff' }}
          >
            Review & Activate
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 1 — Industry Selection
// =============================================================================

function StepIndustry({
  colors,
  alpha,
  selectedIndustry,
  onSelect,
}: {
  colors: any;
  alpha: (c: string, o: number) => string;
  selectedIndustry: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
          <Building className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Select Your Industry</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Choose the primary industry for your organization. This determines baseline compliance requirements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {INDUSTRIES.map((industry) => {
          const isSelected = selectedIndustry === industry.id;
          const Icon = industry.icon;
          return (
            <button
              key={industry.id}
              onClick={() => onSelect(industry.id)}
              className="text-left rounded-xl p-5 transition-all duration-200 card-hover-lift cursor-pointer"
              style={{
                backgroundColor: isSelected ? alpha(colors.primary, 10) : alpha(colors.card, 80),
                border: `2px solid ${isSelected ? colors.primary : alpha(colors.border, 50)}`,
                boxShadow: isSelected ? `0 0 20px ${alpha(colors.primary, 15)}` : 'none',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: isSelected ? alpha(colors.primary, 20) : alpha(colors.bgTertiary, 50),
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: isSelected ? colors.primary : colors.textMuted }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{industry.name}</h4>
                    <p className="text-xs" style={{ color: colors.textMuted }}>{industry.subTypes.length} sub-types</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                    <Check className="h-3 w-3" style={{ color: '#fff' }} />
                  </div>
                )}
              </div>

              {/* Sub-types */}
              <div className="flex flex-wrap gap-1 mb-3">
                {industry.subTypes.slice(0, 3).map((sub) => (
                  <span
                    key={sub}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: alpha(colors.bgTertiary, 60),
                      color: colors.textMuted,
                    }}
                  >
                    {sub}
                  </span>
                ))}
                {industry.subTypes.length > 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: colors.textMuted }}>
                    +{industry.subTypes.length - 3} more
                  </span>
                )}
              </div>

              {/* Auto-activated frameworks */}
              <div className="flex flex-wrap gap-1">
                {industry.autoFrameworks.map((fw) => (
                  <span
                    key={fw}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: alpha(colors.warning, 12),
                      color: colors.warning,
                      border: `1px solid ${alpha(colors.warning, 25)}`,
                    }}
                  >
                    {fw}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2 — Geographic Data Origin
// =============================================================================

function StepGeography({
  colors,
  alpha,
  selectedGeographies,
  onToggle,
}: {
  colors: any;
  alpha: (c: string, o: number) => string;
  selectedGeographies: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
          <Globe className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Geographic Data Origin</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Select all regions where you collect, process, or store data. Multi-select is supported.
          </p>
        </div>
      </div>

      {selectedGeographies.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 8), border: `1px solid ${alpha(colors.primary, 20)}` }}>
          <span className="text-xs font-medium mr-1" style={{ color: colors.primary }}>
            {selectedGeographies.length} region{selectedGeographies.length > 1 ? 's' : ''} selected:
          </span>
          {selectedGeographies.map((geoId) => {
            const geo = GEOGRAPHIES.find((g) => g.id === geoId);
            if (!geo) return null;
            return (
              <span
                key={geoId}
                className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors"
                style={{
                  backgroundColor: alpha(colors.primary, 15),
                  color: colors.primary,
                  border: `1px solid ${alpha(colors.primary, 30)}`,
                }}
                onClick={() => onToggle(geoId)}
              >
                {geo.flag} {geo.name} ×
              </span>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GEOGRAPHIES.map((geo) => {
          const isSelected = selectedGeographies.includes(geo.id);
          return (
            <button
              key={geo.id}
              onClick={() => onToggle(geo.id)}
              className="text-left rounded-xl p-4 transition-all duration-200 card-hover-lift cursor-pointer"
              style={{
                backgroundColor: isSelected ? alpha(colors.primary, 10) : alpha(colors.card, 80),
                border: `2px solid ${isSelected ? colors.primary : alpha(colors.border, 50)}`,
                boxShadow: isSelected ? `0 0 16px ${alpha(colors.primary, 12)}` : 'none',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{
                    backgroundColor: isSelected ? alpha(colors.primary, 20) : alpha(colors.bgTertiary, 50),
                  }}
                >
                  {geo.flag}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{geo.name}</h4>
                  <p className="text-xs mt-0.5 mb-2" style={{ color: colors.textMuted }}>{geo.details}</p>
                  <div className="space-y-1">
                    {geo.regulations.map((reg) => (
                      <div key={reg} className="flex items-center gap-1.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: reg.includes('MANDATORY') ? colors.error : colors.primary }}
                        />
                        <span
                          className="text-xs"
                          style={{
                            color: reg.includes('MANDATORY') ? colors.error : colors.textMuted,
                            fontWeight: reg.includes('MANDATORY') ? 600 : 400,
                          }}
                        >
                          {reg}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 3 — Framework Selection
// =============================================================================

function StepFrameworks({
  colors,
  alpha,
  frameworkStatuses,
  isFrameworkEnabled,
  onToggle,
  selectedIndustry,
}: {
  colors: any;
  alpha: (c: string, o: number) => string;
  frameworkStatuses: Record<string, FrameworkStatus>;
  isFrameworkEnabled: (id: string, status: FrameworkStatus) => boolean;
  onToggle: (id: string, status: FrameworkStatus) => void;
  selectedIndustry: Industry | undefined;
}) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFrameworks = FRAMEWORKS.filter((fw) => {
    const matchesCategory = filterCategory === 'all' || fw.category === filterCategory;
    const matchesSearch =
      searchQuery === '' ||
      fw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fw.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const statusConfig: Record<FrameworkStatus, { label: string; color: string; bgColor: string; borderColor: string; locked: boolean; defaultOn: boolean }> = {
    MANDATORY: { label: 'MANDATORY', color: colors.error, bgColor: alpha(colors.error, 12), borderColor: alpha(colors.error, 30), locked: true, defaultOn: true },
    RECOMMENDED: { label: 'RECOMMENDED', color: colors.warning, bgColor: alpha(colors.warning, 12), borderColor: alpha(colors.warning, 30), locked: false, defaultOn: true },
    OPTIONAL: { label: 'OPTIONAL', color: colors.textMuted, bgColor: alpha(colors.textMuted, 8), borderColor: alpha(colors.textMuted, 20), locked: false, defaultOn: false },
    NOT_APPLICABLE: { label: 'N/A', color: colors.textMuted, bgColor: alpha(colors.bgTertiary, 30), borderColor: alpha(colors.border, 30), locked: false, defaultOn: false },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
            <Shield className="h-5 w-5" style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Compliance Frameworks</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Auto-computed based on your industry and geography selections.
            </p>
          </div>
        </div>
      </div>

      {/* Summary banner */}
      {selectedIndustry && (
        <div
          className="rounded-lg p-3 flex items-center gap-3 text-sm"
          style={{
            backgroundColor: alpha(colors.primary, 8),
            border: `1px solid ${alpha(colors.primary, 20)}`,
            color: colors.textMuted,
          }}
        >
          <Info className="h-4 w-4 shrink-0" style={{ color: colors.primary }} />
          Showing frameworks for <span className="font-medium" style={{ color: colors.text }}>{selectedIndustry.name}</span>
          {` — `}
          <span style={{ color: colors.error }}>{Object.values(frameworkStatuses).filter((s) => s === 'MANDATORY').length} mandatory</span>
          {`, `}
          <span style={{ color: colors.warning }}>{Object.values(frameworkStatuses).filter((s) => s === 'RECOMMENDED').length} recommended</span>
          {`, `}
          <span>{Object.values(frameworkStatuses).filter((s) => s === 'OPTIONAL').length} optional</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: alpha(colors.bgTertiary, 40), border: `1px solid ${alpha(colors.border, 40)}` }}
        >
          <span className="text-xs" style={{ color: colors.textMuted }}>Filter:</span>
          <button
            onClick={() => setFilterCategory('all')}
            className="text-xs px-2 py-0.5 rounded-md transition-colors"
            style={{
              backgroundColor: filterCategory === 'all' ? alpha(colors.primary, 20) : 'transparent',
              color: filterCategory === 'all' ? colors.primary : colors.textMuted,
            }}
          >
            All
          </button>
          {FRAMEWORK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="text-xs px-2 py-0.5 rounded-md transition-colors"
              style={{
                backgroundColor: filterCategory === cat ? alpha(colors.primary, 20) : 'transparent',
                color: filterCategory === cat ? colors.primary : colors.textMuted,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search frameworks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg outline-none ml-auto"
          style={{
            backgroundColor: alpha(colors.bgTertiary, 40),
            border: `1px solid ${alpha(colors.border, 40)}`,
            color: colors.text,
          }}
        />
      </div>

      {/* Framework Grid */}
      <ScrollArea className="max-h-[520px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2 pb-2">
          {filteredFrameworks.map((fw) => {
            const status = frameworkStatuses[fw.id] || 'NOT_APPLICABLE';
            const config = statusConfig[status];
            const enabled = isFrameworkEnabled(fw.id, status);
            const Icon = fw.icon;

            return (
              <div
                key={fw.id}
                className="rounded-xl p-4 transition-all duration-200"
                style={{
                  backgroundColor: enabled ? alpha(colors.primary, 6) : alpha(colors.card, 80),
                  border: `1px solid ${enabled ? alpha(colors.primary, 30) : alpha(colors.border, 40)}`,
                  opacity: status === 'NOT_APPLICABLE' ? 0.5 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ backgroundColor: enabled ? alpha(colors.primary, 15) : alpha(colors.bgTertiary, 50) }}
                    >
                      <Icon className="h-4 w-4" style={{ color: enabled ? colors.primary : colors.textMuted }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{fw.name}</h4>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: config.bgColor,
                            color: config.color,
                            border: `1px solid ${config.borderColor}`,
                          }}
                        >
                          {config.locked && <Lock className="h-2.5 w-2.5 inline mr-1" />}
                          {config.label}
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>{fw.category}</span>
                      </div>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: colors.textMuted }}>{fw.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {fw.enforces.slice(0, 3).map((e) => (
                          <span
                            key={e}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: alpha(colors.bgTertiary, 60),
                              color: colors.textMuted,
                            }}
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 pt-1">
                    {status === 'MANDATORY' ? (
                      <div className="flex items-center gap-1.5">
                        <Switch checked disabled />
                      </div>
                    ) : status === 'NOT_APPLICABLE' ? (
                      <Switch checked={false} disabled />
                    ) : (
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => onToggle(fw.id, status)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// STEP 4 — Sensitivity Policy
// =============================================================================

function StepSensitivity({
  colors,
  alpha,
  selectedPolicy,
  onSelect,
}: {
  colors: any;
  alpha: (c: string, o: number) => string;
  selectedPolicy: SensitivityPolicy;
  onSelect: (policy: SensitivityPolicy) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
          <Eye className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Sensitivity Classification Policy</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Choose how conservatively the system should classify and protect data fields.
          </p>
        </div>
      </div>

      {/* Strictness Visual Indicator */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: alpha(colors.bgTertiary, 30), border: `1px solid ${alpha(colors.border, 40)}` }}>
        <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Strictness:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => {
            const currentConfig = SENSITIVITY_POLICIES.find((p) => p.id === selectedPolicy);
            const isActive = currentConfig ? level <= currentConfig.strictnessLevel : false;
            const strictnessColors = [colors.success, colors.warning, colors.primary, colors.error];
            return (
              <div
                key={level}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: isActive ? '48px' : '24px',
                  backgroundColor: isActive ? strictnessColors[level - 1] : alpha(colors.border, 40),
                }}
              />
            );
          })}
        </div>
        <span className="text-xs font-medium ml-2" style={{ color: colors.primary }}>
          {SENSITIVITY_POLICIES.find((p) => p.id === selectedPolicy)?.name}
        </span>
      </div>

      {/* Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SENSITIVITY_POLICIES.map((policy) => {
          const isSelected = selectedPolicy === policy.id;
          const Icon = policy.icon;
          const strictnessColors: Record<string, string> = {
            conservative: colors.error,
            balanced: colors.warning,
            permissive: colors.success,
            custom: colors.accent,
          };
          const policyColor = strictnessColors[policy.id] || colors.primary;

          return (
            <button
              key={policy.id}
              onClick={() => onSelect(policy.id)}
              className="text-left rounded-xl p-5 transition-all duration-200 card-hover-lift cursor-pointer"
              style={{
                backgroundColor: isSelected ? alpha(policyColor, 8) : alpha(colors.card, 80),
                border: `2px solid ${isSelected ? policyColor : alpha(colors.border, 50)}`,
                boxShadow: isSelected ? `0 0 20px ${alpha(policyColor, 12)}` : 'none',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: isSelected ? alpha(policyColor, 20) : alpha(colors.bgTertiary, 50),
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: isSelected ? policyColor : colors.textMuted }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{policy.name}</h4>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Confidence: {policy.confidenceThreshold}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: policyColor }}>
                    <Check className="h-3 w-3" style={{ color: '#fff' }} />
                  </div>
                )}
              </div>

              <p className="text-xs mb-3 leading-relaxed" style={{ color: colors.textMuted }}>
                {policy.philosophy}
              </p>

              <div className="space-y-1.5 mb-3">
                {policy.protectionRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color: isSelected ? policyColor : colors.textMuted }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>{rule}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1">
                {policy.bestFor.map((industry) => (
                  <span
                    key={industry}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: alpha(policyColor, 10),
                      color: policyColor,
                      border: `1px solid ${alpha(policyColor, 20)}`,
                    }}
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 5 — Special Circumstances
// =============================================================================

function StepSpecialCircumstances({
  colors,
  alpha,
  circumstances,
  onToggle,
}: {
  colors: any;
  alpha: (c: string, o: number) => string;
  circumstances: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const yesCount = Object.values(circumstances).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
          <AlertTriangle className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Special Circumstances</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Answer these questions to identify additional compliance requirements.
          </p>
        </div>
      </div>

      {yesCount > 0 && (
        <div
          className="rounded-lg p-3 flex items-center gap-2 text-sm"
          style={{
            backgroundColor: alpha(colors.warning, 10),
            border: `1px solid ${alpha(colors.warning, 25)}`,
            color: colors.warning,
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {yesCount} special circumstance{yesCount > 1 ? 's' : ''} detected — additional frameworks may be required
        </div>
      )}

      <div className="space-y-3">
        {SPECIAL_CIRCUMSTANCES.map((item, index) => {
          const answer = circumstances[item.id];
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="rounded-xl p-4 transition-all duration-200"
              style={{
                backgroundColor: answer ? alpha(colors.warning, 6) : alpha(colors.card, 80),
                border: `1px solid ${answer ? alpha(colors.warning, 30) : alpha(colors.border, 40)}`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{
                      backgroundColor: answer ? alpha(colors.warning, 15) : alpha(colors.bgTertiary, 50),
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: answer ? colors.warning : colors.textMuted }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-medium" style={{ color: colors.textMuted }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{item.question}</h4>
                    </div>
                    <p className="text-xs mb-2" style={{ color: colors.textMuted }}>{item.description}</p>
                    {answer && (
                      <div
                        className="rounded-lg p-2.5 text-xs"
                        style={{
                          backgroundColor: alpha(colors.warning, 8),
                          border: `1px solid ${alpha(colors.warning, 15)}`,
                          color: colors.text,
                        }}
                      >
                        <span className="font-semibold" style={{ color: colors.warning }}>Impact: </span>
                        {item.impact}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (answer !== true) onToggle(item.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: answer ? alpha(colors.warning, 20) : alpha(colors.bgTertiary, 40),
                      color: answer ? colors.warning : colors.textMuted,
                      border: `1px solid ${answer ? alpha(colors.warning, 40) : alpha(colors.border, 30)}`,
                    }}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => {
                      if (answer === true) onToggle(item.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: answer === false ? alpha(colors.bgTertiary, 40) : 'transparent',
                      color: answer === false ? colors.text : colors.textMuted,
                      border: `1px solid ${answer === false ? alpha(colors.border, 50) : 'transparent'}`,
                    }}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 6 — Configuration Review
// =============================================================================

function StepReview({
  colors,
  alpha,
  wizardState,
  selectedIndustry,
  frameworkStatuses,
  isFrameworkEnabled,
  activeFrameworkCount,
  mandatoryCount,
  onActivate,
  onSaveDraft,
}: {
  colors: any;
  alpha: (c: string, o: number) => string;
  wizardState: WizardState;
  selectedIndustry: Industry | undefined;
  frameworkStatuses: Record<string, FrameworkStatus>;
  isFrameworkEnabled: (id: string, status: FrameworkStatus) => boolean;
  activeFrameworkCount: number;
  mandatoryCount: number;
  onActivate: () => void;
  onSaveDraft: () => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    industry: true,
    geography: true,
    frameworks: true,
    sensitivity: true,
    circumstances: true,
    impact: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedGeos = wizardState.selectedGeographies.map(
    (id) => GEOGRAPHIES.find((g) => g.id === id)
  ).filter(Boolean) as Geography[];

  const selectedPolicy = SENSITIVITY_POLICIES.find((p) => p.id === wizardState.sensitivityPolicy);
  const answeredCircumstances = SPECIAL_CIRCUMSTANCES.filter((c) => wizardState.specialCircumstances[c.id]);
  const enabledFrameworks = FRAMEWORKS.filter((fw) => isFrameworkEnabled(fw.id, frameworkStatuses[fw.id] || 'NOT_APPLICABLE'));

  // Group enabled frameworks by category
  const frameworksByCategory: Record<string, typeof enabledFrameworks> = {};
  enabledFrameworks.forEach((fw) => {
    if (!frameworksByCategory[fw.category]) frameworksByCategory[fw.category] = [];
    frameworksByCategory[fw.category].push(fw);
  });

  // Dummy impact data
  const impactData = {
    phiFields: selectedIndustry?.id === 'healthcare' ? 54 : 0,
    piiFields: 63,
    pciFields: ['financial', 'retail', 'hospitality'].includes(selectedIndustry?.id || '') ? 12 : 0,
    soxFields: ['financial', 'legal'].includes(selectedIndustry?.id || '') ? 8 : 0,
  };
  const complianceGaps = [
    { severity: 'warning', framework: 'SOX', issue: 'Access review schedule not configured' },
    { severity: 'info', framework: 'GDPR', issue: 'Cookie consent banner needs update' },
    ...(selectedIndustry?.id === 'healthcare' ? [{ severity: 'error', framework: 'HIPAA', issue: 'Breach notification workflow missing' }] : []),
    ...(wizardState.specialCircumstances.automated_decisions ? [{ severity: 'warning', framework: 'EU AI Act', issue: 'AI impact assessment pending' }] : []),
  ];

  if (wizardState.activated) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${alpha(colors.success, 10)}, ${alpha(colors.primary, 10)})`,
            border: `2px solid ${alpha(colors.success, 30)}`,
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: alpha(colors.success, 20) }}
          >
            <Check className="h-8 w-8" style={{ color: colors.success }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
            Framework Configuration Activated
          </h3>
          <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
            {activeFrameworkCount} compliance frameworks have been activated with your chosen sensitivity policy.
            Your schema will now be scanned for compliance violations against all active frameworks.
          </p>
          <div className="flex justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.success }}>{activeFrameworkCount}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Active Frameworks</div>
            </div>
            <div
              className="w-px"
              style={{ backgroundColor: alpha(colors.border, 50) }}
            />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.warning }}>{mandatoryCount}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Mandatory</div>
            </div>
            <div
              className="w-px"
              style={{ backgroundColor: alpha(colors.border, 50) }}
            />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                {selectedGeos.length}
              </div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Regions</div>
            </div>
            <div
              className="w-px"
              style={{ backgroundColor: alpha(colors.border, 50) }}
            />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.accent }}>
                {selectedPolicy?.name}
              </div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Policy</div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: alpha(colors.primary, 8),
            border: `1px solid ${alpha(colors.primary, 20)}`,
          }}
        >
          <Target className="h-5 w-5 shrink-0" style={{ color: colors.primary }} />
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>Next Steps</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Navigate to the Compliance tab to view real-time compliance scan results across your schema. The system will continuously monitor all {activeFrameworkCount} active frameworks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 15) }}>
          <ClipboardCheck className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Configuration Review</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Review all your selections before activating the compliance framework configuration.
          </p>
        </div>
      </div>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-2 pb-2">
          {/* ── Industry Summary ── */}
          <ReviewSection
            title="Selected Industry"
            expanded={expandedSections.industry}
            onToggle={() => toggleSection('industry')}
            colors={colors}
            alpha={alpha}
            icon={selectedIndustry?.icon || Building}
            badgeText={selectedIndustry?.name || 'None'}
            badgeColor={colors.primary}
          >
            {selectedIndustry && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {selectedIndustry.subTypes.map((sub) => (
                    <span key={sub} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: alpha(colors.bgTertiary, 60), color: colors.textMuted }}>
                      {sub}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedIndustry.autoFrameworks.map((fw) => (
                    <span key={fw} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: alpha(colors.warning, 12), color: colors.warning, border: `1px solid ${alpha(colors.warning, 25)}` }}>
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ReviewSection>

          {/* ── Geography Summary ── */}
          <ReviewSection
            title="Selected Geographies"
            expanded={expandedSections.geography}
            onToggle={() => toggleSection('geography')}
            colors={colors}
            alpha={alpha}
            icon={Globe}
            badgeText={`${selectedGeos.length} regions`}
            badgeColor={colors.primary}
          >
            <div className="space-y-2">
              {selectedGeos.map((geo) => (
                <div key={geo.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: alpha(colors.bgTertiary, 30) }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{geo.flag}</span>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{geo.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {geo.regulations.map((reg) => (
                      <span key={reg} className="text-xs px-1.5 py-0.5 rounded" style={{ color: reg.includes('MANDATORY') ? colors.error : colors.textMuted, fontWeight: reg.includes('MANDATORY') ? 600 : 400 }}>
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ReviewSection>

          {/* ── Frameworks Summary ── */}
          <ReviewSection
            title="Active Frameworks"
            expanded={expandedSections.frameworks}
            onToggle={() => toggleSection('frameworks')}
            colors={colors}
            alpha={alpha}
            icon={Shield}
            badgeText={`${activeFrameworkCount} active`}
            badgeColor={colors.success}
          >
            <div className="space-y-3">
              {Object.entries(frameworksByCategory).map(([category, frameworks]) => (
                <div key={category}>
                  <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    {category}
                  </p>
                  <div className="space-y-1">
                    {frameworks.map((fw) => {
                      const status = frameworkStatuses[fw.id];
                      const Icon = fw.icon;
                      return (
                        <div key={fw.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: alpha(colors.bgTertiary, 30) }}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                            <span className="text-sm" style={{ color: colors.text }}>{fw.name}</span>
                            <span className="text-xs" style={{ color: colors.textMuted }}>— {fw.fullName}</span>
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: status === 'MANDATORY' ? alpha(colors.error, 12) : alpha(colors.success, 12),
                              color: status === 'MANDATORY' ? colors.error : colors.success,
                            }}
                          >
                            {status === 'MANDATORY' && <Lock className="h-2.5 w-2.5 inline mr-1" />}
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ReviewSection>

          {/* ── Sensitivity Policy Summary ── */}
          <ReviewSection
            title="Sensitivity Policy"
            expanded={expandedSections.sensitivity}
            onToggle={() => toggleSection('sensitivity')}
            colors={colors}
            alpha={alpha}
            icon={selectedPolicy?.icon || Eye}
            badgeText={selectedPolicy?.name || 'None'}
            badgeColor={colors.warning}
          >
            {selectedPolicy && (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: colors.textMuted }}>{selectedPolicy.philosophy}</p>
                <p className="text-xs font-medium" style={{ color: colors.text }}>Confidence Threshold: {selectedPolicy.confidenceThreshold}</p>
                <div className="space-y-1 mt-2">
                  {selectedPolicy.protectionRules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color: colors.success }} />
                      <span className="text-xs" style={{ color: colors.textMuted }}>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ReviewSection>

          {/* ── Special Circumstances Summary ── */}
          <ReviewSection
            title="Special Circumstances"
            expanded={expandedSections.circumstances}
            onToggle={() => toggleSection('circumstances')}
            colors={colors}
            alpha={alpha}
            icon={AlertTriangle}
            badgeText={`${answeredCircumstances.length} yes`}
            badgeColor={answeredCircumstances.length > 0 ? colors.warning : colors.success}
          >
            <div className="space-y-1.5">
              {SPECIAL_CIRCUMSTANCES.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-1.5">
                  {wizardState.specialCircumstances[item.id] ? (
                    <Badge variant="destructive" className="text-xs">YES</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">NO</Badge>
                  )}
                  <span className="text-xs" style={{ color: colors.text }}>{item.question}</span>
                </div>
              ))}
            </div>
          </ReviewSection>

          {/* ── Impact Summary ── */}
          <ReviewSection
            title="Fields & Impact"
            expanded={expandedSections.impact}
            onToggle={() => toggleSection('impact')}
            colors={colors}
            alpha={alpha}
            icon={Database}
            badgeText={`${impactData.phiFields + impactData.piiFields + impactData.pciFields + impactData.soxFields} fields`}
            badgeColor={colors.accent}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'PHI Fields', value: impactData.phiFields, color: colors.error },
                  { label: 'PII Fields', value: impactData.piiFields, color: colors.warning },
                  { label: 'PCI Fields', value: impactData.pciFields, color: colors.primary },
                  { label: 'SOX Fields', value: impactData.soxFields, color: colors.accent },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: alpha(stat.color, 8) }}>
                    <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {complianceGaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: colors.warning }}>
                    Compliance Gaps Detected
                  </p>
                  <div className="space-y-1">
                    {complianceGaps.map((gap, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: alpha(gap.severity === 'error' ? colors.error : gap.severity === 'warning' ? colors.warning : colors.primary, 8) }}>
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: gap.severity === 'error' ? colors.error : gap.severity === 'warning' ? colors.warning : colors.primary }} />
                        <span className="text-xs font-medium" style={{ color: colors.text }}>{gap.framework}</span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>{gap.issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ReviewSection>
        </div>
      </ScrollArea>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid ${alpha(colors.border, 50)}` }}>
        <Button
          onClick={onActivate}
          className="flex-1"
          style={{
            backgroundColor: colors.success,
            color: '#fff',
            boxShadow: `0 4px 14px ${alpha(colors.success, 30)}`,
          }}
        >
          <Zap className="h-4 w-4 mr-2" />
          Confirm & Activate {activeFrameworkCount} Frameworks
        </Button>
        <Button
          variant="outline"
          onClick={onSaveDraft}
          style={{ borderColor: colors.border, color: colors.text }}
        >
          <Target className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// REVIEW SECTION HELPER
// =============================================================================

function ReviewSection({
  title,
  expanded,
  onToggle,
  colors,
  alpha,
  icon: Icon,
  badgeText,
  badgeColor,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  colors: any;
  alpha: (c: string, o: number) => string;
  icon: LucideIcon;
  badgeText: string;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: alpha(colors.card, 80),
        border: `1px solid ${alpha(colors.border, 40)}`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 cursor-pointer"
        style={{ color: colors.text }}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4" style={{ color: badgeColor }} />
          <span className="font-semibold text-sm">{title}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: alpha(badgeColor, 12),
              color: badgeColor,
              border: `1px solid ${alpha(badgeColor, 25)}`,
            }}
          >
            {badgeText}
          </span>
        </div>
        <ChevronRight
          className="h-4 w-4 transition-transform duration-200"
          style={{
            color: colors.textMuted,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${alpha(colors.border, 30)}` }}>
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}
