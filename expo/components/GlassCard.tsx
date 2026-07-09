import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

// GlassCard previously used expo-glass-effect's GlassView on iOS (a blur/glass
// composite). When the iOS system is in dark mode the blur samples the dark
// surface behind the app, making every card appear dark regardless of the
// app-level theme. The fix is to always render a solid View — callers already
// supply fallbackStyle={{ backgroundColor: Colors.surface }} so the card looks
// identical to the web/Android path that was already using the solid fallback.
//
// The prop API is unchanged so no call site needs to be updated. The
// glassEffectStyle and tintColor props are accepted but not used (kept for API
// compatibility in case they are referenced from existing call sites).

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  glassEffectStyle?: 'regular' | 'clear';
  tintColor?: string;
};

export default function GlassCard({
  children,
  style,
  fallbackStyle,
}: GlassCardProps) {
  return (
    <View style={[style, fallbackStyle]}>
      {children}
    </View>
  );
}
