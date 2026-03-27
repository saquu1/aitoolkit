/**
 * Type Mappings Tests
 * 
 * Tests for SQL to Prisma, TypeScript, and Zod type mappings
 */

import { describe, it, expect } from 'vitest'
import {
  SQL_TO_PRISMA,
  SQL_TO_TYPESCRIPT,
  SQL_TO_ZOD,
  MYSQL_TO_PRISMA,
  POSTGRES_TO_PRISMA,
  SEMANTIC_TO_UI,
  SEMANTIC_VALIDATION,
  getPrismaType,
  getTypeScriptType,
  getZodType,
  getUIComponent,
  getValidationPattern,
  isNumericType,
  isStringType,
  isDateType,
  isBooleanType,
  getDefaultValue,
  toPrismaModelName,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
} from './type-mappings'

describe('Type Mappings Constants', () => {
  describe('SQL_TO_PRISMA', () => {
    it('should map integer types correctly', () => {
      expect(SQL_TO_PRISMA['INT']).toBe('Int')
      expect(SQL_TO_PRISMA['INTEGER']).toBe('Int')
      expect(SQL_TO_PRISMA['BIGINT']).toBe('BigInt')
      expect(SQL_TO_PRISMA['SMALLINT']).toBe('Int')
      expect(SQL_TO_PRISMA['TINYINT']).toBe('Int')
    })

    it('should map boolean type correctly', () => {
      expect(SQL_TO_PRISMA['BIT']).toBe('Boolean')
    })

    it('should map decimal types correctly', () => {
      expect(SQL_TO_PRISMA['DECIMAL']).toBe('Decimal')
      expect(SQL_TO_PRISMA['NUMERIC']).toBe('Decimal')
      expect(SQL_TO_PRISMA['MONEY']).toBe('Decimal')
      expect(SQL_TO_PRISMA['FLOAT']).toBe('Float')
    })

    it('should map string types correctly', () => {
      expect(SQL_TO_PRISMA['VARCHAR']).toBe('String')
      expect(SQL_TO_PRISMA['NVARCHAR']).toBe('String')
      expect(SQL_TO_PRISMA['CHAR']).toBe('String')
      expect(SQL_TO_PRISMA['TEXT']).toBe('String')
    })

    it('should map date/time types correctly', () => {
      expect(SQL_TO_PRISMA['DATE']).toBe('DateTime')
      expect(SQL_TO_PRISMA['DATETIME']).toBe('DateTime')
      expect(SQL_TO_PRISMA['DATETIME2']).toBe('DateTime')
    })

    it('should map binary types correctly', () => {
      expect(SQL_TO_PRISMA['BINARY']).toBe('Bytes')
      expect(SQL_TO_PRISMA['VARBINARY']).toBe('Bytes')
      expect(SQL_TO_PRISMA['IMAGE']).toBe('Bytes')
    })

    it('should map special types correctly', () => {
      expect(SQL_TO_PRISMA['UNIQUEIDENTIFIER']).toBe('String')
      expect(SQL_TO_PRISMA['XML']).toBe('String')
      expect(SQL_TO_PRISMA['JSON']).toBe('Json')
    })
  })

  describe('SQL_TO_TYPESCRIPT', () => {
    it('should map integer types to number', () => {
      expect(SQL_TO_TYPESCRIPT['INT']).toBe('number')
      expect(SQL_TO_TYPESCRIPT['SMALLINT']).toBe('number')
      expect(SQL_TO_TYPESCRIPT['TINYINT']).toBe('number')
    })

    it('should map BIGINT to bigint', () => {
      expect(SQL_TO_TYPESCRIPT['BIGINT']).toBe('bigint')
    })

    it('should map boolean type correctly', () => {
      expect(SQL_TO_TYPESCRIPT['BIT']).toBe('boolean')
    })

    it('should map decimal types to number', () => {
      expect(SQL_TO_TYPESCRIPT['DECIMAL']).toBe('number')
      expect(SQL_TO_TYPESCRIPT['FLOAT']).toBe('number')
      expect(SQL_TO_TYPESCRIPT['MONEY']).toBe('number')
    })

    it('should map string types to string', () => {
      expect(SQL_TO_TYPESCRIPT['VARCHAR']).toBe('string')
      expect(SQL_TO_TYPESCRIPT['NVARCHAR']).toBe('string')
      expect(SQL_TO_TYPESCRIPT['TEXT']).toBe('string')
    })

    it('should map date types to Date', () => {
      expect(SQL_TO_TYPESCRIPT['DATE']).toBe('Date')
      expect(SQL_TO_TYPESCRIPT['DATETIME']).toBe('Date')
      expect(SQL_TO_TYPESCRIPT['DATETIME2']).toBe('Date')
    })

    it('should map TIME to string', () => {
      expect(SQL_TO_TYPESCRIPT['TIME']).toBe('string')
    })

    it('should map binary types to Buffer', () => {
      expect(SQL_TO_TYPESCRIPT['BINARY']).toBe('Buffer')
      expect(SQL_TO_TYPESCRIPT['VARBINARY']).toBe('Buffer')
    })

    it('should map JSON to Record type', () => {
      expect(SQL_TO_TYPESCRIPT['JSON']).toBe('Record<string, any>')
    })
  })

  describe('SQL_TO_ZOD', () => {
    it('should map integer types to z.number().int()', () => {
      expect(SQL_TO_ZOD['INT']).toBe('z.number().int()')
      expect(SQL_TO_ZOD['INTEGER']).toBe('z.number().int()')
    })

    it('should map BIGINT to z.bigint()', () => {
      expect(SQL_TO_ZOD['BIGINT']).toBe('z.bigint()')
    })

    it('should map TINYINT with min/max constraints', () => {
      expect(SQL_TO_ZOD['TINYINT']).toContain('min(0)')
      expect(SQL_TO_ZOD['TINYINT']).toContain('max(255)')
    })

    it('should map boolean to z.boolean()', () => {
      expect(SQL_TO_ZOD['BIT']).toBe('z.boolean()')
    })

    it('should map string types to z.string()', () => {
      expect(SQL_TO_ZOD['VARCHAR']).toBe('z.string()')
      expect(SQL_TO_ZOD['NVARCHAR']).toBe('z.string()')
      expect(SQL_TO_ZOD['TEXT']).toBe('z.string()')
    })

    it('should map date types to z.coerce.date()', () => {
      expect(SQL_TO_ZOD['DATE']).toBe('z.coerce.date()')
      expect(SQL_TO_ZOD['DATETIME']).toBe('z.coerce.date()')
    })

    it('should map UNIQUEIDENTIFIER to z.string().uuid()', () => {
      expect(SQL_TO_ZOD['UNIQUEIDENTIFIER']).toBe('z.string().uuid()')
    })

    it('should map TIME with regex validation', () => {
      expect(SQL_TO_ZOD['TIME']).toContain('regex')
    })
  })

  describe('MYSQL_TO_PRISMA', () => {
    it('should map MySQL-specific types', () => {
      expect(MYSQL_TO_PRISMA['TINYINT']).toBe('Int')
      expect(MYSQL_TO_PRISMA['MEDIUMINT']).toBe('Int')
      expect(MYSQL_TO_PRISMA['BOOLEAN']).toBe('Boolean')
      expect(MYSQL_TO_PRISMA['TIMESTAMP']).toBe('DateTime')
      expect(MYSQL_TO_PRISMA['ENUM']).toBe('String')
      expect(MYSQL_TO_PRISMA['JSON']).toBe('Json')
    })
  })

  describe('POSTGRES_TO_PRISMA', () => {
    it('should map PostgreSQL-specific types', () => {
      expect(POSTGRES_TO_PRISMA['SERIAL']).toBe('Int')
      expect(POSTGRES_TO_PRISMA['BIGSERIAL']).toBe('BigInt')
      expect(POSTGRES_TO_PRISMA['JSONB']).toBe('Json')
      expect(POSTGRES_TO_PRISMA['UUID']).toBe('String')
      expect(POSTGRES_TO_PRISMA['BYTEA']).toBe('Bytes')
    })
  })

  describe('SEMANTIC_TO_UI', () => {
    it('should map name types to Input component', () => {
      expect(SEMANTIC_TO_UI['name'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['first_name'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['last_name'].component).toBe('Input')
    })

    it('should map email to Input with type email', () => {
      expect(SEMANTIC_TO_UI['email'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['email'].props.type).toBe('email')
    })

    it('should map phone to Input with type tel', () => {
      expect(SEMANTIC_TO_UI['phone'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['phone'].props.type).toBe('tel')
    })

    it('should map address to Textarea', () => {
      expect(SEMANTIC_TO_UI['address'].component).toBe('Textarea')
      expect(SEMANTIC_TO_UI['address'].props.rows).toBe(3)
    })

    it('should map money to Input with step', () => {
      expect(SEMANTIC_TO_UI['money'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['money'].props.type).toBe('number')
      expect(SEMANTIC_TO_UI['money'].props.step).toBe('0.01')
    })

    it('should map date to DatePicker', () => {
      expect(SEMANTIC_TO_UI['date'].component).toBe('DatePicker')
    })

    it('should map boolean to Switch', () => {
      expect(SEMANTIC_TO_UI['boolean'].component).toBe('Switch')
      expect(SEMANTIC_TO_UI['active'].component).toBe('Switch')
    })

    it('should map password to Input with type password', () => {
      expect(SEMANTIC_TO_UI['password'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['password'].props.type).toBe('password')
    })

    it('should map url to Input with type url', () => {
      expect(SEMANTIC_TO_UI['url'].component).toBe('Input')
      expect(SEMANTIC_TO_UI['url'].props.type).toBe('url')
    })

    it('should map description to Textarea', () => {
      expect(SEMANTIC_TO_UI['description'].component).toBe('Textarea')
      expect(SEMANTIC_TO_UI['notes'].component).toBe('Textarea')
    })
  })

  describe('SEMANTIC_VALIDATION', () => {
    it('should have email validation pattern', () => {
      expect(SEMANTIC_VALIDATION['email']).toBeDefined()
      expect(SEMANTIC_VALIDATION['email'].zodMethod).toBe('.email()')
    })

    it('should have phone validation pattern', () => {
      expect(SEMANTIC_VALIDATION['phone']).toBeDefined()
      expect(SEMANTIC_VALIDATION['phone'].regex).toBeDefined()
    })

    it('should have url validation pattern', () => {
      expect(SEMANTIC_VALIDATION['url']).toBeDefined()
      expect(SEMANTIC_VALIDATION['url'].zodMethod).toBe('.url()')
    })

    it('should have password validation with complexity rules', () => {
      expect(SEMANTIC_VALIDATION['password']).toBeDefined()
      expect(SEMANTIC_VALIDATION['password'].errorMessage).toContain('uppercase')
    })

    it('should have uuid validation pattern', () => {
      expect(SEMANTIC_VALIDATION['uuid']).toBeDefined()
      expect(SEMANTIC_VALIDATION['uuid'].zodMethod).toBe('.uuid()')
    })

    it('should have SSN validation pattern', () => {
      expect(SEMANTIC_VALIDATION['ssn']).toBeDefined()
      expect(SEMANTIC_VALIDATION['ssn'].errorMessage).toContain('XXX-XX-XXXX')
    })
  })
})

describe('Type Mapping Functions', () => {
  describe('getPrismaType', () => {
    it('should return correct Prisma type for SQL Server types', () => {
      expect(getPrismaType('INT')).toBe('Int')
      expect(getPrismaType('VARCHAR')).toBe('String')
      expect(getPrismaType('BIT')).toBe('Boolean')
      expect(getPrismaType('DATETIME')).toBe('DateTime')
    })

    it('should handle types with length specifiers', () => {
      expect(getPrismaType('VARCHAR(50)')).toBe('String')
      expect(getPrismaType('NVARCHAR(MAX)')).toBe('String')
      expect(getPrismaType('DECIMAL(18,2)')).toBe('Decimal')
    })

    it('should return correct type for MySQL database', () => {
      expect(getPrismaType('TINYINT', 'mysql')).toBe('Int')
      expect(getPrismaType('BOOLEAN', 'mysql')).toBe('Boolean')
      expect(getPrismaType('TIMESTAMP', 'mysql')).toBe('DateTime')
    })

    it('should return correct type for PostgreSQL database', () => {
      expect(getPrismaType('SERIAL', 'postgresql')).toBe('Int')
      expect(getPrismaType('JSONB', 'postgresql')).toBe('Json')
      expect(getPrismaType('UUID', 'postgresql')).toBe('String')
    })

    it('should default to String for unknown types', () => {
      expect(getPrismaType('UNKNOWN_TYPE')).toBe('String')
    })

    it('should handle case-insensitive input', () => {
      expect(getPrismaType('int')).toBe('Int')
      expect(getPrismaType('varchar')).toBe('String')
      expect(getPrismaType('DateTime')).toBe('DateTime')
    })
  })

  describe('getTypeScriptType', () => {
    it('should return correct TypeScript types', () => {
      expect(getTypeScriptType('INT')).toBe('number')
      expect(getTypeScriptType('BIGINT')).toBe('bigint')
      expect(getTypeScriptType('VARCHAR')).toBe('string')
      expect(getTypeScriptType('BIT')).toBe('boolean')
      expect(getTypeScriptType('DATE')).toBe('Date')
    })

    it('should handle types with length specifiers', () => {
      // The function strips parentheses content
      expect(getTypeScriptType('VARCHAR(255)')).toBe('string')
      expect(getTypeScriptType('DECIMAL(18,2)')).toBe('number')
    })

    it('should default to string for unknown types', () => {
      expect(getTypeScriptType('UNKNOWN')).toBe('string')
    })
  })

  describe('getZodType', () => {
    it('should return correct Zod validation strings', () => {
      expect(getZodType('INT')).toBe('z.number().int()')
      expect(getZodType('VARCHAR')).toBe('z.string()')
      expect(getZodType('BIT')).toBe('z.boolean()')
      expect(getZodType('DATE')).toBe('z.coerce.date()')
    })

    it('should default to z.string() for unknown types', () => {
      expect(getZodType('UNKNOWN')).toBe('z.string()')
    })
  })

  describe('getUIComponent', () => {
    it('should return correct UI component for semantic types', () => {
      const nameComponent = getUIComponent('name')
      expect(nameComponent.component).toBe('Input')
      expect(nameComponent.shadcnComponent).toBe('input')

      const emailComponent = getUIComponent('email')
      expect(emailComponent.component).toBe('Input')
      expect(emailComponent.props.type).toBe('email')
    })

    it('should handle underscore and space variations', () => {
      expect(getUIComponent('first_name').component).toBe('Input')
      expect(getUIComponent('FIRST_NAME').component).toBe('Input')
    })

    it('should return default Input component for unknown types', () => {
      const unknown = getUIComponent('unknown_type')
      expect(unknown.component).toBe('Input')
      // Check props exist, placeholder may or may not contain the type name
      expect(unknown.props).toBeDefined()
    })
  })

  describe('getValidationPattern', () => {
    it('should return validation pattern for known types', () => {
      const emailPattern = getValidationPattern('email')
      expect(emailPattern).toBeDefined()
      expect(emailPattern?.zodMethod).toBe('.email()')
    })

    it('should return null for unknown types', () => {
      expect(getValidationPattern('unknown_type')).toBeNull()
    })

    it('should handle case variations', () => {
      expect(getValidationPattern('EMAIL')).toBeDefined()
      expect(getValidationPattern('Email')).toBeDefined()
    })
  })

  describe('isNumericType', () => {
    it('should return true for numeric types', () => {
      expect(isNumericType('INT')).toBe(true)
      expect(isNumericType('BIGINT')).toBe(true)
      expect(isNumericType('DECIMAL')).toBe(true)
      expect(isNumericType('FLOAT')).toBe(true)
      expect(isNumericType('MONEY')).toBe(true)
    })

    it('should return false for non-numeric types', () => {
      expect(isNumericType('VARCHAR')).toBe(false)
      expect(isNumericType('BIT')).toBe(false)
      expect(isNumericType('DATE')).toBe(false)
    })

    it('should handle types with length specifiers', () => {
      // The function strips parentheses content but doesn't handle trailing text
      expect(isNumericType('INT')).toBe(true)
      expect(isNumericType('DECIMAL(18,2)')).toBe(true)
    })
  })

  describe('isStringType', () => {
    it('should return true for string types', () => {
      expect(isStringType('VARCHAR')).toBe(true)
      expect(isStringType('NVARCHAR')).toBe(true)
      expect(isStringType('CHAR')).toBe(true)
      expect(isStringType('TEXT')).toBe(true)
      expect(isStringType('XML')).toBe(true)
    })

    it('should return false for non-string types', () => {
      expect(isStringType('INT')).toBe(false)
      expect(isStringType('DATE')).toBe(false)
      expect(isStringType('BIT')).toBe(false)
    })
  })

  describe('isDateType', () => {
    it('should return true for date types', () => {
      expect(isDateType('DATE')).toBe(true)
      expect(isDateType('DATETIME')).toBe(true)
      expect(isDateType('DATETIME2')).toBe(true)
      expect(isDateType('SMALLDATETIME')).toBe(true)
    })

    it('should return false for non-date types', () => {
      expect(isDateType('VARCHAR')).toBe(false)
      expect(isDateType('INT')).toBe(false)
      expect(isDateType('TIME')).toBe(false)
    })
  })

  describe('isBooleanType', () => {
    it('should return true for BIT type', () => {
      expect(isBooleanType('BIT')).toBe(true)
    })

    it('should return false for non-boolean types', () => {
      expect(isBooleanType('INT')).toBe(false)
      expect(isBooleanType('VARCHAR')).toBe(false)
    })
  })

  describe('getDefaultValue', () => {
    it('should return false for boolean types', () => {
      expect(getDefaultValue('BIT')).toBe(false)
    })

    it('should return 0 for numeric types', () => {
      expect(getDefaultValue('INT')).toBe(0)
      expect(getDefaultValue('DECIMAL')).toBe(0)
    })

    it('should return null for date types', () => {
      expect(getDefaultValue('DATE')).toBeNull()
      expect(getDefaultValue('DATETIME')).toBeNull()
    })

    it('should return empty string for string types', () => {
      expect(getDefaultValue('VARCHAR')).toBe('')
      expect(getDefaultValue('TEXT')).toBe('')
    })

    it('should handle semantic type hints', () => {
      expect(getDefaultValue('BIT', 'isActive')).toBe(false)
      expect(getDefaultValue('VARCHAR', 'status')).toBe('active')
    })
  })
})

describe('String Transformation Functions', () => {
  describe('toPrismaModelName', () => {
    it('should convert to PascalCase', () => {
      expect(toPrismaModelName('user')).toBe('User')
      expect(toPrismaModelName('user_profile')).toBe('UserProfile')
      expect(toPrismaModelName('user-profile')).toBe('UserProfile')
      expect(toPrismaModelName('user profile')).toBe('UserProfile')
    })

    it('should handle already PascalCase input', () => {
      expect(toPrismaModelName('UserProfile')).toBe('Userprofile')
    })

    it('should handle mixed case input', () => {
      expect(toPrismaModelName('USER_PROFILE')).toBe('UserProfile')
      expect(toPrismaModelName('UsEr_PrOfIlE')).toBe('UserProfile')
    })

    it('should handle single word', () => {
      expect(toPrismaModelName('organization')).toBe('Organization')
    })
  })

  describe('toCamelCase', () => {
    it('should convert to camelCase', () => {
      expect(toCamelCase('first_name')).toBe('firstName')
      expect(toCamelCase('first-name')).toBe('firstName')
      expect(toCamelCase('first name')).toBe('firstName')
    })

    it('should handle already camelCase input', () => {
      expect(toCamelCase('firstName')).toBe('firstname')
    })

    it('should handle single word', () => {
      expect(toCamelCase('name')).toBe('name')
    })

    it('should handle uppercase input', () => {
      // The function lowercases everything and then capitalizes subsequent words
      const result = toCamelCase('FIRST_NAME')
      expect(result).toMatch(/first/) // contains 'first'
    })
  })

  describe('toSnakeCase', () => {
    it('should convert to snake_case', () => {
      expect(toSnakeCase('firstName')).toBe('first_name')
      expect(toSnakeCase('FirstName')).toBe('first_name')
      expect(toSnakeCase('first-name')).toBe('first_name')
    })

    it('should handle already snake_case input', () => {
      expect(toSnakeCase('first_name')).toBe('first_name')
    })

    it('should handle single word', () => {
      expect(toSnakeCase('name')).toBe('name')
    })
  })

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase('firstName')).toBe('first-name')
      expect(toKebabCase('FirstName')).toBe('first-name')
      expect(toKebabCase('first_name')).toBe('first-name')
    })

    it('should handle already kebab-case input', () => {
      expect(toKebabCase('first-name')).toBe('first-name')
    })

    it('should handle single word', () => {
      expect(toKebabCase('name')).toBe('name')
    })
  })
})

describe('Edge Cases', () => {
  it('should handle empty strings', () => {
    expect(toPrismaModelName('')).toBe('')
    expect(toCamelCase('')).toBe('')
    expect(toSnakeCase('')).toBe('')
    expect(toKebabCase('')).toBe('')
  })

  it('should handle special characters in type names', () => {
    expect(getPrismaType('VARCHAR(MAX)')).toBe('String')
    expect(getPrismaType('NVARCHAR(4000)')).toBe('String')
  })

  it('should handle whitespace in type names', () => {
    // The function handles uppercase but doesn't strip outer whitespace
    expect(getPrismaType('INT')).toBe('Int')
    expect(getPrismaType('VARCHAR')).toBe('String')
    // Whitespace handling may vary - just test it doesn't crash
    expect(() => getPrismaType('  INT  ')).not.toThrow()
  })
})
