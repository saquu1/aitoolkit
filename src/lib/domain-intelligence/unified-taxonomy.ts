/**
 * Unified Table Taxonomy
 * 
 * A single taxonomy that:
 * 1. Classifies tables by TYPE (not by domain)
 * 2. Applies domain-specific INTELLIGENCE based on context
 * 3. Maps to multiple DOMAINS automatically
 * 
 * 80% of table patterns are universal across domains
 * 15% are domain-specific
 * 5% are business-specific
 */

import { BusinessDomain } from './base'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type UniversalTableType = 
  | 'people'      // Users, customers, employees, patients
  | 'places'      // Addresses, locations, warehouses
  | 'things'      // Products, items, assets
  | 'events'      // Orders, transactions, activities
  | 'finance'     // Payments, invoices, accounts
  | 'catalog'     // Categories, tags, classifications
  | 'attachments' // Files, documents, media
  | 'meta'        // Settings, configs, audit

export interface UniversalTableMapping {
  /** Universal table type */
  type: UniversalTableType
  /** Common aliases across all domains */
  aliases: string[]
  /** Domain-specific mappings */
  domainMappings: Partial<Record<BusinessDomain, string[]>>
  /** Typical columns for this table type */
  typicalColumns: string[]
  /** Typical category */
  category: 'master' | 'transaction' | 'lookup' | 'junction' | 'audit' | 'config'
}

// =============================================================================
// UNIVERSAL TABLE TAXONOMY
// =============================================================================

/**
 * PEOPLE & CONTACTS - Universal tables for human entities
 */
export const PEOPLE_TABLES: Record<string, UniversalTableMapping> = {
  user: {
    type: 'people',
    aliases: ['account', 'member', 'profile', 'participant'],
    domainMappings: {
      healthcare: ['patient', 'doctor', 'nurse', 'physician', 'specialist', 'provider'],
      crm: ['lead', 'contact', 'account', 'prospect', 'client'],
      ecommerce: ['customer', 'guest', 'shopper', 'buyer', 'subscriber'],
      erp: ['employee', 'staff', 'worker', 'contractor', 'vendor_user'],
      education: ['student', 'teacher', 'instructor', 'professor', 'parent'],
      real_estate: ['agent', 'broker', 'buyer', 'seller', 'landlord'],
      hospitality: ['guest', 'visitor', 'traveler', 'member'],
    },
    typicalColumns: ['id', 'name', 'email', 'phone', 'created_at', 'updated_at'],
    category: 'master'
  },
  
  customer: {
    type: 'people',
    aliases: ['client', 'account', 'patron'],
    domainMappings: {
      healthcare: ['patient'],
      crm: ['account', 'company', 'organization'],
      ecommerce: ['buyer', 'shopper'],
      erp: ['vendor_customer', 'debtor'],
    },
    typicalColumns: ['id', 'name', 'email', 'phone', 'address_id', 'status'],
    category: 'master'
  },
  
  employee: {
    type: 'people',
    aliases: ['staff', 'worker', 'personnel', 'team_member'],
    domainMappings: {
      erp: ['worker', 'contractor', 'temp_worker', 'personnel'],
      healthcare: ['staff', 'worker', 'employee'],
      education: ['faculty', 'staff', 'administrator'],
    },
    typicalColumns: ['id', 'name', 'email', 'department_id', 'hire_date', 'status'],
    category: 'master'
  },
  
  vendor: {
    type: 'people',
    aliases: ['supplier', 'provider', 'seller', 'contractor'],
    domainMappings: {
      erp: ['supplier', 'vendor', 'contractor', 'service_provider', 'creditor'],
      ecommerce: ['seller', 'merchant', 'dropshipper'],
    },
    typicalColumns: ['id', 'name', 'contact_email', 'phone', 'address_id', 'payment_terms'],
    category: 'master'
  },
  
  partner: {
    type: 'people',
    aliases: ['reseller', 'affiliate', 'distributor'],
    domainMappings: {
      crm: ['reseller', 'affiliate', 'partner_account'],
      erp: ['supplier', 'distribution_partner'],
    },
    typicalColumns: ['id', 'name', 'type', 'commission_rate', 'status'],
    category: 'master'
  }
}

