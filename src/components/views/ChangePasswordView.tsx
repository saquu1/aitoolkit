'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Lock, Loader2, Check, X, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface PasswordStrength {
  score: number
  label: string
  color: string
  bgColor: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: '', bgColor: '' }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'text-red-500', bgColor: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'text-orange-500', bgColor: 'bg-orange-500' }
  if (score <= 3) return { score, label: 'Good', color: 'text-amber-500', bgColor: 'bg-amber-500' }
  if (score <= 4) return { score, label: 'Strong', color: 'text-emerald-500', bgColor: 'bg-emerald-500' }
  return { score, label: 'Very Strong', color: 'text-emerald-600', bgColor: 'bg-emerald-600' }
}

export function ChangePasswordView() {
  const { currentUser } = useAppStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword])

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const isMinLength = newPassword.length >= 6
  const canSubmit = currentPassword && newPassword && confirmPassword && isMinLength && passwordsMatch

  const requirements = [
    { label: 'At least 6 characters', met: isMinLength },
    { label: 'Passwords match', met: passwordsMatch },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      toast.error('User not found. Please log in again.')
      return
    }

    if (!isMinLength) {
      toast.error('New password must be at least 6 characters.')
      return
    }

    if (!passwordsMatch) {
      toast.error('New passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      // First verify the current password via login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginName: currentUser.loginName, password: currentPassword }),
      })

      const loginData = await loginRes.json()

      if (!loginData.success) {
        toast.error('Current password is incorrect.')
        setIsLoading(false)
        return
      }

      // Then update the password
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          newPassword,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Password updated successfully.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to update password.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card className="shadow-sm border-slate-200/60 py-0 gap-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Update your account password
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-slate-700">
                Current Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-700">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          level <= strength.score
                            ? strength.bgColor
                            : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strength.color}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Requirements checklist */}
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
              {requirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  )}
                  <span className={req.met ? 'text-slate-600' : 'text-slate-400'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
              disabled={isLoading || !canSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
