/**
 * File Validation Library
 * Provides security validation for file uploads
 */

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_CONTENT_LENGTH = 50 * 1024 * 1024 // 50MB for raw SQL content

const ALLOWED_EXTENSIONS = [
  ".sql",      // SQL scripts
  ".prisma",   // Prisma schema files
  ".cshtml",   // ASP.NET Razor views
  ".cs",       // C# files
  ".js",       // JavaScript files
  ".ts",       // TypeScript files
  ".json",     // JSON files
  ".xml",      // XML files
  ".md",       // Markdown documentation
]

const DANGEROUS_SQL_PATTERNS = [
  // SQL Server dangerous commands
  { pattern: /xp_cmdshell/gi, message: "SQL contains xp_cmdshell command" },
  { pattern: /sp_configure/gi, message: "SQL contains sp_configure command" },
  { pattern: /DROP\s+DATABASE/gi, message: "SQL contains DROP DATABASE command" },
  { pattern: /TRUNCATE\s+TABLE/gi, message: "SQL contains TRUNCATE TABLE command", level: "warning" },
  { pattern: /EXEC\s+xp_/gi, message: "SQL contains extended stored procedure" },
  { pattern: /OPENROWSET/gi, message: "SQL contains OPENROWSET command" },
  { pattern: /BULK\s+INSERT/gi, message: "SQL contains BULK INSERT command", level: "warning" },
  
  // Potential SQL injection patterns
  { pattern: /;\s*--/g, message: "SQL contains comment after semicolon (potential injection)", level: "warning" },
  { pattern: /UNION\s+SELECT/gi, message: "SQL contains UNION SELECT (potential injection)", level: "warning" },
  { pattern: /'\s*OR\s+'/gi, message: "SQL contains OR pattern (potential injection)", level: "warning" },
  
  // Dynamic SQL
  { pattern: /EXEC\s*\(/gi, message: "SQL contains dynamic EXEC", level: "warning" },
  { pattern: /sp_executesql/gi, message: "SQL contains sp_executesql", level: "warning" },
]

const DANGEROUS_HTML_PATTERNS = [
  { pattern: /<script\b[^>]*>/gi, message: "Content contains script tags" },
  { pattern: /javascript:/gi, message: "Content contains javascript: protocol" },
  { pattern: /on\w+\s*=/gi, message: "Content contains event handlers", level: "warning" },
  { pattern: /<iframe\b[^>]*>/gi, message: "Content contains iframe tags", level: "warning" },
  { pattern: /<embed\b[^>]*>/gi, message: "Content contains embed tags", level: "warning" },
  { pattern: /<object\b[^>]*>/gi, message: "Content contains object tags", level: "warning" },
]

export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  sanitizedContent?: string
  fileInfo?: {
    name: string
    size: number
    type: string
    extension: string
  }
}

export interface ContentValidationResult {
  errors: string[]
  warnings: string[]
}

/**
 * Validate a file upload
 */
