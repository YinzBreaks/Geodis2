import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import '../types/auth';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

// Default quota allocations per plan tier
const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
  enterprise: 500,
};

// In-memory usage store simulating database usage counts per tenant/user for current billing period
const tenantUsageStore = new Map<string, number>();

export const getTenantUsage = (userId: string): number => {
  return tenantUsageStore.get(userId) || 0;
};

export const incrementTenantUsage = (userId: string, count: number = 1): number => {
  const current = getTenantUsage(userId);
  const updated = current + count;
  tenantUsageStore.set(userId, updated);
  return updated;
};

export const resetTenantUsage = (userId?: string): void => {
  if (userId) {
    tenantUsageStore.delete(userId);
  } else {
    tenantUsageStore.clear();
  }
};

export const enforceBillingLimits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      res.status(401).json({
        error: 'Unauthorized: User authentication required for billing enforcement.',
      });
      return;
    }

    const userId = user.id;
    const metadata = user.metadata || {};

    // 1. Cross-reference tenant account / database metadata to fetch active stripe_customer_id and subscription
    const stripeCustomerId =
      user.billing?.stripeCustomerId ||
      metadata.stripe_customer_id ||
      metadata.stripeCustomerId ||
      process.env.DEFAULT_MOCK_STRIPE_CUSTOMER_ID;

    const subscriptionStatus =
      user.billing?.subscriptionStatus ||
      metadata.subscription_status ||
      metadata.subscriptionStatus ||
      (metadata.tier === 'pro' || metadata.tier === 'enterprise' ? 'active' : 'free');

    const planTier: 'free' | 'pro' | 'enterprise' =
      user.billing?.planTier ||
      metadata.plan_tier ||
      metadata.tier ||
      'free';

    const subscriptionItemId =
      user.billing?.subscriptionItemId ||
      metadata.stripe_subscription_item_id ||
      metadata.subscriptionItemId;

    // 2. If user is on a free tier or status is unpaid/canceled, block with 402 Payment Required
    if (
      subscriptionStatus === 'unpaid' ||
      subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'past_due' ||
      subscriptionStatus === 'free' ||
      planTier === 'free'
    ) {
      res.status(402).json({
        error: 'Subscription inactive. Please upgrade your commercial plan.',
        status: subscriptionStatus,
        tier: planTier,
      });
      return;
    }

    // 3. For metered plans, check month usage against tier quota
    const quotaLimit =
      user.billing?.monthlyQuota ||
      PLAN_LIMITS[planTier] ||
      50; // default 50 for pro

    const currentUsage = getTenantUsage(userId);

    if (currentUsage >= quotaLimit) {
      res.status(403).json({
        error: `Monthly quota exceeded. Your ${planTier} plan allows ${quotaLimit} deconstructions per month.`,
        currentUsage,
        quotaLimit,
        tier: planTier,
      });
      return;
    }

    // 4. Attach helper to report usage to Stripe after downstream success
    user.billing = {
      stripeCustomerId,
      subscriptionItemId,
      subscriptionStatus,
      planTier,
      monthlyQuota: quotaLimit,
      currentUsage,
    };

    req.reportBillingUsage = async (quantity: number = 1): Promise<void> => {
      incrementTenantUsage(userId, quantity);

      if (subscriptionItemId && stripeSecretKey && !stripeSecretKey.includes('placeholder')) {
        try {
          // Stripe Node SDK usage record creation
          const subscriptionItems: any = stripe.subscriptionItems;
          if (typeof subscriptionItems.createUsageRecord === 'function') {
            await subscriptionItems.createUsageRecord(subscriptionItemId, {
              quantity,
              timestamp: Math.floor(Date.now() / 1000),
              action: 'increment',
            });
          }
        } catch (stripeErr: any) {
          console.error(
            `[StripeBilling] Failed to record usage for item ${subscriptionItemId}:`,
            stripeErr.message || stripeErr
          );
        }
      } else {
        console.log(
          `[StripeBilling] Local usage incremented for user ${userId}. (Total: ${currentUsage + quantity}/${quotaLimit})`
        );
      }
    };

    next();
  } catch (err: any) {
    console.error('Error in enforceBillingLimits:', err);
    res.status(500).json({
      error: 'Billing enforcement verification failed',
      details: err.message || 'Internal server error',
    });
  }
};
