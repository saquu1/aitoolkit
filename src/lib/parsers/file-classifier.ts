// =============================================================================
// File Classification Engine - Intelligent File Type Detection
// =============================================================================
// Detects file types, frameworks, and languages to route to appropriate parsers
// =============================================================================

/**
 * Supported file types
 */
export type FileType =
  | 'razor_view'      // .cshtml, .vbhtml
  | 'controller'      // .cs (MVC Controller)
  | 'service'         // .cs (Service class)
  | 'model'           // .cs (DTO/ViewModel)
  | 'sql_ddl'         // .sql (CREATE TABLE, ALTER)
  | 'sql_sp'          // .sql (Stored Procedures)
  | 'sql_view'        // .sql (Views)
  | 'sql_function'    // .sql (Functions)
  | 'sql_mixed'       // .sql (Mixed content)
  | 'javascript'      // .js
  | 'typescript'      // .ts
  | 'html'            // .html
  | 'json'            // .json
  | 'markdown'        // .md
  | 'config'          // .config, .xml
  | 'unknown';

/**
 * Detected framework
 */
export type Framework =
  | 'aspnet_mvc'
  | 'aspnet_core'
  | 'webforms'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'unknown';

/**
 * Programming language
 */
export type Language =
  | 'csharp'
  | 'vbnet'
  | 'typescript'
  | 'javascript'
  | 'sql'
  | 'html'
  | 'razor'
  | 'json'
  | 'unknown';

/**
 * File classification result
 */
export interface FileClassification {
  fileName: string;
  fileType: FileType;
  language: Language;
  framework: Framework;
  confidence: number;
  indicators: string[];
  suggestedParser: string;
  metadata: FileMetadata;
}

/**
 * Additional file metadata
 */
export interface FileMetadata {
  size: number;
  lineCount: number;
  hasBOM: boolean;
  encoding: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

/**
 * File Classification Engine
 */
export class FileClassifier {
  // File extension mappings
  private static readonly EXTENSION_MAP: Record<string, { type: FileType; language: Language }> = {
    '.cshtml': { type: 'razor_view', language: 'razor' },
    '.vbhtml': { type: 'razor_view', language: 'vbnet' },
    '.cs': { type: 'controller', language: 'csharp' },
    '.vb': { type: 'controller', language: 'vbnet' },
    '.sql': { type: 'sql_mixed', language: 'sql' },
    '.js': { type: 'javascript', language: 'javascript' },
    '.ts': { type: 'typescript', language: 'typescript' },
    '.tsx': { type: 'typescript', language: 'typescript' },
    '.jsx': { type: 'javascript', language: 'javascript' },
    '.html': { type: 'html', language: 'html' },
    '.htm': { type: 'html', language: 'html' },
    '.json': { type: 'json', language: 'json' },
    '.md': { type: 'markdown', language: 'json' },
    '.config': { type: 'config', language: 'html' },
    '.xml': { type: 'config', language: 'html' },
  };

  // SQL content patterns
  private static readonly SQL_PATTERNS = {
    ddl: /\bCREATE\s+TABLE\b/i,
    sp: /\bCREATE\s+(PROCEDURE|PROC)\b/i,
    view: /\bCREATE\s+VIEW\b/i,
    function: /\bCREATE\s+FUNCTION\b/i,
    alter: /\bALTER\s+TABLE\b/i,
    insert: /\bINSERT\s+INTO\b/i,
  };

  // C# content patterns
  private static readonly CSHARP_PATTERNS = {
    controller: /\bclass\s+\w*Controller\s*:/i,
    service: /\bclass\s+\w*Service\s*:/i,
    repository: /\bclass\s+\w*Repository\s*:/i,
    model: /\bclass\s+\w*(DTO|ViewModel|Model)\s*:/i,
    interface: /\binterface\s+I\w+/i,
  };

