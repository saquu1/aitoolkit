// =============================================================================
// Enhanced JavaScript Intelligence Agent - Complete Frontend Logic Extraction
// =============================================================================
// Advanced analysis of JavaScript, jQuery, AJAX, and modern JS patterns
// Works alongside CSHTML parser for comprehensive frontend intelligence
// =============================================================================

import { AjaxCall, JSParameter, EventHandler, JSDependency, JSFormValidation, ValidationRule, DiscoveredAPIEndpoint } from './js-parser';

/**
 * jQuery Chain Operation
 */
export interface JQueryChain {
  selector: string;
  operations: JQueryOperation[];
  context: string;
  sourceFile: string;
  lineNumber?: number;
}

/**
 * jQuery Operation in chain
 */
export interface JQueryOperation {
  method: string;
  arguments: string[];
  isEventBinder: boolean;
  isAjax: boolean;
  isDOMManipulation: boolean;
  isAnimation: boolean;
}

/**
 * Event Delegation Pattern
 */
export interface EventDelegation {
  parentSelector: string;
  childSelector: string;
  eventType: string;
  handlerCode: string;
  sourceFile: string;
}

/**
 * Template Literal URL
 */
export interface TemplateLiteralURL {
  template: string;
  variables: string[];
  resolvedExample: string;
  context: string;
  sourceFile: string;
}

/**
 * Computed Property Access
 */
export interface ComputedProperty {
  object: string;
  propertyExpression: string;
  inferredProperties: string[];
  context: string;
  sourceFile: string;
}

/**
 * Dynamic Selector
 */
export interface DynamicSelector {
  pattern: string;
  variablePart: string;
  inferredTargets: string[];
  usage: string;
  sourceFile: string;
}

/**
 * AJAX Request Interceptor
 */
export interface AjaxInterceptor {
  type: 'prefilter' | 'ajaxSetup' | 'transport' | 'custom';
  configuration: Record<string, unknown>;
  affectsAll: boolean;
  sourceFile: string;
}

/**
 * Promise/Async Pattern
 */
export interface AsyncPattern {
  type: 'promise' | 'async-await' | 'callback' | 'event';
  code: string;
  relatedEndpoint?: string;
  sourceFile: string;
}

/**
 * DOM Ready Pattern
 */
export interface DOMReadyPattern {
  type: '$(document).ready' | '$(function)' | 'DOMContentLoaded' | 'deferred';
  code: string;
  priority: number;
  sourceFile: string;
}

/**
 * Variable State Tracking
 */
export interface VariableState {
  name: string;
  scope: 'global' | 'function' | 'block';
  assignedValues: string[];
  usedIn: string[];
  isAjaxRelated: boolean;
  sourceFile: string;
}

/**
 * Enhanced JavaScript Intelligence Result
 */
export interface EnhancedJSIntelligenceResult {
  // From base parser
  ajaxCalls: AjaxCall[];
  eventHandlers: EventHandler[];
  dependencies: JSDependency[];
  formValidations: JSFormValidation[];
  discoveredEndpoints: DiscoveredAPIEndpoint[];
  jqueryPlugins: string[];
  bootstrapComponents: string[];
  complexity: number;
  
  // Enhanced results
  jqueryChains: JQueryChain[];
  eventDelegations: EventDelegation[];
  templateLiteralURLs: TemplateLiteralURL[];
  computedProperties: ComputedProperty[];
  dynamicSelectors: DynamicSelector[];
  ajaxInterceptors: AjaxInterceptor[];
  asyncPatterns: AsyncPattern[];
  domReadyPatterns: DOMReadyPattern[];
  variableStates: VariableState[];
  
  // Summary
  summary: {
    totalEndpoints: number;
    totalEventHandlers: number;
    totalJQueryOperations: number;
    ajaxComplexity: 'low' | 'medium' | 'high';
    usesModernJS: boolean;
    usesjQuery: boolean;
    potentialIssues: string[];
  };
}

/**
 * Enhanced JavaScript Intelligence Agent
 */
export class EnhancedJSParserEngine {
  private fileName: string;

  constructor(fileName?: string) {
    this.fileName = fileName || '';
  }

