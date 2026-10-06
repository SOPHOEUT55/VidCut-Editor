import React, { FormEvent, useState } from 'react';
import { Crown, Loader2, LogOut, X } from 'lucide-react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

interface Subscription {
  status: string;
  currentPeriodEnd: string | null;
  isExpert: boolean;
}

interface AccountModalProps {
  session: Session | null;
  user: User | null;
  subscription: Subscription | null;
  subscriptionError: string | null;
  billingNotice: string | null;
  onClose: () => void;
  onSubscriptionUpdated: () => Promise<unknown>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  session,
  user,
  subscription,
  subscriptionError,
  billingNotice,
  onClose,
  onSubscriptionUpdated,
}) => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage('Supabase is not configured. Set the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Account request failed.');
    } finally {
      setBusy(false);
    }
  };

  const startBillingAction = async (endpoint: '/api/subscription/checkout' | '/api/subscription/portal') => {
    if (!session) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result: { url?: string; error?: string } = await response.json();
      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Could not open Stripe billing.');
      }
      window.location.assign(result.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not open Stripe billing.');
      setBusy(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await onSubscriptionUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not refresh subscription status.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  };

  const isExpert = subscription?.isExpert === true;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f1624] text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-bold">VidCut Studio Account</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close account">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {!isSupabaseConfigured && (
            <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-200">
              Account sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and configure the server Supabase keys.
            </p>
          )}

          {user ? (
            <>
              <div>
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="mt-1 text-sm font-medium text-white">{user.email}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-[#151c2a] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Expert · $4.99/month</p>
                    <p className="mt-1 text-xs text-slate-400">Full HD and higher-quality exports</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isExpert ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                    {isExpert ? 'ACTIVE' : 'FREE'}
                  </span>
                </div>
                {isExpert && subscription?.currentPeriodEnd && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Current period ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
                {isExpert ? (
                  <button
                    onClick={() => void startBillingAction('/api/subscription/portal')}
                    disabled={busy}
                    className="mt-3 w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                  >
                    Manage subscription
                  </button>
                ) : (
                  <button
                    onClick={() => void startBillingAction('/api/subscription/checkout')}
                    disabled={busy || !isSupabaseConfigured}
                    className="mt-3 w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-2 text-xs font-bold text-slate-950 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50"
                  >
                    {busy ? 'Opening secure checkout…' : 'Subscribe to Expert'}
                  </button>
                )}
                <button
                  onClick={() => void handleRefreshSubscription()}
                  disabled={busy}
                  className="mt-2 w-full px-3 py-1.5 text-[11px] text-slate-400 hover:text-white disabled:opacity-50"
                >
                  Refresh subscription status
                </button>
              </div>
              <button
                onClick={() => void handleSignOut()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-white">
                  {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Expert is $4.99/month and unlocks Full HD and higher-quality video exports.</p>
              </div>
              <form onSubmit={submitAuth} className="space-y-3">
                <label className="block text-xs text-slate-400">
                  Email
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#151c2a] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Password
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#151c2a] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !isSupabaseConfigured}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                </button>
              </form>
              <button
                onClick={() => {
                  setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setErrorMessage(null);
                  setNotice(null);
                }}
                className="w-full text-xs text-cyan-300 hover:text-cyan-200"
              >
                {mode === 'sign-in' ? 'New to VidCut Studio? Create an account' : 'Already have an account? Sign in'}
              </button>
            </>
          )}

          {(billingNotice || notice) && (
            <p className="rounded-lg border border-cyan-700/50 bg-cyan-950/30 p-3 text-xs text-cyan-200">{billingNotice || notice}</p>
          )}
          {subscriptionError && (
            <p role="alert" className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-200">
              Subscription status could not be checked: {subscriptionError}
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="rounded-lg border border-red-700/50 bg-red-950/30 p-3 text-xs text-red-200">{errorMessage}</p>
          )}
        </div>
      </section>
    </div>
  );
};
