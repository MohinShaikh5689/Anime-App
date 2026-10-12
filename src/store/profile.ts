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
  load: (userId: string) => Promise<void>;
  setAvatar: (url: string | null) => Promise<void>;
  reset: () => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      userId: null,
      avatarUrl: null,

      load: async (userId) => {
        if (get().userId !== userId) set({ userId, avatarUrl: null });
        const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
        if (!error && get().userId === userId) set({ avatarUrl: data?.avatar_url ?? null });
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

      reset: () => set({ userId: null, avatarUrl: null }),
    }),
    {
      name: 'profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ userId, avatarUrl }) => ({ userId, avatarUrl }),
    }
  )
);
