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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startRatio.current = currentRatio; // Capture current ratio at drag start
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [currentRatio]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || Platform.OS !== 'web') return;
    e.preventDefault();

    const deltaY = e.clientY - startY.current;
    const deltaRatio = deltaY / containerHeight;
    let newRatio = startRatio.current + deltaRatio;

    // Clamp the ratio within bounds
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

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onMove = (e: MouseEvent) => handleMouseMove(e);
    const onUp = () => handleMouseUp();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      style={styles.divider}
      // @ts-ignore - web-specific event
      onMouseDown={handleMouseDown}
    >
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'ns-resize' as any,
    marginHorizontal: 16,
    borderRadius: 7,
    marginVertical: 4,
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: '#9e9e9e',
    borderRadius: 3,
  },
});