/**
 * TRANSACTIONS & ORDERS - Universal tables for business transactions
 */
export const TRANSACTION_TABLES: Record<string, UniversalTableMapping> = {
  order: {
    type: 'events',
    aliases: ['transaction', 'record', 'entry', 'document'],
    domainMappings: {
      healthcare: ['admission', 'visit', 'encounter', 'prescription_order', 'lab_order'],
      crm: ['opportunity', 'quote', 'contract', 'deal'],
      ecommerce: ['order', 'purchase', 'cart_order'],
      erp: ['purchase_order', 'sales_order', 'work_order', 'job_order'],
      education: ['enrollment', 'registration', 'enrollment_request'],
      real_estate: ['transaction', 'deal', 'closing'],
      hospitality: ['reservation', 'booking'],
    },
    typicalColumns: ['id', 'number', 'date', 'status', 'total_amount', 'customer_id'],
    category: 'transaction'
  },
  
  invoice: {
    type: 'finance',
    aliases: ['bill', 'statement', 'receivable', 'payable'],
    domainMappings: {
      healthcare: ['medical_bill', 'insurance_claim', 'statement'],
      crm: ['quote', 'proposal', 'invoice'],
      ecommerce: ['order_invoice', 'digital_receipt'],
      erp: ['ap_invoice', 'ar_invoice', 'vendor_invoice', 'customer_invoice'],
      education: ['tuition_invoice', 'fee_statement'],
      hospitality: ['folio', 'guest_invoice'],
    },
    typicalColumns: ['id', 'number', 'date', 'due_date', 'amount', 'status', 'customer_id'],
    category: 'transaction'
  },
  
  payment: {
    type: 'finance',
    aliases: ['transaction', 'settlement', 'receipt'],
    domainMappings: {
      healthcare: ['payment', 'insurance_payment', 'co_pay'],
      crm: ['payment', 'deal_payment'],
      ecommerce: ['payment', 'checkout_payment', 'refund'],
      erp: ['payment', 'disbursement', 'reconciliation'],
      education: ['tuition_payment', 'fee_payment'],
      hospitality: ['payment', 'incidentals', 'deposit'],
    },
    typicalColumns: ['id', 'amount', 'method', 'status', 'date', 'reference'],
    category: 'transaction'
  },
  
  line_item: {
    type: 'events',
    aliases: ['detail', 'entry', 'item', 'record'],
    domainMappings: {
      healthcare: ['prescription_item', 'procedure_line', 'service_line'],
      crm: ['line_item', 'quote_line', 'product_line'],
      ecommerce: ['cart_item', 'order_item', 'line_item'],
      erp: ['po_line', 'invoice_line', 'bom_line'],
      education: ['course_enrollment', 'fee_line'],
    },
    typicalColumns: ['id', 'parent_id', 'product_id', 'quantity', 'unit_price', 'total'],
    category: 'transaction'
  }
}

/**
 * PRODUCTS & INVENTORY - Universal tables for items
 */
