import React from 'react';
import { Platform, View, ViewStyle, StyleProp } from 'react-native';

let GlassView: any = null;
if (Platform.OS === 'ios') {
  try {
    GlassView = require('expo-glass-effect').GlassView;
  } catch {
    console.warn('[GlassCard] expo-glass-effect not available');
  }
}

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
  glassEffectStyle = 'regular',
  tintColor,
}: GlassCardProps) {
  if (Platform.OS === 'ios' && GlassView) {
    return (
      <GlassView
        style={style}
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[style, fallbackStyle]}>
      {children}
    </View>
  );
}
