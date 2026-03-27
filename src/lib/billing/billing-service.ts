/**
 * Billing Integration Service
 * Stripe integration for subscription management
 * 
 * TASK-5.4: Billing Integration
 * Part of Phase 5: Production & Scale
 */

// Types
export interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  limits: {
    projects: number
    tables: number
    agents: number
    apiCalls: number
    storage: number // MB
  }
}

export interface Subscription {
  id: string
  companyId: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  cancelAtPeriodEnd?: boolean
}

export interface UsageRecord {
  id: string
  companyId: string
  period: Date
  projects: number
  tables: number
  agents: number
  apiCalls: number
  storage: number
}

export interface Invoice {
  id: string
  companyId: string
  subscriptionId: string
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded'
  amount: number
  currency: string
  periodStart: Date
  periodEnd: Date
  stripeInvoiceId?: string
  paidAt?: Date
}

// Pricing Plans
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individual developers getting started',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '1 Project',
      '100 Tables',
      'Basic Agents',
      'Community Support'
    ],
    limits: {
      projects: 1,
      tables: 100,
      agents: 5,
      apiCalls: 1000,
      storage: 100
    }
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams building production apps',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: [
      '5 Projects',
      '500 Tables',
      'All Agents',
      'Email Support',
      'Priority Processing'
    ],
    limits: {
      projects: 5,
      tables: 500,
      agents: 20,
      apiCalls: 10000,
      storage: 1000
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams with advanced needs',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited Projects',
      'Unlimited Tables',
      'All Agents + AI Features',
      'Priority Support',
      'Custom Integrations',
      'Advanced Analytics'
    ],
    limits: {
      projects: -1,
      tables: -1,
      agents: 100,
      apiCalls: 100000,
      storage: 10000
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom requirements',
    price: 299,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Professional',
      'Dedicated Support',
      'Custom SLA',
      'On-premise Option',
      'SSO/SAML',
      'Audit Logs'
    ],
    limits: {
      projects: -1,
      tables: -1,
      agents: -1,
      apiCalls: -1,
      storage: -1
    }
  }
]

/**
 * Billing Service
 */
export class BillingService {
  private stripeKey?: string
  private stripeWebhookSecret?: string

  constructor() {
    this.stripeKey = process.env.STRIPE_SECRET_KEY
    this.stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  }

  /**
   * Get pricing plan by ID
   */
  getPlan(planId: string): PricingPlan | undefined {
    return PRICING_PLANS.find(p => p.id === planId)
  }

  /**
   * Get all pricing plans
   */
  getAllPlans(): PricingPlan[] {
    return PRICING_PLANS
  }

