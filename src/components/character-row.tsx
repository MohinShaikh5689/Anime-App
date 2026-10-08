import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion';
import type { CharacterSummary } from '@/lib/anilist';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

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
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInRight.delay(Math.min(index, 6) * 50).duration(400)}>
          <CharacterBubble character={item} />
        </Animated.View>
      )}
    />
  );
}

function CharacterBubble({ character }: { character: CharacterSummary }) {
  const { colors } = useAppTheme();
  const main = character.role === 'MAIN';
  return (
    <PressableScale
      haptic
      scaleTo={0.92}
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
      <View
        style={[
          styles.ring,
          { borderColor: main ? (colors.primary as string) : 'transparent' },
        ]}>
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
      <Text style={[styles.role, { color: main ? colors.primary : colors.textSecondary }]}>
        {main ? 'Main' : character.role === 'SUPPORTING' ? 'Supporting' : 'Background'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 14 },
  item: { width: SIZE + 8, alignItems: 'center' },
  ring: { padding: 3, borderRadius: (SIZE + 12) / 2, borderWidth: 2 },
  avatar: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  name: { fontFamily: Fonts.heading, fontSize: 12.5, textAlign: 'center', marginTop: 6, lineHeight: 15 },
  role: { fontFamily: Fonts.label, fontSize: 11, marginTop: 1 },
});
