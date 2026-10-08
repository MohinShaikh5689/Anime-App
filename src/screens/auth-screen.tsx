/** iOS sign-in: inset grouped fields and a Liquid Glass primary button. */
import { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionButton } from '@/components/controls';
import { useAuthForm } from '@/screens/use-auth-form';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

export function AuthScreen() {
  const { colors, dark } = useAppTheme();
  const form = useAuthForm();
  const passwordRef = useRef<TextInput>(null);
  const signUp = form.mode === 'sign-up';

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[
        styles.fill,
        {
          backgroundColor: colors.background,
          experimental_backgroundImage: dark
            ? 'linear-gradient(160deg, #2B1B26 0%, #16131F 55%, #000000 100%)'
            : 'linear-gradient(160deg, #FFE3EC 0%, #EFE9FF 55%, #F2F2F7 100%)',
        },
      ]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: colors.surface }]}>
            <Text style={styles.logoEmoji}>🌸</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {signUp ? 'Create Account' : 'Anime Tracker'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {signUp
              ? 'Your lists sync across all your devices.'
              : 'Sign in to see your lists on every device.'}
          </Text>
        </View>

        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={form.email}
            onChangeText={form.setEmail}
            keyboardType="email-address"
            textContentType={signUp ? 'username' : 'emailAddress'}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
          <View style={[styles.separator, { backgroundColor: colors.separator }]} />
          <TextInput
            ref={passwordRef}
            style={[styles.input, { color: colors.text }]}
            placeholder={signUp ? 'New password' : 'Password'}
            placeholderTextColor={colors.textSecondary}
            value={form.password}
            onChangeText={form.setPassword}
            secureTextEntry
            textContentType={signUp ? 'newPassword' : 'password'}
            autoComplete={signUp ? 'new-password' : 'current-password'}
            returnKeyType="go"
            onSubmitEditing={form.submit}
          />
        </View>
        {form.passwordHint ? (
          <Text style={[styles.footnote, { color: colors.textSecondary }]}>{form.passwordHint}</Text>
        ) : null}

        {form.error ? (
          <Text style={[styles.message, { color: colors.danger }]} accessibilityLiveRegion="polite">
            {form.error}
          </Text>
        ) : null}
        {form.info ? (
          <Text style={[styles.message, { color: colors.text }]} accessibilityLiveRegion="polite">
            {form.info}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <ActionButton
            title={signUp ? 'Create Account' : 'Sign In'}
            variant="primary"
            block
            loading={form.loading}
            disabled={!form.canSubmit}
            onPress={form.submit}
          />
          <Pressable onPress={form.toggleMode} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.switch, { color: colors.textSecondary }]}>
              {signUp ? 'Already have an account? ' : 'New here? '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {signUp ? 'Sign In' : 'Create Account'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 12 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 20 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: Fonts.display, fontSize: 34, textAlign: 'center' },
  subtitle: { fontFamily: Fonts.label, fontSize: 17, textAlign: 'center' },
  logoEmoji: { fontSize: 44 },
  group: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  input: { fontSize: 17, paddingHorizontal: 16, height: 50 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  footnote: { fontSize: 13, marginHorizontal: 16 },
  message: { fontSize: 15, textAlign: 'center', marginTop: 4 },
  actions: { gap: 20, marginTop: 12, alignItems: 'center' },
  switch: { fontFamily: Fonts.label, fontSize: 15, textAlign: 'center' },
});