  // Framework patterns
  private static readonly FRAMEWORK_PATTERNS: Record<Framework, RegExp[]> = {
    'aspnet_mvc': [
      /System\.Web\.Mvc/i,
      /Controller\s*:/i,
      /Html\.BeginForm/i,
      /@model\s+/i,
    ],
    'aspnet_core': [
      /Microsoft\.AspNetCore/i,
      /ControllerBase/i,
      /\[ApiController\]/i,
      /\[Route\(/i,
    ],
    'webforms': [
      /System\.Web\.UI\.Page/i,
      /<%@ Page/i,
      /runat="server"/i,
    ],
    'react': [
      /import\s+React/i,
      /from\s+['"]react['"]/i,
      /jsx/i,
    ],
    'vue': [
      /new\s+Vue\(/i,
      /<template>/i,
      /<script\s+setup>/i,
    ],
    'angular': [
      /@Component\(/i,
      /@Injectable\(/i,
      /@NgModule\(/i,
    ],
    'nextjs': [
      /from\s+['"]next\//i,
      /getServerSideProps/i,
      /getStaticProps/i,
    ],
    'unknown': [],
  };

  /**
   * Classify a file based on name and content
   */
  classify(fileName: string, content: string): FileClassification {
    const extension = this.getExtension(fileName);
    const baseInfo = FileClassifier.EXTENSION_MAP[extension] || { type: 'unknown' as FileType, language: 'unknown' as Language };
    
    // Get more specific type based on content
    const contentBasedType = this.detectContentSpecificType(content, baseInfo.type);
    
    // Detect framework
    const framework = this.detectFramework(content);
    
    // Detect language (may override extension-based detection)
    const language = this.detectLanguage(content, baseInfo.language);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(baseInfo.type, contentBasedType, framework);
    
    // Gather indicators
    const indicators = this.gatherIndicators(content, contentBasedType, framework);
    
    // Get suggested parser
    const suggestedParser = this.getSuggestedParser(contentBasedType);
    
    // Calculate metadata
    const metadata = this.calculateMetadata(content);

    return {
      fileName,
      fileType: contentBasedType,
      language,
      framework,
      confidence,
      indicators,
      suggestedParser,
      metadata,
    };
  }

  /**
   * Classify multiple files
   */
  classifyBatch(files: Array<{ name: string; content: string }>): FileClassification[] {
    return files.map(f => this.classify(f.name, f.content));
  }

  /**
   * Get file extension
   */
  private getExtension(fileName: string): string {
    const match = fileName.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  }

  /**
   * Detect more specific type based on content
   */
  private detectContentSpecificType(content: string, baseType: FileType): FileType {
    // RAZOR/CSHTML DETECTION - Check for Razor syntax regardless of extension
    // This handles cases where .md or other extensions contain CSHTML content
    const razorIndicators = [
      /@model\s+/i,
      /@Html\./i,
      /@using\s*\(\s*Html\.BeginForm/i,
      /@foreach\s*\(/i,
      /@if\s*\(/i,
      /@ViewBag\./i,
      /@Url\./i,
      /@RenderSection/i,
      /@section\s+/i,
      /@{\s*Layout\s*=/i,
      /ViewBag\.Title\s*=/i,
      /@Html\.DropDownList/i,
      /@Html\.TextBoxFor/i,
      /@Html\.EditorFor/i,
      /<input[^>]*asp-for=/i,
      /@using\s+Techovative/i, // Common namespace pattern
    ];
    
    const razorMatchCount = razorIndicators.filter(pattern => pattern.test(content)).length;
    if (razorMatchCount >= 2) {
      return 'razor_view';
    }
    
    // SQL-specific detection
    if (baseType === 'sql_mixed' || baseType.startsWith('sql_')) {
      const patterns = FileClassifier.SQL_PATTERNS;
      
      const hasDDL = patterns.ddl.test(content) || patterns.alter.test(content);
      const hasSP = patterns.sp.test(content);
      const hasView = patterns.view.test(content);
      const hasFunction = patterns.function.test(content);
      
      const types = [hasDDL, hasSP, hasView, hasFunction].filter(Boolean).length;
      
      if (types > 1) return 'sql_mixed';
      if (hasSP) return 'sql_sp';
      if (hasView) return 'sql_view';
      if (hasFunction) return 'sql_function';
      if (hasDDL) return 'sql_ddl';
    }
    
    // C#-specific detection
    if (baseType === 'controller' || baseType === 'service') {
      const patterns = FileClassifier.CSHARP_PATTERNS;
      
      if (patterns.controller.test(content)) return 'controller';
      if (patterns.service.test(content)) return 'service';
      if (patterns.repository.test(content)) return 'service';
      if (patterns.model.test(content)) return 'model';
    }
    
    // JAVASCRIPT DETECTION - Check for JS content regardless of extension
    const jsIndicators = [
      /\$\.(?:ajax|get|post)\s*\(/i,
      /\$\s*\([^)]+\)\.(?:on|click|change|submit)/i,
      /function\s+\w+\s*\([^)]*\)\s*{/i,
      /const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/i,
      /jQuery\s*\(/i,
      /document\.(?:getElementById|querySelector)/i,
    ];
    
    const jsMatchCount = jsIndicators.filter(pattern => pattern.test(content)).length;
    if (jsMatchCount >= 3 && !razorMatchCount) {
      return 'javascript';
    }
    
    return baseType;
  }

  /**
   * Detect framework
   */
  private detectFramework(content: string): Framework {
    for (const [framework, patterns] of Object.entries(FileClassifier.FRAMEWORK_PATTERNS)) {
      if (framework === 'unknown') continue;
      
      const matchCount = patterns.filter(p => p.test(content)).length;
      if (matchCount >= 2) {
        return framework as Framework;
      }
    }
    
    return 'unknown';
  }

  /**
   * Detect programming language
   */
  private detectLanguage(content: string, baseLanguage: Language): Language {
    // Check for Razor syntax
    if (content.includes('@model ') || content.includes('@Html.') || content.includes('@foreach')) {
      return 'razor';
    }
    
    // Check for C# syntax
    if (content.includes('using System') || /\bclass\s+\w+\s*:/i.test(content)) {
      return 'csharp';
    }
    
    // Check for TypeScript
    if (content.includes(': string') || content.includes(': number') || /\binterface\s+\w+/i.test(content)) {
      return 'typescript';
    }
    
    return baseLanguage;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(baseType: FileType, detectedType: FileType, framework: Framework): number {
    let confidence = 50;
    
    // Extension match
    if (baseType !== 'unknown') confidence += 20;
    
    // Content detection match
    if (baseType === detectedType) confidence += 15;
    
    // Framework detected
    if (framework !== 'unknown') confidence += 15;
    
    return Math.min(confidence, 100);
  }

  /**
   * Gather detection indicators
   */
  private gatherIndicators(content: string, fileType: FileType, framework: Framework): string[] {
    const indicators: string[] = [];
    
    // File type indicators
    const typeIndicators: Record<FileType, string[]> = {
      'razor_view': ['Contains @model directive', 'Contains Razor syntax', 'MVC View file'],
      'controller': ['Contains Controller class', 'MVC Controller detected', 'Has action methods'],
      'service': ['Contains Service class', 'Business logic layer', 'Service pattern'],
      'model': ['Contains DTO/ViewModel', 'Data transfer object', 'View model'],
      'sql_ddl': ['Contains CREATE TABLE', 'DDL statements', 'Table definitions'],
      'sql_sp': ['Contains CREATE PROCEDURE', 'Stored procedure', 'Database logic'],
      'sql_view': ['Contains CREATE VIEW', 'View definition', 'Query abstraction'],
      'sql_function': ['Contains CREATE FUNCTION', 'Scalar/Table function', 'Reusable logic'],
      'sql_mixed': ['Mixed SQL content', 'Multiple statement types', 'Combined script'],
      'javascript': ['JavaScript code', 'Frontend logic', 'Client-side script'],
      'typescript': ['TypeScript code', 'Type-safe JavaScript', 'Typed frontend'],
      'html': ['HTML markup', 'Static page', 'Web content'],
      'json': ['JSON data', 'Configuration', 'Data structure'],
      'markdown': ['Markdown document', 'Documentation', 'README file'],
      'config': ['Configuration file', 'App settings', 'XML config'],
      'unknown': ['Unknown file type', 'Requires inspection'],
    };
    
    indicators.push(...(typeIndicators[fileType] || []));
    
    // Framework indicators
    if (framework !== 'unknown') {
      indicators.push(`Framework: ${framework.replace('_', ' ').toUpperCase()}`);
    }
    
    // Content-specific indicators
    if (content.includes('BEGIN TRANSACTION')) {
      indicators.push('Contains transactions');
    }
    if (content.includes('sp_executesql')) {
      indicators.push('Dynamic SQL detected');
    }
    if (/@\w+/.test(content)) {
      indicators.push('Has parameters/variables');
    }
    
    return indicators;
  }

  /**
   * Get suggested parser
   */
  private getSuggestedParser(fileType: FileType): string {
    const parserMap: Record<FileType, string> = {
      'razor_view': 'CSHTMLParser',
      'controller': 'ControllerParser',
      'service': 'ServiceParser',
      'model': 'ModelParser',
      'sql_ddl': 'SQLDDLParser',
      'sql_sp': 'SPParser',
      'sql_view': 'ViewAnalyzer',
      'sql_function': 'FunctionParser',
      'sql_mixed': 'MixedSQLParser',
      'javascript': 'JSParser',
      'typescript': 'TSParser',
      'html': 'HTMLParser',
      'json': 'JSONParser',
      'markdown': 'MarkdownParser',
      'config': 'ConfigParser',
      'unknown': 'GenericParser',
    };
    
    return parserMap[fileType];
  }

  /**
   * Calculate file metadata
   */
  private calculateMetadata(content: string): FileMetadata {
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    // Estimate complexity based on various factors
    let complexityScore = 0;
    complexityScore += (content.match(/\bif\b/gi) || []).length;
    complexityScore += (content.match(/\bfor\b/gi) || []).length * 2;
    complexityScore += (content.match(/\bwhile\b/gi) || []).length * 2;
    complexityScore += (content.match(/\btry\b/gi) || []).length * 3;
    complexityScore += (content.match(/\bcatch\b/gi) || []).length * 3;
    complexityScore += Math.floor(lineCount / 100);
    
    const estimatedComplexity: 'low' | 'medium' | 'high' = 
      complexityScore < 10 ? 'low' : complexityScore < 30 ? 'medium' : 'high';
    
    return {
      size: content.length,
      lineCount,
      hasBOM: content.charCodeAt(0) === 0xFEFF,
      encoding: 'UTF-8', // Simplified
      estimatedComplexity,
    };
  }
}

// Export singleton instance
export const fileClassifier = new FileClassifier();