  /**
   * Create Stripe customer
   */
  async createCustomer(email: string, name: string, companyId: string): Promise<string> {
    if (!this.stripeKey) {
      // Mock mode
      return `cus_mock_${Date.now()}`
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          email,
          name,
          metadata: JSON.stringify({ companyId })
        }).toString()
      })

      const customer = await response.json()
      return customer.id
    } catch (error) {
      console.error('Failed to create Stripe customer:', error)
      throw error
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(
    customerId: string,
    planId: string,
    paymentMethodId?: string
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    const plan = this.getPlan(planId)
    if (!plan) throw new Error('Invalid plan')

    if (!this.stripeKey) {
      // Mock mode
      return {
        subscriptionId: `sub_mock_${Date.now()}`,
        clientSecret: undefined
      }
    }

    try {
      // Get or create price in Stripe
      const priceId = await this.getOrCreatePrice(plan)

      const body: Record<string, string> = {
        customer: customerId,
        'items[0][price]': priceId,
        payment_behavior: 'default_incomplete',
        expand: 'latest_invoice.payment_intent.client_secret'
      }

      if (paymentMethodId) {
        body.default_payment_method = paymentMethodId
      }

      const response = await fetch('https://api.stripe.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(body).toString()
      })

      const subscription = await response.json()

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      }
    } catch (error) {
      console.error('Failed to create subscription:', error)
      throw error
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<void> {
    if (!this.stripeKey) {
      return
    }

    try {
      const endpoint = immediately
        ? `https://api.stripe.com/v1/subscriptions/${subscriptionId}`
        : `https://api.stripe.com/v1/subscriptions/${subscriptionId}`

      const body = immediately
        ? new URLSearchParams({})
        : new URLSearchParams({ cancel_at_period_end: 'true' })

      await fetch(endpoint, {
        method: immediately ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${this.stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: immediately ? undefined : body
      })
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      throw error
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ handled: boolean; event?: string }> {
    // In a real implementation, verify the signature first

    try {
      const event = JSON.parse(payload)

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object)
          return { handled: true, event: event.type }

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object)
          return { handled: true, event: event.type }

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object)
          return { handled: true, event: event.type }

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object)
          return { handled: true, event: event.type }

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object)
          return { handled: true, event: event.type }

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object)
          return { handled: true, event: event.type }

        default:
          return { handled: false, event: event.type }
      }
    } catch (error) {
      console.error('Webhook handling error:', error)
      return { handled: false }
    }
  }

  /**
   * Check usage limits
   */
  checkUsageLimits(
    companyId: string,
    usage: UsageRecord,
    planId: string
  ): {
    withinLimits: boolean
    violations: string[]
    usagePercentage: Record<string, number>
  } {
    const plan = this.getPlan(planId)
    if (!plan) {
      return {
        withinLimits: false,
        violations: ['Invalid plan'],
        usagePercentage: {}
      }
    }

    const violations: string[] = []
    const usagePercentage: Record<string, number> = {}
    let withinLimits = true

    const checks: Array<{ key: keyof typeof plan.limits; label: string }> = [
      { key: 'projects', label: 'Projects' },
      { key: 'tables', label: 'Tables' },
      { key: 'agents', label: 'Agents' },
      { key: 'apiCalls', label: 'API Calls' },
      { key: 'storage', label: 'Storage (MB)' }
    ]

    for (const check of checks) {
      const limit = plan.limits[check.key]
      const used = usage[check.key]

      if (limit === -1) {
        // Unlimited
        usagePercentage[check.key] = 0
      } else if (limit > 0) {
        const percentage = (used / limit) * 100
        usagePercentage[check.key] = Math.round(percentage)

        if (used > limit) {
          withinLimits = false
          violations.push(`${check.label} limit exceeded: ${used}/${limit}`)
        } else if (percentage >= 90) {
          violations.push(`${check.label} usage at ${Math.round(percentage)}% of limit`)
        }
      }
    }

    return { withinLimits, violations, usagePercentage }
  }

  /**
   * Get or create Stripe price for plan
   */
  private async getOrCreatePrice(plan: PricingPlan): Promise<string> {
    // In a real implementation, this would look up or create the price in Stripe
    // For now, return a mock price ID
    return `price_mock_${plan.id}`
  }

  /**
   * Handle checkout complete
   */
  private async handleCheckoutComplete(session: any): Promise<void> {
    const companyId = session.metadata?.companyId
    const planId = session.metadata?.planId

    console.log(`Checkout complete for company ${companyId}, plan ${planId}`)
    // Update database with subscription info
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    console.log(`Subscription created: ${subscription.id}`)
    // Create subscription record in database
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    console.log(`Subscription updated: ${subscription.id}`)
    // Update subscription in database
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    console.log(`Subscription deleted: ${subscription.id}`)
    // Mark subscription as canceled in database
  }

  /**
   * Handle invoice paid
   */
  private async handleInvoicePaid(invoice: any): Promise<void> {
    console.log(`Invoice paid: ${invoice.id}`)
    // Update invoice status in database
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    console.log(`Invoice payment failed: ${invoice.id}`)
    // Alert company about failed payment
  }
}

// Export singleton
export const billingService = new BillingService()
