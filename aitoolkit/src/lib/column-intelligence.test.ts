/**
 * Column Intelligence Tests
 */

import { describe, it, expect } from "vitest"
import { inferColumnIntelligence, ColumnIntelligenceResult } from "./column-intelligence"

describe("Column Intelligence Engine", () => {
  describe("Email detection", () => {
    it("should detect email columns", () => {
      const result = inferColumnIntelligence("Email", "NVARCHAR", 255, true)
      
      expect(result.semanticType).toBe("email")
      expect(result.uiComponent).toBe("email_input")
      expect(result.validation).toContain("email_format")
    })

    it("should detect email with different naming patterns", () => {
      const patterns = ["EmailAddress", "UserEmail", "ContactEmail", "email"]
      
      patterns.forEach(name => {
        const result = inferColumnIntelligence(name, "NVARCHAR", 255, true)
        expect(result.semanticType).toBe("email")
      })
    })
  })

  describe("Phone detection", () => {
    it("should detect phone columns", () => {
      const result = inferColumnIntelligence("PhoneNumber", "NVARCHAR", 20, true)
      
      expect(result.semanticType).toBe("phone")
      expect(result.uiComponent).toBe("phone_input")
    })

    it("should detect phone with different naming patterns", () => {
      const patterns = ["Phone", "Cell", "Mobile", "ContactNo", "Telephone"]
      
      patterns.forEach(name => {
        const result = inferColumnIntelligence(name, "NVARCHAR", 20, true)
        expect(result.semanticType).toBe("phone")
      })
    })
  })

  describe("PHI detection", () => {
    it("should detect MRN as PHI", () => {
      const result = inferColumnIntelligence("PatientMRN", "NVARCHAR", 20, true)
      
      expect(result.sensitivity).toBe("phi")
    })

    it("should detect diagnosis as PHI", () => {
      const result = inferColumnIntelligence("Diagnosis", "NVARCHAR", 500, true)
      
      expect(result.sensitivity).toBe("phi")
    })

    it("should detect medical-related columns as PHI", () => {
      const phiColumns = ["PatientSSN", "MedicalRecordNumber", "LabResult", "Prescription"]
      
      phiColumns.forEach(name => {
        const result = inferColumnIntelligence(name, "NVARCHAR", 100, true)
        expect(["phi", "pii"]).toContain(result.sensitivity)
      })
    })
  })

  describe("PII detection", () => {
    it("should detect CNIC as PII", () => {
      const result = inferColumnIntelligence("CNIC", "NVARCHAR", 15, true)
      
      expect(result.sensitivity).toBe("pii")
    })

    it("should detect SSN as PII", () => {
      const result = inferColumnIntelligence("SSN", "NVARCHAR", 11, true)
      
      expect(result.sensitivity).toBe("pii")
    })

    it("should detect passport as PII", () => {
      const result = inferColumnIntelligence("PassportNumber", "NVARCHAR", 20, true)
      
      expect(result.sensitivity).toBe("pii")
    })
  })

  describe("Date/Time detection", () => {
    it("should detect date columns", () => {
      const result = inferColumnIntelligence("DateOfBirth", "DATE", 10, true)
      
      expect(result.semanticType).toBe("date")
      expect(result.uiComponent).toBe("date_picker")
    })

    it("should detect datetime columns", () => {
      const result = inferColumnIntelligence("CreatedOn", "DATETIME", 23, true)
      
      expect(result.semanticType).toBe("datetime")
    })

    it("should detect timestamp patterns in names", () => {
      const patterns = ["CreatedAt", "ModifiedAt", "UpdatedOn", "LastLoginDate"]
      
      patterns.forEach(name => {
        const result = inferColumnIntelligence(name, "DATETIME", 23, true)
        expect(["date", "datetime", "timestamp"]).toContain(result.semanticType)
      })
    })
  })

  describe("Boolean detection", () => {
    it("should detect IsActive as boolean toggle", () => {
      const result = inferColumnIntelligence("IsActive", "BIT", 1, true)
      
      expect(result.semanticType).toBe("boolean")
      expect(result.uiComponent).toBe("toggle_switch")
    })

    it("should detect Is* pattern as boolean", () => {
      const patterns = ["IsDeleted", "IsVerified", "IsEnabled", "IsLocked"]
      
      patterns.forEach(name => {
        const result = inferColumnIntelligence(name, "BIT", 1, true)
        expect(result.semanticType).toBe("boolean")
      })
    })
  })

  describe("Money/Amount detection", () => {
    it("should detect amount columns", () => {
      const result = inferColumnIntelligence("Amount", "DECIMAL", 18, true)
      
      expect(result.semanticType).toBe("currency")
      expect(result.uiComponent).toBe("currency_input")
    })

    it("should detect price columns", () => {
      const result = inferColumnIntelligence("UnitPrice", "DECIMAL", 10, true)
      
      expect(result.semanticType).toBe("currency")
    })

    it("should detect fee columns", () => {
      const result = inferColumnIntelligence("ConsultationFee", "DECIMAL", 10, true)
      
      expect(result.semanticType).toBe("currency")
    })
  })

  describe("Foreign Key detection", () => {
    it("should detect FK columns ending with Id", () => {
      const result = inferColumnIntelligence("CityId", "UNIQUEIDENTIFIER", 36, true)
      
      expect(result.semanticType).toBe("foreign_key")
      expect(result.uiComponent).toBe("dropdown")
      expect(result.referencedEntity).toBe("City")
    })

    it("should extract referenced entity name correctly", () => {
      const result = inferColumnIntelligence("OrganizationTypeId", "INT", 4, true)
      
      expect(result.referencedEntity).toBe("OrganizationType")
    })
  })

  describe("Password detection", () => {
    it("should detect password columns", () => {
      const result = inferColumnIntelligence("Password", "NVARCHAR", 255, true)
      
      expect(result.semanticType).toBe("password")
      expect(result.uiComponent).toBe("password_input")
      expect(result.sensitivity).toBe("secret")
    })

    it("should detect password hash columns", () => {
      const result = inferColumnIntelligence("PasswordHash", "NVARCHAR", 500, true)
      
      expect(result.semanticType).toBe("password")
      expect(result.sensitivity).toBe("secret")
    })
  })

  describe("URL detection", () => {
    it("should detect URL columns", () => {
      const result = inferColumnIntelligence("Website", "NVARCHAR", 500, true)
      
      expect(result.semanticType).toBe("url")
      expect(result.uiComponent).toBe("url_input")
    })

    it("should detect URL pattern in names", () => {
      const result = inferColumnIntelligence("ProfileUrl", "NVARCHAR", 255, true)
      
      expect(result.semanticType).toBe("url")
    })
  })

  describe("Name detection", () => {
    it("should detect name columns", () => {
      const result = inferColumnIntelligence("FirstName", "NVARCHAR", 100, true)
      
      expect(result.semanticType).toBe("name")
      expect(result.uiComponent).toBe("text_input")
    })

    it("should detect full name columns", () => {
      const result = inferColumnIntelligence("FullName", "NVARCHAR", 200, true)
      
      expect(result.semanticType).toBe("name")
    })
  })

  describe("Description/Notes detection", () => {
    it("should detect description columns", () => {
      const result = inferColumnIntelligence("Description", "NVARCHAR", -1, true)
      
      expect(result.semanticType).toBe("text")
      expect(result.uiComponent).toBe("textarea")
    })

    it("should detect notes columns", () => {
      const result = inferColumnIntelligence("Notes", "NVARCHAR", -1, true)
      
      expect(result.semanticType).toBe("text")
      expect(result.uiComponent).toBe("textarea")
    })
  })

  describe("Auto-detection rules", () => {
    it("should infer searchability for name fields", () => {
      const result = inferColumnIntelligence("Name", "NVARCHAR", 100, true)
      
      expect(result.isSearchable).toBe(true)
    })

    it("should infer display for common display fields", () => {
      const result = inferColumnIntelligence("Title", "NVARCHAR", 200, true)
      
      expect(result.displayInList).toBe(true)
    })
  })

  describe("Confidence scoring", () => {
    it("should return high confidence for obvious patterns", () => {
      const emailResult = inferColumnIntelligence("Email", "NVARCHAR", 255, true)
      expect(emailResult.confidence).toBeGreaterThan(80)
    })

    it("should return lower confidence for ambiguous patterns", () => {
      const result = inferColumnIntelligence("Data", "NVARCHAR", 100, true)
      expect(result.confidence).toBeLessThan(80)
    })
  })
})
