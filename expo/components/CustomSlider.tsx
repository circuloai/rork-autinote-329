import React, { useState } from 'react';
import { View, PanResponder, StyleSheet, Platform } from 'react-native';

interface CustomSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: any;
}

export default function CustomSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  minimumTrackTintColor = '#007AFF',
  maximumTrackTintColor = '#E5E5EA',
  thumbTintColor = '#FFFFFF',
  style,
}: CustomSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const calculateValue = (locationX: number) => {
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const rawValue = minimumValue + percentage * (maximumValue - minimumValue);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsDragging(true);
      const locationX = evt.nativeEvent.locationX;
      const newValue = calculateValue(locationX);
      onValueChange(newValue);
    },
    onPanResponderMove: (evt) => {
      const locationX = evt.nativeEvent.locationX;
      const newValue = calculateValue(locationX);
      onValueChange(newValue);
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
    },
  });

  const percentage = (value - minimumValue) / (maximumValue - minimumValue);

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]} />
      <View
        style={[
          styles.filledTrack,
          { width: `${percentage * 100}%`, backgroundColor: minimumTrackTintColor },
        ]}
      />
      <View
        style={[
          styles.thumb,
          { left: `${percentage * 100}%`, backgroundColor: thumbTintColor },
          isDragging && styles.thumbActive,
          { shadowColor: minimumTrackTintColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  filledTrack: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    marginLeft: -12,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      },
    }),
  },
  thumbActive: {
    transform: [{ scale: 1.2 }],
  },
});
