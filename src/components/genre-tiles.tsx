import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PlatformPressable } from '@/components/motion';
import { GENRES } from '@/lib/anilist';
import { mix, readableOn } from '@/lib/color';
import { GRID_GAP, GRID_PADDING } from '@/lib/use-grid';
import { Fonts } from '@/theme/fonts';

const GENRE_COLORS: Record<string, string> = {
  Action: '#FF4D4D',
  Adventure: '#FF8A1F',
  Comedy: '#FFC93C',
  Drama: '#7C5CFF',
  Fantasy: '#2FA8FF',
  Romance: '#FF5DA2',
  'Sci-Fi': '#00BFA6',
  'Slice of Life': '#7DCB4A',
  Mystery: '#4F5BD5',
  Sports: '#FF6B35',
  Psychological: '#A34DFF',
  Supernatural: '#1FB5A8',
  Mecha: '#6F7D95',
  Horror: '#B5172A',
  Music: '#EE4FB0',
};

/** App Store-style browse tiles, one per genre. */
export function GenreTiles({ onPick }: { onPick: (genre: string) => void }) {
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : 2;
  const tile = Math.floor((width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);
  return (
    <View style={styles.grid}>
      {GENRES.map((g) => {
        const base = GENRE_COLORS[g] ?? '#6C5CFF';
        const fg = readableOn(base);
        return (
          <PlatformPressable
            key={g}
            haptic
            onPress={() => onPick(g)}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${g}`}
            style={[
              styles.tile,
              {
                width: tile,
                height: Math.round(tile * 0.56),
                experimental_backgroundImage: `linear-gradient(135deg, ${base} 0%, ${mix(base, '#000000', 0.38)} 100%)`,
              },
            ]}>
            <Text style={[styles.label, { color: fg }]} numberOfLines={2}>
              {g}
            </Text>
          </PlatformPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingHorizontal: GRID_PADDING },
  tile: { borderRadius: 16, borderCurve: 'continuous', padding: 14, justifyContent: 'flex-end', overflow: 'hidden' },
  label: { fontFamily: Fonts.display, fontSize: 20 },
});
