"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react"

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Configuration Error",
    description: "There is a problem with the server configuration. Please contact support."
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to access this resource. Your account may be deactivated or you may need additional permissions."
  },
  Verification: {
    title: "Verification Failed",
    description: "The verification link may have expired or is invalid. Please request a new one."
  },
  Default: {
    title: "Authentication Error",
    description: "An error occurred during authentication. Please try again."
  },
  SessionRequired: {
    title: "Sign In Required",
    description: "You need to be signed in to access this page."
  }
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Default"
  
  const errorInfo = errorMessages[error] || errorMessages.Default

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <CardTitle className="text-xl">{errorInfo.title}</CardTitle>
        <CardDescription>{errorInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild className="w-full">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </Button>
        
        <Button variant="outline" asChild className="w-full">
          <Link href="/">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Go to Home
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Loading...</CardTitle>
        <CardDescription>Please wait while we load the error details.</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Suspense fallback={<LoadingFallback />}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
