import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';

interface ResizableDividerProps {
  currentRatio: number;
  onResize: (ratio: number) => void;
  containerHeight: number;
  minTopRatio?: number;
  maxTopRatio?: number;
}

export default function ResizableDivider({
  currentRatio,
  onResize,
  containerHeight,
  minTopRatio = 0.1,
  maxTopRatio = 0.9,
}: ResizableDividerProps) {
  // Use refs to avoid recreating PanResponder on every render
  const startRatio = useRef(currentRatio);
  const currentRatioRef = useRef(currentRatio);
  const containerHeightRef = useRef(containerHeight);
  const onResizeRef = useRef(onResize);
  const minTopRatioRef = useRef(minTopRatio);
  const maxTopRatioRef = useRef(maxTopRatio);

  // Update refs when props change
  useEffect(() => {
    currentRatioRef.current = currentRatio;
  }, [currentRatio]);

  useEffect(() => {
    containerHeightRef.current = containerHeight;
  }, [containerHeight]);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    minTopRatioRef.current = minTopRatio;
    maxTopRatioRef.current = maxTopRatio;
  }, [minTopRatio, maxTopRatio]);

  // ============ Native (React Native) Implementation ============
  // Create PanResponder only once - use refs for all values
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      // Capture the current ratio at the start of the gesture
      startRatio.current = currentRatioRef.current;
    },
    onPanResponderMove: (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const height = containerHeightRef.current;
      if (height <= 0) return;

      const deltaRatio = gestureState.dy / height;
      let newRatio = startRatio.current + deltaRatio;
      newRatio = Math.max(minTopRatioRef.current, Math.min(maxTopRatioRef.current, newRatio));
      onResizeRef.current(newRatio);
    },
    onPanResponderRelease: () => {
      // Gesture ended successfully
    },
    onPanResponderTerminate: () => {
      // Gesture was interrupted
    },
  }), []); // Empty dependency array - PanResponder is created only once

  // ============ Web Implementation ============
  const isDragging = useRef(false);
  const startY = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startRatio.current = currentRatioRef.current;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || Platform.OS !== 'web') return;
    e.preventDefault();

    const height = containerHeightRef.current;
    if (height <= 0) return;

    const deltaY = e.clientY - startY.current;
    const deltaRatio = deltaY / height;
    let newRatio = startRatio.current + deltaRatio;

    newRatio = Math.max(minTopRatioRef.current, Math.min(maxTopRatioRef.current, newRatio));
    onResizeRef.current(newRatio);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (Platform.OS !== 'web') return;
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    const touch = e.touches[0];
    isDragging.current = true;
    startY.current = touch.clientY;
    startRatio.current = currentRatioRef.current;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || Platform.OS !== 'web') return;
    e.preventDefault();

    const height = containerHeightRef.current;
    if (height <= 0) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaRatio = deltaY / height;
    let newRatio = startRatio.current + deltaRatio;

    newRatio = Math.max(minTopRatioRef.current, Math.min(maxTopRatioRef.current, newRatio));
    onResizeRef.current(newRatio);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Platform.OS !== 'web') return;
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // ============ Render ============
  if (Platform.OS === 'web') {
    return (
      <View
        style={styles.divider}
        // @ts-ignore - web-specific events
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <View style={styles.handle} />
      </View>
    );
  }

  // Native (iOS/Android)
  return (
    <View style={styles.divider} {...panResponder.panHandlers}>
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 28,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 14,
    marginVertical: 6,
    ...(Platform.OS === 'web' ? {
      cursor: 'ns-resize',
      touchAction: 'none',
    } as any : {}),
  },
  handle: {
    width: 60,
    height: 6,
    backgroundColor: '#9e9e9e',
    borderRadius: 3,
  },
});
