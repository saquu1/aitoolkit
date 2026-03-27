/**
 * CRM Domain Patterns
 * 
 * Customer Relationship Management - Sales Pipeline, Marketing, Support
 * 
 * @module domain-intelligence/patterns/crm
 */

import { DomainDefinition, TableNamePattern, ColumnNamePattern, FKPattern, WorkflowPattern, SensitiveDataPattern, DomainCategory } from '../base'

// =============================================================================
// TABLE PATTERNS
// =============================================================================

export const CRM_TABLE_PATTERNS: TableNamePattern[] = [
  // Core Entities
  { pattern: 'Lead', weight: 9, category: 'master', description: 'Sales lead' },
  { pattern: 'Leads', weight: 10, category: 'master', description: 'Sales leads' },
  { pattern: 'Prospect', weight: 8, category: 'master', description: 'Prospect' },
  { pattern: 'Prospects', weight: 9, category: 'master', description: 'Prospects' },
  { pattern: 'Inquiry', weight: 6, category: 'master', description: 'Customer inquiry' },
  
  // Accounts/Companies
  { pattern: 'Account', weight: 8, category: 'master', description: 'Account/Company' },
  { pattern: 'Accounts', weight: 9, category: 'master', description: 'Accounts' },
  { pattern: 'Company', weight: 7, category: 'master', description: 'Company' },
  { pattern: 'Companies', weight: 8, category: 'master', description: 'Companies' },
  { pattern: 'Organization', weight: 6, category: 'master', description: 'Organization' },
  
  // Contacts
  { pattern: 'Contact', weight: 8, category: 'master', description: 'Contact' },
  { pattern: 'Contacts', weight: 9, category: 'master', description: 'Contacts' },
  { pattern: 'Person', weight: 5, category: 'master', description: 'Person' },
  
  // Pipeline/Deals
  { pattern: 'Opportunity', weight: 9, category: 'transaction', description: 'Sales opportunity' },
  { pattern: 'Opportunities', weight: 10, category: 'transaction', description: 'Opportunities' },
  { pattern: 'Deal', weight: 8, category: 'transaction', description: 'Deal' },
  { pattern: 'Deals', weight: 9, category: 'transaction', description: 'Deals' },
  { pattern: 'Pipeline', weight: 7, category: 'master', description: 'Sales pipeline' },
  { pattern: 'Stage', weight: 6, category: 'lookup', description: 'Pipeline stage' },
  { pattern: 'Stages', weight: 7, category: 'lookup', description: 'Pipeline stages' },
  
  // Quotes/Proposals
  { pattern: 'Quote', weight: 8, category: 'transaction', description: 'Quote' },
  { pattern: 'Quotes', weight: 9, category: 'transaction', description: 'Quotes' },
  { pattern: 'Proposal', weight: 7, category: 'transaction', description: 'Proposal' },
  { pattern: 'Proposals', weight: 8, category: 'transaction', description: 'Proposals' },
  { pattern: 'Estimate', weight: 6, category: 'transaction', description: 'Estimate' },
  { pattern: 'Bid', weight: 5, category: 'transaction', description: 'Bid' },
  
  // Contracts
  { pattern: 'Contract', weight: 7, category: 'transaction', description: 'Contract' },
  { pattern: 'Contracts', weight: 8, category: 'transaction', description: 'Contracts' },
  { pattern: 'Agreement', weight: 6, category: 'transaction', description: 'Agreement' },
  
  // Activities
  { pattern: 'Activity', weight: 7, category: 'transaction', description: 'Activity' },
  { pattern: 'Activities', weight: 8, category: 'transaction', description: 'Activities' },
  { pattern: 'Task', weight: 7, category: 'transaction', description: 'Task' },
  { pattern: 'Tasks', weight: 8, category: 'transaction', description: 'Tasks' },
  { pattern: 'Call', weight: 5, category: 'transaction', description: 'Call log' },
  { pattern: 'Calls', weight: 6, category: 'transaction', description: 'Call logs' },
  { pattern: 'Meeting', weight: 5, category: 'transaction', description: 'Meeting' },
  { pattern: 'Meetings', weight: 6, category: 'transaction', description: 'Meetings' },
  { pattern: 'Email', weight: 5, category: 'transaction', description: 'Email' },
  { pattern: 'Emails', weight: 6, category: 'transaction', description: 'Emails' },
  { pattern: 'Note', weight: 4, category: 'transaction', description: 'Note' },
  { pattern: 'Notes', weight: 5, category: 'transaction', description: 'Notes' },
  
  // Support
  { pattern: 'Case', weight: 8, category: 'transaction', description: 'Support case' },
  { pattern: 'Cases', weight: 9, category: 'transaction', description: 'Support cases' },
  { pattern: 'Ticket', weight: 7, category: 'transaction', description: 'Support ticket' },
  { pattern: 'Tickets', weight: 8, category: 'transaction', description: 'Support tickets' },
  { pattern: 'Incident', weight: 6, category: 'transaction', description: 'Incident' },
  { pattern: 'Issue', weight: 5, category: 'transaction', description: 'Issue' },
  { pattern: 'ServiceRequest', weight: 6, category: 'transaction', description: 'Service request' },
  
  // Knowledge Base
  { pattern: 'KnowledgeBase', weight: 7, category: 'master', description: 'Knowledge base' },
  { pattern: 'Article', weight: 5, category: 'master', description: 'Knowledge article' },
  { pattern: 'Articles', weight: 6, category: 'master', description: 'Articles' },
  { pattern: 'FAQ', weight: 6, category: 'master', description: 'FAQ' },
  { pattern: 'Solution', weight: 5, category: 'master', description: 'Solution article' },
  
  // Marketing
  { pattern: 'Campaign', weight: 8, category: 'transaction', description: 'Marketing campaign' },
  { pattern: 'Campaigns', weight: 9, category: 'transaction', description: 'Campaigns' },
  { pattern: 'Segment', weight: 7, category: 'master', description: 'Customer segment' },
  { pattern: 'Segments', weight: 8, category: 'master', description: 'Segments' },
  { pattern: 'Audience', weight: 6, category: 'master', description: 'Target audience' },
  { pattern: 'List', weight: 4, category: 'master', description: 'Marketing list' },
  { pattern: 'Subscriber', weight: 6, category: 'master', description: 'Subscriber' },
  { pattern: 'Subscription', weight: 6, category: 'transaction', description: 'Subscription' },
  
  // Territory/Region
  { pattern: 'Territory', weight: 7, category: 'master', description: 'Sales territory' },
  { pattern: 'Territories', weight: 8, category: 'master', description: 'Territories' },
  { pattern: 'Region', weight: 6, category: 'master', description: 'Region' },
  { pattern: 'Regions', weight: 7, category: 'master', description: 'Regions' },
  { pattern: 'District', weight: 5, category: 'master', description: 'District' },
  { pattern: 'Zone', weight: 5, category: 'master', description: 'Zone' },
  
  // Products/Services (for quotes)
  { pattern: 'Product', weight: 5, category: 'master', description: 'Product' },
  { pattern: 'Products', weight: 6, category: 'master', description: 'Products' },
  { pattern: 'Service', weight: 5, category: 'master', description: 'Service' },
  { pattern: 'Services', weight: 6, category: 'master', description: 'Services' },
  { pattern: 'PriceBook', weight: 6, category: 'master', description: 'Price book' },
  { pattern: 'PriceList', weight: 5, category: 'master', description: 'Price list' },
  
  // Users/Teams
  { pattern: 'User', weight: 5, category: 'master', description: 'User' },
  { pattern: 'Users', weight: 6, category: 'master', description: 'Users' },
  { pattern: 'Team', weight: 6, category: 'master', description: 'Team' },
  { pattern: 'Teams', weight: 7, category: 'master', description: 'Teams' },
  { pattern: 'SalesRep', weight: 6, category: 'master', description: 'Sales rep' },
  { pattern: 'Agent', weight: 5, category: 'master', description: 'Support agent' },
  
  // Reports/Analytics
  { pattern: 'Report', weight: 5, category: 'reporting', description: 'Report' },
  { pattern: 'Reports', weight: 6, category: 'reporting', description: 'Reports' },
  { pattern: 'Dashboard', weight: 6, category: 'reporting', description: 'Dashboard' },
  { pattern: 'Metric', weight: 4, category: 'reporting', description: 'Metric' },
  { pattern: 'KPI', weight: 5, category: 'reporting', description: 'KPI' },
  
  // Junction tables
  { pattern: 'OpportunityContact', weight: 6, category: 'junction', description: 'Opportunity-contact link' },
  { pattern: 'AccountContact', weight: 6, category: 'junction', description: 'Account-contact link' },
  { pattern: 'CampaignMember', weight: 6, category: 'junction', description: 'Campaign member' },
  { pattern: 'TeamMember', weight: 5, category: 'junction', description: 'Team member' },
  { pattern: 'QuoteLine', weight: 6, category: 'junction', description: 'Quote line item' },
  { pattern: 'OpportunityLine', weight: 6, category: 'junction', description: 'Opportunity line item' },
]

