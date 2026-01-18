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
  const startRatio = useRef(currentRatio);

  // ============ Native (React Native) Implementation ============
  const panResponder = useMemo(() => PanResponder.create({
    // Capture phase - claim gesture before parent ScrollViews
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // Don't let other views take over
    onPanResponderGrant: () => {
      startRatio.current = currentRatio;
    },
    onPanResponderMove: (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (containerHeight <= 0) return;

      const deltaRatio = gestureState.dy / containerHeight;
      let newRatio = startRatio.current + deltaRatio;
      newRatio = Math.max(minTopRatio, Math.min(maxTopRatio, newRatio));
      onResize(newRatio);
    },
    onPanResponderRelease: () => {
      // Drag ended
    },
    onPanResponderTerminate: () => {
      // Gesture was interrupted
    },
  }), [currentRatio, containerHeight, minTopRatio, maxTopRatio, onResize]);

  // ============ Web Implementation ============
  const isDragging = useRef(false);
  const startY = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startRatio.current = currentRatio;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [currentRatio]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || Platform.OS !== 'web') return;
    e.preventDefault();

    const deltaY = e.clientY - startY.current;
    const deltaRatio = deltaY / containerHeight;
    let newRatio = startRatio.current + deltaRatio;

    newRatio = Math.max(minTopRatio, Math.min(maxTopRatio, newRatio));
    onResize(newRatio);
  }, [containerHeight, minTopRatio, maxTopRatio, onResize]);

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
    startRatio.current = currentRatio;
  }, [currentRatio]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || Platform.OS !== 'web') return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaRatio = deltaY / containerHeight;
    let newRatio = startRatio.current + deltaRatio;

    newRatio = Math.max(minTopRatio, Math.min(maxTopRatio, newRatio));
    onResize(newRatio);
  }, [containerHeight, minTopRatio, maxTopRatio, onResize]);

  const handleTouchEnd = useCallback(() => {
    if (Platform.OS !== 'web') return;
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const onMouseUp = () => handleMouseUp();
    const onTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const onTouchEnd = () => handleTouchEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
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
