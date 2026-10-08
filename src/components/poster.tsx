import { Image, type ImageStyle } from 'expo-image';
import { useState } from 'react';
import { Platform, type StyleProp, StyleSheet } from 'react-native';

import { useAppTheme } from '@/theme/theme';

/** AniList serves each cover at several sizes; if one fails, try the other once. */
function alternate(uri: string) {
  if (uri.includes('/cover/large/')) return uri.replace('/cover/large/', '/cover/medium/');
  if (uri.includes('/cover/medium/')) return uri.replace('/cover/medium/', '/cover/large/');
  return null;
}

/** Remote artwork with a colour placeholder and a one-shot size fallback. */
export function Art({
  uri,
  color,
  style,
  blurRadius,
  contentPosition,
}: {
  uri: string | null | undefined;
  color?: string | null;
  style?: StyleProp<ImageStyle>;
  blurRadius?: number;
  contentPosition?: 'top' | 'center';
}) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const source = uri && failed === uri ? alternate(uri) : uri;
  return (
    <Image
      source={source ? { uri: source } : null}
      style={[{ backgroundColor: color ?? (colors.fill as string) }, style]}
      contentFit="cover"
      contentPosition={contentPosition ?? 'center'}
      transition={250}
      blurRadius={blurRadius}
      recyclingKey={source ?? undefined}
      onError={() => {
        if (uri && failed !== uri) setFailed(uri);
      }}
      accessibilityIgnoresInvertColors
    />
  );
}

const RADIUS = Platform.select({ ios: 12, default: 14 });

/** Anime cover art at the standard 2:3 poster ratio. */
export function Poster({
  uri,
  color,
  width,
  style,
}: {
  uri: string | null;
  color?: string | null;
  width: number;
  style?: StyleProp<ImageStyle>;
}) {
  return <Art uri={uri} color={color} style={[styles.poster, { width, height: width * 1.5 }, style]} />;
}

const styles = StyleSheet.create({
  poster: { borderRadius: RADIUS, borderCurve: 'continuous' },
});
