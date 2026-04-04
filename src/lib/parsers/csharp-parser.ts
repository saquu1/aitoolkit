// =============================================================================
// C# Parser - Intelligence Extraction from C# Source Files
// =============================================================================
// Extracts intelligence from C# Models, Controllers, Services, and DTOs
// Includes Data Annotations, Display Attributes, Navigation Properties,
// XML Documentation Comments, and Business Rule extraction
// =============================================================================

/**
 * C# File Types
 */
export type CSharpFileType = 'model' | 'dto' | 'viewmodel' | 'controller' | 'service' | 'repository' | 'interface' | 'enum' | 'unknown';

/**
 * Parsed C# File Result
 */
export interface CSharpParseResult {
  fileName: string;
  fileType: CSharpFileType;
  namespace: string;
  className: string;
  baseClass?: string;
  interfaces: string[];
  
  // Model/DTO specific
  properties: CSharpProperty[];
  navigationProperties: NavigationProperty[];
  
  // Controller specific
  actions?: ControllerAction[];
  routes?: ApiRoute[];
  
  // Intelligence extracted
  validations: ValidationIntelligence[];
  displayAttributes: DisplayIntelligence[];
  businessRules: BusinessRuleIntelligence[];
  complianceFlags: ComplianceFlag[];
  xmlDocumentation: XmlDocumentationResult;
  
  // Cross-reference
  inferredTable?: string;
  relationships: EntityRelationship[];
  
  // Summary
  summary: CSharpParseSummary;
}

/**
 * C# Property
 */
export interface CSharpProperty {
  name: string;
  type: string;
  isNullable: boolean;
  isRequired: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTarget?: string;
  defaultValue?: string;
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  hasGetter: boolean;
  hasSetter: boolean;
  isVirtual: boolean;
  isCollection: boolean;
  collectionType?: 'List' | 'ICollection' | 'IEnumerable' | 'Array';
  
  // Attributes
  dataAnnotations: DataAnnotation[];
  displayAttributes: DisplayAttributeInfo[];
  validationAttributes: ValidationAttributeInfo[];
  
  // Intelligence
  inferredUIType?: string;
  inferredDbType?: string;
  maxLength?: number;
  minLength?: number;
  range?: { min: number | string; max: number | string };
  pattern?: string;
  
  // Source tracking
  lineNumber: number;
  rawDeclaration: string;
}

/**
 * Data Annotation Attribute
 */
export interface DataAnnotation {
  name: string;
  fullName: string;
  arguments: (string | number | boolean)[];
  namedArguments: Record<string, string | number | boolean>;
  namespace: string;
}

/**
 * Display Attribute Information
 */
export interface DisplayAttributeInfo {
  name?: string;
  shortName?: string;
  description?: string;
  prompt?: string;
  groupName?: string;
  order?: number;
  autoGenerateField?: boolean;
  autoGenerateFilter?: boolean;
}

/**
 * Validation Attribute Information
 */
export interface ValidationAttributeInfo {
  type: 'required' | 'stringlength' | 'maxlength' | 'minlength' | 'range' | 'regex' | 'email' | 'phone' | 'url' | 'creditcard' | 'compare' | 'remote' | 'custom';
  attribute: string;
  parameters: Record<string, string | number | boolean>;
  errorMessage?: string;
  errorMessageResourceName?: string;
}

/**
 * Navigation Property
 */
export interface NavigationProperty {
  name: string;
  targetType: string;
  relationshipType: 'one-to-many' | 'one-to-one' | 'many-to-many';
  isCollection: boolean;
  foreignKeyProperty?: string;
  inverseProperty?: string;
  isRequired: boolean;
  
  // EF Core attributes
  hasForeignKey: boolean;
  hasInverseProperty: boolean;
}

/**
 * Controller Action
 */
export interface ControllerAction {
  name: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route?: string;
  parameters: ActionParameter[];
  returnType: string;
  isAsync: boolean;
  hasValidateAntiForgeryToken: boolean;
  authorizeAttribute?: AuthorizeInfo;
  
  // Intelligence
  inferredOperation: 'create' | 'read' | 'update' | 'delete' | 'list' | 'custom';
  relatedEntity?: string;
}

/**
 * Action Parameter
 */
export interface ActionParameter {
  name: string;
  type: string;
  isFromBody: boolean;
  isFromQuery: boolean;
  isFromRoute: boolean;
  isOptional: boolean;
  defaultValue?: string;
}

/**
 * API Route
 */
export interface ApiRoute {
  template: string;
  httpMethods: string[];
  controller: string;
  action: string;
  constraints: Record<string, string>;
}

/**
 * Authorize Info
 */
export interface AuthorizeInfo {
  roles?: string[];
  policies?: string[];
  authenticationSchemes?: string[];
  isAllowAnonymous: boolean;
}

/**
 * Validation Intelligence
 */
export interface ValidationIntelligence {
  propertyName: string;
  rules: ValidationRule[];
  clientSideRules: ClientValidationRule[];
  serverSideOnly: boolean;
  crossFieldValidation: boolean;
}

/**
 * Validation Rule
 */
export interface ValidationRule {
  type: string;
  value?: string | number | boolean;
  message?: string;
  condition?: string;
}

/**
 * Client Validation Rule (for React generation)
 */
export interface ClientValidationRule {
  ruleName: string;
  parameter?: string | number;
  message: string;
  dependency?: string;
}

/**
 * Display Intelligence
 */
export interface DisplayIntelligence {
  propertyName: string;
  displayName: string;
  description?: string;
  placeholder?: string;
  groupName?: string;
  order: number;
  isHidden: boolean;
  isReadOnly: boolean;
}

/**
 * Business Rule Intelligence (from XML comments and attributes)
 */
export interface BusinessRuleIntelligence {
  id: string;
  propertyName?: string;
  ruleType: 'validation' | 'workflow' | 'computation' | 'conditional' | 'security' | 'compliance';
  description: string;
  source: 'attribute' | 'xml_comment' | 'code_analysis';
  implementation?: string;
  relatedProperties?: string[];
  conditions?: BusinessRuleCondition[];
}

/**
 * Business Rule Condition
 */
export interface BusinessRuleCondition {
  property: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_null' | 'is_not_null';
  value?: string | number;
}

/**
 * Compliance Flag
 */
export interface ComplianceFlag {
  propertyName: string;
  flagType: 'PII' | 'PHI' | 'GDPR' | 'CCPA' | 'HIPAA' | 'PCI' | 'SOX' | 'Custom';
  sensitivity: 'high' | 'medium' | 'low';
  reason: string;
  regulations: string[];
  requiresEncryption: boolean;
  requiresAudit: boolean;
  retentionPolicy?: string;
}

/**
 * XML Documentation Result
 */
export interface XmlDocumentationResult {
  summary?: string;
  remarks?: string;
  parameters: XmlDocParameter[];
  returns?: string;
  exceptions: XmlDocException[];
  examples: string[];
  seeAlso: string[];
  
  // Business intelligence extracted
  businessContext?: string;
  workflowSteps?: string[];
  securityNotes?: string[];
  performanceNotes?: string[];
}

/**
 * XML Doc Parameter
 */
export interface XmlDocParameter {
  name: string;
  description: string;
}

/**
 * XML Doc Exception
 */
export interface XmlDocException {
  type: string;
  condition: string;
}

/**
 * Entity Relationship
 */
export interface EntityRelationship {
  fromEntity: string;
  toEntity: string;
  fromProperty: string;
  toProperty?: string;
  relationshipType: 'one-to-many' | 'one-to-one' | 'many-to-many';
  foreignKey?: string;
  isRequired: boolean;
  cascadeDelete: boolean;
}

/**
 * C# Parse Summary
 */
export interface CSharpParseSummary {
  totalProperties: number;
  totalValidations: number;
  totalNavigationProperties: number;
  totalBusinessRules: number;
  totalComplianceFlags: number;
  hasDataAnnotations: boolean;
  hasXmlDocumentation: boolean;
  hasEFCoreAttributes: boolean;
  inferredPurpose: string;
  complexity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// =============================================================================
// C# Parser Engine
// =============================================================================

/**
 * C# Parser Engine
 */
export class CSharpParserEngine {
  private content: string;
  private fileName: string;
  private currentLine: number = 0;
  
