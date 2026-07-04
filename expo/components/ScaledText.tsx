import React, { useMemo } from 'react';
import { Text, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { getFontScale } from '@/constants/colors';
import { FontFamilies, HEADING_FONT_SIZE_THRESHOLD } from '@/constants/fonts';
import { useApp } from '@/contexts/AppContext';
import type { Preferences } from '@/types';

/**
 * ScaledText — a drop-in replacement for RN <Text> that:
 * 1. Scales fontSize by the user's font-size preference
 * 2. Auto-applies DM Sans (body) to all text
 * 3. Auto-applies Playfair Display Bold (heading) when the style
 *    has fontWeight 700/800/bold AND fontSize >= HEADING_FONT_SIZE_THRESHOLD
 */
export default function ScaledText(props: TextProps) {
  const { preferences } = useApp();
  const scale = useMemo(() => getFontScale(preferences as Preferences | null), [preferences]);

  const scaledStyle = useMemo<StyleProp<TextStyle>>(() => {
    if (!props.style) return undefined;
    return applyFontScale(props.style, scale);
  }, [props.style, scale]);

  const finalStyle = useMemo<StyleProp<TextStyle>>(() => {
    const family = resolveFontFamily(scaledStyle);
    if (!family) return scaledStyle;
    if (Array.isArray(scaledStyle)) {
      return [...scaledStyle, { fontFamily: family }];
    }
    return [scaledStyle, { fontFamily: family }];
  }, [scaledStyle]);

  return <Text {...props} style={finalStyle} />;
}

function resolveFontFamily(style: StyleProp<TextStyle>): string | null {
  const flat = StyleSheet.flatten(style) as TextStyle | null;
  if (!flat) return FontFamilies.body;

  if (flat.fontFamily) return null;

  const weight = flat.fontWeight;
  const isHeavy = weight === '700' || weight === '800' || weight === '900' || weight === 'bold';
  const size = flat.fontSize ?? 0;

  if (isHeavy && size >= HEADING_FONT_SIZE_THRESHOLD) {
    return FontFamilies.heading;
  }

  if (isHeavy) {
    return FontFamilies.bodyBold;
  }

  const isMedium = weight === '500';
  if (isMedium) return FontFamilies.bodyMedium;

  const isSemiBold = weight === '600';
  if (isSemiBold) return FontFamilies.bodySemiBold;

  return FontFamilies.body;
}

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
