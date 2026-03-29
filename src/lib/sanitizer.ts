/**
 * Input Sanitization Library
 * Provides utilities for sanitizing and validating user input
 */

import { z } from "zod"

/**
 * Sanitize general text input
 */
export function sanitizeInput(input: string): string {
  if (!input) return ""
  
  return input
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove script tags
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, "")
    // Trim whitespace
    .trim()
}

/**
 * Sanitize HTML content (for rich text fields)
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ""
  
  // Remove dangerous tags
  const dangerousTags = ["script", "iframe", "embed", "object", "form"]
  let sanitized = input
  
  for (const tag of dangerousTags) {
    const openRegex = new RegExp(`<${tag}\\b[^>]*>`, "gi")
    const closeRegex = new RegExp(`</${tag}>`, "gi")
    sanitized = sanitized.replace(openRegex, "")
    sanitized = sanitized.replace(closeRegex, "")
  }
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, "")
  
  // Remove data: protocol (can contain malicious content)
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, "")
  
  return sanitized.trim()
}

/**
 * Sanitize SQL identifier (table/column names)
 * Throws error if identifier is invalid
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  if (!identifier) {
    throw new Error("SQL identifier cannot be empty")
  }
  
  // Remove brackets if present
  let sanitized = identifier.replace(/^\[|\]$/g, "")
  
  // Remove schema prefix if present
  sanitized = sanitized.replace(/^[\w]+\./, "")
  
  // Check format - only alphanumeric and underscore allowed
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sanitized)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`)
  }
  
  // Check for SQL keywords
  const sqlKeywords = [
    "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
    "TRUNCATE", "EXEC", "UNION", "WHERE", "FROM", "JOIN", "HAVING",
    "ORDER", "GROUP", "BY", "AND", "OR", "NOT", "NULL", "DEFAULT"
  ]
  
  if (sqlKeywords.includes(sanitized.toUpperCase())) {
    throw new Error(`SQL identifier cannot be a reserved keyword: ${identifier}`)
  }
  
  return sanitized
}

/**
 * Sanitize SQL identifier allowing brackets
 */
