
import { useState, useEffect } from 'react';

// Hook to manage CSS transitions for mounting/unmounting
export const useTransition = (isActive: boolean, duration: number = 200) => {
  const [isMounted, setIsMounted] = useState(isActive);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsMounted(true);
      // Double RAF ensures the browser paints the initial state before applying the active state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  return { isMounted, isVisible };
};
