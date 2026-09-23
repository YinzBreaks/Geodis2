import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import '../types/auth';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // 1. Extract Authorization header and ensure it follows 'Bearer <token>' schema
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or improperly formatted Authorization header. Expected Bearer <token>.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Bearer token is empty.',
    });
    return;
  }

  try {
    // 2. Cryptographically verify the raw JWT against Supabase auth server
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data || !data.user) {
      res.status(403).json({
        error: 'Forbidden: Invalid, expired, or untrusted authentication token.',
        details: error?.message || 'Token verification failed',
      });
      return;
    }

    const authUser = data.user;

    // 3. Inspect database metadata / user tiers to see if expert or student
    const appMetadata = authUser.app_metadata || {};
    const userMetadata = authUser.user_metadata || {};

    const tier = (appMetadata.tier || userMetadata.tier || appMetadata.role || userMetadata.role || '').toLowerCase();
    const groups: string[] = Array.isArray(userMetadata.groups)
      ? userMetadata.groups
      : Array.isArray(appMetadata.groups)
      ? appMetadata.groups
      : [];

    const isExpertTier =
      tier === 'expert' ||
      tier === 'pro' ||
      tier === 'enterprise' ||
      tier === 'admin' ||
      tier === 'teacher' ||
      groups.includes('admins') ||
      groups.includes('teachers');

    const role: 'expert' | 'student' = isExpertTier ? 'expert' : 'student';

    // 4. Attach user identity and role to req.user
    req.user = {
      id: authUser.id,
      username: authUser.email || authUser.id,
      email: authUser.email,
      groups,
      role,
      metadata: { ...userMetadata, ...appMetadata },
    };

    // 5. Allow request to pass safely downstream
    next();
  } catch (err: any) {
    console.error('Supabase JWT verification error:', err);
    res.status(403).json({
      error: 'Forbidden: Authentication verification failed.',
      details: err.message || 'Token check error',
    });
  }
};
