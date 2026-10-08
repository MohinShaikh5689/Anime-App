import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Poster } from '@/components/poster';
import { browseAnime } from '@/lib/anilist';
import { withAlpha } from '@/lib/color';
import { useRequest } from '@/lib/use-request';
import { useAppTheme } from '@/theme/theme';

/** A tilted wall of trending covers that fades into the page; decorative. */
export function PosterWall({ height }: { height: number }) {
  const { canvas } = useAppTheme();
  const { width } = useWindowDimensions();
  const fetcher = useCallback((signal: AbortSignal) => browseAnime({ sort: 'TRENDING_DESC', perPage: 15 }, signal), []);
  const { data } = useRequest('wall:trending', fetcher);
  const card = Math.round(width / 3.2);
  const columns = [0, 1, 2, 3].map((c) => (data ?? []).filter((_, i) => i % 4 === c));

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.wall, { height }]}>
      <View style={[styles.tilt, { left: -card * 0.6 }]}>
        {columns.map((col, c) => (
          <View key={c} style={[styles.column, { marginTop: c % 2 ? -card * 0.7 : 0 }]}>
            {col.map((a) => (
              <Poster key={a.id} uri={a.coverUrl} color={a.coverColor} width={card} />
            ))}
          </View>
        ))}
      </View>
      <View
        style={[
          StyleSheet.absoluteFill,
          { experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(canvas, 0.1)} 0%, ${withAlpha(canvas, 0.55)} 55%, ${canvas} 100%)` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  tilt: { position: 'absolute', top: -40, flexDirection: 'row', gap: 12, transform: [{ rotate: '-12deg' }] },
  column: { gap: 12 },
});
