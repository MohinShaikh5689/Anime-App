import { useState } from 'react';

import { supabase } from '@/lib/supabase';

export type AuthMode = 'sign-in' | 'sign-up';

const MIN_PASSWORD = 8;

/** Email + password sign-in/sign-up state shared by the iOS and Android screens. */
export function useAuthForm() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const canSubmit = /^\S+@\S+\.\S+$/.test(trimmedEmail) && password.length >= (mode === 'sign-up' ? MIN_PASSWORD : 1);

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation is on: the user must confirm before signing in.
          setInfo(`We sent a confirmation link to ${trimmedEmail}. Confirm it, then sign in.`);
          setMode('sign-in');
          setPassword('');
        }
      }
      // On success the auth listener swaps the UI to the app.
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    setError(null);
    setInfo(null);
  }

  return {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    info,
    canSubmit,
    submit,
    toggleMode,
    passwordHint: mode === 'sign-up' ? `At least ${MIN_PASSWORD} characters` : null,
  };
}

function friendlyError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email first. Check your inbox for the link.';
  if (/already registered/i.test(message)) return 'An account with this email already exists. Sign in instead.';
  if (/network|fetch/i.test(message)) return 'No connection. Check your internet and try again.';
  return message;
}