export const PRODUCT_TABLES: Record<string, UniversalTableMapping> = {
  product: {
    type: 'things',
    aliases: ['item', 'article', 'goods', 'asset'],
    domainMappings: {
      healthcare: ['medication', 'procedure', 'service', 'supply', 'equipment'],
      crm: ['product', 'service', 'solution', 'offering'],
      ecommerce: ['product', 'sku', 'item', 'merchandise'],
      erp: ['item', 'material', 'component', 'raw_material', 'finished_good'],
      education: ['course', 'class', 'module', 'program', 'curriculum'],
      real_estate: ['property', 'listing', 'unit', 'apartment'],
      hospitality: ['room', 'suite', 'package', 'service'],
    },
    typicalColumns: ['id', 'name', 'description', 'category_id', 'price', 'status'],
    category: 'master'
  },
  
  variant: {
    type: 'things',
    aliases: ['sku_variant', 'product_option', 'size_color'],
    domainMappings: {
      ecommerce: ['variant', 'product_variant', 'sku_option'],
      erp: ['item_variant', 'configuration', 'specification'],
      healthcare: ['dosage', 'formulation', 'strength'],
    },
    typicalColumns: ['id', 'product_id', 'sku', 'attributes', 'price_adjustment'],
    category: 'master'
  },
  
  category: {
    type: 'catalog',
    aliases: ['group', 'type', 'classification', 'taxonomy'],
    domainMappings: {
      healthcare: ['department', 'specialty', 'diagnosis_category'],
      crm: ['industry', 'segment', 'type'],
      ecommerce: ['category', 'department', 'collection'],
      erp: ['item_group', 'product_family', 'commodity_code'],
      education: ['department', 'major', 'subject', 'grade_level'],
    },
    typicalColumns: ['id', 'name', 'parent_id', 'description', 'sort_order'],
    category: 'lookup'
  },
  
  inventory: {
    type: 'things',
    aliases: ['stock', 'quantity', 'availability'],
    domainMappings: {
      ecommerce: ['stock', 'inventory', 'warehouse_stock'],
      erp: ['inventory', 'stock', 'warehouse_quantity', 'bin_quantity'],
      hospitality: ['availability', 'room_availability'],
      healthcare: ['supply_inventory', 'pharmacy_stock'],
    },
    typicalColumns: ['id', 'product_id', 'warehouse_id', 'quantity', 'reorder_point'],
    category: 'transaction'
  },
  
  price: {
    type: 'finance',
    aliases: ['rate', 'cost', 'fee', 'charge'],
    domainMappings: {
      healthcare: ['procedure_rate', 'service_fee', 'copay'],
      crm: ['quote_price', 'deal_value', 'contract_value'],
      ecommerce: ['price', 'sale_price', 'regular_price'],
      erp: ['standard_cost', 'actual_cost', 'selling_price'],
      education: ['tuition', 'fee', 'rate'],
      hospitality: ['rate', 'nightly_rate', 'package_price'],
    },
    typicalColumns: ['id', 'product_id', 'amount', 'currency', 'valid_from', 'valid_to'],
    category: 'master'
  }
}

/**
 * LOCATIONS & ADDRESSES - Universal tables for places
 */
export const LOCATION_TABLES: Record<string, UniversalTableMapping> = {
  address: {
    type: 'places',
    aliases: ['location', 'place', 'site', 'venue'],
    domainMappings: {
      healthcare: ['facility_address', 'clinic_address', 'hospital_address'],
      crm: ['company_address', 'contact_address', 'billing_address', 'shipping_address'],
      ecommerce: ['shipping_address', 'billing_address', 'delivery_address'],
      erp: ['warehouse_address', 'plant_address', 'office_address'],
      education: ['campus_address', 'institution_address'],
      real_estate: ['property_address', 'listing_address', 'agent_office'],
      hospitality: ['hotel_address', 'reservation_address'],
    },
    typicalColumns: ['id', 'street', 'city', 'state', 'country', 'postal_code'],
    category: 'master'
  },
  
  location: {
    type: 'places',
    aliases: ['site', 'facility', 'building', 'venue'],
    domainMappings: {
      healthcare: ['facility', 'clinic', 'hospital', 'lab', 'pharmacy'],
      crm: ['office', 'location', 'branch'],
      ecommerce: ['warehouse', 'fulfillment_center', 'store'],
      erp: ['plant', 'warehouse', 'location', 'site', 'work_center'],
      education: ['campus', 'building', 'classroom', 'lab'],
      hospitality: ['hotel', 'property', 'branch', 'location'],
    },
    typicalColumns: ['id', 'name', 'type', 'address_id', 'capacity', 'status'],
    category: 'master'
  },
  
  zone: {
    type: 'places',
    aliases: ['region', 'area', 'district', 'territory'],
    domainMappings: {
      healthcare: ['coverage_area', 'service_region'],
      crm: ['territory', 'region', 'district', 'sales_zone'],
      ecommerce: ['shipping_zone', 'delivery_zone'],
      erp: ['cost_center', 'profit_center', 'region'],
      education: ['district', 'zone', 'campus_zone'],
      hospitality: ['floor', 'wing', 'section'],
    },
    typicalColumns: ['id', 'name', 'type', 'parent_id', 'description'],
    category: 'lookup'
  }
}

