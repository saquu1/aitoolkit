"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"

const TOKEN_KEY = "aitoolkit-auth-token"

interface UserInfo {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  user: UserInfo | null
  loginEnabled: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  user: null,
  loginEnabled: false,
  login: async () => ({ success: false }),
  logout: () => {},
  checkAuth: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loginEnabled, setLoginEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  // ─── On mount: load token from localStorage ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) {
      setToken(saved)
    }
  }, [])

  // ─── Check auth status (login enabled + token valid) ────────────────────
  const checkAuth = useCallback(async () => {
    try {
      // Check if login is enabled
      const statusRes = await fetch("/api/auth/status")
      const statusData = await statusRes.json()
      setLoginEnabled(statusData.loginEnabled)

      // If we have a token, validate it
      const saved = localStorage.getItem(TOKEN_KEY)
      if (saved) {
        const checkRes = await fetch("/api/auth/check", {
          headers: { Authorization: `Bearer ${saved}` },
        })
        const checkData = await checkRes.json()
        if (checkData.valid) {
          setToken(saved)
          setUser(checkData.user)
        } else {
          // Token expired or invalid — clear it
          setToken(null)
          setUser(null)
          localStorage.removeItem(TOKEN_KEY)
        }
      }
    } catch (err) {
      console.warn("[Auth] Status check failed:", err)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    checkAuth()
    // Re-check every 5 minutes
    const interval = setInterval(checkAuth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkAuth])

  // ─── Override window.fetch to add Authorization header ───────────────────
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const saved = localStorage.getItem(TOKEN_KEY)
      if (saved) {
        const newInit = init || {}
        const headers = new Headers(newInit.headers)
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${saved}`)
        }
        newInit.headers = headers
        return originalFetch(input, newInit)
      }
      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // ─── Login ─────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.success) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem(TOKEN_KEY, data.token)
        return { success: true }
      } else {
        return { success: false, error: data.error || "Login failed" }
      }
    } catch (err: any) {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  // ─── Logout ────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) {
      // Tell server to invalidate token
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${saved}` },
      }).catch(() => {})
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!user,
        user,
        loginEnabled,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