// =============================================================================
// COLUMN PATTERNS
// =============================================================================

export const CRM_COLUMN_PATTERNS: ColumnNamePattern[] = [
  // Lead identifiers
  { pattern: 'LeadId', weight: 8, semanticType: 'lead_id', description: 'Lead ID' },
  { pattern: 'lead_id', weight: 8, semanticType: 'lead_id', description: 'Lead ID' },
  { pattern: 'LeadSource', weight: 6, semanticType: 'lead_source', description: 'Lead source' },
  { pattern: 'LeadStatus', weight: 7, semanticType: 'status', description: 'Lead status' },
  { pattern: 'LeadScore', weight: 7, semanticType: 'score', description: 'Lead score' },
  { pattern: 'LeadType', weight: 5, semanticType: 'type', description: 'Lead type' },
  
  // Opportunity identifiers
  { pattern: 'OpportunityId', weight: 8, semanticType: 'opportunity_id', description: 'Opportunity ID' },
  { pattern: 'opportunity_id', weight: 8, semanticType: 'opportunity_id', description: 'Opportunity ID' },
  { pattern: 'DealId', weight: 7, semanticType: 'opportunity_id', description: 'Deal ID' },
  { pattern: 'Stage', weight: 6, semanticType: 'stage', description: 'Pipeline stage' },
  { pattern: 'PipelineStage', weight: 6, semanticType: 'stage', description: 'Pipeline stage' },
  { pattern: 'Probability', weight: 6, semanticType: 'probability', description: 'Close probability' },
  { pattern: 'CloseDate', weight: 6, semanticType: 'date', description: 'Expected close date' },
  { pattern: 'CloseProbability', weight: 5, semanticType: 'probability', description: 'Close probability' },
  
  // Account identifiers
  { pattern: 'AccountId', weight: 7, semanticType: 'account_id', description: 'Account ID' },
  { pattern: 'account_id', weight: 7, semanticType: 'account_id', description: 'Account ID' },
  { pattern: 'CompanyId', weight: 6, semanticType: 'account_id', description: 'Company ID' },
  { pattern: 'Industry', weight: 5, semanticType: 'industry', description: 'Industry' },
  { pattern: 'CompanySize', weight: 5, semanticType: 'size', description: 'Company size' },
  { pattern: 'EmployeeCount', weight: 5, semanticType: 'size', description: 'Employee count' },
  { pattern: 'AnnualRevenue', weight: 6, semanticType: 'revenue', description: 'Annual revenue', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'Revenue', weight: 5, semanticType: 'revenue', description: 'Revenue', sensitivity: 'CONFIDENTIAL' },
  
  // Contact identifiers
  { pattern: 'ContactId', weight: 7, semanticType: 'contact_id', description: 'Contact ID' },
  { pattern: 'contact_id', weight: 7, semanticType: 'contact_id', description: 'Contact ID' },
  { pattern: 'PrimaryContactId', weight: 6, semanticType: 'contact_id', description: 'Primary contact' },
  { pattern: 'Title', weight: 4, semanticType: 'title', description: 'Job title' },
  { pattern: 'Department', weight: 4, semanticType: 'department', description: 'Department' },
  
  // Financial
  { pattern: 'Amount', weight: 6, semanticType: 'amount', description: 'Amount' },
  { pattern: 'DealAmount', weight: 7, semanticType: 'amount', description: 'Deal amount' },
  { pattern: 'OpportunityAmount', weight: 7, semanticType: 'amount', description: 'Opportunity amount' },
  { pattern: 'DealValue', weight: 7, semanticType: 'amount', description: 'Deal value' },
  { pattern: 'ContractValue', weight: 6, semanticType: 'amount', description: 'Contract value' },
  { pattern: 'QuotedAmount', weight: 5, semanticType: 'amount', description: 'Quoted amount' },
  { pattern: 'Discount', weight: 5, semanticType: 'discount', description: 'Discount' },
  { pattern: 'DiscountPercent', weight: 5, semanticType: 'discount', description: 'Discount percent' },
  
  // Case/Ticket
  { pattern: 'CaseId', weight: 7, semanticType: 'case_id', description: 'Case ID' },
  { pattern: 'case_id', weight: 7, semanticType: 'case_id', description: 'Case ID' },
  { pattern: 'TicketId', weight: 6, semanticType: 'case_id', description: 'Ticket ID' },
  { pattern: 'CaseNumber', weight: 6, semanticType: 'case_number', description: 'Case number' },
  { pattern: 'TicketNumber', weight: 5, semanticType: 'case_number', description: 'Ticket number' },
  { pattern: 'CaseStatus', weight: 6, semanticType: 'status', description: 'Case status' },
  { pattern: 'CasePriority', weight: 5, semanticType: 'priority', description: 'Case priority' },
  { pattern: 'CaseType', weight: 4, semanticType: 'type', description: 'Case type' },
  { pattern: 'Resolution', weight: 4, semanticType: 'resolution', description: 'Resolution' },
  
  // Campaign
  { pattern: 'CampaignId', weight: 7, semanticType: 'campaign_id', description: 'Campaign ID' },
  { pattern: 'campaign_id', weight: 7, semanticType: 'campaign_id', description: 'Campaign ID' },
  { pattern: 'CampaignName', weight: 6, semanticType: 'name', description: 'Campaign name' },
  { pattern: 'CampaignType', weight: 5, semanticType: 'type', description: 'Campaign type' },
  { pattern: 'CampaignStatus', weight: 5, semanticType: 'status', description: 'Campaign status' },
  { pattern: 'Budget', weight: 5, semanticType: 'budget', description: 'Campaign budget' },
  { pattern: 'ExpectedRevenue', weight: 5, semanticType: 'revenue', description: 'Expected revenue' },
  { pattern: 'ActualCost', weight: 5, semanticType: 'cost', description: 'Actual cost' },
  
  // Activity
  { pattern: 'ActivityId', weight: 6, semanticType: 'activity_id', description: 'Activity ID' },
  { pattern: 'activity_id', weight: 6, semanticType: 'activity_id', description: 'Activity ID' },
  { pattern: 'ActivityType', weight: 5, semanticType: 'type', description: 'Activity type' },
  { pattern: 'DueDate', weight: 5, semanticType: 'date', description: 'Due date' },
  { pattern: 'CompletedDate', weight: 4, semanticType: 'date', description: 'Completed date' },
  { pattern: 'Duration', weight: 4, semanticType: 'duration', description: 'Duration' },
  
  // Ownership
  { pattern: 'OwnerId', weight: 6, semanticType: 'owner_id', description: 'Owner ID' },
  { pattern: 'owner_id', weight: 6, semanticType: 'owner_id', description: 'Owner ID' },
  { pattern: 'AssignedTo', weight: 5, semanticType: 'owner_id', description: 'Assigned to' },
  { pattern: 'SalesRepId', weight: 6, semanticType: 'owner_id', description: 'Sales rep ID' },
  { pattern: 'AgentId', weight: 5, semanticType: 'owner_id', description: 'Agent ID' },
  { pattern: 'TeamId', weight: 5, semanticType: 'team_id', description: 'Team ID' },
  
  // Contact Info - PII
  { pattern: 'Email', weight: 6, semanticType: 'email', description: 'Email address', sensitivity: 'PII' },
  { pattern: 'email', weight: 6, semanticType: 'email', description: 'Email address', sensitivity: 'PII' },
  { pattern: 'Phone', weight: 5, semanticType: 'phone', description: 'Phone number', sensitivity: 'PII' },
  { pattern: 'phone', weight: 5, semanticType: 'phone', description: 'Phone number', sensitivity: 'PII' },
  { pattern: 'Mobile', weight: 5, semanticType: 'phone', description: 'Mobile number', sensitivity: 'PII' },
  { pattern: 'Website', weight: 4, semanticType: 'website', description: 'Website' },
  { pattern: 'LinkedIn', weight: 4, semanticType: 'social', description: 'LinkedIn' },
  
  // Address
  { pattern: 'Address', weight: 4, semanticType: 'address', description: 'Address', sensitivity: 'PII' },
  { pattern: 'Street', weight: 3, semanticType: 'address', description: 'Street', sensitivity: 'PII' },
  { pattern: 'City', weight: 3, semanticType: 'city', description: 'City' },
  { pattern: 'State', weight: 3, semanticType: 'state', description: 'State' },
  { pattern: 'Country', weight: 3, semanticType: 'country', description: 'Country' },
  { pattern: 'PostalCode', weight: 3, semanticType: 'postal_code', description: 'Postal code' },
  
  // Tracking
  { pattern: 'ConversionDate', weight: 5, semanticType: 'date', description: 'Conversion date' },
  { pattern: 'LastActivityDate', weight: 4, semanticType: 'date', description: 'Last activity' },
  { pattern: 'LastContactedDate', weight: 4, semanticType: 'date', description: 'Last contacted' },
  { pattern: 'NextFollowUpDate', weight: 4, semanticType: 'date', description: 'Next follow-up' },
]