/**
 * EVENTS & ACTIVITIES - Universal tables for events
 */
export const EVENT_TABLES: Record<string, UniversalTableMapping> = {
  activity: {
    type: 'events',
    aliases: ['event', 'log', 'record', 'history'],
    domainMappings: {
      healthcare: ['clinical_note', 'visit_note', 'assessment', 'progress_note'],
      crm: ['activity', 'task', 'note', 'call_log', 'meeting'],
      ecommerce: ['event', 'action', 'behavior', 'conversion'],
      erp: ['transaction', 'posting', 'journal_entry', 'movement'],
      education: ['attendance', 'participation', 'assignment_submission'],
    },
    typicalColumns: ['id', 'type', 'subject', 'description', 'date', 'user_id'],
    category: 'transaction'
  },
  
  schedule: {
    type: 'events',
    aliases: ['appointment', 'booking', 'reservation', 'timetable'],
    domainMappings: {
      healthcare: ['appointment', 'procedure_schedule', 'surgery_schedule'],
      crm: ['appointment', 'meeting', 'demo_scheduled', 'call_scheduled'],
      ecommerce: ['delivery_slot', 'pickup_time'],
      erp: ['production_schedule', 'maintenance_schedule', 'shift'],
      education: ['class_schedule', 'timetable', 'exam_schedule'],
      hospitality: ['check_in', 'check_out', 'reservation'],
      real_estate: ['showing', 'inspection', 'viewing'],
    },
    typicalColumns: ['id', 'start_time', 'end_time', 'status', 'resource_id'],
    category: 'transaction'
  },
  
  notification: {
    type: 'events',
    aliases: ['alert', 'message', 'communication', 'reminder'],
    domainMappings: {
      healthcare: ['reminder', 'alert', 'patient_notification'],
      crm: ['email', 'notification', 'task_reminder', 'follow_up'],
      ecommerce: ['notification', 'alert', 'order_update'],
      erp: ['alert', 'approval_notification', 'reminder'],
      education: ['announcement', 'notification', 'reminder'],
      hospitality: ['concierge_message', 'room_notification'],
    },
    typicalColumns: ['id', 'type', 'recipient_id', 'subject', 'body', 'sent_at', 'status'],
    category: 'transaction'
  }
}

/**
 * COMMUNICATIONS - Universal tables for messages
 */
export const COMMUNICATION_TABLES: Record<string, UniversalTableMapping> = {
  message: {
    type: 'attachments',
    aliases: ['communication', 'note', 'comment', 'thread'],
    domainMappings: {
      healthcare: ['patient_message', 'clinical_note', 'doctor_note'],
      crm: ['email', 'note', 'comment', 'thread'],
      ecommerce: ['customer_message', 'support_ticket'],
      erp: ['internal_note', 'comment', 'approval_note'],
      education: ['message', 'announcement', 'discussion'],
    },
    typicalColumns: ['id', 'sender_id', 'recipient_id', 'subject', 'body', 'created_at'],
    category: 'transaction'
  },
  
  document: {
    type: 'attachments',
    aliases: ['file', 'attachment', 'record'],
    domainMappings: {
      healthcare: ['medical_record', 'clinical_document', 'lab_report', 'prescription'],
      crm: ['document', 'attachment', 'contract', 'proposal'],
      ecommerce: ['receipt', 'invoice_pdf', 'shipping_label'],
      erp: ['document', 'attachment', 'report', 'certificate'],
      education: ['transcript', 'certificate', 'document'],
      hospitality: ['registration_card', 'folio'],
    },
    typicalColumns: ['id', 'name', 'type', 'size', 'url', 'created_at'],
    category: 'master'
  }
}