  // Regex patterns
  private static readonly NAMESPACE_PATTERN = /namespace\s+([\w.]+)/;
  private static readonly CLASS_PATTERN = /(?:public|internal|private|protected)?\s*(?:sealed\s+|abstract\s+|static\s+)?(?:partial\s+)?class\s+(\w+)(?:\s*:\s*([\w\s,.<>\[\]]+))?/;  
  private static readonly INTERFACE_PATTERN = /interface\s+I(\w+)/;
  private static readonly PROPERTY_PATTERN = /(?:\[.*?\]\s*)*(?:public|private|protected|internal)\s+(?:virtual\s+)?(?:override\s+)?(?:static\s+)?(\??[\w<>\[\],\s\.]+)\s+(\w+)\s*(?:{\s*(?:get;\s*|set;\s*|init;\s*)+}|=[^;]+;)/gs;
  private static readonly METHOD_PATTERN = /(?:\[.*?\]\s*)*(?:public|private|protected|internal)\s+(?:async\s+)?(?:override\s+)?(?:virtual\s+)?(?:static\s+)?(\??[\w<>\[\],\s\.]+)\s+(\w+)\s*\(([^)]*)\)/g;
  
  // Data Annotation patterns
  private static readonly ATTRIBUTE_PATTERN = /\[([\w]+)(?:\(([^)]*)\))?\]/g;
  private static readonly REQUIRED_PATTERN = /\[Required(?:\(([^)]*)\))?\]/i;
  private static readonly STRING_LENGTH_PATTERN = /\[StringLength\s*\(\s*(\d+)(?:\s*,\s*MinimumLength\s*=\s*(\d+))?\s*\)/i;
  private static readonly MAX_LENGTH_PATTERN = /\[MaxLength\s*\(\s*(\d+)\s*\)\]/i;
  private static readonly MIN_LENGTH_PATTERN = /\[MinLength\s*\(\s*(\d+)\s*\)\]/i;
  private static readonly RANGE_PATTERN = /\[Range\s*\(\s*(?:typeof\((\w+)\)\s*,\s*)?([^,]+)\s*,\s*([^)]+)\s*\)/i;
  private static readonly REGEX_PATTERN = /\[RegularExpression\s*\(\s*@"?([^"]+)"?\s*\)/i;
  private static readonly EMAIL_PATTERN = /\[EmailAddress(?:\s*\([^)]*\))?\]/i;
  private static readonly PHONE_PATTERN = /\[Phone(?:\s*\([^)]*\))?\]/i;
  private static readonly URL_PATTERN = /\[Url(?:\s*\([^)]*\))?\]/i;
  private static readonly DISPLAY_PATTERN = /\[Display\s*\(([^)]+)\)\]/i;
  private static readonly KEY_PATTERN = /\[Key(?:\s*\([^)]*\))?\]/i;
  private static readonly FOREIGN_KEY_PATTERN = /\[ForeignKey\s*\(\s*"([^"]+)"\s*\)\]/i;
  private static readonly NOT_MAPPED_PATTERN = /\[NotMapped(?:\s*\([^)]*\))?\]/i;
  
  // EF Core patterns
  private static readonly RELATIONSHIP_PATTERN = /\[(Required|Optional|InverseProperty|ForeignKey)\s*\(([^)]*)\)\]/i;
  
  // Compliance patterns
  private static readonly PERSONAL_DATA_PATTERN = /\[PersonalData(?:\s*\([^)]*\))?\]/i;
  private static readonly SENSITIVE_DATA_PATTERN = /\[SensitiveData(?:\s*\([^)]*\))?\]/i;
  private static readonly PROTECTED_DATA_PATTERN = /\[ProtectedPersonalData(?:\s*\([^)]*\))?\]/i;
  
  // XML Documentation patterns
  private static readonly XML_SUMMARY_PATTERN = /\/\/\/\s*<summary>([\s\S]*?)<\/summary>/i;
  private static readonly XML_REMARKS_PATTERN = /\/\/\/\s*<remarks>([\s\S]*?)<\/remarks>/i;
  private static readonly XML_PARAM_PATTERN = /\/\/\/\s*<param\s+name="(\w+)">([\s\S]*?)<\/param>/gi;
  private static readonly XML_RETURNS_PATTERN = /\/\/\/\s*<returns>([\s\S]*?)<\/returns>/i;
  private static readonly XML_EXCEPTION_PATTERN = /\/\/\/\s*<exception\s+cref="(\w+)">([\s\S]*?)<\/exception>/gi;
  private static readonly XML_EXAMPLE_PATTERN = /\/\/\/\s*<example>([\s\S]*?)<\/example>/gi;
  private static readonly XML_SEE_PATTERN = /\/\/\/\s*<see\s+cref="([^"]+)"\s*\/>/gi;
  private static readonly XML_SEEALSO_PATTERN = /\/\/\/\s*<seealso\s+cref="([^"]+)"\s*\/>/gi;
  
  // Controller patterns
  private static readonly HTTP_GET_PATTERN = /\[HttpGet(?:\("([^"]+)"\))?\]/i;
  private static readonly HTTP_POST_PATTERN = /\[HttpPost(?:\("([^"]+)"\))?\]/i;
  private static readonly HTTP_PUT_PATTERN = /\[HttpPut(?:\("([^"]+)"\))?\]/i;
  private static readonly HTTP_DELETE_PATTERN = /\[HttpDelete(?:\("([^"]+)"\))?\]/i;
  private static readonly HTTP_PATCH_PATTERN = /\[HttpPatch(?:\("([^"]+)"\))?\]/i;
  private static readonly ROUTE_PATTERN = /\[Route\s*\(\s*"([^"]+)"\s*\)\]/i;
  private static readonly AUTHORIZE_PATTERN = /\[Authorize(?:\(([^)]*)\))?\]/i;
  private static readonly ALLOW_ANONYMOUS_PATTERN = /\[AllowAnonymous(?:\s*\([^)]*\))?\]/i;
  private static readonly VALIDATE_ANTI_FORGERY_PATTERN = /\[ValidateAntiForgeryToken(?:\s*\([^)]*\))?\]/i;
  
  constructor(content: string, fileName?: string) {
    this.content = content;
    this.fileName = fileName || '';
  }
  
  /**
   * Parse C# file and extract intelligence
   */
  parse(): CSharpParseResult {
    const fileType = this.detectFileType();
    const namespace = this.extractNamespace();
    const classInfo = this.extractClassInfo();
    const properties = this.extractProperties();
    const navigationProperties = this.extractNavigationProperties(properties);
    const xmlDocumentation = this.extractXmlDocumentation();
    
    // Extract intelligence
    const validations = this.extractValidationIntelligence(properties);
    const displayAttributes = this.extractDisplayIntelligence(properties);
    const businessRules = this.extractBusinessRules(properties, xmlDocumentation);
    const complianceFlags = this.extractComplianceFlags(properties);
    const relationships = this.extractRelationships(properties, navigationProperties);
    
    // Controller-specific extraction
    let actions: ControllerAction[] | undefined;
    let routes: ApiRoute[] | undefined;
    if (fileType === 'controller') {
      actions = this.extractControllerActions();
      routes = this.extractApiRoutes(actions);
    }
    
    // Infer table from model
    const inferredTable = this.inferTableName(classInfo.className, fileType);
    
    // Generate summary
    const summary = this.generateSummary(
      properties, validations, navigationProperties, 
      businessRules, complianceFlags, fileType, xmlDocumentation
    );
    
    return {
      fileName: this.fileName,
      fileType,
      namespace,
      className: classInfo.className,
      baseClass: classInfo.baseClass,
      interfaces: classInfo.interfaces,
      properties,
      navigationProperties,
      actions,
      routes,
      validations,
      displayAttributes,
      businessRules,
      complianceFlags,
      xmlDocumentation,
      inferredTable,
      relationships,
      summary,
    };
  }
  
  /**
   * Detect file type from content
   */
  private detectFileType(): CSharpFileType {
    const content = this.content;
    
    // Controller detection
    if (/class\s+\w+Controller\s*:/.test(content) || /\[ApiController\]/.test(content)) {
      return 'controller';
    }
    
    // Service detection
    if (/class\s+\w+Service\s*:/.test(content) || /interface\s+I\w+Service/.test(content)) {
      return 'service';
    }
    
    // Repository detection
    if (/class\s+\w+Repository\s*:/.test(content) || /interface\s+I\w+Repository/.test(content)) {
      return 'repository';
    }
    
    // Interface detection
    if (/^interface\s+I\w+/m.test(content)) {
      return 'interface';
    }
    
    // Enum detection
    if (/^enum\s+\w+/m.test(content)) {
      return 'enum';
    }
    
    // DTO detection
    if (/class\s+\w*DTO\b/.test(content) || /class\s+\w*Dto\b/.test(content)) {
      return 'dto';
    }
    
    // ViewModel detection
    if (/class\s+\w*ViewModel\b/.test(content) || /class\s+\w*VM\b/.test(content)) {
      return 'viewmodel';
    }
    
    // Model detection (has Key or EF attributes)
    if (/\[Key\]/.test(content) || /\[Table\(/.test(content) || /\[Column\(/.test(content)) {
      return 'model';
    }
    
    // Default to model if has properties with Data Annotations
    if (/\[Required\]/.test(content) || /\[Display\(/.test(content) || /\[StringLength\(/.test(content)) {
      return 'model';
    }
    
    return 'unknown';
  }
  
  /**
   * Extract namespace
   */
  private extractNamespace(): string {
    const match = this.content.match(CSharpParserEngine.NAMESPACE_PATTERN);
    return match ? match[1] : '';
  }
  
  /**
   * Extract class information
   */
  private extractClassInfo(): { className: string; baseClass?: string; interfaces: string[] } {
    const match = this.content.match(CSharpParserEngine.CLASS_PATTERN);
    
    if (!match) {
      return { className: '', interfaces: [] };
    }
    
    const className = match[1];
    const inheritance = match[2] ? match[2].trim() : '';
    
    let baseClass: string | undefined;
    const interfaces: string[] = [];
    
    if (inheritance) {
      const parts = inheritance.split(',').map(p => p.trim());
      // First non-interface is base class
      for (const part of parts) {
        if (part.startsWith('I') && part.length > 1 && part[1] === part[1].toUpperCase()) {
          interfaces.push(part);
        } else if (!baseClass) {
          baseClass = part;
        } else {
          interfaces.push(part);
        }
      }
    }
    
    return { className, baseClass, interfaces };
  }
  
  /**
   * Extract properties with all attributes
   */
  private extractProperties(): CSharpProperty[] {
    const properties: CSharpProperty[] = [];
    const lines = this.content.split('\n');
    
    let currentProperty: { startLine: number; attributes: string[]; declaration: string } | null = null;
    let bracketDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track bracket depth
      bracketDepth += (line.match(/{/g) || []).length;
      bracketDepth -= (line.match(/}/g) || []).length;
      
      // Collect attributes
      if (trimmedLine.startsWith('[')) {
        if (!currentProperty) {
          currentProperty = { startLine: i, attributes: [], declaration: '' };
        }
        currentProperty.attributes.push(trimmedLine);
        continue;
      }
      
      // Detect property declaration
      const propMatch = trimmedLine.match(/^(public|private|protected|internal)\s+(?:virtual\s+)?(?:override\s+)?(?:static\s+)?(\??[\w<>\[\],\s\.]+)\s+(\w+)\s*(?:{|=)/);
      
      if (propMatch && bracketDepth <= 2) {
        const accessModifier = propMatch[1] as CSharpProperty['accessModifier'];
        const type = propMatch[2].trim();
        const name = propMatch[3];
        
        // Parse full property declaration
        const fullDeclaration = this.extractFullPropertyDeclaration(lines, i);
        
        const property = this.parseProperty(
          name, 
          type, 
          accessModifier, 
          currentProperty?.attributes || [], 
          fullDeclaration,
          currentProperty?.startLine || i
        );
        
        properties.push(property);
        currentProperty = null;
        continue;
      }
      
      // Reset if not a property
      if (!trimmedLine.startsWith('[') && !trimmedLine.startsWith('//') && trimmedLine !== '') {
        if (!trimmedLine.includes('{') && !trimmedLine.includes('}')) {
          currentProperty = null;
        }
      }
    }
    
    return properties;
  }
  
  /**
   * Extract full property declaration including get/set
   */
  private extractFullPropertyDeclaration(lines: string[], startIndex: number): string {
    let declaration = '';
    let braceCount = 0;
    let foundOpenBrace = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      declaration += line + '\n';
      
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (line.includes('{')) foundOpenBrace = true;
      if (foundOpenBrace && braceCount === 0) break;
    }
    
    return declaration.trim();
  }
  
  /**
   * Parse individual property
   */
  private parseProperty(
    name: string, 
    type: string, 
    accessModifier: CSharpProperty['accessModifier'],
    attributeStrings: string[],
    fullDeclaration: string,
    lineNumber: number
  ): CSharpProperty {
    const isNullable = type.startsWith('?') || type.includes('?');
    const cleanType = type.replace('?', '').trim();
    const isCollection = /(?:List|ICollection|IEnumerable|IList|HashSet)<.+>/.test(cleanType);
    
    // Parse attributes
    const dataAnnotations: DataAnnotation[] = [];
    const displayAttributes: DisplayAttributeInfo[] = [];
    const validationAttributes: ValidationAttributeInfo[] = [];
    
    const allAttributes = attributeStrings.join(' ');
    
    // Extract all attributes
    const attrMatches = allAttributes.matchAll(/\[([\w]+)(?:\(([^)]*)\))?\]/g);
    for (const match of attrMatches) {
      const attrName = match[1];
      const args = match[2] || '';
      
      dataAnnotations.push({
        name: attrName,
        fullName: attrName,
        arguments: this.parseAttributeArgs(args),
        namedArguments: this.parseNamedArgs(args),
        namespace: this.getAttributeNamespace(attrName),
      });
    }
    
    // Parse display attributes
    const displayMatch = allAttributes.match(CSharpParserEngine.DISPLAY_PATTERN);
    if (displayMatch) {
      displayAttributes.push(this.parseDisplayAttribute(displayMatch[1]));
    }
    
    // Parse validation attributes
    validationAttributes.push(...this.parseValidationAttributes(allAttributes));
    
    // Determine if required
    const isRequired = allAttributes.includes('[Required') || 
                       allAttributes.includes('[Key]') ||
                       (!isNullable && !isCollection && !allAttributes.includes('?'));
    
    // Determine if primary key
    const isPrimaryKey = /\[Key\]/i.test(allAttributes);
    
    // Determine if foreign key
    const fkMatch = allAttributes.match(CSharpParserEngine.FOREIGN_KEY_PATTERN);
    const isForeignKey = !!fkMatch;
    const foreignKeyTarget = fkMatch ? fkMatch[1] : undefined;
    
    // Extract length constraints
    const maxLength = this.extractMaxLength(allAttributes);
    const minLength = this.extractMinLength(allAttributes);
    const range = this.extractRange(allAttributes);
    const pattern = this.extractPattern(allAttributes);
    
    // Infer UI and DB types
    const inferredUIType = this.inferUIType(cleanType, validationAttributes, allAttributes);
    const inferredDbType = this.inferDbType(cleanType, allAttributes);
    
    // Check for virtual (navigation property indicator)
    const isVirtual = /\bvirtual\b/.test(fullDeclaration);
    
    // Check getter/setter
    const hasGetter = /get\s*[{;]/.test(fullDeclaration);
    const hasSetter = /set\s*[{;]/.test(fullDeclaration);
    
    // Collection type
    let collectionType: 'List' | 'ICollection' | 'IEnumerable' | 'Array' | undefined;
    if (isCollection) {
      if (cleanType.includes('List')) collectionType = 'List';
      else if (cleanType.includes('ICollection')) collectionType = 'ICollection';
      else if (cleanType.includes('IEnumerable')) collectionType = 'IEnumerable';
      else if (cleanType.endsWith('[]')) collectionType = 'Array';
    }
    
    return {
      name,
      type: cleanType,
      isNullable,
      isRequired,
      isPrimaryKey,
      isForeignKey,
      foreignKeyTarget,
      accessModifier,
      hasGetter,
      hasSetter,
      isVirtual,
      isCollection,
      collectionType,
      dataAnnotations,
      displayAttributes,
      validationAttributes,
      inferredUIType,
      inferredDbType,
      maxLength,
      minLength,
      range,
      pattern,
      lineNumber,
      rawDeclaration: fullDeclaration,
    };
  }
  
  /**
   * Parse attribute arguments
   */
  private parseAttributeArgs(argsString: string): (string | number | boolean)[] {
    if (!argsString) return [];
    
    const args: (string | number | boolean)[] = [];
    const parts = argsString.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('=')) continue; // Named argument
      
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        args.push(trimmed.slice(1, -1));
      } else if (trimmed === 'true' || trimmed === 'false') {
        args.push(trimmed === 'true');
      } else if (!isNaN(Number(trimmed))) {
        args.push(Number(trimmed));
      }
    }
    
    return args;
  }
  
  /**
   * Parse named arguments
   */
  private parseNamedArgs(argsString: string): Record<string, string | number | boolean> {
    const named: Record<string, string | number | boolean> = {};
    if (!argsString) return named;
    
    const namedMatch = argsString.matchAll(/(\w+)\s*=\s*("[^"]*"|'[^']*'|\d+|true|false|null)/g);
    for (const match of namedMatch) {
      const name = match[1];
      let value: string | number | boolean = match[2];
      
      if (value.startsWith('"') || value.startsWith("'")) {
        value = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        value = value === 'true';
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }
      
      named[name] = value;
    }
    
    return named;
  }
  
  /**
   * Get attribute namespace
   */
  private getAttributeNamespace(attrName: string): string {
    const namespaces: Record<string, string> = {
      'Required': 'System.ComponentModel.DataAnnotations',
      'StringLength': 'System.ComponentModel.DataAnnotations',
      'MaxLength': 'System.ComponentModel.DataAnnotations',
      'MinLength': 'System.ComponentModel.DataAnnotations',
      'Range': 'System.ComponentModel.DataAnnotations',
      'RegularExpression': 'System.ComponentModel.DataAnnotations',
      'EmailAddress': 'System.ComponentModel.DataAnnotations',
      'Phone': 'System.ComponentModel.DataAnnotations',
      'Url': 'System.ComponentModel.DataAnnotations',
      'Display': 'System.ComponentModel.DataAnnotations',
      'Key': 'System.ComponentModel.DataAnnotations',
      'ForeignKey': 'System.ComponentModel.DataAnnotations.Schema',
      'Column': 'System.ComponentModel.DataAnnotations.Schema',
      'Table': 'System.ComponentModel.DataAnnotations.Schema',
      'NotMapped': 'System.ComponentModel.DataAnnotations.Schema',
      'PersonalData': 'System.ComponentModel.DataAnnotations',
      'ProtectedPersonalData': 'System.ComponentModel.DataAnnotations',
      'HttpGet': 'Microsoft.AspNetCore.Mvc',
      'HttpPost': 'Microsoft.AspNetCore.Mvc',
      'HttpPut': 'Microsoft.AspNetCore.Mvc',
      'HttpDelete': 'Microsoft.AspNetCore.Mvc',
      'Route': 'Microsoft.AspNetCore.Mvc',
      'Authorize': 'Microsoft.AspNetCore.Authorization',
    };
    
    return namespaces[attrName] || 'Custom';
  }
  
  /**
   * Parse display attribute
   */
  private parseDisplayAttribute(args: string): DisplayAttributeInfo {
    const named = this.parseNamedArgs(args);
    
    return {
      name: named.Name as string || named.name as string,
      shortName: named.ShortName as string || named.shortName as string,
      description: named.Description as string || named.description as string,
      prompt: named.Prompt as string || named.prompt as string,
      groupName: named.GroupName as string || named.groupName as string,
      order: named.Order as number || named.order as number || 0,
      autoGenerateField: named.AutoGenerateField as boolean,
      autoGenerateFilter: named.AutoGenerateFilter as boolean,
    };
  }
  
  /**
   * Parse validation attributes
   */
  private parseValidationAttributes(attributeString: string): ValidationAttributeInfo[] {
    const validations: ValidationAttributeInfo[] = [];
    
    // Required
    if (CSharpParserEngine.REQUIRED_PATTERN.test(attributeString)) {
      const match = attributeString.match(CSharpParserEngine.REQUIRED_PATTERN);
      validations.push({
        type: 'required',
        attribute: 'Required',
        parameters: this.parseNamedArgs(match?.[1] || ''),
        errorMessage: this.extractErrorMessage(attributeString, 'Required'),
      });
    }
    
    // StringLength
    const strLenMatch = attributeString.match(CSharpParserEngine.STRING_LENGTH_PATTERN);
    if (strLenMatch) {
      validations.push({
        type: 'stringlength',
        attribute: 'StringLength',
        parameters: {
          maximumLength: parseInt(strLenMatch[1]),
          minimumLength: strLenMatch[2] ? parseInt(strLenMatch[2]) : 0,
        },
        errorMessage: this.extractErrorMessage(attributeString, 'StringLength'),
      });
    }
    
    // MaxLength
    const maxLenMatch = attributeString.match(CSharpParserEngine.MAX_LENGTH_PATTERN);
    if (maxLenMatch) {
      validations.push({
        type: 'maxlength',
        attribute: 'MaxLength',
        parameters: { length: parseInt(maxLenMatch[1]) },
        errorMessage: this.extractErrorMessage(attributeString, 'MaxLength'),
      });
    }
    
    // MinLength
    const minLenMatch = attributeString.match(CSharpParserEngine.MIN_LENGTH_PATTERN);
    if (minLenMatch) {
      validations.push({
        type: 'minlength',
        attribute: 'MinLength',
        parameters: { length: parseInt(minLenMatch[1]) },
        errorMessage: this.extractErrorMessage(attributeString, 'MinLength'),
      });
    }
    
    // Range
    const rangeMatch = attributeString.match(CSharpParserEngine.RANGE_PATTERN);
    if (rangeMatch) {
      validations.push({
        type: 'range',
        attribute: 'Range',
        parameters: {
          type: rangeMatch[1] || 'int',
          minimum: rangeMatch[2].trim(),
          maximum: rangeMatch[3].trim(),
        },
        errorMessage: this.extractErrorMessage(attributeString, 'Range'),
      });
    }
    
    // RegularExpression
    const regexMatch = attributeString.match(CSharpParserEngine.REGEX_PATTERN);
    if (regexMatch) {
      validations.push({
        type: 'regex',
        attribute: 'RegularExpression',
        parameters: { pattern: regexMatch[1] },
        errorMessage: this.extractErrorMessage(attributeString, 'RegularExpression'),
      });
    }
    
    // EmailAddress
    if (CSharpParserEngine.EMAIL_PATTERN.test(attributeString)) {
      validations.push({
        type: 'email',
        attribute: 'EmailAddress',
        parameters: {},
        errorMessage: this.extractErrorMessage(attributeString, 'EmailAddress'),
      });
    }
    
    // Phone
    if (CSharpParserEngine.PHONE_PATTERN.test(attributeString)) {
      validations.push({
        type: 'phone',
        attribute: 'Phone',
        parameters: {},
        errorMessage: this.extractErrorMessage(attributeString, 'Phone'),
      });
    }
    
    // Url
    if (CSharpParserEngine.URL_PATTERN.test(attributeString)) {
      validations.push({
        type: 'url',
        attribute: 'Url',
        parameters: {},
        errorMessage: this.extractErrorMessage(attributeString, 'Url'),
      });
    }
    
    return validations;
  }
  
  /**
   * Extract error message from attribute
   */
  private extractErrorMessage(attributeString: string, attrName: string): string | undefined {
    const regex = new RegExp(`\\[${attrName}[^\\]]*ErrorMessage\\s*=\\s*"([^"]+)"`, 'i');
    const match = attributeString.match(regex);
    return match ? match[1] : undefined;
  }
  
  /**
   * Extract max length
   */
  private extractMaxLength(attributeString: string): number | undefined {
    const strLenMatch = attributeString.match(CSharpParserEngine.STRING_LENGTH_PATTERN);
    if (strLenMatch) return parseInt(strLenMatch[1]);
    
    const maxLenMatch = attributeString.match(CSharpParserEngine.MAX_LENGTH_PATTERN);
    if (maxLenMatch) return parseInt(maxLenMatch[1]);
    
    return undefined;
  }
  
  /**
   * Extract min length
   */
  private extractMinLength(attributeString: string): number | undefined {
    const strLenMatch = attributeString.match(CSharpParserEngine.STRING_LENGTH_PATTERN);
    if (strLenMatch?.[2]) return parseInt(strLenMatch[2]);
    
    const minLenMatch = attributeString.match(CSharpParserEngine.MIN_LENGTH_PATTERN);
    if (minLenMatch) return parseInt(minLenMatch[1]);
    
    return undefined;
  }
  
  /**
   * Extract range
   */
  private extractRange(attributeString: string): { min: number | string; max: number | string } | undefined {
    const match = attributeString.match(CSharpParserEngine.RANGE_PATTERN);
    if (!match) return undefined;
    
    return {
      min: isNaN(Number(match[2])) ? match[2].trim() : Number(match[2]),
      max: isNaN(Number(match[3])) ? match[3].trim() : Number(match[3]),
    };
  }
  
  /**
   * Extract pattern
   */
  private extractPattern(attributeString: string): string | undefined {
    const match = attributeString.match(CSharpParserEngine.REGEX_PATTERN);
    return match ? match[1] : undefined;
  }
  
  /**
   * Infer UI type from C# type and attributes
   */
  private inferUIType(csharpType: string, validations: ValidationAttributeInfo[], attributes: string): string {
    const type = csharpType.toLowerCase();
    
    // Check validation hints
    if (validations.some(v => v.type === 'email')) return 'email';
    if (validations.some(v => v.type === 'phone')) return 'tel';
    if (validations.some(v => v.type === 'url')) return 'url';
    
    // Check attributes
    if (/\[DataType\(DataType\.Password\)\]/i.test(attributes)) return 'password';
    if (/\[DataType\(DataType\.Date\)\]/i.test(attributes)) return 'date';
    if (/\[DataType\(DataType\.Time\)\]/i.test(attributes)) return 'time';
    if (/\[DataType\(DataType\.DateTime\)\]/i.test(attributes)) return 'datetime';
    if (/\[DataType\(DataType\.MultilineText\)\]/i.test(attributes)) return 'textarea';
    if (/\[DataType\(DataType\.Upload\)\]/i.test(attributes)) return 'file';
    if (/\[DataType\(DataType\.Currency\)\]/i.test(attributes)) return 'currency';
    
    // Type-based inference
    if (type === 'string') return 'text';
    if (type === 'int' || type === 'long' || type === 'decimal' || type === 'double' || type === 'float') return 'number';
    if (type === 'bool' || type === 'boolean') return 'checkbox';
    if (type === 'datetime' || type === 'datetimeoffset') return 'datetime';
    if (type === 'guid') return 'text';
    if (type === 'byte[]') return 'file';
    
    // FK detection
    if (type.endsWith('Id') || /\[ForeignKey\(/i.test(attributes)) return 'select';
    
    return 'text';
  }
  
  /**
   * Infer database type from C# type
   */
  private inferDbType(csharpType: string, attributes: string): string {
    const type = csharpType.toLowerCase();
    
    // Check Column attribute
    const columnMatch = attributes.match(/\[Column\s*\([^)]*TypeName\s*=\s*"([^"]+)"\s*\)/i);
    if (columnMatch) return columnMatch[1];
    
    // Type mapping
    const typeMap: Record<string, string> = {
      'string': 'NVARCHAR',
      'int': 'INT',
      'long': 'BIGINT',
      'short': 'SMALLINT',
      'byte': 'TINYINT',
      'bool': 'BIT',
      'boolean': 'BIT',
      'decimal': 'DECIMAL(18,2)',
      'double': 'FLOAT',
      'float': 'FLOAT',
      'datetime': 'DATETIME',
      'datetimeoffset': 'DATETIMEOFFSET',
      'timespan': 'TIME',
      'guid': 'UNIQUEIDENTIFIER',
      'byte[]': 'VARBINARY(MAX)',
      'object': 'NVARCHAR(MAX)',
    };
    
    return typeMap[type] || 'NVARCHAR(MAX)';
  }
  
  /**
   * Extract navigation properties
   */
  private extractNavigationProperties(properties: CSharpProperty[]): NavigationProperty[] {
    const navProps: NavigationProperty[] = [];
    
    for (const prop of properties) {
      // Skip if not virtual and not a known entity type
      if (!prop.isVirtual && !this.isEntityType(prop.type)) continue;
      
      // Skip collections unless virtual
      if (prop.isCollection && !prop.isVirtual) continue;
      
      const navProp: NavigationProperty = {
        name: prop.name,
        targetType: prop.isCollection ? this.extractGenericArg(prop.type) : prop.type,
        relationshipType: prop.isCollection ? 'one-to-many' : 'one-to-one',
        isCollection: prop.isCollection,
        isRequired: prop.isRequired,
        hasForeignKey: prop.isForeignKey,
        hasInverseProperty: false,
      };
      
      // Extract FK property name
      if (prop.isForeignKey && prop.foreignKeyTarget) {
        navProp.foreignKeyProperty = prop.foreignKeyTarget;
      }
      
      // Check for InverseProperty
      const inverseMatch = prop.rawDeclaration.match(/\[InverseProperty\s*\(\s*"([^"]+)"\s*\)\]/i);
      if (inverseMatch) {
        navProp.inverseProperty = inverseMatch[1];
        navProp.hasInverseProperty = true;
      }
      
      navProps.push(navProp);
    }
    
    return navProps;
  }
  
  /**
   * Check if type is an entity type (not primitive)
   */
  private isEntityType(type: string): boolean {
    const primitives = [
      'string', 'int', 'long', 'short', 'byte', 'bool', 'boolean',
      'decimal', 'double', 'float', 'datetime', 'datetimeoffset',
      'timespan', 'guid', 'object', 'task', 'action', 'func'
    ];
    
    const cleanType = type.toLowerCase().replace('?', '');
    if (primitives.includes(cleanType)) return false;
    if (cleanType.endsWith('[]')) return false;
    if (cleanType.includes('list<') || cleanType.includes('icollection<')) return true;
    
    // Assume it's an entity if it starts with capital letter and isn't a primitive
    return /^[A-Z]/.test(type);
  }
  
  /**
   * Extract generic argument from type
   */
  private extractGenericArg(type: string): string {
    const match = type.match(/<(?:.+?\.)?([^,>]+)>/);
    return match ? match[1] : type;
  }
  
  /**
   * Extract XML documentation
   */
  private extractXmlDocumentation(): XmlDocumentationResult {
    const result: XmlDocumentationResult = {
      parameters: [],
      exceptions: [],
      examples: [],
      seeAlso: [],
    };
    
    // Summary
    const summaryMatch = this.content.match(CSharpParserEngine.XML_SUMMARY_PATTERN);
    if (summaryMatch) {
      result.summary = this.cleanXmlContent(summaryMatch[1]);
    }
    
    // Remarks
    const remarksMatch = this.content.match(CSharpParserEngine.XML_REMARKS_PATTERN);
    if (remarksMatch) {
      result.remarks = this.cleanXmlContent(remarksMatch[1]);
    }
    
    // Parameters
    let paramMatch;
    while ((paramMatch = CSharpParserEngine.XML_PARAM_PATTERN.exec(this.content)) !== null) {
      result.parameters.push({
        name: paramMatch[1],
        description: this.cleanXmlContent(paramMatch[2]),
      });
    }
    
    // Returns
    const returnsMatch = this.content.match(CSharpParserEngine.XML_RETURNS_PATTERN);
    if (returnsMatch) {
      result.returns = this.cleanXmlContent(returnsMatch[1]);
    }
    
    // Exceptions
    let excMatch;
    while ((excMatch = CSharpParserEngine.XML_EXCEPTION_PATTERN.exec(this.content)) !== null) {
      result.exceptions.push({
        type: excMatch[1],
        condition: this.cleanXmlContent(excMatch[2]),
      });
    }
    
    // Examples
    let exMatch;
    while ((exMatch = CSharpParserEngine.XML_EXAMPLE_PATTERN.exec(this.content)) !== null) {
      result.examples.push(this.cleanXmlContent(exMatch[1]));
    }
    
    // See also
    let seeMatch;
    while ((seeMatch = CSharpParserEngine.XML_SEEALSO_PATTERN.exec(this.content)) !== null) {
      result.seeAlso.push(seeMatch[1]);
    }
    
    // Extract business intelligence from XML
    this.extractBusinessIntelligenceFromXml(result);
    
    return result;
  }
  
  /**
   * Clean XML content
   */
  private cleanXmlContent(content: string): string {
    return content
      .replace(/\/\/\/\s*/g, '')
      .replace(/<see\s+cref="([^"]+)"\s*\/>/g, '$1')
      .replace(/<paramref\s+name="([^"]+)"\s*\/>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
  
  /**
   * Extract business intelligence from XML documentation
   */
  private extractBusinessIntelligenceFromXml(result: XmlDocumentationResult): void {
    const text = [result.summary, result.remarks].filter(Boolean).join(' ');
    
    // Business context patterns
    const businessPatterns = [
      { pattern: /business\s+rule[:\s]+([^.]+)/i, key: 'businessContext' },
      { pattern: /workflow[:\s]+([^.]+)/i, key: 'workflowSteps' },
      { pattern: /security[:\s]+([^.]+)/i, key: 'securityNotes' },
      { pattern: /performance[:\s]+([^.]+)/i, key: 'performanceNotes' },
      { pattern: /compliance[:\s]+([^.]+)/i, key: 'compliance' },
      { pattern: /GDPR|HIPAA|PCI|SOX|CCPA/i, key: 'compliance' },
    ];
    
    for (const { pattern, key } of businessPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (key === 'workflowSteps') {
          result.workflowSteps = match[1].split(/,\s*|;\s*/).map(s => s.trim());
        } else if (key === 'securityNotes') {
          result.securityNotes = [match[1].trim()];
        } else if (key === 'performanceNotes') {
          result.performanceNotes = [match[1].trim()];
        } else if (key === 'businessContext') {
          result.businessContext = match[1].trim();
        }
      }
    }
    
    // Detect compliance keywords
    const complianceKeywords = ['GDPR', 'HIPAA', 'PCI', 'SOX', 'CCPA', 'PII', 'PHI', 'sensitive'];
    if (complianceKeywords.some(kw => text.toUpperCase().includes(kw))) {
      result.securityNotes = result.securityNotes || [];
      result.securityNotes.push('Compliance-related data detected in documentation');
    }
  }
  
  /**
   * Extract validation intelligence
   */
  private extractValidationIntelligence(properties: CSharpProperty[]): ValidationIntelligence[] {
    return properties.map(prop => {
      const rules: ValidationRule[] = [];
      const clientRules: ClientValidationRule[] = [];
      
      for (const val of prop.validationAttributes) {
        // Server-side rules
        rules.push({
          type: val.type,
          value: val.parameters.maximumLength || val.parameters.minimumLength || val.parameters.length,
          message: val.errorMessage,
        });
        
        // Client-side rules for React
        const clientRule = this.validationToClientRule(val);
        if (clientRule) {
          clientRules.push(clientRule);
        }
      }
      
      return {
        propertyName: prop.name,
        rules,
        clientSideRules: clientRules,
        serverSideOnly: prop.validationAttributes.some(v => v.type === 'remote'),
        crossFieldValidation: prop.validationAttributes.some(v => v.type === 'compare'),
      };
    }).filter(v => v.rules.length > 0);
  }
  
  /**
   * Convert validation to client-side rule
   */
  private validationToClientRule(val: ValidationAttributeInfo): ClientValidationRule | null {
    const ruleMap: Record<string, string> = {
      'required': 'required',
      'email': 'email',
      'stringlength': 'maxLength',
      'maxlength': 'maxLength',
      'minlength': 'minLength',
      'range': 'range',
      'regex': 'pattern',
      'phone': 'phone',
      'url': 'url',
    };
    
    const ruleName = ruleMap[val.type];
    if (!ruleName) return null;
    
    let parameter: string | number | undefined;
    if (val.type === 'stringlength' || val.type === 'maxlength') {
      parameter = val.parameters.maximumLength as number || val.parameters.length as number;
    } else if (val.type === 'minlength') {
      parameter = val.parameters.length as number;
    } else if (val.type === 'range') {
      parameter = `${val.parameters.minimum}-${val.parameters.maximum}`;
    } else if (val.type === 'regex') {
      parameter = val.parameters.pattern as string;
    }
    
    return {
      ruleName,
      parameter,
      message: val.errorMessage || this.getDefaultMessage(val.type),
    };
  }
  
  /**
   * Get default validation message
   */
  private getDefaultMessage(type: string): string {
    const messages: Record<string, string> = {
      'required': 'This field is required',
      'email': 'Please enter a valid email address',
      'stringlength': 'Please enter a valid length',
      'maxlength': 'Input exceeds maximum length',
      'minlength': 'Input is too short',
      'range': 'Please enter a value within the valid range',
      'regex': 'Please enter a valid format',
      'phone': 'Please enter a valid phone number',
      'url': 'Please enter a valid URL',
    };
    return messages[type] || 'Invalid input';
  }
  
  /**
   * Extract display intelligence
   */
  private extractDisplayIntelligence(properties: CSharpProperty[]): DisplayIntelligence[] {
    return properties.map(prop => {
      const display = prop.displayAttributes[0];
      
      return {
        propertyName: prop.name,
        displayName: display?.name || this.formatPropertyName(prop.name),
        description: display?.description,
        placeholder: display?.prompt,
        groupName: display?.groupName,
        order: display?.order || 0,
        isHidden: prop.dataAnnotations.some(a => a.name === 'NotMapped' || a.name === 'HiddenInput'),
        isReadOnly: !prop.hasSetter,
      };
    });
  }
  
  /**
   * Format property name to display name
   */
  private formatPropertyName(name: string): string {
    // CamelCase to Title Case
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }
  
  /**
   * Extract business rules
   */
  private extractBusinessRules(properties: CSharpProperty[], xmlDoc: XmlDocumentationResult): BusinessRuleIntelligence[] {
    const rules: BusinessRuleIntelligence[] = [];
    
    // Extract from attributes
    for (const prop of properties) {
      // Range validation
      const rangeAttr = prop.validationAttributes.find(v => v.type === 'range');
      if (rangeAttr) {
        rules.push({
          id: `BR_${prop.name}_Range`,
          propertyName: prop.name,
          ruleType: 'validation',
          description: `${prop.name} must be between ${rangeAttr.parameters.minimum} and ${rangeAttr.parameters.maximum}`,
          source: 'attribute',
          implementation: `Range(${rangeAttr.parameters.minimum}, ${rangeAttr.parameters.maximum})`,
        });
      }
      
      // Regex validation
      const regexAttr = prop.validationAttributes.find(v => v.type === 'regex');
      if (regexAttr) {
        rules.push({
          id: `BR_${prop.name}_Format`,
          propertyName: prop.name,
          ruleType: 'validation',
          description: `${prop.name} must match the required format`,
          source: 'attribute',
          implementation: `Pattern: ${regexAttr.parameters.pattern}`,
        });
      }
    }
    
    // Extract from XML documentation
    if (xmlDoc.businessContext) {
      rules.push({
        id: 'BR_Doc_Context',
        ruleType: 'workflow',
        description: xmlDoc.businessContext,
        source: 'xml_comment',
      });
    }
    
    if (xmlDoc.workflowSteps && xmlDoc.workflowSteps.length > 0) {
      rules.push({
        id: 'BR_Doc_Workflow',
        ruleType: 'workflow',
        description: `Workflow steps: ${xmlDoc.workflowSteps.join(', ')}`,
        source: 'xml_comment',
      });
    }
    
    if (xmlDoc.securityNotes && xmlDoc.securityNotes.length > 0) {
      rules.push({
        id: 'BR_Doc_Security',
        ruleType: 'security',
        description: xmlDoc.securityNotes.join('; '),
        source: 'xml_comment',
      });
    }
    
    return rules;
  }
  
  /**
   * Extract compliance flags
   */
  private extractComplianceFlags(properties: CSharpProperty[]): ComplianceFlag[] {
    const flags: ComplianceFlag[] = [];
    
    for (const prop of properties) {
      // PersonalData attribute
      if (prop.dataAnnotations.some(a => a.name === 'PersonalData' || a.name === 'ProtectedPersonalData')) {
        const piiType = this.inferPIIType(prop.name);
        const sensitivity = this.inferSensitivity(prop.name, piiType);
        
        flags.push({
          propertyName: prop.name,
          flagType: 'PII',
          sensitivity,
          reason: `Marked with PersonalData attribute`,
          regulations: this.inferRegulations(prop.name, piiType),
          requiresEncryption: sensitivity === 'high',
          requiresAudit: sensitivity === 'high',
        });
      }
      
      // Infer PII from name patterns
      const inferredPII = this.inferPIIFromName(prop.name);
      if (inferredPII && !flags.some(f => f.propertyName === prop.name)) {
        flags.push({
          propertyName: prop.name,
          flagType: 'PII',
          sensitivity: inferredPII.sensitivity,
          reason: `Inferred from property name pattern`,
          regulations: inferredPII.regulations,
          requiresEncryption: inferredPII.sensitivity === 'high',
          requiresAudit: inferredPII.sensitivity === 'high',
        });
      }
    }
    
    return flags;
  }
  
  /**
   * Infer PII type from property name
   */
  private inferPIIType(name: string): 'email' | 'phone' | 'ssn' | 'credit_card' | 'dob' | 'address' | 'name' | 'other' {
    const lower = name.toLowerCase();
    
    if (lower.includes('email') || lower.includes('emailaddress')) return 'email';
    if (lower.includes('phone') || lower.includes('tel') || lower.includes('mobile')) return 'phone';
    if (lower.includes('ssn') || lower.includes('social')) return 'ssn';
    if (lower.includes('credit') || lower.includes('card')) return 'credit_card';
    if (lower.includes('birth') || lower.includes('dob') || lower.includes('birthdate')) return 'dob';
    if (lower.includes('address') || lower.includes('street') || lower.includes('city')) return 'address';
    if (lower.includes('firstname') || lower.includes('lastname') || lower.includes('name')) return 'name';
    
    return 'other';
  }
  
  /**
   * Infer sensitivity level
   */
  private inferSensitivity(name: string, piiType: string): 'high' | 'medium' | 'low' {
    const highSensitivity = ['ssn', 'credit_card', 'dob'];
    const mediumSensitivity = ['email', 'phone', 'address'];
    
    if (highSensitivity.includes(piiType)) return 'high';
    if (mediumSensitivity.includes(piiType)) return 'medium';
    
    // Check for sensitive keywords
    const lower = name.toLowerCase();
    if (lower.includes('password') || lower.includes('secret') || lower.includes('token')) return 'high';
    if (lower.includes('medical') || lower.includes('health') || lower.includes('patient')) return 'high';
    
    return 'low';
  }
  
  /**
   * Infer applicable regulations
   */
  private inferRegulations(name: string, piiType: string): string[] {
    const regulations: string[] = [];
    const lower = name.toLowerCase();
    
    // GDPR applies to all PII in EU
    regulations.push('GDPR');
    
    // HIPAA for health data
    if (lower.includes('patient') || lower.includes('medical') || lower.includes('health') || lower.includes('diagnosis')) {
      regulations.push('HIPAA');
    }
    
    // PCI for payment data
    if (piiType === 'credit_card' || lower.includes('payment') || lower.includes('card')) {
      regulations.push('PCI-DSS');
    }
    
    // CCPA for California residents
    if (piiType !== 'other') {
      regulations.push('CCPA');
    }
    
    return regulations;
  }
  
  /**
   * Infer PII from property name
   */
  private inferPIIFromName(name: string): { sensitivity: 'high' | 'medium' | 'low'; regulations: string[] } | null {
    const lower = name.toLowerCase();
    
    // High sensitivity patterns
    if (/password|secret|token|api_?key/i.test(name)) {
      return { sensitivity: 'high', regulations: ['GDPR', 'SOC2'] };
    }
    if (/ssn|social.?security|tax.?id/i.test(name)) {
      return { sensitivity: 'high', regulations: ['GDPR', 'CCPA', 'SOX'] };
    }
    if (/credit.?card|card.?number|cvv|cvc/i.test(name)) {
      return { sensitivity: 'high', regulations: ['PCI-DSS', 'GDPR'] };
    }
    
    // Medium sensitivity patterns
    if (/email|e.?mail/i.test(name)) {
      return { sensitivity: 'medium', regulations: ['GDPR', 'CCPA'] };
    }
    if (/phone|telephone|mobile/i.test(name)) {
      return { sensitivity: 'medium', regulations: ['GDPR', 'CCPA'] };
    }
    if (/address|street|city|state|zip|postal/i.test(name)) {
      return { sensitivity: 'medium', regulations: ['GDPR', 'CCPA'] };
    }
    if (/birth|dob|birthday/i.test(name)) {
      return { sensitivity: 'medium', regulations: ['GDPR', 'CCPA'] };
    }
    
    return null;
  }
  
  /**
   * Extract relationships
   */
  private extractRelationships(properties: CSharpProperty[], navProps: NavigationProperty[]): EntityRelationship[] {
    const relationships: EntityRelationship[] = [];
    
    for (const nav of navProps) {
      const fkProp = properties.find(p => p.name === nav.foreignKeyProperty);
      
      relationships.push({
        fromEntity: '', // Will be filled by caller
        toEntity: nav.targetType,
        fromProperty: nav.name,
        toProperty: nav.inverseProperty,
        relationshipType: nav.relationshipType,
        foreignKey: nav.foreignKeyProperty,
        isRequired: nav.isRequired,
        cascadeDelete: false, // Would need to check EF Core Fluent API
      });
    }
    
    return relationships;
  }
  
  /**
   * Extract controller actions
   */
  private extractControllerActions(): ControllerAction[] {
    const actions: ControllerAction[] = [];
    const lines = this.content.split('\n');
    
    let currentAttributes: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Collect attributes
      if (line.startsWith('[')) {
        currentAttributes.push(line);
        continue;
      }
      
      // Detect method declaration
      const methodMatch = line.match(/(?:public|protected|internal)\s+(?:async\s+)?(\w[\w<>\[\],\s\.]*)\s+(\w+)\s*\(([^)]*)\)/);
      
      if (methodMatch) {
        const returnType = methodMatch[1].trim();
        const methodName = methodMatch[2];
        const parameters = methodMatch[3];
        
        const attrs = currentAttributes.join(' ');
        
        // Determine HTTP method
        let httpMethod: ControllerAction['httpMethod'] = 'GET';
        let route: string | undefined;
        
        if (attrs.match(CSharpParserEngine.HTTP_GET_PATTERN)) {
          httpMethod = 'GET';
          const match = attrs.match(CSharpParserEngine.HTTP_GET_PATTERN);
          route = match?.[1];
        } else if (attrs.match(CSharpParserEngine.HTTP_POST_PATTERN)) {
          httpMethod = 'POST';
          const match = attrs.match(CSharpParserEngine.HTTP_POST_PATTERN);
          route = match?.[1];
        } else if (attrs.match(CSharpParserEngine.HTTP_PUT_PATTERN)) {
          httpMethod = 'PUT';
          const match = attrs.match(CSharpParserEngine.HTTP_PUT_PATTERN);
          route = match?.[1];
        } else if (attrs.match(CSharpParserEngine.HTTP_DELETE_PATTERN)) {
          httpMethod = 'DELETE';
          const match = attrs.match(CSharpParserEngine.HTTP_DELETE_PATTERN);
          route = match?.[1];
        } else if (attrs.match(CSharpParserEngine.HTTP_PATCH_PATTERN)) {
          httpMethod = 'PATCH';
          const match = attrs.match(CSharpParserEngine.HTTP_PATCH_PATTERN);
          route = match?.[1];
        }
        
        // Route attribute
        const routeAttrMatch = attrs.match(CSharpParserEngine.ROUTE_PATTERN);
        if (routeAttrMatch) {
          route = routeAttrMatch[1];
        }
        
        // Authorize attribute
        let authorize: AuthorizeInfo | undefined;
        if (CSharpParserEngine.ALLOW_ANONYMOUS_PATTERN.test(attrs)) {
          authorize = { isAllowAnonymous: true };
        } else if (CSharpParserEngine.AUTHORIZE_PATTERN.test(attrs)) {
          const authMatch = attrs.match(CSharpParserEngine.AUTHORIZE_PATTERN);
          const authArgs = authMatch?.[1] || '';
          
          authorize = {
            roles: this.extractRoles(authArgs),
            policies: this.extractPolicies(authArgs),
            isAllowAnonymous: false,
          };
        }
        
        // Infer operation
        const inferredOperation = this.inferOperation(methodName);
        
        // Parse parameters
        const actionParams = this.parseActionParameters(parameters, attrs);
        
        actions.push({
          name: methodName,
          httpMethod,
          route,
          parameters: actionParams,
          returnType,
          isAsync: line.includes('async'),
          hasValidateAntiForgeryToken: CSharpParserEngine.VALIDATE_ANTI_FORGERY_PATTERN.test(attrs),
          authorizeAttribute: authorize,
          inferredOperation,
          relatedEntity: this.inferRelatedEntity(methodName),
        });
        
        currentAttributes = [];
      } else if (!line.startsWith('[') && !line.startsWith('//') && line !== '') {
        currentAttributes = [];
      }
    }
    
    return actions;
  }
  
  /**
   * Parse action parameters
   */
  private parseActionParameters(paramsString: string, attrs: string): ActionParameter[] {
    const params: ActionParameter[] = [];
    
    if (!paramsString.trim()) return params;
    
    const parts = paramsString.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      const match = trimmed.match(/(?:\[.*?\]\s*)?(\w[\w<>\[\],\s\.]*)\s+(\w+)(?:\s*=\s*([^,]+))?/);
      
      if (match) {
        const type = match[1].trim();
        const name = match[2];
        const defaultValue = match[3]?.trim();
        
        params.push({
          name,
          type,
          isFromBody: attrs.includes(`[FromBody]`) && part.includes(name),
          isFromQuery: attrs.includes(`[FromQuery]`) && part.includes(name),
          isFromRoute: attrs.includes(`[FromRoute]`) && part.includes(name),
          isOptional: !!defaultValue || type.includes('?'),
          defaultValue,
        });
      }
    }
    
    return params;
  }
  
  /**
   * Extract roles from Authorize attribute
   */
  private extractRoles(args: string): string[] {
    const match = args.match(/Roles\s*=\s*"([^"]+)"/);
    if (match) {
      return match[1].split(',').map(r => r.trim());
    }
    return [];
  }
  
  /**
   * Extract policies from Authorize attribute
   */
  private extractPolicies(args: string): string[] {
    const match = args.match(/Policy\s*=\s*"([^"]+)"/);
    if (match) {
      return [match[1]];
    }
    return [];
  }
  
  /**
   * Infer operation from method name
   */
  private inferOperation(methodName: string): ControllerAction['inferredOperation'] {
    const lower = methodName.toLowerCase();
    
    if (lower.startsWith('create') || lower.startsWith('add') || lower.startsWith('new')) return 'create';
    if (lower.startsWith('update') || lower.startsWith('edit') || lower.startsWith('modify')) return 'update';
    if (lower.startsWith('delete') || lower.startsWith('remove')) return 'delete';
    if (lower.startsWith('get') || lower.startsWith('find') || lower.startsWith('details')) return 'read';
    if (lower.startsWith('list') || lower.startsWith('index') || lower.startsWith('search')) return 'list';
    
    return 'custom';
  }
  
  /**
   * Infer related entity from method name
   */
  private inferRelatedEntity(methodName: string): string | undefined {
    // CreatePatient -> Patient
    // UpdateUser -> User
    const match = methodName.match(/(?:Create|Update|Delete|Get|Find|List|Index)(\w+)/);
    return match ? match[1] : undefined;
  }
  
  /**
   * Extract API routes
   */
  private extractApiRoutes(actions: ControllerAction[]): ApiRoute[] {
    const routes: ApiRoute[] = [];
    const classRouteMatch = this.content.match(/\[Route\s*\(\s*"([^"]+)"\s*\)\]/);
    const classRoute = classRouteMatch ? classRouteMatch[1] : '';
    
    for (const action of actions) {
      if (action.route || classRoute) {
        routes.push({
          template: this.combineRoutes(classRoute, action.route || ''),
          httpMethods: [action.httpMethod],
          controller: '', // Filled by caller
          action: action.name,
          constraints: {},
        });
      }
    }
    
    return routes;
  }
  
  /**
   * Combine class and method routes
   */
  private combineRoutes(classRoute: string, methodRoute: string): string {
    if (!classRoute && !methodRoute) return '';
    if (!classRoute) return methodRoute;
    if (!methodRoute) return classRoute;
    
    return `${classRoute}/${methodRoute}`.replace(/\/+/g, '/');
  }
  
  /**
   * Infer table name from class name
   */
  private inferTableName(className: string, fileType: CSharpFileType): string | undefined {
    if (fileType !== 'model' && fileType !== 'dto' && fileType !== 'viewmodel') {
      return undefined;
    }
    
    // Check Table attribute
    const tableMatch = this.content.match(/\[Table\s*\(\s*"([^"]+)"\s*\)/);
    if (tableMatch) return tableMatch[1];
    
    // Remove common suffixes
    let name = className
      .replace(/DTO$/i, '')
      .replace(/Dto$/i, '')
      .replace(/ViewModel$/i, '')
      .replace(/VM$/i, '')
      .replace(/Model$/i, '')
      .replace(/Entity$/i, '');
    
    // Pluralize
    return this.pluralize(name);
  }
  
  /**
   * Pluralize a word
   */
  private pluralize(word: string): string {
    if (!word) return word;
    
    const irregulars: Record<string, string> = {
      'person': 'People',
      'child': 'Children',
      'man': 'Men',
      'woman': 'Women',
      'tooth': 'Teeth',
      'foot': 'Feet',
      'mouse': 'Mice',
      'goose': 'Geese',
      'data': 'Data',
    };
    
    const lower = word.toLowerCase();
    if (irregulars[lower]) {
      return irregulars[lower];
    }
    
    if (word.endsWith('s') || word.endsWith('S')) return word;
    if (word.endsWith('y') && !'aeiou'.includes(word.slice(-2, -1).toLowerCase())) {
      return word.slice(0, -1) + 'ies';
    }
    if (/[sxz]$/.test(word) || /ch$/.test(word) || /sh$/.test(word)) {
      return word + 'es';
    }
    
    return word + 's';
  }
  
  /**
   * Generate parse summary
   */
  private generateSummary(
    properties: CSharpProperty[],
    validations: ValidationIntelligence[],
    navProps: NavigationProperty[],
    businessRules: BusinessRuleIntelligence[],
    complianceFlags: ComplianceFlag[],
    fileType: CSharpFileType,
    xmlDoc: XmlDocumentationResult
  ): CSharpParseSummary {
    const totalValidations = validations.reduce((sum, v) => sum + v.rules.length, 0);
    const hasDataAnnotations = properties.some(p => p.dataAnnotations.length > 0);
    const hasEFCoreAttributes = properties.some(p => 
      p.dataAnnotations.some(a => ['Key', 'ForeignKey', 'InverseProperty', 'Column', 'Table', 'Index'].includes(a.name))
    );
    
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (complianceFlags.length > 0 && !complianceFlags.some(f => f.requiresEncryption)) {
      recommendations.push('Consider adding encryption for PII fields');
    }
    
    if (hasDataAnnotations && !xmlDoc.summary) {
      recommendations.push('Add XML documentation comments for better business context extraction');
    }
    
    if (navProps.length > 0 && !hasEFCoreAttributes) {
      recommendations.push('Consider adding explicit EF Core relationship attributes for clarity');
    }
    
    const complexity = this.calculateComplexity(properties, validations, businessRules);
    
    return {
      totalProperties: properties.length,
      totalValidations,
      totalNavigationProperties: navProps.length,
      totalBusinessRules: businessRules.length,
      totalComplianceFlags: complianceFlags.length,
      hasDataAnnotations,
      hasXmlDocumentation: !!xmlDoc.summary,
      hasEFCoreAttributes,
      inferredPurpose: this.inferPurpose(fileType, properties),
      complexity,
      recommendations,
    };
  }
  
  /**
   * Calculate complexity
   */
  private calculateComplexity(
    properties: CSharpProperty[],
    validations: ValidationIntelligence[],
    businessRules: BusinessRuleIntelligence[]
  ): 'low' | 'medium' | 'high' {
    let score = 0;
    
    score += properties.length;
    score += validations.reduce((sum, v) => sum + v.rules.length * 2, 0);
    score += businessRules.length * 3;
    
    if (score > 50) return 'high';
    if (score > 20) return 'medium';
    return 'low';
  }
  
  /**
   * Infer purpose from file type and properties
   */
  private inferPurpose(fileType: CSharpFileType, properties: CSharpProperty[]): string {
    const purposes: Record<CSharpFileType, string> = {
      'model': 'Data entity with validation rules',
      'dto': 'Data transfer object for API communication',
      'viewmodel': 'View-specific data model',
      'controller': 'API endpoint handler',
      'service': 'Business logic service',
      'repository': 'Data access repository',
      'interface': 'Contract definition',
      'enum': 'Enumeration definition',
      'unknown': 'Unknown file type',
    };
    
    return purposes[fileType];
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Parse C# file content
 */
export function parseCSharp(content: string, fileName?: string): CSharpParseResult {
  const parser = new CSharpParserEngine(content, fileName);
  return parser.parse();
}

/**
 * Parse multiple C# files
 */
export function parseCSharpBatch(files: Array<{ name: string; content: string }>): CSharpParseResult[] {
  return files.map(f => parseCSharp(f.content, f.name));
}

// Export default instance
export const csharpParser = {
  parse: parseCSharp,
  parseBatch: parseCSharpBatch,
  CSharpParserEngine,
};
