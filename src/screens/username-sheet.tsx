import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/controls';
import { normalizeUsername, useProfile, usernameProblem } from '@/store/profile';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

/** Pick or change your public @username. */
export function UsernameSheet() {
  const { colors } = useAppTheme();
  const current = useProfile((s) => s.username);
  const setUsername = useProfile((s) => s.setUsername);
  const [value, setValue] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = normalizeUsername(value);
  const problem = username ? usernameProblem(username) : null;
  const unchanged = username === current;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await setUsername(username);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const hint = error ?? problem ?? '3–20 characters: letters, numbers and underscores.';
  const hintIsError = !!(error || problem);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{current ? 'Change username' : 'Choose a username'}</Text>
        <Text style={[Type.subhead, { color: colors.textSecondary }]}>
          This is how you show up in Tsuzuku. Your email stays private.
        </Text>

        <View
          style={[
            styles.field,
            { backgroundColor: colors.fill, borderColor: hintIsError ? (colors.danger as string) : 'transparent' },
          ]}>
          <Text style={[styles.at, { color: colors.textSecondary }]}>@</Text>
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t);
              setError(null);
            }}
            placeholder="username"
            placeholderTextColor={colors.textSecondary as string}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            textContentType="username"
            maxLength={21}
            returnKeyType="done"
            onSubmitEditing={() => !problem && username && !unchanged && save()}
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel="Username"
          />
        </View>
        <Text
          style={[Type.footnote, { color: hintIsError ? colors.danger : colors.textSecondary }]}
          accessibilityLiveRegion="polite">
          {hint}
        </Text>

        <ActionButton
          title="Save"
          variant="primary"
          block
          loading={saving}
          disabled={!username || !!problem || unchanged}
          onPress={save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 24, paddingTop: 32, gap: 14 },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 14,
    minHeight: 54,
    marginTop: 8,
  },
  at: { fontSize: 20, fontWeight: '700', marginRight: 2 },
  input: { flex: 1, fontSize: 20, fontWeight: '600', paddingVertical: 12 },
});
