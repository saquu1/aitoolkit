/**
 * Simple Token Auth System (No Cookies)
 * ======================================
 * Token-based authentication using localStorage + Authorization header.
 * Works in iframes, cross-origin, and behind proxies (unlike cookies).
 * 
 * How it works:
 * 1. User logs in → server returns a random token
 * 2. Client stores token in localStorage
 * 3. Client sends token as "Authorization: Bearer <token>" on every request
 * 4. Middleware validates token if login is enabled
 * 5. Settings page toggles login requirement ON/OFF
 */

interface TokenData {
  userId: string
  email: string
  name: string
  role: string
  createdAt: number
  expiresAt: number
}

interface AuthState {
  loginEnabled: boolean
  tokens: Map<string, TokenData>
}

// Use globalThis to ensure state is shared across middleware and API routes
// (Next.js standalone may bundle them in separate module contexts)
const AUTH_GLOBAL_KEY = "__aitoolkit_auth_state__"

function getAuthState(): AuthState {
  if (!(globalThis as any)[AUTH_GLOBAL_KEY]) {
    ;(globalThis as any)[AUTH_GLOBAL_KEY] = {
      loginEnabled: false, // OFF by default — all routes open
      tokens: new Map(),
    }
  }
  return (globalThis as any)[AUTH_GLOBAL_KEY]
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function isLoginEnabled(): boolean {
  return getAuthState().loginEnabled
}

export function setLoginEnabled(enabled: boolean): { enabled: boolean } {
  getAuthState().loginEnabled = enabled
  return { enabled }
}

// ─── Token Management ─────────────────────────────────────────────────────────

export function createToken(user: {
  id: string
  email: string
  name: string
  role: string
}): string {
  // Generate a random 48-byte hex token
  const bytes = new Uint8Array(48)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 48; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const token = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")

  getAuthState().tokens.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  })

  return token
}

export function validateToken(
  token: string
): { userId: string; email: string; name: string; role: string } | null {
  if (!token) return null

  const data = getAuthState().tokens.get(token)
  if (!data) return null

  // Check expiry
  if (Date.now() > data.expiresAt) {
    getAuthState().tokens.delete(token)
    return null
  }

  return {
    userId: data.userId,
    email: data.email,
    name: data.name,
    role: data.role,
  }
}

export function removeToken(token: string): boolean {
  return getAuthState().tokens.delete(token)
}

// ─── Middleware Helper ────────────────────────────────────────────────────────

export interface AuthResult {
  authenticated: boolean
  user: { userId: string; email: string; name: string; role: string } | null
  token: string | null
}

/**
 * Check auth from a request's Authorization header.
 * Returns { authenticated: false } if login is disabled (no auth needed).
 */
export function checkRequestAuth(authHeader: string | null): AuthResult {
  // If login is disabled, always allow
  if (!getAuthState().loginEnabled) {
    return { authenticated: true, user: null, token: null }
  }

  // Login enabled — require valid token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, user: null, token: null }
  }

  const token = authHeader.slice(7).trim()
  const user = validateToken(token)

  if (!user) {
    return { authenticated: false, user: null, token }
  }

  return { authenticated: true, user, token }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getAuthStats() {
  let activeTokens = 0
  const now = Date.now()
  for (const [, data] of getAuthState().tokens) {
    if (now < data.expiresAt) activeTokens++
  }
  return {
    loginEnabled: getAuthState().loginEnabled,
    activeTokens,
    totalTokens: getAuthState().tokens.size,
  }
}
