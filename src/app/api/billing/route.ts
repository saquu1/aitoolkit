/**
 * Billing API Routes
 * TASK-5.4: Billing Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  billingService,
  PRICING_PLANS,
  UsageRecord
} from '@/lib/billing/billing-service'

// GET /api/billing
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  const companyId = request.nextUrl.searchParams.get('companyId')

  switch (action) {
    case 'plans':
      return getPlans()

    case 'subscription':
      if (!companyId) {
        return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
      }
      return getSubscription(companyId)

    case 'usage':
      if (!companyId) {
        return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
      }
      return getUsage(companyId)

    case 'invoices':
      if (!companyId) {
        return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
      }
      return getInvoices(companyId)

    case 'check-limits':
      return checkLimits(request)

    default:
      return NextResponse.json({
        error: 'Invalid action',
        availableActions: ['plans', 'subscription', 'usage', 'invoices', 'check-limits']
      }, { status: 400 })
  }
}

// POST /api/billing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create-subscription':
        return await createSubscription(body)

      case 'cancel-subscription':
        return await cancelSubscription(body)

      case 'update-payment-method':
        return await updatePaymentMethod(body)

      case 'create-customer':
        return await createCustomer(body)

      case 'webhook':
        return await handleWebhook(body)

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['create-subscription', 'cancel-subscription', 'update-payment-method', 'create-customer', 'webhook']
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Billing API error:', error)
    return NextResponse.json({
      error: 'Operation failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Get pricing plans
 */
async function getPlans() {
  return NextResponse.json({
    success: true,
    data: PRICING_PLANS
  })
}

/**
 * Get subscription for company
 */
async function getSubscription(companyId: string) {
  // Mock subscription data
  const subscription = {
    id: 'sub_mock',
    companyId,
    planId: 'starter',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    stripeSubscriptionId: 'sub_stripe_mock',
    stripeCustomerId: 'cus_stripe_mock'
  }

  const plan = billingService.getPlan(subscription.planId)

  return NextResponse.json({
    success: true,
    data: {
      subscription,
      plan
    }
  })
}

/**
 * Get usage for company
 */
async function getUsage(companyId: string) {
  // Mock usage data
  const usage: UsageRecord = {
    id: 'usage_mock',
    companyId,
    period: new Date(),
    projects: 3,
    tables: 150,
    agents: 12,
    apiCalls: 2500,
    storage: 450
  }

  const subscription = await getSubscriptionInternal(companyId)
  const plan = billingService.getPlan(subscription?.planId || 'free')
  const limitsCheck = billingService.checkUsageLimits(companyId, usage, subscription?.planId || 'free')

  return NextResponse.json({
    success: true,
    data: {
      usage,
      plan,
      limits: limitsCheck
    }
  })
}

/**
 * Get invoices for company
 */
async function getInvoices(companyId: string) {
  // Mock invoices
  const invoices = [
    {
      id: 'inv_1',
      companyId,
      subscriptionId: 'sub_mock',
      status: 'paid',
      amount: 2900,
      currency: 'USD',
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      paidAt: new Date()
    }
  ]

  return NextResponse.json({
    success: true,
    data: invoices
  })
}

/**
 * Check usage limits
 */
async function checkLimits(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  const planId = request.nextUrl.searchParams.get('planId') || 'free'

  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
  }

  // Get current usage
  const usage: UsageRecord = {
    id: 'usage_current',
    companyId,
    period: new Date(),
    projects: 3,
    tables: 150,
    agents: 12,
    apiCalls: 2500,
    storage: 450
  }

  const result = billingService.checkUsageLimits(companyId, usage, planId)

  return NextResponse.json({
    success: true,
    data: result
  })
}

/**
 * Create subscription
 */
async function createSubscription(body: any) {
  const { companyId, planId, email, name, paymentMethodId } = body

  if (!companyId || !planId) {
    return NextResponse.json({ error: 'Missing companyId or planId' }, { status: 400 })
  }

  const plan = billingService.getPlan(planId)
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Create or get customer
  let customerId = body.stripeCustomerId
  if (!customerId && email) {
    customerId = await billingService.createCustomer(email, name || '', companyId)
  }

  // Create subscription
  const result = await billingService.createSubscription(
    customerId,
    planId,
    paymentMethodId
  )

  return NextResponse.json({
    success: true,
    data: {
      subscriptionId: result.subscriptionId,
      clientSecret: result.clientSecret
    }
  })
}

/**
 * Cancel subscription
 */
async function cancelSubscription(body: any) {
  const { subscriptionId, immediately } = body

  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })
  }

  await billingService.cancelSubscription(subscriptionId, immediately)

  return NextResponse.json({
    success: true,
    message: immediately ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end'
  })
}

/**
 * Update payment method
 */
async function updatePaymentMethod(body: any) {
  const { customerId, paymentMethodId } = body

  if (!customerId || !paymentMethodId) {
    return NextResponse.json({ error: 'Missing customerId or paymentMethodId' }, { status: 400 })
  }

  // In production, this would update the payment method in Stripe

  return NextResponse.json({
    success: true,
    message: 'Payment method updated'
  })
}

/**
 * Create customer
 */
async function createCustomer(body: any) {
  const { email, name, companyId } = body

  if (!email || !companyId) {
    return NextResponse.json({ error: 'Missing email or companyId' }, { status: 400 })
  }

  const customerId = await billingService.createCustomer(email, name || '', companyId)

  return NextResponse.json({
    success: true,
    data: { customerId }
  })
}

/**
 * Handle Stripe webhook
 */
async function handleWebhook(body: any) {
  const { payload, signature } = body

  if (!payload) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  const result = await billingService.handleWebhook(payload, signature)

  return NextResponse.json({
    success: result.handled,
    event: result.event
  })
}

/**
 * Helper to get subscription internally
 */
async function getSubscriptionInternal(companyId: string): Promise<any> {
  return {
    id: 'sub_mock',
    companyId,
    planId: 'starter',
    status: 'active'
  }
}
