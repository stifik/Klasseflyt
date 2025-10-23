import { useEffect } from 'react';
import { preloadSounds } from '@/lib/sounds';

/**
 * Preload/detect available sounds on mount to avoid latency on first play.
 */
export function useSoundPreload(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    preloadSounds();
  }, [enabled]);
}