  /**
   * Analyze JavaScript content
   */
  analyze(content: string, fileName?: string): EnhancedJSIntelligenceResult {
    const currentFile = fileName || this.fileName;
    
    // Base analysis
    const ajaxCalls = this.extractAjaxCalls(content, currentFile);
    const eventHandlers = this.extractEventHandlers(content, currentFile);
    const dependencies = this.extractDependencies(content, currentFile);
    const formValidations = this.extractFormValidations(content, currentFile);
    const discoveredEndpoints = this.discoverAPIEndpoints(ajaxCalls);
    const jqueryPlugins = this.detectJQueryPlugins(content);
    const bootstrapComponents = this.detectBootstrapComponents(content);
    const complexity = this.calculateComplexity(content);
    
    // Enhanced analysis
    const jqueryChains = this.extractJQueryChains(content, currentFile);
    const eventDelegations = this.extractEventDelegations(content, currentFile);
    const templateLiteralURLs = this.extractTemplateLiteralURLs(content, currentFile);
    const computedProperties = this.extractComputedProperties(content, currentFile);
    const dynamicSelectors = this.extractDynamicSelectors(content, currentFile);
    const ajaxInterceptors = this.extractAjaxInterceptors(content, currentFile);
    const asyncPatterns = this.extractAsyncPatterns(content, currentFile);
    const domReadyPatterns = this.extractDOMReadyPatterns(content, currentFile);
    const variableStates = this.extractVariableStates(content, currentFile);
    
    // Generate summary
    const summary = this.generateSummary(
      ajaxCalls, eventHandlers, jqueryChains, templateLiteralURLs, 
      asyncPatterns, content
    );

    return {
      ajaxCalls,
      eventHandlers,
      dependencies,
      formValidations,
      discoveredEndpoints,
      jqueryPlugins,
      bootstrapComponents,
      complexity,
      jqueryChains,
      eventDelegations,
      templateLiteralURLs,
      computedProperties,
      dynamicSelectors,
      ajaxInterceptors,
      asyncPatterns,
      domReadyPatterns,
      variableStates,
      summary,
    };
  }

