export interface BillingMetadata {
  stripeCustomerId?: string;
  subscriptionItemId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'unpaid' | 'canceled' | 'past_due' | 'free';
  planTier?: 'free' | 'pro' | 'enterprise';
  monthlyQuota?: number;
  currentUsage?: number;
}

export interface UserPayload {
  id?: string;
  username: string;
  email?: string;
  groups: string[];
  role: 'expert' | 'student';
  metadata?: Record<string, any>;
  billing?: BillingMetadata;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      reportBillingUsage?: (quantity?: number) => Promise<void>;
    }
  }
}