export function validateFileUpload(
  file: File,
  content?: string
): FileValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Get file extension
  const extension = getExtension(file.name).toLowerCase()

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`)
  }

  // Check file extension
  if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(`File extension "${extension}" is not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`)
  }

  // Check content length if provided
  if (content && content.length > MAX_CONTENT_LENGTH) {
    errors.push(`Content length exceeds maximum allowed size of ${formatFileSize(MAX_CONTENT_LENGTH)}`)
  }

  // Validate content based on file type
  if (content && extension) {
    const contentValidation = validateFileContent(content, extension)
    errors.push(...contentValidation.errors)
    warnings.push(...contentValidation.warnings)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      extension,
    }
  }
}

/**
 * Validate file content based on type
 */
export function validateFileContent(
  content: string,
  extension: string
): ContentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for null bytes (potential binary injection)
  if (content.includes("\0")) {
    errors.push("Content contains null bytes which may indicate binary data injection")
  }

  // SQL-specific validation
  if (extension === ".sql") {
    const sqlValidation = validateSqlContent(content)
    errors.push(...sqlValidation.errors)
    warnings.push(...sqlValidation.warnings)
  }

  // C#/CSHTML validation
  if (extension === ".cs" || extension === ".cshtml") {
    const codeValidation = validateCodeContent(content)
    errors.push(...codeValidation.errors)
    warnings.push(...codeValidation.warnings)
  }

  // HTML-like content validation
  if (extension === ".cshtml" || extension === ".md") {
    const htmlValidation = validateHtmlContent(content)
    errors.push(...htmlValidation.errors)
    warnings.push(...htmlValidation.warnings)
  }

  return { errors, warnings }
}

/**
 * Validate SQL content for dangerous patterns
 */
export function validateSqlContent(content: string): ContentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const { pattern, message, level } of DANGEROUS_SQL_PATTERNS) {
    if (pattern.test(content)) {
      if (level === "warning") {
        warnings.push(message)
      } else {
        errors.push(message)
      }
    }
  }

  return { errors, warnings }
}

/**
 * Validate HTML-like content for dangerous patterns
 */
export function validateHtmlContent(content: string): ContentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const { pattern, message, level } of DANGEROUS_HTML_PATTERNS) {
    if (pattern.test(content)) {
      if (level === "warning") {
        warnings.push(message)
      } else {
        errors.push(message)
      }
    }
  }

  return { errors, warnings }
}

/**
 * Validate code content (C#, TypeScript, etc.)
 */
export function validateCodeContent(content: string): ContentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for obvious malicious patterns
  const maliciousPatterns = [
    { pattern: /eval\s*\(/gi, message: "Code contains eval() which can be dangerous" },
    { pattern: /Process\.Start/gi, message: "Code contains Process.Start which can execute system commands" },
    { pattern: /File\.Delete/gi, message: "Code contains File.Delete", level: "warning" },
    { pattern: /Directory\.Delete/gi, message: "Code contains Directory.Delete", level: "warning" },
  ]

  for (const { pattern, message, level } of maliciousPatterns) {
    if (pattern.test(content)) {
      if (level === "warning") {
        warnings.push(message)
      } else {
        errors.push(message)
      }
    }
  }

  return { errors, warnings }
}

/**
 * Sanitize input content by removing potentially dangerous patterns
 */
export function sanitizeInput(input: string): string {
  let sanitized = input

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "")

  // Remove script tags (but preserve content for analysis)
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, "")
  sanitized = sanitized.replace(/<\/script>/gi, "")

  // Remove event handlers (but log them)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, "")

  return sanitized.trim()
}

/**
 * Sanitize SQL identifier (table/column names)
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  // Remove any characters that aren't alphanumeric, underscore, or brackets
  const sanitized = identifier.replace(/[^\w\[\]]/g, "")
  
  // Validate format
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$|^\[[\w\s]+\]$/.test(sanitized)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`)
  }
  
  return sanitized
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, "")
  
  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, "_")
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "")
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, "")
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = getExtension(sanitized)
    const baseName = sanitized.substring(0, sanitized.length - ext.length)
    sanitized = baseName.substring(0, 250 - ext.length) + ext
  }
  
  return sanitized || "unnamed_file"
}

/**
 * Get file extension from filename
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".")
  return lastDot === -1 ? "" : filename.substring(lastDot)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Detect file type from content
 */
export function detectFileType(content: string, filename: string): string {
  const extension = getExtension(filename).toLowerCase()
  
  // Check by extension first
  if (extension === ".sql") return "sql"
  if (extension === ".prisma") return "prisma"
  if (extension === ".cshtml") return "cshtml"
  if (extension === ".cs") return "csharp"
  if (extension === ".json") return "json"
  if (extension === ".xml") return "xml"
  
  // Try to detect from content
  if (/CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+PROCEDURE/i.test(content)) {
    return "sql"
  }
  
  if (/@\w+|Html\.|@model/i.test(content)) {
    return "cshtml"
  }
  
  if (/^\s*\{[\s\S]*\}\s*$/.test(content) || /^\s*\[[\s\S]*\]\s*$/.test(content)) {
    return "json"
  }
  
  if (/<\?xml|<\w+\s+xmlns/i.test(content)) {
    return "xml"
  }
  
  if (/generator\s+client|datasource\s+db|model\s+\w+/.test(content)) {
    return "prisma"
  }
  
  return "unknown"
}

/**
 * Validate that content matches expected file type
 */
export function validateFileTypeMatch(
  content: string,
  filename: string
): { matches: boolean; detected: string; expected: string } {
  const extension = getExtension(filename).toLowerCase()
  const detected = detectFileType(content, filename)
  
  const extensionTypeMap: Record<string, string> = {
    ".sql": "sql",
    ".prisma": "prisma",
    ".cshtml": "cshtml",
    ".cs": "csharp",
    ".json": "json",
    ".xml": "xml",
  }
  
  const expected = extensionTypeMap[extension] || "unknown"
  
  return {
    matches: detected === expected || detected === "unknown",
    detected,
    expected
  }
}

/**
 * Extract potential tables from SQL content (for preview)
 */
export function extractTablePreview(content: string): string[] {
  const tables: string[] = []
  const tableRegex = /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi
  let match
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[2] || match[1]
    if (tableName && !tables.includes(tableName)) {
      tables.push(tableName)
    }
  }
  
  return tables.slice(0, 10) // Return first 10 tables
}

/**
 * Extract potential stored procedures from SQL content (for preview)
 */
export function extractProcedurePreview(content: string): string[] {
  const procedures: string[] = []
  const procRegex = /CREATE\s+PROC(?:EDURE)?\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi
  let match
  
  while ((match = procRegex.exec(content)) !== null) {
    const procName = match[2] || match[1]
    if (procName && !procedures.includes(procName)) {
      procedures.push(procName)
    }
  }
  
  return procedures.slice(0, 10) // Return first 10 procedures
}