/**
 * FINANCIAL - Universal tables for finance
 */
export const FINANCIAL_TABLES: Record<string, UniversalTableMapping> = {
  account: {
    type: 'finance',
    aliases: ['ledger', 'gl_account', 'posting_account'],
    domainMappings: {
      healthcare: ['billing_account', 'patient_account'],
      crm: ['account', 'revenue_account'],
      ecommerce: ['billing_account', 'customer_account'],
      erp: ['gl_account', 'cost_account', 'revenue_account'],
      education: ['student_account', 'bursar_account'],
    },
    typicalColumns: ['id', 'code', 'name', 'type', 'balance', 'currency'],
    category: 'master'
  },
  
  ledger: {
    type: 'finance',
    aliases: ['journal', 'posting', 'transaction_log'],
    domainMappings: {
      erp: ['general_ledger', 'subledger', 'journal_entry'],
      healthcare: ['billing_ledger', 'payment_log'],
      education: ['fee_ledger', 'payment_history'],
    },
    typicalColumns: ['id', 'date', 'account_id', 'debit', 'credit', 'description'],
    category: 'transaction'
  },
  
  budget: {
    type: 'finance',
    aliases: ['plan', 'forecast', 'allocation'],
    domainMappings: {
      erp: ['budget', 'forecast', 'financial_plan'],
      education: ['department_budget', 'scholarship_fund'],
      healthcare: ['department_budget', 'grant_funding'],
    },
    typicalColumns: ['id', 'name', 'period', 'amount', 'actual', 'variance'],
    category: 'master'
  }
}

/**
 * RELATIONSHIPS - Universal tables for relationships
 */
export const RELATIONSHIP_TABLES: Record<string, UniversalTableMapping> = {
  membership: {
    type: 'meta',
    aliases: ['association', 'link', 'junction'],
    domainMappings: {
      healthcare: ['care_team_member', 'patient_provider_link'],
      crm: ['account_contact', 'opportunity_contact'],
      ecommerce: ['wishlist_item', 'subscription_item'],
      erp: ['bom_component', 'work_center_employee'],
      education: ['enrollment', 'class_roster', 'committee_member'],
    },
    typicalColumns: ['id', 'entity_a_id', 'entity_b_id', 'role', 'start_date'],
    category: 'junction'
  },
  
  team: {
    type: 'people',
    aliases: ['group', 'crew', 'unit', 'squad'],
    domainMappings: {
      healthcare: ['care_team', 'department', 'unit'],
      crm: ['sales_team', 'account_team', 'service_team'],
      ecommerce: ['fulfillment_team', 'support_team'],
      erp: ['work_team', 'department', 'shift_group'],
      education: ['class', 'cohort', 'study_group'],
    },
    typicalColumns: ['id', 'name', 'type', 'leader_id', 'description'],
    category: 'master'
  },
  
  permission: {
    type: 'meta',
    aliases: ['access', 'role', 'privilege'],
    domainMappings: {
      healthcare: ['hipaa_role', 'clinical_access', 'ehr_permission'],
      crm: ['sales_access', 'account_access', 'territory_access'],
      ecommerce: ['admin_role', 'vendor_access'],
      erp: ['approval_authority', 'posting_permission'],
      education: ['faculty_role', 'student_access', 'parent_access'],
    },
    typicalColumns: ['id', 'name', 'description', 'permissions', 'level'],
    category: 'config'
  }
}

// =============================================================================
// COMBINED TAXONOMY
// =============================================================================

