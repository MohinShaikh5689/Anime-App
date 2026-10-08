/**
 * Android controls using Material 3 components from react-native-paper.
 * iOS uses `controls.tsx` (Liquid Glass).
 */
import { StyleSheet, View } from 'react-native';
import { Button, Chip, IconButton, ProgressBar, Text } from 'react-native-paper';

import type {
  ActionButtonProps,
  EpisodeStepperProps,
  IncrementButtonProps,
  ProgressProps,
  StatusPickerProps,
} from './controls.types';
import { Icon } from '@/components/icon';
import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { useAppTheme } from '@/theme/theme';

export function Progress({ value, total, color }: ProgressProps) {
  return (
    <ProgressBar
      progress={total ? Math.min(1, value / total) : 0}
      color={color as string | undefined}
      style={styles.progress}
    />
  );
}

export function IncrementButton({ onPress, accessibilityLabel }: IncrementButtonProps) {
  return (
    <IconButton
      icon="add"
      mode="contained-tonal"
      size={20}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.chips}>
      {LIST_STATUSES.map((status) => {
        const meta = LISTS[status];
        const selected = value === status;
        return (
          <Chip
            key={status}
            mode={selected ? 'flat' : 'outlined'}
            selected={selected}
            showSelectedCheck={false}
            icon={({ size }) => (
              <Icon
                sf={meta.sf}
                md={meta.md}
                size={size}
                color={selected ? colors.primary : colors.textSecondary}
              />
            )}
            onPress={() => onChange(status)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}>
            {meta.title}
          </Chip>
        );
      })}
    </View>
  );
}

export function EpisodeStepper({ progress, episodes, onChange }: EpisodeStepperProps) {
  const atMax = episodes != null && progress >= episodes;
  return (
    <View style={styles.stepper}>
      <IconButton
        icon="remove"
        mode="contained-tonal"
        size={24}
        disabled={progress <= 0}
        onPress={() => onChange(progress - 1)}
        accessibilityLabel="Previous episode"
      />
      <View style={styles.stepValue} accessibilityLiveRegion="polite">
        <Text variant="headlineMedium">
          {progress}
          <Text variant="headlineMedium" style={styles.muted}>
            {' '}
            / {episodes ?? '?'}
          </Text>
        </Text>
        <Text variant="labelMedium" style={styles.muted}>
          episodes
        </Text>
      </View>
      <IconButton
        icon="add"
        mode="contained-tonal"
        size={24}
        disabled={atMax}
        onPress={() => onChange(progress + 1)}
        accessibilityLabel="Next episode"
      />
    </View>
  );
}

export function ActionButton({ title, md, variant = 'tonal', onPress }: ActionButtonProps) {
  const { colors } = useAppTheme();
  if (variant === 'destructive') {
    return (
      <Button mode="text" icon={md} textColor={colors.danger as string} onPress={onPress}>
        {title}
      </Button>
    );
  }
  return (
    <Button mode={variant === 'primary' ? 'contained' : 'contained-tonal'} icon={md} onPress={onPress}>
      {title}
    </Button>
  );
}

const styles = StyleSheet.create({
  progress: { borderRadius: 2, height: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { alignItems: 'center' },
  muted: { opacity: 0.6 },
});
