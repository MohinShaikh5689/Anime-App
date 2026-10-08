import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { PlatformPressable } from '@/components/motion';
import type { CharacterSummary } from '@/lib/anilist';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const SIZE = 78;

/** Horizontal row of character portraits; tapping one opens the character sheet. */
export function CharacterRow({ characters }: { characters: CharacterSummary[] }) {
  return (
    <FlatList
      horizontal
      data={characters}
      keyExtractor={(c) => String(c.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <CharacterBubble character={item} />}
    />
  );
}

function CharacterBubble({ character }: { character: CharacterSummary }) {
  const { colors } = useAppTheme();
  const main = character.role === 'MAIN';
  return (
    <PlatformPressable
      haptic
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={`${character.name}, ${main ? 'main' : 'supporting'} character`}
      onPress={() =>
        router.push({
          pathname: '/character/[id]',
          params: {
            id: String(character.id),
            name: character.name,
            image: character.image ?? '',
          },
        } as unknown as Href)
      }>
      <View style={[styles.ring, { borderColor: colors.rule as string }]}>
        <Image
          source={character.image ? { uri: character.image } : null}
          style={[styles.avatar, { backgroundColor: colors.fill }]}
          contentFit="cover"
          transition={200}
        />
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {character.name}
      </Text>
      {main ? (
        <>
          <Text style={[styles.role, { color: colors.primary }]}>Main</Text>
          {character.voiceActor ? (
            <Text style={[styles.role, { color: colors.textSecondary }]} numberOfLines={1}>
              {character.voiceActor.name}
            </Text>
          ) : null}
        </>
      ) : null}
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 12 },
  item: { width: SIZE + 16, alignItems: 'center' },
  ring: { padding: 3, borderRadius: (SIZE + 8) / 2, borderWidth: StyleSheet.hairlineWidth * 2 },
  avatar: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  name: { ...Type.footnote, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  role: { ...Type.caption, textAlign: 'center', marginTop: 1 },
});
