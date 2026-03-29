/**
 * Code Formatting Service
 * Prettier integration for generated code formatting
 * 
 * TASK-4.6: Code Formatting
 * Part of Phase 4: Features & User Experience
 */

// Types
export interface FormatOptions {
  printWidth?: number
  tabWidth?: number
  useTabs?: boolean
  semi?: boolean
  singleQuote?: boolean
  trailingComma?: 'none' | 'es5' | 'all'
  bracketSpacing?: boolean
  arrowParens?: 'avoid' | 'always'
  endOfLine?: 'lf' | 'crlf' | 'cr' | 'auto'
}

export interface FormatResult {
  original: string
  formatted: string
  changed: boolean
  language: string
  error?: string
}

export interface LanguageConfig {
  parser: string
  plugins?: string[]
  options?: FormatOptions
}

// Language configurations
const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  typescript: {
    parser: 'typescript',
    options: {
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
      trailingComma: 'es5',
      bracketSpacing: true,
      arrowParens: 'always'
    }
  },
  javascript: {
    parser: 'babel',
    options: {
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
      trailingComma: 'es5'
    }
  },
  json: {
    parser: 'json',
    options: {
      printWidth: 100,
      tabWidth: 2,
      trailingComma: 'none'
    }
  },
  html: {
    parser: 'html',
    options: {
      printWidth: 120,
      tabWidth: 2,
      singleQuote: false
    }
  },
  css: {
    parser: 'css',
    options: {
      printWidth: 100,
      tabWidth: 2,
      singleQuote: false
    }
  },
  scss: {
    parser: 'scss',
    options: {
      printWidth: 100,
      tabWidth: 2,
      singleQuote: false
    }
  },
  markdown: {
    parser: 'markdown',
    options: {
      printWidth: 80,
      tabWidth: 2
    }
  },
  yaml: {
    parser: 'yaml',
    options: {
      printWidth: 80,
      tabWidth: 2
    }
  },
  graphql: {
    parser: 'graphql',
    options: {
      printWidth: 100,
      tabWidth: 2
    }
  },
  prisma: {
    parser: 'prisma',
    options: {
      printWidth: 100,
      tabWidth: 2
    }
  },
  sql: {
    parser: 'sql',
    options: {
      printWidth: 100,
      tabWidth: 2,
      keywordCase: 'upper',
      indentStyle: 'standard'
    }
  }
}

// Default options
const DEFAULT_OPTIONS: FormatOptions = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf'
}

/**
 * Code Formatter Service
 */
export class CodeFormatter {
  private options: FormatOptions

  constructor(options?: Partial<FormatOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Format code based on language
   */
  async format(code: string, language: string): Promise<FormatResult> {
    const lang = language.toLowerCase()
    const config = LANGUAGE_CONFIGS[lang]

    if (!config) {
      return this.formatGeneric(code, lang)
    }

    try {
      // Use built-in formatting logic (Prettier-like)
      const formatted = await this.formatWithConfig(code, config)
      
      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: lang
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: lang,
        error: error.message
      }
    }
  }

