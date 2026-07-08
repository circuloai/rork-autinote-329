import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { getColors } from '@/constants/colors';

type Props = {
  style?: object;
};

export default function AppFooter({ style }: Props) {
  const { preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: Colors.surface,
          borderColor: Colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.line, { color: Colors.textSecondary }]}>
        ✨🧩 Crafted with love 🧩✨
      </Text>
      <Text style={[styles.line, { color: Colors.textSecondary }]}>
        {'by '}
        <Text
          style={[
            styles.name,
            { color: Colors.text },
            Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : undefined,
          ]}
          numberOfLines={1}
        >
          Anika Kale
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
  },
  line: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
  },
});
