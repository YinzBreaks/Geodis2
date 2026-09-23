import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import type {
  LocalClusterEngine,
  ProjectPipeline,
  OrchestrationStep,
  WorkspaceAudience,
  UserIdentity,
} from '../types/orchestration';
import { supabase } from '../utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export type { LocalClusterEngine, WorkspaceAudience, UserIdentity };

export interface OrchestrationContextValue {
  currentPipeline: ProjectPipeline | null;
  setCurrentPipeline: React.Dispatch<React.SetStateAction<ProjectPipeline | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentUserRole: 'expert' | 'student';
  setCurrentUserRole: React.Dispatch<React.SetStateAction<'expert' | 'student'>>;
  userIdentity: UserIdentity | null;
  setUserIdentity: React.Dispatch<React.SetStateAction<UserIdentity | null>>;
  session: Session | null;
  markStepComplete: (stepNumber: number) => void;
  isStepLocked: (step: OrchestrationStep) => boolean;
  signOut: () => Promise<void>;
}

const OrchestrationContext = createContext<OrchestrationContextValue | undefined>(undefined);

export interface OrchestrationProviderProps {
  children: ReactNode;
  initialRole?: 'expert' | 'student';
}

function resolveInitialUserRole(initialRole?: 'expert' | 'student'): 'expert' | 'student' {
  if (initialRole) {
    return initialRole;
  }

  if (typeof window !== 'undefined') {
    const storedRole = window.sessionStorage?.getItem('user_role') || window.localStorage?.getItem('user_role');
    if (storedRole === 'expert' || storedRole === 'student') {
      return storedRole;
    }

    const windowGlobalRole = (window as any).__USER_ROLE__;
    if (windowGlobalRole === 'expert' || windowGlobalRole === 'student') {
      return windowGlobalRole;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roleParam = urlParams.get('role');
      if (roleParam === 'expert' || roleParam === 'student') {
        return roleParam;
      }
    } catch {
      // Ignored
    }
  }

  return 'student';
}

export const OrchestrationProvider: React.FC<OrchestrationProviderProps> = ({
  children,
  initialRole,
}) => {
  const [currentPipeline, setCurrentPipeline] = useState<ProjectPipeline | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<'expert' | 'student'>(() =>
    resolveInitialUserRole(initialRole)
  );
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Sync Supabase auth state natively
  useEffect(() => {
    // 1. Fetch current session on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        extractUserAndRole(initialSession);
      }
    });

    // 2. Listen to Supabase auth state changes natively
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        extractUserAndRole(currentSession);
      } else {
        setUserIdentity(null);
        // Retain fallback local role or reset to student
        const fallback = resolveInitialUserRole(initialRole);
        setCurrentUserRole(fallback);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialRole]);

  const extractUserAndRole = (activeSession: Session) => {
    const user = activeSession.user;
    const userMeta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};

    const tier = (appMeta.tier || userMeta.tier || appMeta.role || userMeta.role || '').toLowerCase();
    const groups: string[] = Array.isArray(userMeta.groups)
      ? userMeta.groups
      : Array.isArray(appMeta.groups)
      ? appMeta.groups
      : [];

    const isExpert =
      tier === 'expert' ||
      tier === 'pro' ||
      tier === 'enterprise' ||
      tier === 'admin' ||
      tier === 'teacher' ||
      groups.includes('teachers') ||
      groups.includes('admins');

    const derivedRole: 'expert' | 'student' = isExpert ? 'expert' : 'student';

    setCurrentUserRole(derivedRole);
    setUserIdentity({
      id: user.id,
      email: user.email,
      role: derivedRole,
      organizationId: userMeta.organization_id || appMeta.organization_id,
      metadata: { ...userMeta, ...appMeta },
    });

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('user_role', derivedRole);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserIdentity(null);
  };

  // Mark a specific step number as completed
  const markStepComplete = (stepNumber: number): void => {
    setCurrentPipeline((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        steps: prev.steps.map((step) =>
          step.stepNumber === stepNumber ? { ...step, isCompleted: true } : step
        ),
      };
    });
  };

  // Step is locked if ANY step number listed in dependencies is not yet completed
  const isStepLocked = (step: OrchestrationStep): boolean => {
    if (!currentPipeline) return false;
    if (!step.dependencies || step.dependencies.length === 0) {
      return false;
    }

    const completedStepNumbers = new Set(
      currentPipeline.steps
        .filter((s) => s.isCompleted)
        .map((s) => s.stepNumber)
    );

    return step.dependencies.some((depNum) => !completedStepNumbers.has(depNum));
  };

  const contextValue = useMemo<OrchestrationContextValue>(
    () => ({
      currentPipeline,
      setCurrentPipeline,
      isLoading,
      setIsLoading,
      currentUserRole,
      setCurrentUserRole,
      userIdentity,
      setUserIdentity,
      session,
      markStepComplete,
      isStepLocked,
      signOut,
    }),
    [currentPipeline, isLoading, currentUserRole, userIdentity, session]
  );

  return (
    <OrchestrationContext.Provider value={contextValue}>
      {children}
    </OrchestrationContext.Provider>
  );
};

export const useOrchestrator = (): OrchestrationContextValue => {
  const context = useContext(OrchestrationContext);
  if (!context) {
    throw new Error('useOrchestrator must be used within an OrchestrationProvider');
  }
  return context;
};

export { OrchestrationContext };
