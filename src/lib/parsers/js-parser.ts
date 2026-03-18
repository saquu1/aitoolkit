// =============================================================================
// JavaScript Intelligence Agent - Extract Frontend Logic & API Calls
// =============================================================================
// Analyzes JavaScript files to extract AJAX calls, event handlers, dependencies
// =============================================================================

/**
 * AJAX/API Call extracted from JavaScript
 */
export interface AjaxCall {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  dataType?: string;
  contentType?: string;
  parameters: JSParameter[];
  successCallback?: string;
  errorCallback?: string;
  isAsync: boolean;
  sourceFile: string;
  lineNumber?: number;
  context: string;
}

/**
 * JavaScript parameter
 */
export interface JSParameter {
  name: string;
  inferredType: string;
  isRequired: boolean;
  defaultValue?: string;
  source: 'url' | 'body' | 'query' | 'header';
}

/**
 * Event handler extracted from JavaScript
 */
export interface EventHandler {
  id: string;
  eventType: string;
  selector: string;
  handlerType: 'inline' | 'jquery' | 'vanilla' | 'anonymous';
  functionName?: string;
  code: string;
  sourceFile: string;
  lineNumber?: number;
}

/**
 * JavaScript library dependency
 */
export interface JSDependency {
  name: string;
  version?: string;
  type: 'cdn' | 'npm' | 'local';
  isDevelopment: boolean;
  sourceFile: string;
}

/**
 * Form validation extracted from JavaScript
 */
export interface JSFormValidation {
  formId?: string;
  formSelector: string;
  rules: ValidationRule[];
  messages: Record<string, string>;
  submitHandler?: string;
  sourceFile: string;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  fieldName: string;
  ruleType: 'required' | 'email' | 'phone' | 'minlength' | 'maxlength' | 'pattern' | 'custom';
  value?: string | number;
  message?: string;
}

/**
 * API Endpoint discovered from JavaScript
 */
export interface DiscoveredAPIEndpoint {
  url: string;
  method: string;
  parameters: JSParameter[];
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  sourceFile: string;
  confidence: number;
}

/**
 * JavaScript Intelligence Result
 */
export interface JSIntelligenceResult {
  fileName: string;
  ajaxCalls: AjaxCall[];
  eventHandlers: EventHandler[];
  dependencies: JSDependency[];
  formValidations: JSFormValidation[];
  discoveredEndpoints: DiscoveredAPIEndpoint[];
  jqueryPlugins: string[];
  bootstrapComponents: string[];
  complexity: number;
}

/**
 * JavaScript Intelligence Agent
 */
export class JSParserEngine {
  /**
   * Analyze JavaScript content
   */
  analyze(content: string, fileName: string): JSIntelligenceResult {
    const ajaxCalls = this.extractAjaxCalls(content, fileName);
    const eventHandlers = this.extractEventHandlers(content, fileName);
    const dependencies = this.extractDependencies(content, fileName);
    const formValidations = this.extractFormValidations(content, fileName);
    const discoveredEndpoints = this.discoverAPIEndpoints(ajaxCalls);
    const jqueryPlugins = this.detectJQueryPlugins(content);
    const bootstrapComponents = this.detectBootstrapComponents(content);
    const complexity = this.calculateComplexity(content);

    return {
      fileName,
      ajaxCalls,
      eventHandlers,
      dependencies,
      formValidations,
      discoveredEndpoints,
      jqueryPlugins,
      bootstrapComponents,
      complexity,
    };
  }