export function sanitizeSqlIdentifierWithBrackets(identifier: string): string {
  if (!identifier) {
    throw new Error("SQL identifier cannot be empty")
  }
  
  // Check if already bracketed
  if (/^\[[\w\s]+\]$/.test(identifier)) {
    return identifier
  }
  
  // Validate and sanitize
  const sanitized = sanitizeSqlIdentifier(identifier)
  
  return `[${sanitized}]`
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(filename: string): string {
  if (!filename) return "unnamed_file"
  
  let sanitized = filename
    // Remove path traversal
    .replace(/\.\./g, "")
    // Remove path separators
    .replace(/[\/\\]/g, "_")
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    // Remove invalid characters for most file systems
    .replace(/[<>:"|?*]/g, "_")
    // Trim whitespace
    .trim()
  
  // Limit length
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = getExtension(sanitized)
    const baseName = sanitized.substring(0, sanitized.length - ext.length)
    sanitized = baseName.substring(0, maxLength - ext.length) + ext
  }
  
  return sanitized || "unnamed_file"
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ""
  
  const sanitized = email
    .toLowerCase()
    .trim()
    // Remove any characters that aren't valid in email
    .replace(/[^\w@.\-+]/g, "")
  
  return sanitized
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ""
  
  let sanitized = url.trim()
  
  // Only allow http, https, and mailto protocols
  const allowedProtocols = ["http://", "https://", "mailto:"]
  const hasValidProtocol = allowedProtocols.some(p => 
    sanitized.toLowerCase().startsWith(p)
  )
  
  if (!hasValidProtocol) {
    // Default to https if no protocol specified
    if (!sanitized.includes("://")) {
      sanitized = "https://" + sanitized
    } else {
      // Invalid protocol - return empty
      return ""
    }
  }
  
  // Remove any dangerous characters
  sanitized = sanitized.replace(/[<>"']/g, "")
  
  return sanitized
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return ""
  
  // Keep only digits, +, -, (, ), and space
  const sanitized = phone.replace(/[^\d+\-()\s]/g, "")
  
  return sanitized.trim()
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string): string {
  if (!input) return ""
  
  // Keep only digits, decimal point, and minus sign
  const sanitized = input.replace(/[^\d.\-]/g, "")
  
  // Ensure only one decimal point
  const parts = sanitized.split(".")
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("")
  }
  
  return sanitized
}

/**
 * Sanitize JSON string
 */
export function sanitizeJsonString(jsonString: string): string {
  if (!jsonString) return "{}"
  
  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed)
  } catch {
    return "{}"
  }
}

/**
 * Sanitize object (remove dangerous properties)
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options?: {
    removeNull?: boolean
    removeEmpty?: boolean
    maxDepth?: number
    maxLength?: number
  }
): Partial<T> {
  const result: Record<string, any> = {}
  const maxDepth = options?.maxDepth ?? 10
  const maxLength = options?.maxLength ?? 10000
  
  function sanitize(value: any, depth: number): any {
    if (depth > maxDepth) return undefined
    if (value === null) {
      return options?.removeNull ? undefined : null
    }
    if (value === undefined) return undefined
    if (value === "") {
      return options?.removeEmpty ? undefined : ""
    }
    
    if (typeof value === "string") {
      let str = sanitizeInput(value)
      if (str.length > maxLength) {
        str = str.substring(0, maxLength)
      }
      return str || undefined
    }
    
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return undefined
      return value
    }
    
    if (typeof value === "boolean") return value
    
    if (Array.isArray(value)) {
      return value
        .map(v => sanitize(v, depth + 1))
        .filter(v => v !== undefined)
    }
    
    if (typeof value === "object") {
      const sanitized: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        // Skip dangerous keys
        if (key.startsWith("__") || key === "constructor" || key === "prototype") {
          continue
        }
        const sanitizedValue = sanitize(val, depth + 1)
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue
        }
      }
      return sanitized
    }
    
    return undefined
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedValue = sanitize(value, 0)
    if (sanitizedValue !== undefined) {
      result[key] = sanitizedValue
    }
  }
  
  return result as Partial<T>
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  if (!input) return ""
  
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  
  return input.replace(/[&<>"']/g, char => htmlEscapes[char] || char)
}

/**
 * Unescape HTML special characters
 */
export function unescapeHtml(input: string): string {
  if (!input) return ""
  
  const htmlUnescapes: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
  }
  
  let result = input
  for (const [escaped, unescaped] of Object.entries(htmlUnescapes)) {
    result = result.replace(new RegExp(escaped, "g"), unescaped)
  }
  
  return result
}

/**
 * Sanitize for use in SQL LIKE clause
 */
export function sanitizeLikePattern(pattern: string): string {
  if (!pattern) return ""
  
  // Escape special LIKE characters
  return pattern
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
}

/**
 * Remove all non-alphanumeric characters
 */
export function toAlphanumeric(input: string): string {
  if (!input) return ""
  return input.replace(/[^a-zA-Z0-9]/g, "")
}

/**
 * Convert to slug format
 */
export function toSlug(input: string): string {
  if (!input) return ""
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100)
}

/**
 * Get file extension helper
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".")
  return lastDot === -1 ? "" : filename.substring(lastDot)
}

/**
 * Zod schema for sanitizing strings
 */
export const sanitizedStringSchema = z.string()
  .transform(sanitizeInput)
  .refine(val => val.length <= 10000, {
    message: "String exceeds maximum length"
  })

/**
 * Zod schema for sanitizing emails
 */
export const sanitizedEmailSchema = z.string()
  .email()
  .transform(sanitizeEmail)

/**
 * Zod schema for sanitizing URLs
 */
export const sanitizedUrlSchema = z.string()
  .url()
  .transform(sanitizeUrl)
  .refine(val => val !== "", {
    message: "Invalid or dangerous URL"
  })

/**
 * Zod schema for sanitizing SQL identifiers
 */
export const sanitizedSqlIdentifierSchema = z.string()
  .min(1)
  .max(128)
  .refine(val => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val), {
    message: "Invalid SQL identifier format"
  })
  .transform(sanitizeSqlIdentifier)
