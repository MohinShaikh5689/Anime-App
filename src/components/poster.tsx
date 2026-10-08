import { Image } from 'expo-image';
import { Platform, type StyleProp, StyleSheet, type ImageStyle } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type Props = {
  uri: string | null;
  color?: string | null;
  width: number;
  style?: StyleProp<ImageStyle>;
};

const RADIUS = Platform.select({ ios: 8, default: 12 });

/** Anime cover art at the standard 2:3 poster ratio. */
export function Poster({ uri, color, width, style }: Props) {
  const { colors } = useAppTheme();
  return (
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
}

const styles = StyleSheet.create({
  poster: { borderRadius: RADIUS, borderCurve: 'continuous' },
});