  /**
   * Extract AJAX calls (enhanced)
   */
  private extractAjaxCalls(content: string, fileName: string): AjaxCall[] {
    const calls: AjaxCall[] = [];
    let idCounter = 1;

    // Pattern 1: $.ajax({ ... }) with proper brace matching
    const ajaxMatches = this.findAjaxBlocks(content);
    for (const block of ajaxMatches) {
      const ajaxBody = block.body;
      
      // Extract URL (handle template literals)
      const urlMatch = ajaxBody.match(/url\s*:\s*["'`]([^"'`]+)["'`]/);
      const templateUrlMatch = ajaxBody.match(/url\s*:\s*`([^`]+)`/);
      
      let url = urlMatch?.[1] || '';
      
      // Handle template literal URLs
      if (templateUrlMatch) {
        const template = templateUrlMatch[1];
        url = this.resolveTemplateLiteral(template);
      }

      const methodMatch = ajaxBody.match(/(?:type|method)\s*:\s*["'](\w+)["']/i);
      const dataTypeMatch = ajaxBody.match(/dataType\s*:\s*["'](\w+)["']/i);
      const contentTypeMatch = ajaxBody.match(/contentType\s*:\s*["']([^"']+)["']/i);
      const asyncMatch = ajaxBody.match(/async\s*:\s*(true|false)/i);
      
      if (url) {
        const parameters = this.extractAjaxParameters(ajaxBody);
        
        calls.push({
          id: `ajax-${idCounter++}`,
          url,
          method: (methodMatch?.[1]?.toUpperCase() || 'GET') as AjaxCall['method'],
          dataType: dataTypeMatch?.[1],
          contentType: contentTypeMatch?.[1],
          parameters,
          successCallback: this.extractSuccessCallback(ajaxBody),
          errorCallback: this.extractErrorCallback(ajaxBody),
          isAsync: asyncMatch ? asyncMatch[1] === 'true' : true,
          sourceFile: fileName,
          context: block.context,
        });
      }
    }

    // Pattern 2: $.get(url, ...)
    const getRegex = /\$\s*\.\s*get\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    let match;
    while ((match = getRegex.exec(content)) !== null) {
      calls.push({
        id: `ajax-${idCounter++}`,
        url: match[1],
        method: 'GET',
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 3: $.post(url, ...)
    const postRegex = /\$\s*\.\s*post\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((match = postRegex.exec(content)) !== null) {
      calls.push({
        id: `ajax-${idCounter++}`,
        url: match[1],
        method: 'POST',
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 4: $.getJSON(url, ...)
    const getJsonRegex = /\$\s*\.\s*getJSON\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((match = getJsonRegex.exec(content)) !== null) {
      calls.push({
        id: `ajax-${idCounter++}`,
        url: match[1],
        method: 'GET',
        dataType: 'json',
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 5: fetch API with template literals
    const fetchRegex = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((match = fetchRegex.exec(content)) !== null) {
      calls.push({
        id: `fetch-${idCounter++}`,
        url: match[1],
        method: 'GET',
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 6: fetch with variable URL
    const fetchVarRegex = /fetch\s*\(\s*(\w+(?:\.\w+|\[[^\]]+\])*)/gi;
    while ((match = fetchVarRegex.exec(content)) !== null) {
      const variable = match[1];
      // Try to find the variable assignment
      const urlValue = this.resolveVariableURL(content, variable);
      
      if (urlValue) {
        calls.push({
          id: `fetch-var-${idCounter++}`,
          url: urlValue,
          method: 'GET',
          parameters: [],
          isAsync: true,
          sourceFile: fileName,
          context: `Variable: ${variable}`,
        });
      }
    }

    // Pattern 7: XMLHttpRequest
    const xhrRegex = /\.open\s*\(\s*["'](\w+)["']\s*,\s*["'`]([^"'`]+)["'`]/gi;
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

    // Pattern 8: axios
    const axiosRegex = /axios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((match = axiosRegex.exec(content)) !== null) {
      calls.push({
        id: `axios-${idCounter++}`,
        url: match[2],
        method: match[1].toUpperCase() as AjaxCall['method'],
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: this.getSurroundingContext(content, match.index, 100),
      });
    }

    // Pattern 9: $.load for partial content
    const loadRegex = /\$\(([^)]+)\)\.load\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((match = loadRegex.exec(content)) !== null) {
      calls.push({
        id: `load-${idCounter++}`,
        url: match[2],
        method: 'GET',
        parameters: [],
        isAsync: true,
        sourceFile: fileName,
        context: `jQuery.load on ${match[1]}`,
      });
    }

    // Pattern 10: Form serialization with AJAX
    const formAjaxRegex = /\$\(([^)]+)\)\.ajaxForm\s*\(\s*\{([^}]+)\}/gi;
    while ((match = formAjaxRegex.exec(content)) !== null) {
      const formSelector = match[1];
      const configBody = match[2];
      const urlMatch = configBody.match(/url\s*:\s*["'`]([^"'`]+)["'`]/);
      
      if (urlMatch) {
        calls.push({
          id: `form-ajax-${idCounter++}`,
          url: urlMatch[1],
          method: 'POST',
          parameters: [],
          isAsync: true,
          isFormData: true,
          sourceFile: fileName,
          context: `jQuery.ajaxForm on ${formSelector}`,
        });
      }
    }

    return this.deduplicateCalls(calls);
  }

  /**
   * Find AJAX blocks with proper brace matching
   */
  private findAjaxBlocks(content: string): Array<{ body: string; context: string }> {
    const blocks: Array<{ body: string; context: string }> = [];
    
    const patterns = [
      /\$\s*\.\s*ajax\s*\(\s*\{/gi,
      /jQuery\s*\.\s*ajax\s*\(\s*\{/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const startIndex = match.index + match[0].length;
        const body = this.extractBalancedBraces(content, startIndex - 1);
        
        blocks.push({
          body: body.slice(1, -1), // Remove outer braces
          context: this.getSurroundingContext(content, match.index, 150),
        });
      }
    }

    return blocks;
  }

  /**
   * Extract balanced braces
   */
  private extractBalancedBraces(content: string, startIndex: number): string {
    let braceCount = 0;
    let started = false;
    let pos = startIndex;
    
    while (pos < content.length) {
      if (content[pos] === '{') {
        braceCount++;
        started = true;
      } else if (content[pos] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          return content.substring(startIndex, pos + 1);
        }
      }
      pos++;
    }
    
    return '';
  }

  /**
   * Resolve template literal URL
   */
  private resolveTemplateLiteral(template: string): string {
    // Replace ${variable} with placeholder
    return template.replace(/\$\{[^}]+\}/g, ':param');
  }

  /**
   * Resolve variable URL from content
   */
  private resolveVariableURL(content: string, variable: string): string | undefined {
    // Look for const/let/var assignment
    const escapedVar = variable.replace(/\./g, '\\.');
    const regex = new RegExp('(?:const|let|var)\\s+' + escapedVar + '\\s*=\\s*["\'`]([^"\'`]+)["\'`]');
    const match = content.match(regex);
    return match?.[1];
  }

  /**
   * Extract parameters from AJAX body (enhanced)
   */
  private extractAjaxParameters(ajaxBody: string): JSParameter[] {
    const parameters: JSParameter[] = [];
    
    const dataMatch = ajaxBody.match(/data\s*:\s*([^\n,}]+)/i);
    if (dataMatch) {
      const dataValue = dataMatch[1].trim();
      
      // Object literal: { key: value }
      if (dataValue.startsWith('{')) {
        const objBody = this.extractBalancedBraces('{ ' + dataValue, 0);
        const propRegex = /(\w+)\s*:\s*([^,}]+)/g;
        let match;
        while ((match = propRegex.exec(objBody)) !== null) {
          parameters.push({
            name: match[1],
            inferredType: this.inferTypeFromValue(match[2]),
            isRequired: false,
            source: 'body',
          });
        }
      }
      
      // JSON.stringify(...)
      if (dataValue.includes('JSON.stringify')) {
        const innerMatch = dataValue.match(/JSON\.stringify\s*\(\s*(\w+)/);
        if (innerMatch) {
          parameters.push({
            name: 'body',
            inferredType: 'object',
            isRequired: true,
            source: 'body',
          });
        }
      }
      
      // FormData
      if (dataValue.includes('FormData') || dataValue.includes('new FormData')) {
        parameters.push({
          name: 'formData',
          inferredType: 'FormData',
          isRequired: true,
          source: 'body',
        });
      }
      
      // Form serialization: $(form).serialize()
      if (dataValue.includes('.serialize()')) {
        parameters.push({
          name: 'serializedForm',
          inferredType: 'string',
          isRequired: true,
          source: 'body',
        });
      }
      
      // $(form).serializeArray()
      if (dataValue.includes('.serializeArray()')) {
        parameters.push({
          name: 'serializedArray',
          inferredType: 'array',
          isRequired: true,
          source: 'body',
        });
      }
      
      // Variable reference
      if (/^\w+$/.test(dataValue)) {
        parameters.push({
          name: dataValue,
          inferredType: 'unknown',
          isRequired: true,
          source: 'body',
        });
      }
    }

    return parameters;
  }

  /**
   * Infer type from value expression
   */
  private inferTypeFromValue(value: string): string {
    const trimmed = value.trim();
    
    if (/^["']/.test(trimmed)) return 'string';
    if (/^\d+$/.test(trimmed)) return 'number';
    if (/^(true|false)$/.test(trimmed)) return 'boolean';
    if (/^\[/.test(trimmed)) return 'array';
    if (/^\{/.test(trimmed)) return 'object';
    if (/null/.test(trimmed)) return 'null';
    if (/function/.test(trimmed)) return 'function';
    
    return 'unknown';
  }

  /**
   * Extract success callback
   */
  private extractSuccessCallback(ajaxBody: string): string | undefined {
    const successMatch = ajaxBody.match(/success\s*:\s*(?:function\s*(\w*)|(\w+))/i);
    return successMatch?.[1] || successMatch?.[2];
  }

  /**
   * Extract error callback
   */
  private extractErrorCallback(ajaxBody: string): string | undefined {
    const errorMatch = ajaxBody.match(/error\s*:\s*(?:function\s*(\w*)|(\w+))/i);
    return errorMatch?.[1] || errorMatch?.[2];
  }

  /**
   * Deduplicate AJAX calls
   */
  private deduplicateCalls(calls: AjaxCall[]): AjaxCall[] {
    const seen = new Set<string>();
    return calls.filter(call => {
      const key = `${call.method}:${call.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Extract event handlers (enhanced)
   */
  private extractEventHandlers(content: string, fileName: string): EventHandler[] {
    const handlers: EventHandler[] = [];
    let idCounter = 1;

    // jQuery event bindings with .on()
    const onRegex = /\$\(([^)]+)\)\s*\.\s*on\s*\(\s*["'](\w+)["']\s*(?:,\s*["']([^"']+)["']\s*)?(?:,?\s*(?:function\s*(\w*)\s*\(|\s*\{|\s*\w+))/gi;
    let match;
    while ((match = onRegex.exec(content)) !== null) {
      handlers.push({
        id: `handler-${idCounter++}`,
        eventType: match[2],
        selector: match[1].replace(/["']/g, ''),
        handlerType: 'jquery',
        functionName: match[4],
        code: this.extractHandlerCode(content, match.index),
        sourceFile: fileName,
      });
    }

    // jQuery shorthand methods
    const shorthandEvents = ['click', 'change', 'submit', 'focus', 'blur', 'keyup', 'keydown', 
                            'keypress', 'hover', 'toggle', 'mouseenter', 'mouseleave', 
                            'mousedown', 'mouseup', 'dblclick', 'scroll', 'resize'];
    
    for (const event of shorthandEvents) {
      const shorthandRegex = new RegExp(
        `\\$\\(([^)]+)\\)\\s*\\.${event}\\s*\\(\\s*(?:function|["']|\\w+\\s*\\(|\\{)`,
        'gi'
      );
      while ((match = shorthandRegex.exec(content)) !== null) {
        handlers.push({
          id: `handler-${idCounter++}`,
          eventType: event,
          selector: match[1].replace(/["']/g, ''),
          handlerType: 'jquery',
          code: this.extractHandlerCode(content, match.index),
          sourceFile: fileName,
        });
      }
    }

    // Vanilla addEventListener
    const vanillaRegex = /(?:document|window|[\w]+)\.addEventListener\s*\(\s*["'](\w+)["']\s*,\s*(?:function\s*(\w*)|(\w+))/gi;
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

    // Inline event handlers (onclick="...", onchange="...")
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

    // jQuery one() - one-time event
    const oneRegex = /\$\(([^)]+)\)\s*\.\s*one\s*\(\s*["'](\w+)["']/gi;
    while ((match = oneRegex.exec(content)) !== null) {
      handlers.push({
        id: `handler-${idCounter++}`,
        eventType: match[2],
        selector: match[1].replace(/["']/g, ''),
        handlerType: 'jquery',
        code: this.extractHandlerCode(content, match.index),
        sourceFile: fileName,
      });
    }

    // trigger() - programmatically triggered events
    const triggerRegex = /\$\(([^)]+)\)\s*\.\s*trigger\s*\(\s*["'](\w+)["']/gi;
    while ((match = triggerRegex.exec(content)) !== null) {
      handlers.push({
        id: `trigger-${idCounter++}`,
        eventType: `trigger:${match[2]}`,
        selector: match[1].replace(/["']/g, ''),
        handlerType: 'jquery',
        code: `Triggers ${match[2]} event`,
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
      else if (content[pos] === '}') depth--;
      pos++;
    }
    
    return content.substring(funcStart + 1, pos - 1).trim().substring(0, 500);
  }

  /**
   * Extract jQuery chains
   */
  private extractJQueryChains(content: string, fileName: string): JQueryChain[] {
    const chains: JQueryChain[] = [];

    // Match jQuery chains: $(selector).method1().method2().method3()
    const chainRegex = /\$\(([^)]+)\)((?:\.\w+\([^)]*\))+)/gi;
    let match;
    
    while ((match = chainRegex.exec(content)) !== null) {
      const selector = match[1].replace(/["']/g, '');
      const chainStr = match[2];
      
      // Parse individual operations
      const operations: JQueryOperation[] = [];
      const opRegex = /\.(\w+)\s*\(([^)]*)\)/g;
      let opMatch;
      
      while ((opMatch = opRegex.exec(chainStr)) !== null) {
        const method = opMatch[1];
        const args = this.parseArguments(opMatch[2]);
        
        operations.push({
          method,
          arguments: args,
          isEventBinder: ['on', 'bind', 'one', 'click', 'change', 'submit', 'hover'].includes(method),
          isAjax: ['load', 'get', 'post', 'ajax', 'getJSON', 'getScript'].includes(method),
          isDOMManipulation: ['html', 'text', 'append', 'prepend', 'after', 'before', 'remove', 'empty', 'val', 'attr', 'prop', 'css', 'addClass', 'removeClass', 'toggleClass'].includes(method),
          isAnimation: ['show', 'hide', 'toggle', 'fadeIn', 'fadeOut', 'fadeToggle', 'slideDown', 'slideUp', 'slideToggle', 'animate'].includes(method),
        });
      }

      if (operations.length > 1) {
        chains.push({
          selector,
          operations,
          context: this.getSurroundingContext(content, match.index, 100),
          sourceFile: fileName,
        });
      }
    }

    return chains;
  }

  /**
   * Parse function arguments
   */
  private parseArguments(argsStr: string): string[] {
    if (!argsStr.trim()) return [];
    
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
      } else if (!inString) {
        if (char === '(' || char === '[' || char === '{') depth++;
        else if (char === ')' || char === ']' || char === '}') depth--;
        else if (char === ',' && depth === 0) {
          args.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      args.push(current.trim());
    }
    
    return args;
  }

  /**
   * Extract event delegations
   */
  private extractEventDelegations(content: string, fileName: string): EventDelegation[] {
    const delegations: EventDelegation[] = [];

    // $(parent).on('event', 'child', handler)
    const regex = /\$\(([^)]+)\)\s*\.\s*on\s*\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']/gi;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      delegations.push({
        parentSelector: match[1].replace(/["']/g, ''),
        childSelector: match[3],
        eventType: match[2],
        handlerCode: this.extractHandlerCode(content, match.index),
        sourceFile: fileName,
      });
    }

    // $(parent).delegate('child', 'event', handler) - deprecated but still used
    const delegateRegex = /\$\(([^)]+)\)\s*\.\s*delegate\s*\(\s*["']([^"']+)["']\s*,\s*["'](\w+)["']/gi;
    while ((match = delegateRegex.exec(content)) !== null) {
      delegations.push({
        parentSelector: match[1].replace(/["']/g, ''),
        childSelector: match[2],
        eventType: match[3],
        handlerCode: this.extractHandlerCode(content, match.index),
        sourceFile: fileName,
      });
    }

    return delegations;
  }

  /**
   * Extract template literal URLs
   */
  private extractTemplateLiteralURLs(content: string, fileName: string): TemplateLiteralURL[] {
    const urls: TemplateLiteralURL[] = [];

    // Find template literals in URL context
    const regex = /(?:url|endpoint|api|href)\s*[=:]\s*`([^`]+)`/gi;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const template = match[1];
      const variables = template.match(/\$\{([^}]+)\}/g)?.map(v => v.slice(2, -1)) || [];
      
      urls.push({
        template,
        variables,
        resolvedExample: template.replace(/\$\{[^}]+\}/g, ':value'),
        context: this.getSurroundingContext(content, match.index, 100),
        sourceFile: fileName,
      });
    }

    // fetch(`...`) with template literal
    const fetchRegex = /fetch\s*\(\s*`([^`]+)`/gi;
    while ((match = fetchRegex.exec(content)) !== null) {
      const template = match[1];
      const variables = template.match(/\$\{([^}]+)\}/g)?.map(v => v.slice(2, -1)) || [];
      
      urls.push({
        template,
        variables,
        resolvedExample: template.replace(/\$\{[^}]+\}/g, ':value'),
        context: 'fetch',
        sourceFile: fileName,
      });
    }

    return urls;
  }

  /**
   * Extract computed properties
   */
  private extractComputedProperties(content: string, fileName: string): ComputedProperty[] {
    const properties: ComputedProperty[] = [];

    // object[expression] patterns
    const regex = /(\w+)\s*\[\s*([^\]]+)\s*\]/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      properties.push({
        object: match[1],
        propertyExpression: match[2],
        inferredProperties: this.inferPropertiesFromContext(content, match[1]),
        context: this.getSurroundingContext(content, match.index, 50),
        sourceFile: fileName,
      });
    }

    return properties;
  }

  /**
   * Infer properties from context
   */
  private inferPropertiesFromContext(content: string, objectName: string): string[] {
    const properties: string[] = [];
    
    // Find property assignments or accesses
    const regex = new RegExp(`${objectName}\\.(\\w+)`, 'g');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (!properties.includes(match[1])) {
        properties.push(match[1]);
      }
    }
    
    return properties.slice(0, 10); // Limit to 10
  }

  /**
   * Extract dynamic selectors
   */
  private extractDynamicSelectors(content: string, fileName: string): DynamicSelector[] {
    const selectors: DynamicSelector[] = [];

    // $('.' + className, '#element-' + id)
    const regex = /\$\(\s*["']([^"']*["']\s*\+\s*\w+|\w+\s*\+\s*["'][^"']*)["']\s*\)/gi;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const pattern = match[1];
      const varMatch = pattern.match(/\w+/g);
      
      selectors.push({
        pattern,
        variablePart: varMatch?.pop() || '',
        inferredTargets: [],
        usage: 'element-selection',
        sourceFile: fileName,
      });
    }

    // Template literal selectors: $(`#${id}`)
    const templateRegex = /\$\(\s*`([^`]+)`\s*\)/gi;
    while ((match = templateRegex.exec(content)) !== null) {
      const template = match[1];
      const variables = template.match(/\$\{([^}]+)\}/g)?.map(v => v.slice(2, -1)) || [];
      
      selectors.push({
        pattern: template,
        variablePart: variables.join(', '),
        inferredTargets: [],
        usage: 'element-selection',
        sourceFile: fileName,
      });
    }

    return selectors;
  }

  /**
   * Extract AJAX interceptors
   */
  private extractAjaxInterceptors(content: string, fileName: string): AjaxInterceptor[] {
    const interceptors: AjaxInterceptor[] = [];

    // $.ajaxPrefilter
    const prefilterRegex = /\$\s*\.\s*ajaxPrefilter\s*\(/gi;
    let match;
    while ((match = prefilterRegex.exec(content)) !== null) {
      interceptors.push({
        type: 'prefilter',
        configuration: {},
        affectsAll: true,
        sourceFile: fileName,
      });
    }

    // $.ajaxSetup
    const setupRegex = /\$\s*\.\s*ajaxSetup\s*\(\s*\{([^}]+)\}/gi;
    while ((match = setupRegex.exec(content)) !== null) {
      const configBody = match[1];
      const config: Record<string, unknown> = {};
      
      const propRegex = /(\w+)\s*:\s*([^,}]+)/g;
      let propMatch;
      while ((propMatch = propRegex.exec(configBody)) !== null) {
        config[propMatch[1]] = propMatch[2].trim();
      }
      
      interceptors.push({
        type: 'ajaxSetup',
        configuration: config,
        affectsAll: true,
        sourceFile: fileName,
      });
    }

    return interceptors;
  }

  /**
   * Extract async patterns
   */
  private extractAsyncPatterns(content: string, fileName: string): AsyncPattern[] {
    const patterns: AsyncPattern[] = [];

    // async/await
    const asyncRegex = /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/gi;
    let match;
    while ((match = asyncRegex.exec(content)) !== null) {
      const body = match[2];
      const endpointMatch = body.match(/await\s+fetch\s*\(\s*["'`]([^"'`]+)/i);
      
      patterns.push({
        type: 'async-await',
        code: `async function ${match[1]}`,
        relatedEndpoint: endpointMatch?.[1],
        sourceFile: fileName,
      });
    }

    // Promise
    const promiseRegex = /new\s+Promise\s*\(\s*function\s*\((\w+,\s*\w+)\)/gi;
    while ((match = promiseRegex.exec(content)) !== null) {
      patterns.push({
        type: 'promise',
        code: `new Promise(${match[1]})`,
        sourceFile: fileName,
      });
    }

    // .then() chains
    const thenRegex = /\.then\s*\(\s*(?:function|(\w+)\s*=>)/gi;
    while ((match = thenRegex.exec(content)) !== null) {
      patterns.push({
        type: 'promise',
        code: '.then() chain',
        sourceFile: fileName,
      });
    }

    return patterns;
  }

  /**
   * Extract DOM ready patterns
   */
  private extractDOMReadyPatterns(content: string, fileName: string): DOMReadyPattern[] {
    const patterns: DOMReadyPattern[] = [];

    // $(document).ready()
    const readyRegex = /\$\s*\(\s*document\s*\)\s*\.\s*ready\s*\(/gi;
    let match;
    while ((readyRegex.exec(content)) !== null) {
      patterns.push({
        type: '$(document).ready',
        code: 'jQuery document ready',
        priority: 1,
        sourceFile: fileName,
      });
    }

    // $(function() {})
    const shortReadyRegex = /\$\s*\(\s*function\s*\(/gi;
    while ((match = shortReadyRegex.exec(content)) !== null) {
      patterns.push({
        type: '$(function)',
        code: 'jQuery short ready',
        priority: 2,
        sourceFile: fileName,
      });
    }

    // DOMContentLoaded
    const domReadyRegex = /addEventListener\s*\(\s*["']DOMContentLoaded["']/gi;
    while ((domReadyRegex.exec(content)) !== null) {
      patterns.push({
        type: 'DOMContentLoaded',
        code: 'DOMContentLoaded event',
        priority: 3,
        sourceFile: fileName,
      });
    }

    return patterns;
  }

  /**
   * Extract variable states
   */
  private extractVariableStates(content: string, fileName: string): VariableState[] {
    const states: VariableState[] = [];
    const seen = new Set<string>();

    // Variable declarations
    const declRegex = /(?:var|let|const)\s+(\w+)\s*=\s*([^;]+)/g;
    let match;
    
    while ((match = declRegex.exec(content)) !== null) {
      const name = match[1];
      if (seen.has(name)) continue;
      seen.add(name);
      
      const value = match[2];
      const isAjaxRelated = /ajax|fetch|XMLHttpRequest|\$\.get|\$\.post/.test(value);
      
      states.push({
        name,
        scope: /var /.test(match[0]) ? 'function' : 'block',
        assignedValues: [value.substring(0, 100)],
        usedIn: [],
        isAjaxRelated,
        sourceFile: fileName,
      });
    }

    return states;
  }

  /**
   * Extract dependencies
   */
  private extractDependencies(content: string, fileName: string): JSDependency[] {
    const dependencies: JSDependency[] = [];

    // Script tags
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
        formSelector: formSelector.replace(/["']/g, ''),
        rules,
        messages,
        sourceFile: fileName,
      });
    }

    return validations;
  }

  /**
   * Extract validation rules
   */
  private extractValidationRules(validateBody: string): ValidationRule[] {
    const rules: ValidationRule[] = [];
    
    const rulesMatch = validateBody.match(/rules\s*:\s*\{([\s\S]*?)\}/i);
    if (rulesMatch) {
      const rulesBody = rulesMatch[1];
      
      const fieldRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
      let match;
      while ((match = fieldRegex.exec(rulesBody)) !== null) {
        const fieldName = match[1];
        const fieldRules = match[2];
        
        const ruleTypes = ['required', 'email', 'url', 'date', 'number', 'digits', 
                          'minlength', 'maxlength', 'min', 'max', 'pattern', 'remote'];
        
        for (const ruleType of ruleTypes) {
          const ruleRegex = new RegExp(`${ruleType}\\s*:\\s*(true|false|\\d+|["'][^"']+["'])`, 'i');
          const ruleMatch = fieldRules.match(ruleRegex);
          if (ruleMatch) {
            rules.push({
              fieldName,
              ruleType: ruleType as ValidationRule['ruleType'],
              value: ruleMatch[1].replace(/["']/g, ''),
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
   * Detect jQuery plugins
   */
  private detectJQueryPlugins(content: string): string[] {
    const plugins: string[] = [];
    
    const pluginPatterns = [
      { name: 'jQuery Mask', pattern: /\$\(.*\)\.mask\s*\(/i },
      { name: 'jQuery UI', pattern: /\$\(.*\)\.(datepicker|accordion|tabs|dialog|sortable|draggable|droppable|autocomplete)\s*\(/i },
      { name: 'DataTables', pattern: /\$\(.*\)\.DataTable\s*\(|\.dataTable\s*\(/i },
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
      { name: 'DateTimePicker', pattern: /\$\(.*\)\.(datetimepicker|datepicker|daterangepicker)\s*\(/i },
      { name: 'TinyMCE', pattern: /tinymce\.(init|get|activeEditor)/i },
      { name: 'CKEditor', pattern: /CKEDITOR\.(replace|instances)/i },
      { name: 'Summernote', pattern: /\$\(.*\)\.summernote\s*\(/i },
      { name: 'Dropzone', pattern: /new\s+Dropzone\s*\(|Dropzone\.autoDiscover/i },
      { name: 'InputMask', pattern: /Inputmask\s*\(|\.inputmask\s*\(/i },
      { name: 'RateYo', pattern: /\$\(.*\)\.rateYo\s*\(/i },
      { name: 'Owl Carousel', pattern: /\$\(.*\)\.owlCarousel\s*\(/i },
      { name: 'Slick Carousel', pattern: /\$\(.*\)\.slick\s*\(/i },
      { name: 'Isotope', pattern: /\$\(.*\)\.isotope\s*\(/i },
      { name: 'Lightbox', pattern: /\$\(.*\)\.(lightbox|lightbox2)\s*\(/i },
      { name: 'Lazy Load', pattern: /\$\(.*\)\.lazy\s*\(|lazyload\s*\(/i },
      { name: 'Sticky', pattern: /\$\(.*\)\.sticky\s*\(/i },
      { name: 'ScrollMagic', pattern: /new\s+ScrollMagic\.Controller|ScrollMagic\.Scene/i },
      { name: 'GSAP', pattern: /gsap\.(to|from|timeline)|TweenMax|TweenLite/i },
    ];
    
    for (const { name, pattern } of pluginPatterns) {
      if (pattern.test(content) && !plugins.includes(name)) {
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
      { name: 'Modal', pattern: /class="[^"]*modal[^"]*"|data-toggle="modal"|data-bs-toggle="modal"/i },
      { name: 'Dropdown', pattern: /class="[^"]*dropdown[^"]*"|data-toggle="dropdown"|data-bs-toggle="dropdown"/i },
      { name: 'Tabs', pattern: /class="[^"]*nav-tabs[^"]*"|data-toggle="tab"|data-bs-toggle="tab"/i },
      { name: 'Pills', pattern: /class="[^"]*nav-pills[^"]*"|data-bs-toggle="pill"/i },
      { name: 'Accordion', pattern: /class="[^"]*accordion[^"]*"|data-toggle="collapse"|data-bs-toggle="collapse"/i },
      { name: 'Carousel', pattern: /class="[^"]*carousel[^"]*"|data-ride="carousel"|data-bs-ride="carousel"/i },
      { name: 'Alert', pattern: /class="[^"]*alert[^"]*"|\.alert\s*\(/i },
      { name: 'Button Group', pattern: /class="[^"]*btn-group[^"]*"/i },
      { name: 'Navbar', pattern: /class="[^"]*navbar[^"]*"/i },
      { name: 'Card', pattern: /class="[^"]*card[^"]*"/i },
      { name: 'Badge', pattern: /class="[^"]*badge[^"]*"/i },
      { name: 'Breadcrumb', pattern: /class="[^"]*breadcrumb[^"]*"/i },
      { name: 'Pagination', pattern: /class="[^"]*pagination[^"]*"/i },
      { name: 'Progress', pattern: /class="[^"]*progress[^"]*"/i },
      { name: 'Spinner', pattern: /class="[^"]*spinner[^"]*"/i },
      { name: 'Toast', pattern: /class="[^"]*toast[^"]*"|\.toast\s*\(/i },
      { name: 'Offcanvas', pattern: /class="[^"]*offcanvas[^"]*"|data-bs-toggle="offcanvas"/i },
    ];
    
    for (const { name, pattern } of componentPatterns) {
      if (pattern.test(content) && !components.includes(name)) {
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
    score += (content.match(/\basync\b/gi) || []).length * 2;
    score += (content.match(/\bawait\b/gi) || []).length * 2;
    score += (content.match(/=>/g) || []).length;
    
    return score;
  }

  /**
   * Get surrounding context
   */
  private getSurroundingContext(content: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end);
  }

  /**
   * Generate summary
   */
  private generateSummary(
    ajaxCalls: AjaxCall[],
    eventHandlers: EventHandler[],
    jqueryChains: JQueryChain[],
    templateLiteralURLs: TemplateLiteralURL[],
    asyncPatterns: AsyncPattern[],
    content: string
  ): EnhancedJSIntelligenceResult['summary'] {
    const potentialIssues: string[] = [];
    
    // Check for potential issues
    if (ajaxCalls.some(c => c.url.includes('${'))) {
      potentialIssues.push('Template literal URLs may need runtime resolution');
    }
    
    if (content.includes('eval(')) {
      potentialIssues.push('eval() usage detected - potential security risk');
    }
    
    if (content.includes('innerHTML') && !content.includes('DOMPurify')) {
      potentialIssues.push('innerHTML usage without sanitization');
    }
    
    const hasDynamicSelectors = templateLiteralURLs.length > 0 || 
                                content.includes('$(`') || 
                                /\$\([^)]*\+[^)]*\)/.test(content);
    if (hasDynamicSelectors) {
      potentialIssues.push('Dynamic selectors detected - may need special handling');
    }

    // Determine AJAX complexity
    let ajaxComplexity: 'low' | 'medium' | 'high' = 'low';
    if (ajaxCalls.length > 10 || templateLiteralURLs.length > 3 || asyncPatterns.length > 5) {
      ajaxComplexity = 'high';
    } else if (ajaxCalls.length > 5 || templateLiteralURLs.length > 0) {
      ajaxComplexity = 'medium';
    }

    return {
      totalEndpoints: ajaxCalls.length,
      totalEventHandlers: eventHandlers.length,
      totalJQueryOperations: jqueryChains.reduce((sum, c) => sum + c.operations.length, 0),
      ajaxComplexity,
      usesModernJS: /const|let|=>|async|await|class\s+\w+/.test(content),
      usesjQuery: /\$\(|jQuery/.test(content),
      potentialIssues,
    };
  }
}

// Export singleton
export const enhancedJSParsers = new EnhancedJSParserEngine();
