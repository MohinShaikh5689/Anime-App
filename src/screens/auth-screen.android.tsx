/** Android sign-in: Material 3 outlined text fields and filled buttons. */
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme, type MD3Theme } from 'react-native-paper';
import type { TextInput as NativeTextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PosterWall } from '@/components/poster-wall';
import { Fonts } from '@/theme/fonts';
import { useAuthForm } from '@/screens/use-auth-form';

const APP_ICON = require('../../assets/images/splash-icon.png');

export function AuthScreen() {
  const { colors } = useTheme<MD3Theme>();
  const insets = useSafeAreaInsets();
  const form = useAuthForm();
  const wallHeight = Math.round(useWindowDimensions().height * 0.6);
  const passwordRef = useRef<NativeTextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const signUp = form.mode === 'sign-up';

  return (
    <KeyboardAvoidingView behavior="height" style={[styles.fill, { backgroundColor: colors.background }]}>
      <PosterWall height={wallHeight} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}>
        <View style={styles.hero}>
          <Image source={APP_ICON} style={styles.mark} accessibilityLabel="Tsuzuku" />
          <Text variant="headlineMedium" style={[styles.center, styles.display]}>
            {signUp ? 'Create account' : 'Tsuzuku'}
          </Text>
          <Text variant="bodyLarge" style={[styles.center, { color: colors.onSurfaceVariant }]}>
            {signUp
              ? 'Your lists sync across all your devices.'
              : 'Sign in to see your lists on every device.'}
          </Text>
        </View>

        <TextInput
          mode="outlined"
          label="Email"
          value={form.email}
          onChangeText={form.setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
          left={<TextInput.Icon icon="mail" />}
        />
        <View>
          <TextInput
            ref={passwordRef}
            mode="outlined"
            label="Password"
            value={form.password}
            onChangeText={form.setPassword}
            secureTextEntry={!showPassword}
            autoComplete={signUp ? 'new-password' : 'current-password'}
            returnKeyType="go"
            onSubmitEditing={form.submit}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'visibility_off' : 'visibility'}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              />
            }
          />
          {form.passwordHint ? <HelperText type="info">{form.passwordHint}</HelperText> : null}
        </View>

        {form.error ? (
          <HelperText type="error" visible style={styles.center}>
            {form.error}
          </HelperText>
        ) : null}
        {form.info ? (
          <Text variant="bodyMedium" style={styles.center}>
            {form.info}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={form.submit}
          loading={form.loading}
          disabled={!form.canSubmit || form.loading}
          contentStyle={styles.buttonContent}
          style={styles.primary}>
          {signUp ? 'Create account' : 'Sign in'}
        </Button>
        <Button mode="text" onPress={form.toggleMode}>
          {signUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mark: { width: 72, height: 72, alignSelf: 'center', marginBottom: 6 },
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 24, gap: 12 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 16 },
  center: { textAlign: 'center' },
  display: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 40 },
  primary: { marginTop: 8 },
  buttonContent: { height: 48 },
});
