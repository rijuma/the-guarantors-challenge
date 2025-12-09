/**
 * Generates a normalized cache key from an address string or component
 * - Handles null/undefined values
 * - Converts to lowercase
 * - Trims whitespace
 * - Collapses multiple spaces to single space
 */
export function getCacheKey(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim().replace(/\s+/g, ' ')
}
