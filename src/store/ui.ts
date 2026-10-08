import { create } from 'zustand';

import type { ListStatus } from '@/constants/lists';

/** Transient UI state shared across tabs (not persisted). */
type UiState = {
  libraryList: ListStatus;
  setLibraryList: (list: ListStatus) => void;
};

export const useUi = create<UiState>()((set) => ({
  libraryList: 'watching',
  setLibraryList: (libraryList) => set({ libraryList }),
}));
