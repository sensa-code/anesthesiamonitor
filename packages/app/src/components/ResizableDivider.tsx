import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

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
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startRatio = useRef(currentRatio);

  // Mouse events for desktop
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

  // Touch events for mobile
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

    // Mouse event listeners
    const onMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const onMouseUp = () => handleMouseUp();

    // Touch event listeners
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

  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

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

const styles = StyleSheet.create({
  divider: {
    height: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'ns-resize' as any,
    marginHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    // Make touch target larger for mobile
    touchAction: 'none' as any,
  },
  handle: {
    width: 60,
    height: 6,
    backgroundColor: '#9e9e9e',
    borderRadius: 3,
  },
});