  /**
   * Format TypeScript/JavaScript
   */
  async formatTypeScript(code: string, options?: Partial<FormatOptions>): Promise<FormatResult> {
    const opts = { ...this.options, ...options }
    
    try {
      let formatted = code

      // Basic formatting rules
      formatted = this.normalizeLineEndings(formatted, opts.endOfLine || 'lf')
      formatted = this.normalizeIndentation(formatted, opts.tabWidth || 2, opts.useTabs || false)
      formatted = this.normalizeQuotes(formatted, opts.singleQuote !== false)
      formatted = this.normalizeSemicolons(formatted, opts.semi !== false)
      formatted = this.addTrailingCommas(formatted, opts.trailingComma || 'es5')
      formatted = this.normalizeSpacing(formatted, opts.bracketSpacing !== false)

      // TypeScript-specific formatting
      formatted = this.formatTypeScriptSpecific(formatted)

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'typescript'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'typescript',
        error: error.message
      }
    }
  }

  /**
   * Format JSON
   */
  async formatJSON(code: string, options?: Partial<FormatOptions>): Promise<FormatResult> {
    const opts = { ...this.options, ...options }
    
    try {
      const parsed = JSON.parse(code)
      const indent = opts.useTabs ? '\t' : ' '.repeat(opts.tabWidth || 2)
      const formatted = JSON.stringify(parsed, null, indent)

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'json'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'json',
        error: error.message
      }
    }
  }

  /**
   * Format Prisma Schema
   */
  async formatPrisma(code: string): Promise<FormatResult> {
    try {
      let formatted = code

      // Normalize model definitions
      formatted = formatted.replace(
        /model\s+(\w+)\s*\{([\s\S]*?)\}/g,
        (_, name, body) => {
          const formattedBody = this.formatPrismaModelBody(body)
          return `model ${name} {\n${formattedBody}\n}`
        }
      )

      // Normalize datasource
      formatted = formatted.replace(
        /datasource\s+(\w+)\s*\{([\s\S]*?)\}/g,
        (_, name, body) => {
          const lines = body.split('\n')
            .map(l => l.trim())
            .filter(l => l)
            .map(l => `  ${l}`)
            .join('\n')
          return `datasource ${name} {\n${lines}\n}`
        }
      )

      // Normalize generator
      formatted = formatted.replace(
        /generator\s+(\w+)\s*\{([\s\S]*?)\}/g,
        (_, name, body) => {
          const lines = body.split('\n')
            .map(l => l.trim())
            .filter(l => l)
            .map(l => `  ${l}`)
            .join('\n')
          return `generator ${name} {\n${lines}\n}`
        }
      )

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'prisma'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'prisma',
        error: error.message
      }
    }
  }

  /**
   * Format SQL
   */
  async formatSQL(code: string): Promise<FormatResult> {
    try {
      let formatted = code

      // Uppercase keywords
      const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
        'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ORDER', 'BY',
        'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES',
        'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP',
        'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'PRIMARY',
        'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
        'IDENTITY', 'CONSTRAINT', 'CASCADE', 'RESTRICT', 'NULL', 'NOT NULL',
        'VARCHAR', 'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC',
        'FLOAT', 'REAL', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'TEXT',
        'CHAR', 'NVARCHAR', 'NCHAR', 'BIT', 'BINARY', 'VARBINARY'
      ]

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        formatted = formatted.replace(regex, keyword)
      }

      // Normalize line breaks after major clauses
      formatted = formatted.replace(/\s+(SELECT|FROM|WHERE|JOIN|ORDER BY|GROUP BY|HAVING)/gi, '\n$1')
      formatted = formatted.replace(/\s+(INSERT INTO|UPDATE|DELETE FROM)/gi, '\n$1')

      // Normalize indentation
      const lines = formatted.split('\n')
      let indentLevel = 0
      formatted = lines.map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith(')') || trimmed.startsWith('END')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        const indented = '  '.repeat(indentLevel) + trimmed
        if (trimmed.endsWith('(') || trimmed.endsWith('BEGIN')) {
          indentLevel++
        }
        return indented
      }).join('\n')

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'sql'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'sql',
        error: error.message
      }
    }
  }

  /**
   * Format Markdown
   */
  async formatMarkdown(code: string): Promise<FormatResult> {
    try {
      let formatted = code

      // Normalize headers
      formatted = formatted.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2')

      // Normalize lists
      formatted = formatted.replace(/^(\s*)[-*+]\s*/gm, '$1- ')

      // Normalize code blocks
      formatted = formatted.replace(/```(\w*)\n/g, '```$1\n')

      // Normalize blank lines (max 2 consecutive)
      formatted = formatted.replace(/\n{3,}/g, '\n\n')

      // Ensure newline at end
      if (!formatted.endsWith('\n')) {
        formatted += '\n'
      }

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'markdown'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'markdown',
        error: error.message
      }
    }
  }

  /**
   * Format HTML
   */
  async formatHTML(code: string): Promise<FormatResult> {
    try {
      let formatted = code

      // Remove extra whitespace between tags
      formatted = formatted.replace(/>\s+</g, '>\n<')

      // Indent nested tags
      const lines = formatted.split('\n')
      let indentLevel = 0
      const INDENT = '  '

      formatted = lines.map(line => {
        const trimmed = line.trim()
        
        // Decrease indent for closing tags
        if (trimmed.startsWith('</')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        const indented = INDENT.repeat(indentLevel) + trimmed
        
        // Increase indent after opening tags (not self-closing)
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && 
            !trimmed.endsWith('/>') && !trimmed.match(/<[^>]+\/>/)) {
          indentLevel++
        }
        
        return indented
      }).join('\n')

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'html'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'html',
        error: error.message
      }
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_CONFIGS)
  }

  /**
   * Update options
   */
  setOptions(options: Partial<FormatOptions>): void {
    this.options = { ...this.options, ...options }
  }

  // Private helper methods

  private async formatWithConfig(code: string, config: LanguageConfig): Promise<string> {
    const lang = config.parser.toLowerCase()

    switch (lang) {
      case 'typescript':
      case 'babel':
        return (await this.formatTypeScript(code, config.options)).formatted
      case 'json':
        return (await this.formatJSON(code, config.options)).formatted
      case 'html':
        return (await this.formatHTML(code)).formatted
      case 'css':
      case 'scss':
        return (await this.formatCSS(code)).formatted
      case 'markdown':
        return (await this.formatMarkdown(code)).formatted
      case 'prisma':
        return (await this.formatPrisma(code)).formatted
      case 'sql':
        return (await this.formatSQL(code)).formatted
      default:
        return code
    }
  }

  private async formatCSS(code: string): Promise<FormatResult> {
    try {
      let formatted = code

      // Normalize whitespace
      formatted = formatted.replace(/\s*{\s*/g, ' {\n  ')
      formatted = formatted.replace(/;\s*/g, ';\n  ')
      formatted = formatted.replace(/\s*}\s*/g, '\n}\n')

      // Remove extra blank lines
      formatted = formatted.replace(/\n{3,}/g, '\n\n')

      // Uppercase CSS values that should be
      formatted = formatted.replace(/:\s*!important/gi, ': !important')

      return {
        original: code,
        formatted,
        changed: code !== formatted,
        language: 'css'
      }
    } catch (error: any) {
      return {
        original: code,
        formatted: code,
        changed: false,
        language: 'css',
        error: error.message
      }
    }
  }

  private formatGeneric(code: string, language: string): FormatResult {
    return {
      original: code,
      formatted: code,
      changed: false,
      language,
      error: `No formatter available for language: ${language}`
    }
  }

  private normalizeLineEndings(code: string, style: 'lf' | 'crlf' | 'cr' | 'auto'): string {
    switch (style) {
      case 'lf':
        return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      case 'crlf':
        return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n')
      case 'cr':
        return code.replace(/\r\n/g, '\r').replace(/\n/g, '\r')
      default:
        return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    }
  }

  private normalizeIndentation(code: string, tabWidth: number, useTabs: boolean): string {
    const indent = useTabs ? '\t' : ' '.repeat(tabWidth)
    const lines = code.split('\n')
    
    let indentLevel = 0
    return lines.map(line => {
      const trimmed = line.trim()
      
      // Decrease indent for closing braces
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }
      
      const indented = indent.repeat(indentLevel) + trimmed
      
      // Increase indent after opening braces
      indentLevel += (trimmed.match(/[{[(]/g) || []).length
      indentLevel -= (trimmed.match(/[}\])]/g) || []).length
      
      return indented
    }).join('\n')
  }

  private normalizeQuotes(code: string, singleQuote: boolean): string {
    if (singleQuote) {
      // Convert double quotes to single quotes where appropriate
      return code.replace(/"([^"']*)"(?=\s*[,;)\]\n}])/g, "'$1'")
    }
    return code
  }

  private normalizeSemicolons(code: string, useSemicolons: boolean): string {
    if (!useSemicolons) {
      // Remove unnecessary semicolons
      return code.replace(/;(\s*[\n}])/g, '$1')
    }
    return code
  }

  private addTrailingCommas(code: string, style: 'none' | 'es5' | 'all'): string {
    if (style === 'none') return code

    // Add trailing commas in arrays and objects (ES5 style)
    if (style === 'es5' || style === 'all') {
      // Add trailing comma before closing bracket in multi-line arrays/objects
      code = code.replace(/,?\s*([\]\}])/g, (match, bracket, offset, string) => {
        const beforeMatch = string.substring(0, offset)
        const lastNewline = beforeMatch.lastIndexOf('\n')
        if (lastNewline !== -1 && offset - lastNewline > 2) {
          return `,${bracket}`
        }
        return match
      })
    }

    return code
  }

  private normalizeSpacing(code: string, bracketSpacing: boolean): string {
    if (bracketSpacing) {
      // Add space inside braces
      code = code.replace(/\{\s*/g, '{ ')
      code = code.replace(/\s*\}/g, ' }')
    } else {
      // Remove space inside braces
      code = code.replace(/\{\s+/g, '{')
      code = code.replace(/\s+\}/g, '}')
    }
    return code
  }

  private formatTypeScriptSpecific(code: string): string {
    // Add spaces after keywords
    const keywords = ['if', 'else', 'for', 'while', 'switch', 'catch', 'finally']
    for (const kw of keywords) {
      code = code.replace(new RegExp(`\\b${kw}\\(`, 'g'), `${kw} (`)
    }

    // Normalize arrow functions
    code = code.replace(/\)\s*=>\s*\{/g, ') => {')
    code = code.replace(/\)\s*=>\s*([^{\n])/g, ') => $1')

    // Normalize type annotations
    code = code.replace(/:\s*([A-Z]\w*)/g, ': $1')

    return code
  }

  private formatPrismaModelBody(body: string): string {
    const lines = body.split('\n')
      .map(l => l.trim())
      .filter(l => l)

    const fields: string[] = []
    const blocks: string[] = []

    for (const line of lines) {
      if (line.startsWith('@@')) {
        blocks.push(line)
      } else {
        fields.push(line)
      }
    }

    // Format fields
    const formattedFields = fields.map(f => `  ${f}`)

    // Format blocks
    const formattedBlocks = blocks.map(b => `  ${b}`)

    return [...formattedFields, ...formattedBlocks].join('\n')
  }
}

// Export singleton
export const codeFormatter = new CodeFormatter()

/**
 * Quick format functions
 */
export async function formatCode(code: string, language: string): Promise<FormatResult> {
  return codeFormatter.format(code, language)
}

export async function formatTypeScript(code: string): Promise<FormatResult> {
  return codeFormatter.formatTypeScript(code)
}

export async function formatJSON(code: string): Promise<FormatResult> {
  return codeFormatter.formatJSON(code)
}

export async function formatPrisma(code: string): Promise<FormatResult> {
  return codeFormatter.formatPrisma(code)
}

export async function formatSQL(code: string): Promise<FormatResult> {
  return codeFormatter.formatSQL(code)
}