// =============================================================================
// FK PATTERNS
// =============================================================================

export const CRM_FK_PATTERNS: FKPattern[] = [
  { columnPattern: /^LeadId$/i, referencesTable: 'Leads', weight: 8, description: 'Reference to lead' },
  { columnPattern: /^OpportunityId$/i, referencesTable: 'Opportunities', weight: 8, description: 'Reference to opportunity' },
  { columnPattern: /^DealId$/i, referencesTable: 'Opportunities', weight: 7, description: 'Reference to deal' },
  { columnPattern: /^AccountId$/i, referencesTable: 'Accounts', weight: 7, description: 'Reference to account' },
  { columnPattern: /^CompanyId$/i, referencesTable: 'Accounts', weight: 6, description: 'Reference to company' },
  { columnPattern: /^ContactId$/i, referencesTable: 'Contacts', weight: 7, description: 'Reference to contact' },
  { columnPattern: /^PrimaryContactId$/i, referencesTable: 'Contacts', weight: 6, description: 'Reference to primary contact' },
  { columnPattern: /^CaseId$/i, referencesTable: 'Cases', weight: 7, description: 'Reference to case' },
  { columnPattern: /^TicketId$/i, referencesTable: 'Tickets', weight: 6, description: 'Reference to ticket' },
  { columnPattern: /^CampaignId$/i, referencesTable: 'Campaigns', weight: 7, description: 'Reference to campaign' },
  { columnPattern: /^QuoteId$/i, referencesTable: 'Quotes', weight: 6, description: 'Reference to quote' },
  { columnPattern: /^ContractId$/i, referencesTable: 'Contracts', weight: 6, description: 'Reference to contract' },
  { columnPattern: /^OwnerId$/i, referencesTable: 'Users', weight: 6, description: 'Reference to owner' },
  { columnPattern: /^SalesRepId$/i, referencesTable: 'Users', weight: 6, description: 'Reference to sales rep' },
  { columnPattern: /^AgentId$/i, referencesTable: 'Users', weight: 5, description: 'Reference to agent' },
  { columnPattern: /^TeamId$/i, referencesTable: 'Teams', weight: 5, description: 'Reference to team' },
  { columnPattern: /^TerritoryId$/i, referencesTable: 'Territories', weight: 5, description: 'Reference to territory' },
  { columnPattern: /^ProductId$/i, referencesTable: 'Products', weight: 5, description: 'Reference to product' },
]

