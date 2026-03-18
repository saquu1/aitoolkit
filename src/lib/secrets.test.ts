/**
 * Tests for Secrets Management & Encryption Utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  encrypt,
  decrypt,
  hash,
  hashWithSalt,
  verifyHash,
  generateToken,
  generateSecureString,
  generateUUID,
  createHMAC,
  verifyHMAC,
  maskSensitiveData,
  secureCompare,
  redactSensitiveFields,
  SecretsManager,
} from './secrets'

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'my-secret-password-123'
      const encrypted = encrypt(plaintext)
      
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted.length).toBeGreaterThan(plaintext.length)
      
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same-password'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)
      
      expect(encrypted1).not.toBe(encrypted2)
      
      expect(decrypt(encrypted1)).toBe(plaintext)
      expect(decrypt(encrypted2)).toBe(plaintext)
    })

    it('should throw on empty plaintext', () => {
      expect(() => encrypt('')).toThrow()
    })

    it('should throw on empty ciphertext', () => {
      expect(() => decrypt('')).toThrow()
    })

    it('should handle special characters', () => {
      const plaintext = 'p@$$w0rd!#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode characters', () => {
      const plaintext = '密码测试 パスワード 🔐'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })
  })

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const data = 'test-data'
      const hash1 = hash(data)
      const hash2 = hash(data)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 hex characters
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hash('data1')
      const hash2 = hash('data2')
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('hashWithSalt', () => {
    it('should produce hash with salt', () => {
      const data = 'my-password'
      const result = hashWithSalt(data)
      
      expect(result.hash).toBeDefined()
      expect(result.salt).toBeDefined()
      expect(result.hash).toHaveLength(128) // SHA-512 produces 128 hex characters
    })

    it('should verify correct hash', () => {
      const data = 'my-password'
      const { hash, salt } = hashWithSalt(data)
      
      expect(verifyHash(data, hash, salt)).toBe(true)
    })

    it('should reject incorrect hash', () => {
      const data = 'my-password'
      const { hash, salt } = hashWithSalt(data)
      
      expect(verifyHash('wrong-password', hash, salt)).toBe(false)
    })

    it('should use provided salt', () => {
      const data = 'my-password'
      const customSalt = 'my-custom-salt'
      
      const result1 = hashWithSalt(data, customSalt)
      const result2 = hashWithSalt(data, customSalt)
      
      expect(result1.hash).toBe(result2.hash)
      expect(result1.salt).toBe(customSalt)
    })
  })
})

describe('Token Generation', () => {
  describe('generateToken', () => {
    it('should generate token of default length', () => {
      const token = generateToken()
      expect(token).toHaveLength(64) // 32 bytes = 64 hex chars
    })

    it('should generate token of custom length', () => {
      const token = generateToken(16)
      expect(token).toHaveLength(32) // 16 bytes = 32 hex chars
    })

    it('should generate unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('generateSecureString', () => {
    it('should generate string of default length', () => {
      const str = generateSecureString()
      expect(str).toHaveLength(32)
    })

    it('should generate string of custom length', () => {
      const str = generateSecureString(16)
      expect(str).toHaveLength(16)
    })

    it('should only contain URL-safe characters', () => {
      const str = generateSecureString(100)
      const urlSafePattern = /^[A-Za-z0-9_-]+$/
      expect(urlSafePattern.test(str)).toBe(true)
    })
  })

  describe('generateUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = generateUUID()
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuidPattern.test(uuid)).toBe(true)
    })

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      
      expect(uuid1).not.toBe(uuid2)
    })
  })
})

describe('HMAC', () => {
  describe('createHMAC and verifyHMAC', () => {
    it('should create and verify HMAC', () => {
      const data = 'message-to-sign'
      const signature = createHMAC(data)
      
      expect(signature).toBeDefined()
      expect(verifyHMAC(data, signature)).toBe(true)
    })

    it('should reject tampered data', () => {
      const data = 'original-message'
      const signature = createHMAC(data)
      
      expect(verifyHMAC('tampered-message', signature)).toBe(false)
    })

    it('should use custom secret', () => {
      const data = 'message'
      const secret = 'my-secret-key'
      const signature = createHMAC(data, secret)
      
      expect(verifyHMAC(data, signature, secret)).toBe(true)
      expect(verifyHMAC(data, signature, 'wrong-secret')).toBe(false)
    })
  })
})

describe('Utility Functions', () => {
  describe('maskSensitiveData', () => {
    it('should mask middle of string', () => {
      const data = '1234567890123456'
      const masked = maskSensitiveData(data, 4, 4)
      
      expect(masked).toBe('1234********3456')
    })

    it('should handle short strings', () => {
      expect(maskSensitiveData('abc')).toBe('****')
      expect(maskSensitiveData('')).toBe('****')
    })

    it('should use default visible characters', () => {
      const data = 'abcdefghijklmnop'
      const masked = maskSensitiveData(data)
      
      expect(masked.startsWith('abcd')).toBe(true)
      expect(masked.endsWith('mnop')).toBe(true)
    })
  })

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('test', 'test')).toBe(true)
    })

    it('should return false for different strings', () => {
      expect(secureCompare('test1', 'test2')).toBe(false)
    })

    it('should return false for different lengths', () => {
      expect(secureCompare('short', 'longer-string')).toBe(false)
    })
  })

  describe('redactSensitiveFields', () => {
    it('should redact password field', () => {
      const obj = { username: 'user', password: 'secret123' }
      const redacted = redactSensitiveFields(obj)
      
      expect(redacted.username).toBe('user')
      expect(redacted.password).toBe('[REDACTED]')
    })

    it('should redact apiKey field', () => {
      const obj = { name: 'test', apiKey: 'key-123' }
      const redacted = redactSensitiveFields(obj)
      
      expect(redacted.apiKey).toBe('[REDACTED]')
    })

    it('should redact nested sensitive fields', () => {
      const obj = {
        user: 'test',
        config: {
          token: 'my-token',
          other: 'value'
        }
      }
      const redacted = redactSensitiveFields(obj)
      
      expect(redacted.config.token).toBe('[REDACTED]')
      expect(redacted.config.other).toBe('value')
    })

    it('should allow custom sensitive fields', () => {
      const obj = { name: 'test', customSecret: 'hidden' }
      const redacted = redactSensitiveFields(obj, ['custom'])
      
      expect(redacted.customSecret).toBe('[REDACTED]')
    })
  })
})

describe('SecretsManager', () => {
  let manager: SecretsManager

  beforeEach(() => {
    manager = new SecretsManager()
  })

  it('should store and retrieve secrets', () => {
    manager.set('api-key', 'my-secret-key')
    
    expect(manager.has('api-key')).toBe(true)
    expect(manager.get('api-key')).toBe('my-secret-key')
  })

  it('should return undefined for non-existent key', () => {
    expect(manager.get('non-existent')).toBeUndefined()
  })

  it('should delete secrets', () => {
    manager.set('key1', 'value1')
    expect(manager.has('key1')).toBe(true)
    
    manager.delete('key1')
    expect(manager.has('key1')).toBe(false)
  })

  it('should list keys', () => {
    manager.set('key1', 'value1')
    manager.set('key2', 'value2')
    
    const keys = manager.keys()
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
    expect(keys).toHaveLength(2)
  })

  it('should clear all secrets', () => {
    manager.set('key1', 'value1')
    manager.set('key2', 'value2')
    
    manager.clear()
    
    expect(manager.keys()).toHaveLength(0)
  })

  it('should export and import encrypted secrets', () => {
    manager.set('key1', 'value1')
    manager.set('key2', 'value2')
    
    const exported = manager.exportEncrypted()
    expect(exported).toBeDefined()
    
    const newManager = new SecretsManager()
    newManager.importEncrypted(exported)
    
    expect(newManager.get('key1')).toBe('value1')
    expect(newManager.get('key2')).toBe('value2')
  })
})
