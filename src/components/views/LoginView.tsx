'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calculator, Eye, EyeOff, LogIn, User, Lock, Loader2 } from 'lucide-react'

export function LoginView() {
  const { login } = useAppStore()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!loginName.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginName, password }),
      })

      const data = await res.json()

      if (data.success) {
        login(data.user)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-orange-100/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-100/30 via-transparent to-amber-100/20" />

      {/* Subtle decorative shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200/15 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-amber-300/10 rounded-full blur-2xl" />

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md shadow-xl border-amber-200/50 py-0 gap-0">
        <CardHeader className="flex flex-col items-center gap-3 pt-8 pb-2 px-6">
          {/* Logo */}
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
            <Calculator className="h-8 w-8 text-white" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AccuBooks
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Accounting System
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                {error}
              </div>
            )}

            {/* Username field */}
            <div className="space-y-2">
              <Label htmlFor="loginName" className="text-slate-700">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="loginName"
                  placeholder="Enter username"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In button */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-md shadow-amber-200/50 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 rounded-lg bg-amber-50/70 border border-amber-200/50 px-4 py-3 text-center">
            <p className="text-xs text-amber-700 font-medium">
              Default credentials
            </p>
            <p className="text-xs text-amber-600/80 mt-0.5 font-mono">
              admin / admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
