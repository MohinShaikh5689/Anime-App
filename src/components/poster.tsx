import { Image } from 'expo-image';
import { Platform, type StyleProp, StyleSheet, type ImageStyle, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type Props = {
  uri: string | null;
  color?: string | null;
  width: number;
  style?: StyleProp<ImageStyle>;
  /** Soft drop shadow, for covers that float over artwork. */
  shadow?: boolean;
};

const RADIUS = Platform.select({ ios: 10, default: 12 });

/** Anime cover art at the standard 2:3 poster ratio. */
export function Poster({ uri, color, width, style, shadow }: Props) {
  const { colors } = useAppTheme();
  const image = (
    <Image
      source={uri ? { uri } : null}
      style={[
        styles.poster,
        { width, height: width * 1.5, backgroundColor: color ?? colors.fill },
        style,
      ]}
      contentFit="cover"
      transition={200}
      recyclingKey={uri ?? undefined}
      accessibilityIgnoresInvertColors
    />
  );
  if (!shadow) return image;
  return <View style={styles.shadow}>{image}</View>;
}

const styles = StyleSheet.create({
  poster: { borderRadius: RADIUS, borderCurve: 'continuous' },
  shadow: { borderRadius: RADIUS, boxShadow: '0 8px 20px rgba(0,0,0,0.28)' },
});
