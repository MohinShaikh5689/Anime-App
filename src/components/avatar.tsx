import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { readableOn } from '@/lib/color';
import { Fonts } from '@/theme/fonts';

/** Round profile picture: the chosen portrait, or an initial on the accent colour. */
export function Avatar({
  url,
  name,
  size,
  accent,
  ring,
}: {
  url: string | null | undefined;
  name: string;
  size: number;
  accent: string;
  /** Border colour, to separate the avatar from art behind it. */
  ring?: string;
}) {
  const style = [
    styles.base,
    { width: size, height: size, borderRadius: size / 2, backgroundColor: accent },
    ring ? { borderWidth: Math.max(2, size / 24), borderColor: ring } : null,
  ];
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={style}
        contentFit="cover"
        contentPosition="top"
        transition={200}
        accessibilityLabel={`${name}'s profile picture`}
      />
    );
  }
  return (
    <View style={style} accessibilityLabel={`${name}'s profile picture`}>
      <Text
        style={[styles.initial, { color: readableOn(accent), fontSize: size * 0.44, lineHeight: size * 0.52 }]}
        maxFontSizeMultiplier={1}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontFamily: Fonts.display },
});
