import React, { useRef, useCallback, useState, useEffect } from 'react';
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

  // Refs that mirror the latest state/props so PanResponder closures always see current values
  const sliderWidthRef = useRef(0);
  const onValueChangeRef = useRef(onValueChange);
  const minRef = useRef(minimumValue);
  const maxRef = useRef(maximumValue);
  const stepRef = useRef(step);

  useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    minRef.current = minimumValue;
  }, [minimumValue]);

  useEffect(() => {
    maxRef.current = maximumValue;
  }, [maximumValue]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setSliderWidth(width);
    sliderWidthRef.current = width;
    if (sliderRef.current) {
      sliderRef.current.measureInWindow((x) => {
        sliderPageXRef.current = x;
      });
    }
  }, []);

  /**
   * Calculate value from a screen-space X coordinate.
   * Reads from refs so PanResponder always uses up-to-date data.
   */
  const calcFromRef = (pageX: number) => {
    const w = sliderWidthRef.current;
    if (w <= 0) return value;
    const local = pageX - sliderPageXRef.current;
    const ratio = Math.max(0, Math.min(1, local / w));
    const raw = minRef.current + ratio * (maxRef.current - minRef.current);
    const stepped = Math.round(raw / stepRef.current) * stepRef.current;
    return Math.max(minRef.current, Math.min(maxRef.current, stepped));
  };

  // PanResponder created once; reads from refs so it never goes stale
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const newVal = calcFromRef(evt.nativeEvent.pageX);
        onValueChangeRef.current(newVal);
      },
      onPanResponderMove: (evt) => {
        const newVal = calcFromRef(evt.nativeEvent.pageX);
        onValueChangeRef.current(newVal);
      },
      onPanResponderRelease: () => {},
      onPanResponderTerminationRequest: () => false,
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