export const UNIFIED_TAXONOMY = {
  people: PEOPLE_TABLES,
  transaction: TRANSACTION_TABLES,
  product: PRODUCT_TABLES,
  location: LOCATION_TABLES,
  event: EVENT_TABLES,
  communication: COMMUNICATION_TABLES,
  financial: FINANCIAL_TABLES,
  relationship: RELATIONSHIP_TABLES,
}

/**
 * Find domain mapping for a table name
 */
export function findDomainMapping(
  tableName: string
): { universalType: string; mapping: UniversalTableMapping; domain: BusinessDomain } | null {
  const normalized = tableName.toLowerCase().replace(/[_\s]/g, '')
  
  for (const [universalType, tables] of Object.entries(UNIFIED_TAXONOMY)) {
    for (const [key, mapping] of Object.entries(tables)) {
      // Check exact match
      if (key.toLowerCase() === normalized) {
        return { universalType, mapping, domain: 'unknown' as BusinessDomain }
      }
      
      // Check aliases
      if (mapping.aliases.some(a => a.toLowerCase().replace(/[_\s]/g, '') === normalized)) {
        return { universalType, mapping, domain: 'unknown' as BusinessDomain }
      }
      
      // Check domain-specific mappings
      for (const [domain, domainNames] of Object.entries(mapping.domainMappings)) {
        if (domainNames?.some(d => d.toLowerCase().replace(/[_\s]/g, '') === normalized)) {
          return { universalType, mapping, domain: domain as BusinessDomain }
        }
      }
    }
  }
  
  return null
}

/**
 * Get all possible table names for a domain
 */
export function getDomainTables(domain: BusinessDomain): string[] {
  const tables: string[] = []
  
  for (const [, mappings] of Object.entries(UNIFIED_TAXONOMY)) {
    for (const [key, mapping] of Object.entries(mappings)) {
      // Add universal tables (apply to all domains)
      tables.push(key)
      tables.push(...mapping.aliases)
      
      // Add domain-specific tables
      if (mapping.domainMappings[domain]) {
        tables.push(...mapping.domainMappings[domain]!)
      }
    }
  }
  
  return Array.from(new Set(tables.map(t => t.toLowerCase())))
}

/**
 * Detect domain from a list of table names
 */
export function detectDomainFromTables(tableNames: string[]): {
  domain: BusinessDomain
  confidence: number
  matchedTables: string[]
  scores: Partial<Record<BusinessDomain, number>>
} {
  const scores: Partial<Record<BusinessDomain, number>> = {}
  const matchedTables: string[] = []
  
  const domains: BusinessDomain[] = ['healthcare', 'crm', 'ecommerce', 'erp', 'education', 'hospitality', 'real_estate', 'finance']
  
  // Initialize scores
  for (const domain of domains) {
    scores[domain] = 0
  }
  
  for (const tableName of tableNames) {
    const result = findDomainMapping(tableName)
    
    if (result) {
      matchedTables.push(tableName)
      
      // If we found a domain-specific mapping, boost that domain
      if (result.domain && result.domain !== 'unknown') {
        scores[result.domain] = (scores[result.domain] || 0) + 2
      }
      
      // Check all domains for this table
      for (const domain of domains) {
        const domainNames = result.mapping.domainMappings[domain]
        if (domainNames?.some(d => d.toLowerCase() === tableName.toLowerCase())) {
          scores[domain] = (scores[domain] || 0) + 3 // Higher weight for domain-specific match
        }
      }
    }
  }
  
  // Find best matching domain
  let bestDomain: BusinessDomain = 'unknown'
  let bestScore = 0
  
  for (const [domain, score] of Object.entries(scores)) {
    if (score && score > bestScore) {
      bestScore = score
      bestDomain = domain as BusinessDomain
    }
  }
  
  const totalTables = tableNames.length
  const confidence = totalTables > 0 ? Math.min(100, Math.round((bestScore / totalTables) * 50)) : 0
  
  return {
    domain: bestDomain,
    confidence,
    matchedTables,
    scores
  }
}
