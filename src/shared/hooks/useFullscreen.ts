import { useState, useEffect } from 'react';

/**
 * Detects if the browser is in fullscreen mode (F11 / TBI mode).
 * Used to apply larger sizes for TBI accessibility (WCAG AA).
 */
export function useFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(
    !!document.fullscreenElement
  );

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return isFullscreen;
}

/**
 * TBI mode threshold: fullscreen + width >= 1024px.
 * On a TBI, the screen is typically 1920x1080 or higher.
 */
export function useTBIMode(): boolean {
  const isFullscreen = useFullscreen();
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isFullscreen && width >= 1024;
}
