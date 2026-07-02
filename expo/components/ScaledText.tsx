import React, { useMemo } from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { getFontScale } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { Preferences } from '@/types';

/**
 * ScaledText — a drop-in replacement for RN <Text> that automatically
 * applies the user's font-size preference (from AppContext) to any
 * `fontSize` declared in its `style` prop.
 *
 * Pass it the same props you would pass to <Text>. The base font sizes
 * in stylesheets stay unchanged; this component multiplies them by the
 * current font scale at render time.
 */
export default function ScaledText(props: TextProps) {
  const { preferences } = useApp();
  const scale = useMemo(() => getFontScale(preferences as Preferences | null), [preferences]);

  const scaledStyle = useMemo<StyleProp<TextStyle>>(() => {
    if (!props.style) return undefined;
    return applyFontScale(props.style, scale);
  }, [props.style, scale]);

  return <Text {...props} style={scaledStyle} />;
}

/**
 * Walks the style prop (which can be an array, object, or nested arrays)
 * and multiplies every `fontSize` value by `scale`.
 */
function applyFontScale(style: StyleProp<TextStyle>, scale: number): StyleProp<TextStyle> {
  if (style == null) return style;
  if (Array.isArray(style)) {
    return style.map((s) => applyFontScale(s as StyleProp<TextStyle>, scale)) as StyleProp<TextStyle>;
  }
  if (typeof style === 'object') {
    const s = style as TextStyle;
    if (s.fontSize != null) {
      return { ...s, fontSize: Math.round(s.fontSize * scale) };
    }
    return s;
  }
  return style;
}
