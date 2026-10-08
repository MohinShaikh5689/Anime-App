import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/states';
import { getCharacter } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

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

  const facts: { label: string; value: string; numeric?: boolean }[] = [];
  if (data?.gender) facts.push({ label: 'Gender', value: data.gender });
  if (data?.age) facts.push({ label: 'Age', value: data.age, numeric: true });
  if (data?.birthday) facts.push({ label: 'Birthday', value: data.birthday });
  if (data?.bloodType) facts.push({ label: 'Blood type', value: data.bloodType });
  if (data?.favourites != null) {
    facts.push({ label: 'Favourited by', value: data.favourites.toLocaleString(), numeric: true });
  }
  if (data?.alternativeNames.length) facts.push({ label: 'Also known as', value: data.alternativeNames.join(', ') });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[styles.ring, { borderColor: colors.rule as string }]}>
          <Image
            source={image ? { uri: image } : null}
            style={[styles.portrait, { backgroundColor: colors.fill }]}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Portrait of ${name}`}
          />
        </View>
        <Text style={[Type.title2, styles.center, { color: colors.text }]} selectable>
          {name}
        </Text>
        {data?.nativeName ? (
          <Text style={[Type.subhead, { color: colors.textSecondary }]}>{data.nativeName}</Text>
        ) : null}
      </View>

      {facts.length ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {facts.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.fact,
                i > 0 && { borderTopColor: colors.rule as string, borderTopWidth: StyleSheet.hairlineWidth * 2 },
              ]}>
              <Text style={[Type.subhead, { color: colors.textSecondary }]}>{f.label}</Text>
              <Text
                style={[
                  f.numeric ? styles.numeric : Type.subhead,
                  styles.factValue,
                  { color: colors.text },
                ]}
                numberOfLines={2}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
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
        <View style={styles.about}>
          <Text style={[Type.headline, styles.aboutTitle, { color: colors.text, borderBottomColor: colors.rule as string }]}>
            About
          </Text>
          <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
            <Text style={[Type.body, { color: colors.text }]} numberOfLines={expanded ? undefined : 8}>
              {data.description}
            </Text>
            {data.description.length > 360 ? (
              <Text style={[Type.subhead, styles.more, { color: colors.primary }]}>
                {expanded ? 'Show less' : 'Show more'}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ) : (
        <Text style={[Type.subhead, styles.center, { color: colors.textSecondary }]}>
          AniList has no bio for this character yet.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 32, paddingBottom: 48, gap: 20 },
  header: { alignItems: 'center', gap: 4 },
  ring: {
    padding: 4,
    borderRadius: 72,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: 12,
  },
  portrait: { width: 128, height: 128, borderRadius: 64 },
  center: { textAlign: 'center' },
  card: { borderRadius: Platform.OS === 'ios' ? 14 : 20, borderCurve: 'continuous', paddingHorizontal: 16 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingVertical: 12 },
  factValue: { flexShrink: 1, textAlign: 'right' },
  numeric: { fontFamily: Fonts.numeral, fontSize: 18, fontVariant: ['tabular-nums'] },
  about: { gap: 10 },
  aboutTitle: { paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  more: { marginTop: 8, fontWeight: '600' },
  skeleton: { gap: 10, paddingTop: 8 },
  skeletonLine: { height: 12, borderRadius: 6 },
});
