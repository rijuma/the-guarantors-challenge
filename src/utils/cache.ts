/**
 * Generates a normalized cache key from an address string or component.
 */
export function getCacheKey(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim().replace(/\s+/g, ' ')
}
