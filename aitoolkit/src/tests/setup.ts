/**
 * Test Setup File
 * Configures the testing environment
 */

import "@testing-library/jest-dom"
import { vi } from "vitest"

// ============================================================================
// ENVIRONMENT MOCKS
// ============================================================================

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: "file:./test.db",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "test-secret-key-for-testing-min-32-chars",
  REDIS_URL: "",
}

// ============================================================================
// NEXT.JS MOCKS
// ============================================================================

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve({
    get: vi.fn((key: string) => {
      const headers: Record<string, string> = {
        "x-forwarded-for": "127.0.0.1",
        "user-agent": "test-agent",
        "content-type": "application/json",
      }
      return headers[key] || null
    }),
  })),
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// ============================================================================
// PRISMA MOCK
// ============================================================================

// Create a mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  company: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  toolkitProject: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  toolkitTable: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  userCompany: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

vi.mock("./lib/db", () => ({
  prisma: mockPrisma,
}))

export { mockPrisma }

// ============================================================================
// NEXT-AUTH MOCK
// ============================================================================

vi.mock("./lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
  getCurrentUser: vi.fn(),
  requireAuth: vi.fn(),
}))

// ============================================================================
// REDIS MOCK
// ============================================================================

vi.mock("ioredis", () => {
  const MockRedis = vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(() => Promise.resolve(1)),
    expire: vi.fn(),
    pexpire: vi.fn(),
    pipeline: vi.fn(() => ({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: vi.fn(() => Promise.resolve([[null, 0], [null, 1]])),
    })),
    on: vi.fn(),
  }))
  return { default: MockRedis }
})

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock fetch
global.fetch = vi.fn()

// Mock console methods in tests (optional, uncomment if needed)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// }

// Mock Request and Response for API route testing
class MockRequest {
  method: string
  url: string
  headers: Headers
  private _body: any

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || "GET"
    this.headers = new Headers(init?.headers as HeadersInit)
    this._body = init?.body
  }

  async json() {
    return typeof this._body === "string" ? JSON.parse(this._body) : this._body
  }

  async text() {
    return typeof this._body === "string" ? this._body : JSON.stringify(this._body)
  }
}

class MockResponse {
  status: number
  statusText: string
  headers: Headers
  private _body: any

  constructor(body?: any, init?: ResponseInit) {
    this._body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || "OK"
    this.headers = new Headers(init?.headers)
  }

  async json() {
    return this._body
  }

  async text() {
    return typeof this._body === "string" ? this._body : JSON.stringify(this._body)
  }
}

// @ts-ignore
global.Request = MockRequest as any
// @ts-ignore
global.Response = MockResponse as any

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
})

// Export test utilities
export function createMockRequest(
  url: string,
  options?: {
    method?: string
    body?: any
    headers?: Record<string, string>
  }
): Request {
  return new MockRequest(url, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  }) as Request
}

export function createMockResponse(
  body?: any,
  options?: {
    status?: number
    headers?: Record<string, string>
  }
): Response {
  return new MockResponse(body, {
    status: options?.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  }) as Response
}
