import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useOrchestrator } from '../context/OrchestrationContext';

export interface AuthGatewayProps {
  children: React.ReactNode;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ children }) => {
  const { session } = useOrchestrator();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If user is authenticated, render child dashboard directly
  if (session) {
    return <>{children}</>;
  }

  // Tab 1: Magic Link Sign In
  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setMagicLinkSent(false);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        throw error;
      }

      setMagicLinkSent(true);
      setSuccessMessage('Check your email for the magic link!');
    } catch (err: any) {
      console.error('Magic link sign-in error:', err);
      setErrorMessage(err.message || 'Failed to send magic link. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tab 2: Create Account & Organization
  const handleSignUpWithOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !orgName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            organization_name: orgName.trim(),
            role: 'expert',
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const user = authData?.user;
      if (!user) {
        throw new Error('User creation returned no user record.');
      }

      // 2. Create organization record
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
        })
        .select('id')
        .single();

      if (orgError) {
        console.warn('Organization insert note:', orgError.message);
      }

      // 3. Write matching row to users_org_mapping
      if (orgData?.id) {
        const { error: mappingError } = await supabase
          .from('users_org_mapping')
          .insert({
            user_id: user.id,
            organization_id: orgData.id,
          });

        if (mappingError) {
          console.warn('Mapping insert note:', mappingError.message);
        }
      }

      setSuccessMessage('Account and Organization created successfully! You are now logged in.');
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrorMessage(err.message || 'Failed to complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 mx-auto mb-3 text-lg">
            PO
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">PromptOrganizer Gateway</h2>
          <p className="text-xs text-slate-400 mt-1">Multi-Tenant AI Agent Architecture Engine</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition ${
              activeTab === 'signin'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In / Magic Link
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition ${
              activeTab === 'signup'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account & Org
          </button>
        </div>

        {/* Status / Alert Banners */}
        {magicLinkSent && (
          <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Check your email for the magic link!</span>
          </div>
        )}

        {successMessage && !magicLinkSent && (
          <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1 Form: Magic Link */}
        {activeTab === 'signin' && (
          <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
            <div>
              <label htmlFor="signin-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email
              </label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Sending Magic Link...</span>
                </>
              ) : (
                <span>Send Magic Link ✉️</span>
              )}
            </button>
          </form>
        )}

        {/* Tab 2 Form: Create Account & Org */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpWithOrg} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@studio.io"
                required
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="signup-org" className="block text-xs font-medium text-slate-300 mb-1.5">
                Company / Organization Name
              </label>
              <input
                id="signup-org"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Autonomous Systems"
                required
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password || !orgName.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Provisioning Account & Tenant...</span>
                </>
              ) : (
                <span>Register & Create Organization 🚀</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Protected by Supabase Row-Level Security (RLS) & JWT verification
          </p>
        </div>
      </div>
    </div>
  );
};
