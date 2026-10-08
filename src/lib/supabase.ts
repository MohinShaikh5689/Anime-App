import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. Add them to .env and restart Expo.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // AsyncStorage is already part of the native build, so no rebuild is needed.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

type AuthState = { session: Session | null; ready: boolean };

export const useAuth = create<AuthState>()(() => ({ session: null, ready: false }));

supabase.auth
  .getSession()
  .then(({ data }) => useAuth.setState({ session: data.session, ready: true }))
  .catch(() => useAuth.setState({ ready: true }));

supabase.auth.onAuthStateChange((_event, session) => {
  useAuth.setState({ session, ready: true });
});
