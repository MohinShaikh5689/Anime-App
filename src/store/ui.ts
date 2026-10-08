import { create } from 'zustand';

import type { ListStatus } from '@/constants/lists';
import type { MediaKind } from '@/lib/anilist';

/** Transient UI state shared across tabs (not persisted). */
type UiState = {
  libraryList: ListStatus;
  setLibraryList: (list: ListStatus) => void;
  libraryKind: MediaKind;
  setLibraryKind: (kind: MediaKind) => void;
  searchKind: MediaKind;
  setSearchKind: (kind: MediaKind) => void;
};

export const useUi = create<UiState>()((set) => ({
  libraryList: 'watching',
  setLibraryList: (libraryList) => set({ libraryList }),
  libraryKind: 'anime',
  setLibraryKind: (libraryKind) => set({ libraryKind }),
  searchKind: 'anime',
  setSearchKind: (searchKind) => set({ searchKind }),
}));
