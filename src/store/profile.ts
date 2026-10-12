import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { supabase } from '@/lib/supabase';

/**
 * The signed-in user's public profile (`public.profiles`). The avatar is just an image
 * URL (an AniList character portrait), so nothing is uploaded or stored in a bucket.
 * Cached on the device so the picture shows instantly and offline.
 */
type ProfileState = {
  userId: string | null;
  avatarUrl: string | null;
  /** Unique public handle, without the @. Null until chosen. */
  username: string | null;
  load: (userId: string) => Promise<void>;
  setAvatar: (url: string | null) => Promise<void>;
  /** Saves a new username; throws a readable error (taken, invalid, …). */
  setUsername: (username: string) => Promise<void>;
  reset: () => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      userId: null,
      avatarUrl: null,
      username: null,

      load: async (userId) => {
        if (get().userId !== userId) set({ userId, avatarUrl: null, username: null });
        let { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', userId)
          .maybeSingle<{ avatar_url: string | null; username?: string | null }>();
        if (error?.code === '42703') {
          // The database predates migration 0004 (no username column yet).
          ({ data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle());
        }
        if (!error && get().userId === userId) {
          set({ avatarUrl: data?.avatar_url ?? null, username: data?.username ?? null });
        }
      },

      setUsername: async (raw) => {
        const { userId } = get();
        if (!userId) return;
        const username = normalizeUsername(raw);
        const problem = usernameProblem(username);
        if (problem) throw new Error(problem);
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, username, updated_at: new Date().toISOString() });
        if (error) {
          if (error.code === '23505') throw new Error(`@${username} is taken. Try another one.`);
          if (error.code === 'PGRST204' || error.code === '42703') {
            throw new Error('Usernames need a quick database update. Run supabase/migrations/0004_usernames.sql in Supabase.');
          }
          throw new Error(error.message);
        }
        set({ username });
      },

      setAvatar: async (url) => {
        const { userId, avatarUrl: previous } = get();
        if (!userId) return;
        set({ avatarUrl: url });
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, avatar_url: url, updated_at: new Date().toISOString() });
        if (error) {
          set({ avatarUrl: previous });
          throw error;
        }
      },

      reset: () => set({ userId: null, avatarUrl: null, username: null }),
    }),
    {
      name: 'profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ userId, avatarUrl, username }) => ({ userId, avatarUrl, username }),
    }
  )
);

/** Usernames are stored lowercase without the @. */
export function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/** Why a username can't be used, or null when it's fine. Mirrors the database check. */
export function usernameProblem(username: string): string | null {
  if (username.length < 3) return 'Use at least 3 characters.';
  if (username.length > 20) return 'Use 20 characters or fewer.';
  if (!/^[a-z0-9_]+$/.test(username)) return 'Use only letters, numbers and underscores.';
  return null;
}
