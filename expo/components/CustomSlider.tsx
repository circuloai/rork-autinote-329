import React, { useRef, useCallback, useState } from 'react';
import { View, PanResponder, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';

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
  const sliderRef = useRef<View>(null);
  const sliderPageXRef = useRef(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setSliderWidth(width);
    // Measure slider's absolute position on screen
    if (sliderRef.current) {
      sliderRef.current.measureInWindow((x) => {
        sliderPageXRef.current = x;
      });
    }
  }, []);

  const calculateValue = useCallback(
    (locationInSlider: number) => {
      if (sliderWidth <= 0) return value;
      const ratio = Math.max(0, Math.min(1, locationInSlider / sliderWidth));
      const rawValue = minimumValue + ratio * (maximumValue - minimumValue);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
    },
    [sliderWidth, minimumValue, maximumValue, step, value]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // pageX is the absolute position on screen, subtract slider's pageX to get position within slider
        const locationInSlider = evt.nativeEvent.pageX - sliderPageXRef.current;
        const newValue = calculateValue(locationInSlider);
        onValueChange(newValue);
      },
      onPanResponderMove: (evt) => {
        const locationInSlider = evt.nativeEvent.pageX - sliderPageXRef.current;
        const newValue = calculateValue(locationInSlider);
        onValueChange(newValue);
      },
      onPanResponderRelease: () => {
        // No state change needed — parent already has the value
      },
    })
  ).current;

  const percentage = sliderWidth > 0
    ? ((value - minimumValue) / (maximumValue - minimumValue)) * 100
    : 0;

  return (
    <View
      ref={sliderRef}
      style={[styles.container, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {/* Background track */}
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]} />
      {/* Filled track */}
      <View
        style={[
          styles.filledTrack,
          {
            width: `${percentage}%`,
            backgroundColor: minimumTrackTintColor,
          },
        ]}
      />
      {/* Thumb */}
      <View
        style={[
          styles.thumbWrapper,
          { left: `${percentage}%` },
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbTintColor,
              shadowColor: minimumTrackTintColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  filledTrack: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 19, // (44 - 6) / 2
  },
  thumbWrapper: {
    position: 'absolute',
    top: 0,
    marginLeft: -14,
    width: 28,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      },
    }),
  },
});
