/**
 * Secrets Management & Encryption Utilities
 * Provides secure encryption, decryption, hashing, and key management
 * for sensitive data like API keys, database credentials, and PHI
 */

import crypto from 'crypto'

// Configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const ITERATIONS = 100000 // PBKDF2 iterations

/**
 * Get the encryption key from environment or generate one
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    console.warn('[Security] ENCRYPTION_KEY not set, using fallback. Set ENCRYPTION_KEY in production!')
    // In development, use a fallback (NOT for production)
    return 'dev-fallback-key-please-set-encryption-key-in-production-env'
  }
  return key
}

/**
 * Derive a cryptographic key from a password/secret
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns a base64-encoded string containing salt, iv, tag, and encrypted data
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty')
  }

  const password = getEncryptionKey()
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(IV_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt data encrypted with the encrypt function
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error('Ciphertext cannot be empty')
  }

  const password = getEncryptionKey()
  const combined = Buffer.from(ciphertext, 'base64')
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  
  const key = deriveKey(password, salt)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Hash a string using SHA-256
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Hash a string using SHA-512 with salt
 */
export function hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(32).toString('hex')
  const hashValue = crypto
    .createHash('sha512')
    .update(data + actualSalt)
    .digest('hex')
  
  return { hash: hashValue, salt: actualSalt }
}

/**
 * Verify a hash created with hashWithSalt
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const result = hashWithSalt(data, salt)
  return result.hash === hash
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a secure random string (URL-safe)
 */
export function generateSecureString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const bytes = crypto.randomBytes(length)
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  
  return result
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Create an HMAC signature
 */
export function createHMAC(data: string, secret?: string): string {
  const key = secret || getEncryptionKey()
  return crypto.createHmac('sha256', key).update(data).digest('hex')
}

/**
 * Verify an HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = createHMAC(data, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Mask sensitive data for display
 * Shows first N and last M characters
 */
export function maskSensitiveData(
  data: string,
  visibleStart: number = 4,
  visibleEnd: number = 4
): string {
  if (!data || data.length <= visibleStart + visibleEnd) {
    return '****'
  }
  
  const start = data.substring(0, visibleStart)
  const end = data.substring(data.length - visibleEnd)
  const masked = '*'.repeat(Math.min(data.length - visibleStart - visibleEnd, 10))
  
  return `${start}${masked}${end}`
}

/**
 * Securely compare two strings (timing-safe)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  )
}

/**
 * Generate a key pair for asymmetric encryption
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })
  
  return {
    publicKey: publicKey.toString(),
    privateKey: privateKey.toString()
  }
}

/**
 * Encrypt with public key (asymmetric)
 */
export function encryptWithPublicKey(data: string, publicKey: string): string {
  const buffer = Buffer.from(data, 'utf8')
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  )
  
  return encrypted.toString('base64')
}

/**
 * Decrypt with private key (asymmetric)
 */
export function decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
  const buffer = Buffer.from(encryptedData, 'base64')
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  )
  
  return decrypted.toString('utf8')
}

/**
 * Redact sensitive fields from an object
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'secret', 'token', 'key', 'credential', 'apiKey']
): T {
  const result = { ...obj }
  
  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase()
    
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]' as T[keyof T]
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = redactSensitiveFields(
        result[key] as Record<string, unknown>,
        sensitiveFields
      ) as T[keyof T]
    }
  }
  
  return result
}

/**
 * Secrets Manager class for managing encrypted secrets
 */
export class SecretsManager {
  private secrets: Map<string, string> = new Map()
  
  /**
   * Store an encrypted secret
   */
  set(key: string, value: string): void {
    this.secrets.set(key, encrypt(value))
  }
  
  /**
   * Retrieve and decrypt a secret
   */
  get(key: string): string | undefined {
    const encrypted = this.secrets.get(key)
    if (!encrypted) return undefined
    
    return decrypt(encrypted)
  }
  
  /**
   * Check if a secret exists
   */
  has(key: string): boolean {
    return this.secrets.has(key)
  }
  
  /**
   * Delete a secret
   */
  delete(key: string): boolean {
    return this.secrets.delete(key)
  }
  
  /**
   * List all secret keys (not values)
   */
  keys(): string[] {
    return Array.from(this.secrets.keys())
  }
  
  /**
   * Clear all secrets
   */
  clear(): void {
    this.secrets.clear()
  }
  
  /**
   * Export secrets as encrypted JSON
   */
  exportEncrypted(): string {
    const data = Object.fromEntries(this.secrets)
    return encrypt(JSON.stringify(data))
  }
  
  /**
   * Import secrets from encrypted JSON
   */
  importEncrypted(encryptedData: string): void {
    const decrypted = decrypt(encryptedData)
    const data = JSON.parse(decrypted)
    
    for (const [key, value] of Object.entries(data)) {
      this.secrets.set(key, value as string)
    }
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager()

// Type exports
export type { SecretsManager }
