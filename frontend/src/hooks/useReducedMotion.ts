import { useSyncExternalStore } from 'react'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Where `matchMedia` does not exist (jsdom, very old engines) the preference cannot be read;
 * the hook then answers "reduce", the safe side: an island keeps its static fallback rather
 * than animating for someone who may have asked for no motion.
 */
function mediaQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery()
  if (!query) return () => {}
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return mediaQuery()?.matches ?? true
}

/** True while the user asks for reduced motion; re-renders when the OS setting changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
