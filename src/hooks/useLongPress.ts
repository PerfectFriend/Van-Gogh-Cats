import React, { useRef, useCallback, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  delay?: number;
}

/**
 * Tactile long-press + right-click hook for mobile & desktop (Ubuntu/Web).
 * Cancels cleanly if finger/cursor moves > 10px (scrolling) and prevents
 * accidental click firing immediately after a long-press triggers.
 */
export function useLongPress({ onLongPress, onClick, delay = 420 }: UseLongPressOptions) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if ('button' in e && e.button !== 0) return;

      longPressTriggeredRef.current = false;
      setIsPressing(true);

      if ('touches' in e && e.touches.length > 0) {
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if ('clientX' in e) {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      timerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        setIsPressing(false);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(18);
          } catch {}
        }
        onLongPress(e);
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current || !timerRef.current) return;
      let curX = 0;
      let curY = 0;
      if ('touches' in e && e.touches.length > 0) {
        curX = e.touches[0].clientX;
        curY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        curX = e.clientX;
        curY = e.clientY;
      }
      const dx = Math.abs(curX - startPosRef.current.x);
      const dy = Math.abs(curY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearTimer();
      }
    },
    [clearTimer]
  );

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      clearTimer();
      if (longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [clearTimer]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        longPressTriggeredRef.current = false;
        return;
      }
      if (onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimer();
      onLongPress(e);
    },
    [clearTimer, onLongPress]
  );

  return {
    isPressing,
    handlers: {
      onMouseDown: start,
      onMouseMove: move,
      onMouseUp: end,
      onMouseLeave: clearTimer,
      onTouchStart: start,
      onTouchMove: move,
      onTouchEnd: end,
      onClick: handleClick,
      onContextMenu: handleContextMenu,
    },
  };
}
