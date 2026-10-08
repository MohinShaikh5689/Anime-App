import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

type Props = {
  /** SF Symbol name used on iOS. */
  sf: SFSymbol;
  /** Material Symbol name used on Android. */
  md: AndroidSymbol;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ sf, md, size = 22, color, style }: Props) {
  return (
    <SymbolView
      name={{ ios: sf, android: md }}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  );
}
