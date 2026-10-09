import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Device preferences (not synced). */
type SettingsState = {
  /** Notify when a show in Watching gets a new episode. */
  episodeAlerts: boolean;
  /** Whether we've already asked for notification permission on our own. */
  askedForAlerts: boolean;
  setEpisodeAlerts: (on: boolean) => void;
  markAskedForAlerts: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      episodeAlerts: true,
      askedForAlerts: false,
      setEpisodeAlerts: (episodeAlerts) => set({ episodeAlerts }),
      markAskedForAlerts: () => set({ askedForAlerts: true }),
    }),
    {
      name: 'anime-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ episodeAlerts, askedForAlerts }) => ({ episodeAlerts, askedForAlerts }),
    }
  )
);