// =============================================================================
// WORKFLOW PATTERNS
// =============================================================================

export const CRM_WORKFLOWS: WorkflowPattern[] = [
  {
    name: 'Lead Lifecycle',
    tableName: /^Lead/i,
    statusColumn: 'Status',
    states: ['New', 'Open', 'Contacted', 'Qualified', 'Working', 'Negotiation', 'Converted', 'Unqualified', 'Disqualified', 'Recycled'],
    weight: 9
  },
  {
    name: 'Opportunity Pipeline',
    tableName: /^Opportunity|^Deal/i,
    statusColumn: 'Stage',
    states: ['Prospecting', 'Qualification', 'NeedsAnalysis', 'ValueProposition', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'],
    weight: 10
  },
  {
    name: 'Quote Approval',
    tableName: /^Quote|^Proposal/i,
    statusColumn: 'Status',
    states: ['Draft', 'PendingReview', 'PendingApproval', 'Approved', 'Sent', 'Accepted', 'Rejected', 'Expired'],
    weight: 7
  },
  {
    name: 'Case Resolution',
    tableName: /^Case|^Ticket/i,
    statusColumn: 'Status',
    states: ['New', 'Assigned', 'InProgress', 'PendingCustomer', 'PendingInternal', 'Resolved', 'Closed', 'Escalated', 'Reopened'],
    weight: 8
  },
  {
    name: 'Campaign Workflow',
    tableName: /^Campaign/i,
    statusColumn: 'Status',
    states: ['Planning', 'Scheduled', 'InProgress', 'Paused', 'Completed', 'Cancelled', 'Archived'],
    weight: 6
  },
  {
    name: 'Contract Lifecycle',
    tableName: /^Contract/i,
    statusColumn: 'Status',
    states: ['Draft', 'PendingReview', 'PendingSignature', 'Active', 'Expired', 'Terminated', 'Renewed'],
    weight: 6
  },
]

// =============================================================================
// SENSITIVE DATA PATTERNS
// =============================================================================

export const CRM_SENSITIVE_PATTERNS: SensitiveDataPattern[] = [
  {
    name: 'Email Address',
    patterns: [
      /\bemail\b/i,
      /\bemail_address\b/i,
      /\be_mail\b/i,
    ],
    sensitivity: 'PII',
    domainWeight: 8,
    description: 'Email address - GDPR protected'
  },
  {
    name: 'Phone Number',
    patterns: [
      /\bphone\b/i,
      /\bmobile\b/i,
      /\bcell_phone\b/i,
      /\bcontact_no\b/i,
    ],
    sensitivity: 'PII',
    domainWeight: 6,
    description: 'Phone number - GDPR protected'
  },
  {
    name: 'Company Revenue',
    patterns: [
      /\bannual_revenue\b/i,
      /\bcompany_revenue\b/i,
      /\brevenue\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 7,
    description: 'Company revenue - confidential business info'
  },
  {
    name: 'Deal Value',
    patterns: [
      /\bdeal_value\b/i,
      /\bopportunity_amount\b/i,
      /\bcontract_value\b/i,
      /\bdeal_size\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 6,
    description: 'Deal/contract value'
  },
  {
    name: 'Commission',
    patterns: [
      /\bcommission\b/i,
      /\bcommission_rate\b/i,
      /\bcommission_amount\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 5,
    description: 'Sales commission information'
  },
]

// =============================================================================
// TABLE CATEGORIES
// =============================================================================

export const CRM_TABLE_CATEGORIES: Record<DomainCategory, string[]> = {
  master: ['Leads', 'Accounts', 'Contacts', 'Products', 'PriceBooks', 'Territories', 'Teams', 'Users'],
  transaction: ['Opportunities', 'Quotes', 'Contracts', 'Cases', 'Activities', 'Tasks', 'Campaigns', 'Emails'],
  lookup: ['Industries', 'LeadSources', 'Stages', 'Priorities', 'Statuses', 'Types', 'CampaignTypes'],
  audit: ['FieldHistory', 'ActivityHistory', 'LoginHistory', 'ExportHistory'],
  config: ['WorkflowRules', 'AssignmentRules', 'EmailTemplates', 'PageLayouts'],
  workflow: ['ApprovalProcesses', 'WorkflowInstances', 'QueueItems'],
  reporting: ['Reports', 'Dashboards', 'Metrics'],
  junction: [],
    integration: ['ExternalSystems', 'APICalls', 'DataImports']
}

// =============================================================================
// DOMAIN DEFINITION
// =============================================================================

export const CRM_DOMAIN: DomainDefinition = {
  domain: 'crm',
  displayName: 'CRM / Customer Relationship Management',
  description: 'Customer Relationship Management systems covering Sales, Marketing Automation, Customer Support, and Contact Management',
  industries: [
    'Software & Technology',
    'Financial Services',
    'Healthcare Providers',
    'Real Estate',
    'Professional Services',
    'Manufacturing',
    'Retail',
    'Telecommunications'
  ],
  
  tablePatterns: CRM_TABLE_PATTERNS,
  columnPatterns: CRM_COLUMN_PATTERNS,
  fkPatterns: CRM_FK_PATTERNS,
  workflows: CRM_WORKFLOWS,
  sensitivePatterns: CRM_SENSITIVE_PATTERNS,
  
  tableCategories: CRM_TABLE_CATEGORIES,
  
  keywords: [
    'lead', 'opportunity', 'deal', 'account', 'contact', 'prospect',
    'quote', 'proposal', 'contract', 'agreement',
    'case', 'ticket', 'support', 'issue', 'incident',
    'campaign', 'segment', 'audience', 'marketing',
    'pipeline', 'stage', 'funnel', 'conversion',
    'activity', 'task', 'call', 'meeting', 'email',
    'territory', 'region', 'district', 'zone',
    'sales', 'commission', 'quota', 'forecast',
    'churn', 'retention', 'loyalty', 'lifetime_value',
    'customer', 'client', 'prospect', 'subscriber'
  ],
  
  specificity: 8
}