  /**
   * Extract AJAX calls from JavaScript
   */
  private extractAjaxCalls(content: string, fileName: string): AjaxCall[] {
    const calls: AjaxCall[] = [];
    let idCounter = 1;

    // jQuery AJAX patterns
    const jqueryPatterns = [
      // $.ajax({ ... })
      /\$\.ajax\s*\(\s*\{([^}]+)\}/gi,
      // $.get(url, data, success)
      /\$\.get\s*\(\s*['"]([^'"]+)['"]/gi,
      // $.post(url, data, success)
      /\$\.post\s*\(\s*['"]([^'"]+)['"]/gi,
      // $.getJSON(url, data, success)
      /\$\.getJSON\s*\(\s*['"]([^'"]+)['"]/gi,
    ];

    // Pattern 1: $.ajax({ url: "...", method: "..." })
    const ajaxRegex = /\$\.ajax\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;
    let match;
    while ((match = ajaxRegex.exec(content)) !== null) {
      const ajaxBody = match[1];
      
      const urlMatch = ajaxBody.match(/url\s*:\s*['"]([^'"]+)['"]/i);
      const methodMatch = ajaxBody.match(/(?:type|method)\s*:\s*['"]([^'"]+)['"]/i);
      const dataTypeMatch = ajaxBody.match(/dataType\s*:\s*['"]([^'"]+)['"]/i);
      const contentTypeMatch = ajaxBody.match(/contentType\s*:\s*['"]([^'"]+)['"]/i);
      const asyncMatch = ajaxBody.match(/async\s*:\s*(true|false)/i);
      
      if (urlMatch) {
        const parameters = this.extractAjaxParameters(ajaxBody);
        
        calls.push({
          id: `ajax-${idCounter++}`,
          url: urlMatch[1],
          method: (methodMatch?.[1]?.toUpperCase() || 'GET') as AjaxCall['method'],
          dataType: dataTypeMatch?.[1],
          contentType: contentTypeMatch?.[1],
          parameters,
          successCallback: this.extractSuccessCallback(ajaxBody),
          errorCallback: this.extractErrorCallback(ajaxBody),
          isAsync: asyncMatch ? asyncMatch[1] === 'true' : true,
          sourceFile: fileName,
          context: this.getSurroundingContext(content, match.index, 100),
        });
      }
    }

    // Pattern 2: $.get(url, ...)
    const getRegex = /\$\.get\s*\(\s*['"]([^'"]+)['"]\s*(?:,([^)]+))?/gi;
    while ((match = getRegex.exec(content)) !== null) {
      calls.push({
        id: `ajax-${idCounter++}`,
        url: match[1],
        method: 'GET',
        parameters: match[2] ? this.parseDataParameter(match[2]) : [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 3: $.post(url, ...)
    const postRegex = /\$\.post\s*\(\s*['"]([^'"]+)['"]\s*(?:,([^)]+))?/gi;
    while ((match = postRegex.exec(content)) !== null) {
      calls.push({
        id: `ajax-${idCounter++}`,
        url: match[1],
        method: 'POST',
        parameters: match[2] ? this.parseDataParameter(match[2]) : [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 4: fetch API
    const fetchRegex = /fetch\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{([^}]+)\})?/gi;
    while ((match = fetchRegex.exec(content)) !== null) {
      const options = match[2] || '';
      const methodMatch = options.match(/method\s*:\s*['"]([^'"]+)['"]/i);
      
      calls.push({
        id: `fetch-${idCounter++}`,
        url: match[1],
        method: (methodMatch?.[1]?.toUpperCase() || 'GET') as AjaxCall['method'],
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 5: XMLHttpRequest
    const xhrRegex = /\.open\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/gi;
    while ((match = xhrRegex.exec(content)) !== null) {
      calls.push({
        id: `xhr-${idCounter++}`,
        url: match[2],
        method: match[1].toUpperCase() as AjaxCall['method'],
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    return calls;
  }

  /**
   * Extract parameters from AJAX body
   */
  private extractAjaxParameters(ajaxBody: string): JSParameter[] {
    const parameters: JSParameter[] = [];
    
    const dataMatch = ajaxBody.match(/data\s*:\s*([^\n,]+)/i);
    if (dataMatch) {
      const dataValue = dataMatch[1].trim();
      
      // Object literal: { key: value }
      if (dataValue.startsWith('{')) {
        const propRegex = /(\w+)\s*:\s*([^,}]+)/g;
        let match;
        while ((match = propRegex.exec(dataValue)) !== null) {
          parameters.push({
            name: match[1],
            inferredType: 'unknown',
            isRequired: false,
            source: 'body',
          });
        }
      }
      
      // JSON.stringify(...)
      if (dataValue.includes('JSON.stringify')) {
        parameters.push({
          name: 'body',
          inferredType: 'object',
          isRequired: true,
          source: 'body',
        });
      }
      
      // FormData
      if (dataValue.includes('FormData')) {
        parameters.push({
          name: 'formData',
          inferredType: 'FormData',
          isRequired: true,
          source: 'body',
        });
      }
      
      // Variable reference
      if (/^\$\('#\w+'\)/.test(dataValue)) {
        parameters.push({
          name: 'serializedForm',
          inferredType: 'object',
          isRequired: true,
          source: 'body',
        });
      }
    }
    
    return parameters;
  }

  /**
   * Extract success callback name
   */
  private extractSuccessCallback(ajaxBody: string): string | undefined {
    const successMatch = ajaxBody.match(/success\s*:\s*(?:function\s*\w*\s*\(|(\w+))/i);
    return successMatch?.[1];
  }

  /**
   * Extract error callback name
   */
  private extractErrorCallback(ajaxBody: string): string | undefined {
    const errorMatch = ajaxBody.match(/error\s*:\s*(?:function\s*\w*\s*\(|(\w+))/i);
    return errorMatch?.[1];
  }

  /**
   * Parse data parameter
   */
  private parseDataParameter(dataStr: string): JSParameter[] {
    const parameters: JSParameter[] = [];
    
    // Try to extract object properties
    const propRegex = /(\w+)\s*:/g;
    let match;
    while ((match = propRegex.exec(dataStr)) !== null) {
      parameters.push({
        name: match[1],
        inferredType: 'unknown',
        isRequired: false,
        source: 'body',
      });
    }
    
    return parameters;
  }

  /**
   * Extract event handlers
   */
  private extractEventHandlers(content: string, fileName: string): EventHandler[] {
    const handlers: EventHandler[] = [];
    let idCounter = 1;

    // jQuery event bindings
    const jqueryEventRegex = /\$\(([^)]+)\)\.(?:on|bind|live|one)\s*\(\s*['"](\w+)['"]\s*(?:,([^,]+))?\s*(?:,?\s*(?:function\s*\w*\s*\(|\s*\{))/gi;
    let match;
    while ((match = jqueryEventRegex.exec(content)) !== null) {
      handlers.push({
        id: `handler-${idCounter++}`,
        eventType: match[2],
        selector: match[1].replace(/['"]/g, ''),
        handlerType: 'jquery',
        code: this.extractHandlerCode(content, match.index),
        sourceFile: fileName,
      });
    }

    // jQuery shorthand methods
    const shorthandEvents = ['click', 'change', 'submit', 'focus', 'blur', 'keyup', 'keydown', 'hover', 'toggle'];
    for (const event of shorthandEvents) {
      const shorthandRegex = new RegExp(`\\$\\(([^)]+)\\)\\.${event}\\s*\\(\\s*(?:function|["'])`, 'gi');
      while ((match = shorthandRegex.exec(content)) !== null) {
        handlers.push({
          id: `handler-${idCounter++}`,
          eventType: event,
          selector: match[1].replace(/['"]/g, ''),
          handlerType: 'jquery',
          code: this.extractHandlerCode(content, match.index),
          sourceFile: fileName,
        });
      }
    }

    // Vanilla addEventListener
    const vanillaRegex = /(?:document|window|[\w]+)\.addEventListener\s*\(\s*['"](\w+)['"]\s*,\s*(?:function\s*(\w+)|(\w+))/gi;
    while ((match = vanillaRegex.exec(content)) !== null) {
      handlers.push({
        id: `handler-${idCounter++}`,
        eventType: match[1],
        selector: 'document',
        handlerType: 'vanilla',
        functionName: match[2] || match[3],
        code: this.extractHandlerCode(content, match.index),
        sourceFile: fileName,
      });
    }

    // Inline event handlers (onclick="...")
    const inlineRegex = /on(\w+)\s*=\s*["']([^"']+)["']/gi;
    while ((match = inlineRegex.exec(content)) !== null) {
      handlers.push({
        id: `handler-${idCounter++}`,
        eventType: match[1],
        selector: 'inline',
        handlerType: 'inline',
        code: match[2],
        sourceFile: fileName,
      });
    }

    return handlers;
  }

  /**
   * Extract handler code
   */
  private extractHandlerCode(content: string, startIndex: number): string {
    // Find the function body
    const funcStart = content.indexOf('{', startIndex);
    if (funcStart === -1) return '';
    
    let depth = 1;
    let pos = funcStart + 1;
    
    while (depth > 0 && pos < content.length) {
      if (content[pos] === '{') depth++;
      if (content[pos] === '}') depth--;
      pos++;
    }
    
    return content.substring(funcStart + 1, pos - 1).trim().substring(0, 500); // Limit code length
  }

  /**
   * Extract JavaScript dependencies
   */
  private extractDependencies(content: string, fileName: string): JSDependency[] {
    const dependencies: JSDependency[] = [];

    // Script tags (for inline script context)
    const scriptTagRegex = /<script\s+src=["']([^"']+)["']/gi;
    let match;
    while ((match = scriptTagRegex.exec(content)) !== null) {
      const src = match[1];
      dependencies.push({
        name: this.extractLibraryName(src),
        version: this.extractVersion(src),
        type: src.includes('cdn') || src.includes('http') ? 'cdn' : 'local',
        isDevelopment: false,
        sourceFile: fileName,
      });
    }

    // AMD/CommonJS requires
    const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/gi;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push({
        name: match[1],
        type: 'npm',
        isDevelopment: false,
        sourceFile: fileName,
      });
    }

    // ES6 imports
    const importRegex = /import\s+.*?\s+from\s+["']([^"']+)["']/gi;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push({
        name: match[1],
        type: match[1].startsWith('.') ? 'local' : 'npm',
        isDevelopment: false,
        sourceFile: fileName,
      });
    }

    return dependencies;
  }

  /**
   * Extract library name from URL
   */
  private extractLibraryName(url: string): string {
    const match = url.match(/\/([^\/]+)(?:\.min)?\.js$/i);
    return match ? match[1] : url;
  }

  /**
   * Extract version from URL
   */
  private extractVersion(url: string): string | undefined {
    const match = url.match(/(\d+\.\d+\.\d+|\d+\.\d+)/);
    return match?.[1];
  }

  /**
   * Extract form validations
   */
  private extractFormValidations(content: string, fileName: string): JSFormValidation[] {
    const validations: JSFormValidation[] = [];

    // jQuery Validation plugin
    const validateRegex = /\$\(([^)]+)\)\.validate\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;
    let match;
    while ((match = validateRegex.exec(content)) !== null) {
      const formSelector = match[1];
      const validateBody = match[2];
      
      const rules = this.extractValidationRules(validateBody);
      const messages = this.extractValidationMessages(validateBody);
      
      validations.push({
        formSelector: formSelector.replace(/['"]/g, ''),
        rules,
        messages,
        sourceFile: fileName,
      });
    }

    return validations;
  }

  /**
   * Extract validation rules from validate body
   */
  private extractValidationRules(validateBody: string): ValidationRule[] {
    const rules: ValidationRule[] = [];
    
    const rulesMatch = validateBody.match(/rules\s*:\s*\{([\s\S]*?)\}/i);
    if (rulesMatch) {
      const rulesBody = rulesMatch[1];
      
      // Match field: { rule: value }
      const fieldRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
      let match;
      while ((match = fieldRegex.exec(rulesBody)) !== null) {
        const fieldName = match[1];
        const fieldRules = match[2];
        
        const ruleTypes = ['required', 'email', 'url', 'date', 'number', 'digits', 'minlength', 'maxlength', 'min', 'max', 'pattern'];
        for (const ruleType of ruleTypes) {
          const ruleRegex = new RegExp(`${ruleType}\\s*:\\s*(true|false|\\d+|["'][^"']+["'])`, 'i');
          const ruleMatch = fieldRules.match(ruleRegex);
          if (ruleMatch) {
            rules.push({
              fieldName,
              ruleType: ruleType as ValidationRule['ruleType'],
              value: ruleMatch[1].replace(/['"]/g, ''),
            });
          }
        }
      }
    }
    
    return rules;
  }

  /**
   * Extract validation messages
   */
  private extractValidationMessages(validateBody: string): Record<string, string> {
    const messages: Record<string, string> = {};
    
    const messagesMatch = validateBody.match(/messages\s*:\s*\{([\s\S]*?)\}/i);
    if (messagesMatch) {
      const msgBody = messagesMatch[1];
      const msgRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
      let match;
      while ((match = msgRegex.exec(msgBody)) !== null) {
        const fieldName = match[1];
        const fieldMsgs = match[2];
        const ruleMsgRegex = /(\w+)\s*:\s*["']([^"']+)["']/g;
        let msgMatch;
        while ((msgMatch = ruleMsgRegex.exec(fieldMsgs)) !== null) {
          messages[`${fieldName}.${msgMatch[1]}`] = msgMatch[2];
        }
      }
    }
    
    return messages;
  }

  /**
   * Discover API endpoints from AJAX calls
   */
  private discoverAPIEndpoints(ajaxCalls: AjaxCall[]): DiscoveredAPIEndpoint[] {
    return ajaxCalls.map(call => ({
      url: call.url,
      method: call.method,
      parameters: call.parameters,
      sourceFile: call.sourceFile,
      confidence: call.url.startsWith('/') || call.url.startsWith('http') ? 90 : 60,
    }));
  }

  /**
   * Detect jQuery plugins in use
   */
  private detectJQueryPlugins(content: string): string[] {
    const plugins: string[] = [];
    
    const pluginPatterns = [
      { name: 'jQuery Mask', pattern: /\$\(.*\)\.mask\s*\(/i },
      { name: 'jQuery UI', pattern: /\$\(.*\)\.(datepicker|accordion|tabs|dialog|sortable|draggable|droppable)\s*\(/i },
      { name: 'DataTables', pattern: /\$\(.*\)\.DataTable\s*\(/i },
      { name: 'Select2', pattern: /\$\(.*\)\.select2\s*\(/i },
      { name: 'jQuery Validate', pattern: /\$\(.*\)\.validate\s*\(/i },
      { name: 'jQuery Form', pattern: /\$\(.*\)\.ajaxForm\s*\(/i },
      { name: 'SweetAlert', pattern: /swal\s*\(|SweetAlert/i },
      { name: 'Toastr', pattern: /toastr\.(success|error|warning|info)\s*\(/i },
      { name: 'Moment.js', pattern: /moment\s*\(/i },
      { name: 'Lodash', pattern: /_\.\w+\s*\(/i },
      { name: 'Chart.js', pattern: /new\s+Chart\s*\(/i },
      { name: 'Knockout', pattern: /ko\.(applyBindings|observable|computed)\s*\(/i },
      { name: 'Bootstrap Modal', pattern: /\$\(.*\)\.modal\s*\(/i },
      { name: 'Bootstrap Tooltip', pattern: /\$\(.*\)\.tooltip\s*\(/i },
      { name: 'Bootstrap Popover', pattern: /\$\(.*\)\.popover\s*\(/i },
    ];
    
    for (const { name, pattern } of pluginPatterns) {
      if (pattern.test(content)) {
        plugins.push(name);
      }
    }
    
    return plugins;
  }

  /**
   * Detect Bootstrap components
   */
  private detectBootstrapComponents(content: string): string[] {
    const components: string[] = [];
    
    const componentPatterns = [
      { name: 'Modal', pattern: /class="[^"]*modal[^"]*"|data-toggle="modal"/i },
      { name: 'Dropdown', pattern: /class="[^"]*dropdown[^"]*"|data-toggle="dropdown"/i },
      { name: 'Tabs', pattern: /class="[^"]*nav-tabs[^"]*"|data-toggle="tab"/i },
      { name: 'Accordion', pattern: /class="[^"]*accordion[^"]*"|data-toggle="collapse"/i },
      { name: 'Carousel', pattern: /class="[^"]*carousel[^"]*"|data-ride="carousel"/i },
      { name: 'Alert', pattern: /class="[^"]*alert[^"]*"/i },
      { name: 'Button Group', pattern: /class="[^"]*btn-group[^"]*"/i },
      { name: 'Navbar', pattern: /class="[^"]*navbar[^"]*"/i },
      { name: 'Card', pattern: /class="[^"]*card[^"]*"/i },
      { name: 'Badge', pattern: /class="[^"]*badge[^"]*"/i },
    ];
    
    for (const { name, pattern } of componentPatterns) {
      if (pattern.test(content)) {
        components.push(name);
      }
    }
    
    return components;
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(content: string): number {
    let score = 0;
    
    score += (content.match(/\bfunction\b/gi) || []).length * 2;
    score += (content.match(/\bif\b/gi) || []).length;
    score += (content.match(/\bfor\b/gi) || []).length * 2;
    score += (content.match(/\bwhile\b/gi) || []).length * 2;
    score += (content.match(/\bswitch\b/gi) || []).length * 3;
    score += (content.match(/\btry\b/gi) || []).length * 3;
    score += (content.match(/\$\.\w+\s*\(/g) || []).length;
    
    return score;
  }

  /**
   * Get surrounding context for a match
   */
  private getSurroundingContext(content: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end);
  }
}

// Export singleton
export const jsParser = new JSParserEngine();
