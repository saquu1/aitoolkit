/**
 * File Validator Tests
 */

import { describe, it, expect } from "vitest"
import {
  validateFileUpload,
  validateFileContent,
  validateSqlContent,
  sanitizeInput,
  sanitizeSqlIdentifier,
  sanitizeFileName,
  getExtension,
  formatFileSize,
  detectFileType,
} from "./file-validator"

describe("File Validator", () => {
  describe("File Upload Validation", () => {
    it("should reject files larger than max size", () => {
      const largeFile = new File([""], "test.sql", {
        type: "text/plain",
      })
      Object.defineProperty(largeFile, "size", { value: 20 * 1024 * 1024 }) // 20MB
      
      const result = validateFileUpload(largeFile)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining("exceeds maximum"))
    })

    it("should reject files with disallowed extensions", () => {
      const file = new File(["test"], "test.exe", {
        type: "application/octet-stream",
      })
      Object.defineProperty(file, "size", { value: 100 })
      
      const result = validateFileUpload(file)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining("not allowed"))
    })

    it("should accept valid SQL files", () => {
      const file = new File(["CREATE TABLE Test (Id INT)"], "test.sql", {
        type: "text/plain",
      })
      Object.defineProperty(file, "size", { value: 100 })
      
      const result = validateFileUpload(file)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should provide file info on validation", () => {
      const file = new File(["test"], "schema.sql", {
        type: "text/plain",
      })
      Object.defineProperty(file, "size", { value: 1024 })
      
      const result = validateFileUpload(file)
      
      expect(result.fileInfo).toBeDefined()
      expect(result.fileInfo?.name).toBe("schema.sql")
      expect(result.fileInfo?.extension).toBe(".sql")
      expect(result.fileInfo?.size).toBe(1024)
    })
  })

  describe("SQL Content Validation", () => {
    it("should detect dangerous xp_cmdshell command", () => {
      const content = "EXEC xp_cmdshell 'dir'"
      const result = validateFileContent(content, ".sql")
      
      expect(result.errors).toContainEqual(expect.stringContaining("xp_cmdshell"))
    })

    it("should detect DROP DATABASE as error", () => {
      const content = "DROP DATABASE TestDB"
      const result = validateFileContent(content, ".sql")
      
      expect(result.errors).toContainEqual(expect.stringContaining("DROP DATABASE"))
    })

    it("should warn about TRUNCATE TABLE", () => {
      const content = "TRUNCATE TABLE Logs"
      const result = validateFileContent(content, ".sql")
      
      expect(result.warnings).toContainEqual(expect.stringContaining("TRUNCATE"))
    })

    it("should warn about potential SQL injection patterns", () => {
      const content = "SELECT * FROM Users WHERE Id = 1; -- comment"
      const result = validateFileContent(content, ".sql")
      
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it("should pass clean SQL", () => {
      const content = `
        CREATE TABLE Users (
          Id INT PRIMARY KEY,
          Name NVARCHAR(100)
        )
      `
      const result = validateFileContent(content, ".sql")
      
      expect(result.errors).toHaveLength(0)
    })
  })

  describe("HTML Content Validation", () => {
    it("should detect script tags", () => {
      const content = "<script>alert('xss')</script>"
      const result = validateFileContent(content, ".cshtml")
      
      expect(result.errors).toContainEqual(expect.stringContaining("script"))
    })

    it("should detect javascript: protocol", () => {
      const content = '<a href="javascript:void(0)">Click</a>'
      const result = validateFileContent(content, ".cshtml")
      
      expect(result.errors).toContainEqual(expect.stringContaining("javascript:"))
    })

    it("should warn about event handlers", () => {
      const content = '<div onclick="doSomething()">Test</div>'
      const result = validateFileContent(content, ".cshtml")
      
      expect(result.warnings).toContainEqual(expect.stringContaining("event handler"))
    })
  })

  describe("Input Sanitization", () => {
    it("should remove script tags", () => {
      const input = "<script>alert('xss')</script>Hello World"
      const result = sanitizeInput(input)
      
      expect(result).toBe("Hello World")
    })

    it("should remove null bytes", () => {
      const input = "Hello\0World"
      const result = sanitizeInput(input)
      
      expect(result).toBe("HelloWorld")
    })

    it("should remove javascript: protocol", () => {
      const input = "javascript:alert('xss')"
      const result = sanitizeInput(input)
      
      expect(result).toBe("alert('xss')")
    })

    it("should trim whitespace", () => {
      const input = "  hello world  "
      const result = sanitizeInput(input)
      
      expect(result).toBe("hello world")
    })
  })

  describe("SQL Identifier Sanitization", () => {
    it("should accept valid identifiers", () => {
      expect(sanitizeSqlIdentifier("Users")).toBe("Users")
      expect(sanitizeSqlIdentifier("PatientRecords")).toBe("PatientRecords")
      expect(sanitizeSqlIdentifier("table_name")).toBe("table_name")
    })

    it("should throw on invalid identifiers", () => {
      expect(() => sanitizeSqlIdentifier("user-name")).toThrow()
      expect(() => sanitizeSqlIdentifier("123table")).toThrow()
      expect(() => sanitizeSqlIdentifier("")).toThrow()
    })

    it("should throw on SQL keywords", () => {
      expect(() => sanitizeSqlIdentifier("SELECT")).toThrow()
      expect(() => sanitizeSqlIdentifier("DROP")).toThrow()
      expect(() => sanitizeSqlIdentifier("TABLE")).toThrow()
    })
  })

  describe("File Name Sanitization", () => {
    it("should remove path traversal attempts", () => {
      const result = sanitizeFileName("../../../etc/passwd")
      expect(result).not.toContain("..")
      expect(result).not.toContain("/")
    })

    it("should remove path separators", () => {
      const result = sanitizeFileName("folder/file.sql")
      expect(result).not.toContain("/")
    })

    it("should remove null bytes", () => {
      const result = sanitizeFileName("test\0file.sql")
      expect(result).not.toContain("\0")
    })

    it("should preserve valid file names", () => {
      const result = sanitizeFileName("my-schema.sql")
      expect(result).toBe("my-schema.sql")
    })

    it("should return default for empty names", () => {
      const result = sanitizeFileName("")
      expect(result).toBe("unnamed_file")
    })

    it("should limit file name length", () => {
      const longName = "a".repeat(300) + ".sql"
      const result = sanitizeFileName(longName)
      expect(result.length).toBeLessThanOrEqual(255)
    })
  })

  describe("File Extension Extraction", () => {
    it("should extract extension correctly", () => {
      expect(getExtension("file.sql")).toBe(".sql")
      expect(getExtension("schema.prisma")).toBe(".prisma")
      expect(getExtension("path/to/file.cshtml")).toBe(".cshtml")
    })

    it("should return empty string for no extension", () => {
      expect(getExtension("README")).toBe("")
    })
  })

  describe("File Size Formatting", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes")
      expect(formatFileSize(500)).toBe("500 Bytes")
    })

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1 KB")
      expect(formatFileSize(2560)).toBe("2.5 KB")
    })

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1 MB")
      expect(formatFileSize(5242880)).toBe("5 MB")
    })
  })

  describe("File Type Detection", () => {
    it("should detect SQL from content", () => {
      const content = "CREATE TABLE Test (Id INT)"
      const result = detectFileType(content, "unknown.txt")
      
      expect(result).toBe("sql")
    })

    it("should detect JSON from content", () => {
      const content = '{"key": "value"}'
      const result = detectFileType(content, "data.txt")
      
      expect(result).toBe("json")
    })

    it("should detect Prisma from content", () => {
      const content = "model User { id Int @id }"
      const result = detectFileType(content, "schema.txt")
      
      expect(result).toBe("prisma")
    })

    it("should prefer extension when available", () => {
      const content = "some content"
      const result = detectFileType(content, "schema.sql")
      
      expect(result).toBe("sql")
    })
  })
})
