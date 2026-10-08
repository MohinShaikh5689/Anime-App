import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/controls';
import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

type EmptyStateProps = {
  sf: SFSymbol;
  md: AndroidSymbol;
  title: string;
  body?: string;
  action?: { title: string; sf?: SFSymbol; md?: AndroidSymbol; onPress: () => void };
};

export function EmptyState({ sf, md, title, body, action }: EmptyStateProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <Icon sf={sf} md={md} size={44} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text> : null}
      {action ? (
        <View style={styles.action}>
          <ActionButton
            title={action.title}
            sf={action.sf}
            md={action.md}
            variant="tonal"
            onPress={action.onPress}
          />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary as string} size="large" />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <EmptyState
      sf="wifi.exclamationmark"
      md="wifi_off"
      title="Couldn't load anime"
      body={error.message}
      action={{ title: 'Try Again', sf: 'arrow.clockwise', md: 'refresh', onPress: onRetry }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 8,
  },
  title: { ...Type.title3, textAlign: 'center', marginTop: 8 },
  body: { ...Type.subhead, textAlign: 'center' },
  action: { marginTop: 16 },
});
