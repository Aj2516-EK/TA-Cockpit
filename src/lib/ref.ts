export function readRef<T>(ref: { current: T }): T {
  return ref.current
}

