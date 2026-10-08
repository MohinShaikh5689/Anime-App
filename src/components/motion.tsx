/**
 * Platform press feedback for custom pressables: the iOS highlight (dimming) and the
 * Android ripple. The app's only authored motion is the frame ink sweep and the
 * finish check; nothing else moves on its own.
 */
import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';

type PlatformPressableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

export const PlatformPressable = forwardRef<View, PlatformPressableProps>(function PlatformPressable(
  { style, haptic, onPress, ...rest },
  ref
) {
  return (
    <Pressable
      ref={ref}
      {...rest}
      android_ripple={{ color: 'rgba(127,127,127,0.18)', foreground: true }}
      onPress={(e) => {
        if (haptic && Platform.OS === 'ios') Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, Platform.OS === 'ios' && pressed && { opacity: 0.6 }]}
    />
  );
});
