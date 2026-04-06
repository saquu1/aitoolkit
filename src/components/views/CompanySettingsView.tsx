'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Building2, Save, RotateCcw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompanyData {
  id: number
  companyName: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  ntn: string | null
  stn: string | null
  logoPath: string | null
  incomeAccountId: number | null
  expVoucherTitle: string | null
  expVoucherFooter: string | null
  expVoucherSignature: string | null
  incVoucherTitle: string | null
  incVoucherFooter: string | null
  incVoucherSignature: string | null
  fundsPaymentTitle: string | null
  fundsPaymentFooter: string | null
  fundsReceiveTitle: string | null
  fundsReceiveFooter: string | null
  journalTitle: string | null
  journalFooter: string | null
  employeePaymentTitle: string | null
  employeePaymentFooter: string | null
  saleNoStart: number
}

interface IncomeAccount {
  id: number
  aname: string
  atype: string
}

// ─── Default Values ─────────────────────────────────────────────────────────

const DEFAULTS: CompanyData = {
  id: 1,
  companyName: '',
  address: null,
  phone: null,
  email: null,
  website: null,
  ntn: null,
  stn: null,
  logoPath: null,
  incomeAccountId: null,
  expVoucherTitle: 'EXPENSE VOUCHER',
  expVoucherFooter: null,
  expVoucherSignature: null,
  incVoucherTitle: 'INCOME VOUCHER',
  incVoucherFooter: null,
  incVoucherSignature: null,
  fundsPaymentTitle: 'PAYMENT VOUCHER',
  fundsPaymentFooter: null,
  fundsReceiveTitle: 'RECEIPT VOUCHER',
  fundsReceiveFooter: null,
  journalTitle: 'JOURNAL VOUCHER',
  journalFooter: null,
  employeePaymentTitle: 'EMPLOYEE PAYMENT',
  employeePaymentFooter: null,
  saleNoStart: 1,
}

// ─── Voucher Section Config ─────────────────────────────────────────────────

interface VoucherField {
  key: 'titleKey' | 'footerKey'
  label: string
  placeholder: string
}

interface VoucherSection {
  title: string
  fields: VoucherField[]
  titleKey: keyof CompanyData
  footerKey: keyof CompanyData
}

