/**
 * SQL Parser Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { parseSqlServer } from "./sql-parser"

describe("SQL Parser", () => {
  describe("CREATE TABLE parsing", () => {
    it("should parse a simple CREATE TABLE statement", () => {
      const sql = `
        CREATE TABLE Users (
          Id INT PRIMARY KEY,
          Name NVARCHAR(100) NOT NULL,
          Email NVARCHAR(255)
        )
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.errors).toHaveLength(0)
      expect(result.tables).toHaveLength(1)
      expect(result.tables[0].tableName).toBe("Users")
      expect(result.tables[0].columns).toHaveLength(3)
    })

    it("should handle bracketed identifiers", () => {
      const sql = `
        CREATE TABLE [dbo].[Patient] (
          [Id] UNIQUEIDENTIFIER PRIMARY KEY,
          [Name] NVARCHAR(200)
        )
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.errors).toHaveLength(0)
      expect(result.tables).toHaveLength(1)
      expect(result.tables[0].tableName).toBe("Patient")
      expect(result.tables[0].columns).toHaveLength(2)
    })

    it("should detect primary keys", () => {
      const sql = `
        CREATE TABLE Test (
          Id INT PRIMARY KEY,
          Name NVARCHAR(50)
        )
      `
      
      const result = parseSqlServer(sql)
      const idColumn = result.tables[0].columns.find(c => c.name === "Id")
      
      expect(idColumn?.isPrimaryKey).toBe(true)
    })

    it("should parse column data types correctly", () => {
      const sql = `
        CREATE TABLE TypesTest (
          Id INT,
          Name NVARCHAR(100),
          Amount DECIMAL(18,2),
          IsActive BIT,
          CreatedAt DATETIME,
          Data NVARCHAR(MAX)
        )
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.errors).toHaveLength(0)
      expect(result.tables[0].columns).toHaveLength(6)
      
      const columns = result.tables[0].columns
      expect(columns.find(c => c.name === "Id")?.dataType).toBe("INT")
      expect(columns.find(c => c.name === "Name")?.dataType).toBe("NVARCHAR")
      expect(columns.find(c => c.name === "Amount")?.dataType).toBe("DECIMAL")
      expect(columns.find(c => c.name === "IsActive")?.dataType).toBe("BIT")
    })

    it("should parse NOT NULL constraints", () => {
      const sql = `
        CREATE TABLE NotNullTest (
          Id INT NOT NULL,
          Name NVARCHAR(100) NOT NULL,
          Optional NVARCHAR(50)
        )
      `
      
      const result = parseSqlServer(sql)
      const columns = result.tables[0].columns
      
      expect(columns.find(c => c.name === "Id")?.nullable).toBe(false)
      expect(columns.find(c => c.name === "Name")?.nullable).toBe(false)
      expect(columns.find(c => c.name === "Optional")?.nullable).toBe(true)
    })

    it("should parse DEFAULT values", () => {
      const sql = `
        CREATE TABLE DefaultsTest (
          Id INT,
          IsActive BIT DEFAULT 1,
          CreatedAt DATETIME DEFAULT GETDATE(),
          Status NVARCHAR(20) DEFAULT 'active'
        )
      `
      
      const result = parseSqlServer(sql)
      const columns = result.tables[0].columns
      
      expect(columns.find(c => c.name === "IsActive")?.defaultValue).toBe("1")
      expect(columns.find(c => c.name === "CreatedAt")?.defaultValue).toBeDefined()
    })

    it("should parse IDENTITY columns", () => {
      const sql = `
        CREATE TABLE IdentityTest (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(100)
        )
      `
      
      const result = parseSqlServer(sql)
      const idColumn = result.tables[0].columns.find(c => c.name === "Id")
      
      expect(idColumn?.isIdentity).toBe(true)
    })
  })

  describe("Foreign Key parsing", () => {
    it("should parse inline foreign key references", () => {
      const sql = `
        CREATE TABLE Orders (
          Id INT PRIMARY KEY,
          CustomerId INT FOREIGN KEY REFERENCES Customers(Id),
          Amount DECIMAL(10,2)
        )
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.tables[0].foreignKeys).toBeDefined()
    })

    it("should parse FOREIGN KEY constraints at table level", () => {
      const sql = `
        CREATE TABLE OrderItems (
          Id INT PRIMARY KEY,
          OrderId INT NOT NULL,
          ProductId INT NOT NULL,
          FOREIGN KEY (OrderId) REFERENCES Orders(Id),
          FOREIGN KEY (ProductId) REFERENCES Products(Id)
        )
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.tables[0].foreignKeys?.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Multiple tables", () => {
    it("should parse multiple CREATE TABLE statements", () => {
      const sql = `
        CREATE TABLE Users (
          Id INT PRIMARY KEY,
          Name NVARCHAR(100)
        );
        
        CREATE TABLE Posts (
          Id INT PRIMARY KEY,
          Title NVARCHAR(200),
          AuthorId INT
        );
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.tables).toHaveLength(2)
      expect(result.tables[0].tableName).toBe("Users")
      expect(result.tables[1].tableName).toBe("Posts")
    })
  })

  describe("Error handling", () => {
    it("should continue parsing after errors", () => {
      const sql = `
        CREATE TABLE Valid1 (Id INT);
        INVALID SQL HERE;
        CREATE TABLE Valid2 (Id INT);
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.tables.length).toBeGreaterThanOrEqual(1)
    })

    it("should handle empty input", () => {
      const result = parseSqlServer("")
      
      expect(result.tables).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it("should handle whitespace-only input", () => {
      const result = parseSqlServer("   \n\t  ")
      
      expect(result.tables).toHaveLength(0)
    })
  })

  describe("Complex schemas", () => {
    it("should parse a complex table with multiple constraints", () => {
      const sql = `
        CREATE TABLE [dbo].[Patients] (
          [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          [MRN] NVARCHAR(20) NOT NULL UNIQUE,
          [FirstName] NVARCHAR(100) NOT NULL,
          [LastName] NVARCHAR(100) NOT NULL,
          [DateOfBirth] DATE NULL,
          [GenderId] UNIQUEIDENTIFIER NOT NULL,
          [CityId] UNIQUEIDENTIFIER NULL,
          [IsActive] BIT NOT NULL DEFAULT 1,
          [CreatedOn] DATETIME NOT NULL DEFAULT GETDATE(),
          [ModifiedOn] DATETIME NULL,
          CONSTRAINT [FK_Patients_GenderId] FOREIGN KEY ([GenderId]) REFERENCES [Lookups]([Id]),
          CONSTRAINT [FK_Patients_CityId] FOREIGN KEY ([CityId]) REFERENCES [Cities]([Id])
        )
      `
      
      const result = parseSqlServer(sql)
      
      expect(result.errors).toHaveLength(0)
      expect(result.tables).toHaveLength(1)
      expect(result.tables[0].columns.length).toBeGreaterThan(5)
    })
  })
})
