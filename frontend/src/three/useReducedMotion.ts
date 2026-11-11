import { useSyncExternalStore } from 'react'

// TẠM của lane 5C (phase-05-ui-contract.md §5): bản chính là frontend/src/hooks/useReducedMotion.ts
// của lane 5B, cùng chữ kí `useReducedMotion(): boolean`. Lúc merge, orchestrator đổi import trong
// src/islands/ShelfScene/index.tsx sang '@/hooks/useReducedMotion' rồi xoá file này.

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/** `true` khi người dùng bật giảm chuyển động; tự cập nhật khi cài đặt hệ điều hành đổi. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