const voucherSections: VoucherSection[] = [
  {
    title: 'Expense Voucher',
    titleKey: 'expVoucherTitle',
    footerKey: 'expVoucherFooter',
    fields: [
      { key: 'titleKey', label: 'Title', placeholder: 'e.g., EXPENSE VOUCHER' },
      { key: 'footerKey', label: 'Footer', placeholder: 'e.g., Authorized Signature' },
    ],
  },
  {
    title: 'Income Voucher',
    titleKey: 'incVoucherTitle',
    footerKey: 'incVoucherFooter',
    fields: [
      { key: 'titleKey', label: 'Title', placeholder: 'e.g., INCOME VOUCHER' },
      { key: 'footerKey', label: 'Footer', placeholder: 'e.g., Received By' },
    ],
  },
  {
    title: 'Payment Voucher',
    titleKey: 'fundsPaymentTitle',
    footerKey: 'fundsPaymentFooter',
    fields: [
      { key: 'titleKey', label: 'Title', placeholder: 'e.g., PAYMENT VOUCHER' },
      { key: 'footerKey', label: 'Footer', placeholder: 'e.g., Approved By' },
    ],
  },
  {
    title: 'Receipt Voucher',
    titleKey: 'fundsReceiveTitle',
    footerKey: 'fundsReceiveFooter',
    fields: [
      { key: 'titleKey', label: 'Title', placeholder: 'e.g., RECEIPT VOUCHER' },
      { key: 'footerKey', label: 'Footer', placeholder: 'e.g., Cashier Signature' },
    ],
  },
  {
    title: 'Journal Voucher',
    titleKey: 'journalTitle',
    footerKey: 'journalFooter',
    fields: [
      { key: 'titleKey', label: 'Title', placeholder: 'e.g., JOURNAL VOUCHER' },
      { key: 'footerKey', label: 'Footer', placeholder: 'e.g., Prepared By' },
    ],
  },
  {
    title: 'Employee Payment',
    titleKey: 'employeePaymentTitle',
    footerKey: 'employeePaymentFooter',
    fields: [
      { key: 'titleKey', label: 'Title', placeholder: 'e.g., EMPLOYEE PAYMENT' },
      { key: 'footerKey', label: 'Footer', placeholder: 'e.g., Employee Signature' },
    ],
  },
]

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <Card className="py-0 gap-0">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="py-0 gap-0">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompanySettingsView() {
  const [form, setForm] = useState<CompanyData>(DEFAULTS)
  const [incomeAccounts, setIncomeAccounts] = useState<IncomeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch company data
  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true)
      const [companyRes, accountsRes] = await Promise.all([
        fetch('/api/company'),
        fetch('/api/accounts?atype=INCOME&isActive=true&limit=100'),
      ])

      const companyJson = await companyRes.json()
      if (companyJson.success && companyJson.data) {
        setForm({ ...DEFAULTS, ...companyJson.data })
      } else {
        toast.error('Failed to load company settings')
      }

      const accountsJson = await accountsRes.json()
      if (accountsJson.success && accountsJson.data) {
        setIncomeAccounts(
          (accountsJson.data.records ?? accountsJson.data).map(
            (a: { id: number; aname: string; atype: string }) => ({
              id: a.id,
              aname: a.aname,
              atype: a.atype,
            })
          )
        )
      }
    } catch {
      toast.error('Network error while loading settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Track changes
  useEffect(() => {
    // Skip initial comparison when loading
    if (loading) return
    setHasChanges(JSON.stringify(form) !== JSON.stringify(DEFAULTS))
  }, [form, loading])

  // Update form field
  function updateField<K extends keyof CompanyData>(key: K, value: CompanyData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Save company settings
  async function handleSave() {
    try {
      setSaving(true)
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Settings saved successfully')
        setForm({ ...DEFAULTS, ...json.data })
        setHasChanges(false)
      } else {
        toast.error(json.error ?? 'Failed to save settings')
      }
    } catch {
      toast.error('Network error while saving settings')
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  function handleReset() {
    setForm(DEFAULTS)
    toast.info('Form reset to defaults')
  }

  if (loading) return <SettingsSkeleton />

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Company Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company information and voucher configurations.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Company Information ──────────────────────────── */}
        <Card className="py-0 gap-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="companyName" className="text-xs font-medium">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address" className="text-xs font-medium">
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={form.address ?? ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Enter company address"
                  rows={2}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={form.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="e.g., 555-1234"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="e.g., info@company.com"
                />
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label htmlFor="website" className="text-xs font-medium">
                  Website
                </Label>
                <Input
                  id="website"
                  value={form.website ?? ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="e.g., https://company.com"
                />
              </div>

              {/* NTN */}
              <div className="space-y-1.5">
                <Label htmlFor="ntn" className="text-xs font-medium">
                  NTN (National Tax Number)
                </Label>
                <Input
                  id="ntn"
                  value={form.ntn ?? ''}
                  onChange={(e) => updateField('ntn', e.target.value)}
                  placeholder="e.g., 1234567-8"
                />
              </div>

              {/* STN */}
              <div className="space-y-1.5">
                <Label htmlFor="stn" className="text-xs font-medium">
                  STN (Sales Tax Number)
                </Label>
                <Input
                  id="stn"
                  value={form.stn ?? ''}
                  onChange={(e) => updateField('stn', e.target.value)}
                  placeholder="e.g., ST-12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Voucher Settings ─────────────────────────────── */}
        <Card className="py-0 gap-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-sky-100 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-sky-600" />
              </div>
              Voucher Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {voucherSections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Title
                      </Label>
                      <Input
                        value={(form[section.titleKey] as string) ?? ''}
                        onChange={(e) =>
                          updateField(section.titleKey, e.target.value)
                        }
                        placeholder={section.fields[0].placeholder}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Footer
                      </Label>
                      <Input
                        value={(form[section.footerKey] as string) ?? ''}
                        onChange={(e) =>
                          updateField(section.footerKey, e.target.value)
                        }
                        placeholder={section.fields[1].placeholder}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Other Settings ───────────────────────────────── */}
        <Card className="py-0 gap-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-stone-100 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-stone-600" />
              </div>
              Other Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sale Invoice Start Number */}
              <div className="space-y-1.5">
                <Label htmlFor="saleNoStart" className="text-xs font-medium">
                  Sale Invoice Start Number
                </Label>
                <Input
                  id="saleNoStart"
                  type="number"
                  min={0}
                  value={form.saleNoStart}
                  onChange={(e) =>
                    updateField('saleNoStart', parseInt(e.target.value) || 0)
                  }
                  placeholder="e.g., 1"
                />
              </div>

              {/* Income Account */}
              <div className="space-y-1.5">
                <Label htmlFor="incomeAccount" className="text-xs font-medium">
                  Default Income Account
                </Label>
                <Select
                  value={form.incomeAccountId?.toString() ?? 'none'}
                  onValueChange={(val) =>
                    updateField(
                      'incomeAccountId',
                      val === 'none' ? null : parseInt(val)
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select income account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {incomeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.aname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Action Buttons ──────────────────────────────────────────── */}
        <Separator />

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
