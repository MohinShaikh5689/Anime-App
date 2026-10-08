import { useWindowDimensions } from 'react-native';

export const GRID_PADDING = 16;
export const GRID_GAP = 12;
const MIN_CARD = 144;

/** Poster grid sizing: 3 columns on phones, more on wider screens. */
export function useGrid() {
  const { width } = useWindowDimensions();
  const inner = width - GRID_PADDING * 2;
  const columns = Math.max(3, Math.floor((inner + GRID_GAP) / (MIN_CARD + GRID_GAP)));
  const cardWidth = Math.floor((inner - GRID_GAP * (columns - 1)) / columns);
  return { columns, cardWidth };
}
