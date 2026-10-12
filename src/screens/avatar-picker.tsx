import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ActionButton, Segmented } from '@/components/controls';
import { Icon } from '@/components/icon';
import { EmptyState, ErrorState } from '@/components/states';
import { type AvatarCharacter, type AvatarGender, getAvatarCharacters } from '@/lib/anilist';
import { useDebouncedValue, useRequest } from '@/lib/use-request';
import { useProfile } from '@/store/profile';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const GENDERS: AvatarGender[] = ['Male', 'Female', 'Any'];
const PADDING = 20;
const GAP = 14;
/** Popular characters run deep; shuffling picks a page from this range. */
const SHUFFLE_PAGES = 40;

/** Choose an anime character portrait as your profile picture. */
export function AvatarPicker() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const current = useProfile((s) => s.avatarUrl);
  const setAvatar = useProfile((s) => s.setAvatar);
  const [gender, setGender] = useState<AvatarGender>('Any');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const search = useDebouncedValue(query.trim(), 350);

  const columns = width >= 600 ? 5 : 3;
  const size = Math.floor((width - PADDING * 2 - GAP * (columns - 1)) / columns);

  const key = `avatars:${gender}:${search ? `q=${search}` : `p=${page}`}`;
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      if (search) return getAvatarCharacters({ gender, search }, signal);
      // One gender is roughly a third to two thirds of a page, so read two.
      const pages = gender === 'Any' ? [page] : [page, page + 1];
      const lists = await Promise.all(pages.map((p) => getAvatarCharacters({ gender, page: p }, signal)));
      return lists.flat();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const { data, error, loading, retry } = useRequest<AvatarCharacter[]>(key, fetcher);

  const choose = async (url: string | null) => {
    setSaving(url ?? 'none');
    try {
      await setAvatar(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save your picture", e instanceof Error ? e.message : 'Try again in a moment.');
    } finally {
      setSaving(null);
    }
  };

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>Choose your avatar</Text>
      <Text style={[Type.subhead, { color: colors.textSecondary }]}>
        Pick an anime character as your profile picture.
      </Text>
      <Segmented
        values={GENDERS}
        selectedIndex={GENDERS.indexOf(gender)}
        onChange={(i) => {
          setGender(GENDERS[i] ?? 'Any');
          setPage(1);
        }}
      />
      <View style={[styles.search, { backgroundColor: colors.fill }]}>
        <Icon sf="magnifyingglass" md="search" size={17} color={colors.textSecondary as string} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for a character"
          placeholderTextColor={colors.textSecondary as string}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[Type.body, styles.searchInput, { color: colors.text }]}
        />
      </View>
      <View style={styles.actions}>
        {!search ? (
          <ActionButton
            title="Shuffle"
            sf="shuffle"
            md="shuffle"
            variant="tonal"
            onPress={() => setPage(1 + Math.floor(Math.random() * SHUFFLE_PAGES))}
          />
        ) : null}
        {current ? (
          <ActionButton
            title="Remove Picture"
            sf="trash"
            md="delete"
            variant="destructive"
            loading={saving === 'none'}
            onPress={() => choose(null)}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <FlatList
      key={columns}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      numColumns={columns}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      data={data ?? []}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={styles.loading} />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : (
          <EmptyState sf="person.crop.circle.badge.questionmark" md="person_search" title="No characters found" />
        )
      }
      renderItem={({ item }) => {
        const selected = item.image === current;
        return (
          <Pressable
            onPress={() => choose(item.image)}
            disabled={saving != null}
            accessibilityRole="button"
            accessibilityLabel={`Use ${item.name}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.cell, { width: size }, pressed && styles.pressed]}>
            <View
              style={[
                styles.ring,
                { width: size, height: size, borderRadius: size / 2, borderColor: selected ? colors.primary : 'transparent' },
              ]}>
              <Image
                source={{ uri: item.image }}
                style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, backgroundColor: colors.fill }}
                contentFit="cover"
                contentPosition="top"
                transition={150}
              />
              {saving === item.image ? (
                <View style={[StyleSheet.absoluteFill, styles.saving]}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <Text style={[Type.footnote, styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PADDING, paddingTop: 28, paddingBottom: 48, gap: 18, flexGrow: 1 },
  header: { gap: 14, marginBottom: 6 },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, paddingVertical: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { gap: GAP },
  cell: { alignItems: 'center', gap: 6 },
  ring: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  saving: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999 },
  name: { fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.6 },
  loading: { marginTop: 40 },
});
