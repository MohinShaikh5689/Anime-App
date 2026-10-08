/**
 * Android controls using Material 3 components from react-native-paper.
 * iOS uses `controls.tsx` (Liquid Glass).
 */
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Chip as PaperChip,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';

import type {
  ActionButtonProps,
  ChipProps,
  EpisodeStepperProps,
  IncrementButtonProps,
  ListSwitcherProps,
  StatusPickerProps,
} from './controls.types';
import { EpisodeReadout } from '@/components/frames';
import { Icon } from '@/components/icon';
import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { useAppTheme } from '@/theme/theme';

export function IncrementButton({ onPress, accessibilityLabel }: IncrementButtonProps) {
  return (
    <View>
      <IconButton
        icon="add"
        mode="contained-tonal"
        size={20}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
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
          <PaperChip
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
          </PaperChip>
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
        <EpisodeReadout progress={progress} total={episodes} size={28} />
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

export function ActionButton({
  title,
  md,
  variant = 'tonal',
  loading,
  disabled,
  block,
  onPress,
}: ActionButtonProps) {
  const { colors } = useAppTheme();
  const common = {
    icon: md,
    loading,
    disabled: disabled || loading,
    onPress,
    style: block ? styles.block : undefined,
    contentStyle: block ? styles.blockContent : undefined,
  };
  if (variant === 'destructive') {
    return (
      <Button mode="text" textColor={colors.danger as string} {...common}>
        {title}
      </Button>
    );
  }
  return (
    <Button mode={variant === 'primary' ? 'contained' : 'contained-tonal'} {...common}>
      {title}
    </Button>
  );
}

/** Material 3 segmented buttons. */
export function ListSwitcher({ value, onChange }: ListSwitcherProps) {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={(v) => onChange(v as ListSwitcherProps['value'])}
      density="small"
      style={styles.switcher}
      buttons={LIST_STATUSES.map((status) => ({
        value: status,
        label: LISTS[status].title,
        labelStyle: styles.segmentLabel,
        showSelectedCheck: false,
      }))}
    />
  );
}

/** Material 3 filter chip. */
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <PaperChip mode={selected ? 'flat' : 'outlined'} selected={selected} onPress={onPress}>
      {label}
    </PaperChip>
  );
}

const styles = StyleSheet.create({
  switcher: { marginHorizontal: 16 },
  block: { alignSelf: 'stretch' },
  blockContent: { height: 48 },
  segmentLabel: { fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { alignItems: 'center' },
});
