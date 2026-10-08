import { Image } from 'expo-image';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { AmbientBackdrop } from '@/components/motion';
import { ErrorState } from '@/components/states';
import { getCharacter } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

type Fact = { sf: SFSymbol; md: AndroidSymbol; label: string };

type Props = {
  id: number;
  /** Shown instantly while the full profile loads. */
  initialName?: string;
  initialImage?: string;
};

/** Character profile, presented as a native sheet from the anime page. */
export function CharacterSheet({ id, initialName, initialImage }: Props) {
  const { colors } = useAppTheme();
  const fetcher = useCallback((signal: AbortSignal) => getCharacter(id, signal), [id]);
  const { data, error, retry } = useRequest(`character:${id}`, fetcher);
  const [expanded, setExpanded] = useState(false);

  const name = data?.name ?? initialName ?? '';
  const image = data?.image ?? initialImage ?? null;

  const facts: Fact[] = [];
  if (data?.gender) facts.push({ sf: 'person.fill', md: 'person', label: data.gender });
  if (data?.age) facts.push({ sf: 'hourglass', md: 'hourglass_empty', label: `Age ${data.age}` });
  if (data?.birthday) facts.push({ sf: 'gift.fill', md: 'cake', label: data.birthday });
  if (data?.bloodType) facts.push({ sf: 'drop.fill', md: 'water_drop', label: `Type ${data.bloodType}` });
  if (data?.favourites != null) {
    facts.push({ sf: 'heart.fill', md: 'favorite', label: `${data.favourites.toLocaleString()} fans` });
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <AmbientBackdrop uri={image} height={300} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View style={styles.portraitShadow}>
            <Image
              source={image ? { uri: image } : null}
              style={[styles.portrait, { backgroundColor: colors.fill }]}
              contentFit="cover"
              transition={250}
            />
          </View>
          <Text style={[styles.name, { color: colors.text }]} selectable>
            {name}
          </Text>
          {data?.nativeName ? (
            <Text style={[styles.native, { color: colors.textSecondary }]}>{data.nativeName}</Text>
          ) : null}
        </Animated.View>

        {facts.length ? (
          <Animated.View entering={FadeIn.delay(120).duration(400)} style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={[styles.fact, { backgroundColor: colors.surface }]}>
                <Icon sf={f.sf} md={f.md} size={14} color={colors.primary} />
                <Text style={[styles.factText, { color: colors.text }]}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {data?.alternativeNames.length ? (
          <Text style={[styles.aka, { color: colors.textSecondary }]}>
            Also known as {data.alternativeNames.join(', ')}
          </Text>
        ) : null}

        {error && !data ? (
          <ErrorState error={error} onRetry={retry} />
        ) : !data ? (
          <View style={styles.skeleton}>
            {[0.95, 0.9, 0.7].map((w) => (
              <View key={w} style={[styles.skeletonLine, { width: `${w * 100}%`, backgroundColor: colors.fill }]} />
            ))}
          </View>
        ) : data.description ? (
          <Animated.View
            entering={FadeIn.delay(180).duration(400)}
            style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>About</Text>
            <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
              <Text style={[styles.body, { color: colors.text }]} numberOfLines={expanded ? undefined : 8}>
                {data.description}
              </Text>
              {data.description.length > 360 ? (
                <Text style={[styles.more, { color: colors.primary }]}>
                  {expanded ? 'Show less' : 'Show more'}
                </Text>
              ) : null}
            </Pressable>
          </Animated.View>
        ) : (
          <Text style={[styles.aka, { color: colors.textSecondary }]}>No bio yet. 🍃</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, paddingTop: 36, paddingBottom: 48, gap: 18 },
  header: { alignItems: 'center', gap: 4 },
  portraitShadow: { borderRadius: 70, boxShadow: '0 10px 28px rgba(0,0,0,0.25)', marginBottom: 10 },
  portrait: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  name: { fontFamily: Fonts.display, fontSize: 28, textAlign: 'center' },
  native: { fontFamily: Fonts.label, fontSize: 16 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  factText: { fontFamily: Fonts.heading, fontSize: 13 },
  aka: { fontFamily: Fonts.label, fontSize: 14, textAlign: 'center' },
  card: { padding: 16, borderRadius: 24, borderCurve: 'continuous', gap: 8 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 15 },
  body: { fontSize: 15, lineHeight: 22 },
  more: { fontFamily: Fonts.heading, fontSize: 15, marginTop: 8 },
  skeleton: { gap: 10, paddingTop: 8 },
  skeletonLine: { height: 12, borderRadius: 6 },
});
