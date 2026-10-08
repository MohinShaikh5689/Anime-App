import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme';

type Props = {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
};

/** 1–5 star rating. Tapping the current value again clears it. */
export function RatingStars({ value, onChange, size = 28 }: Props) {
  const { colors } = useAppTheme();
  const active = Platform.select({ ios: '#FFB800', default: colors.primary });

  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value != null && star <= value;
        const icon = (
          <Icon
            sf={filled ? 'star.fill' : 'star'}
            md="star"
            size={size}
            color={filled ? active : colors.textSecondary}
            style={!filled && Platform.OS === 'android' ? { opacity: 0.35 } : undefined}
          />
        );
        if (!onChange) return <View key={star}>{icon}</View>;
        return (
          <Pressable
            key={star}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
            accessibilityState={{ selected: filled }}
            android_ripple={{ borderless: true, radius: size * 0.8 }}
            onPress={() => onChange(value === star ? null : star)}>
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
