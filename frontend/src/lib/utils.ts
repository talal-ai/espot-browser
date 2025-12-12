/**
 * Utility Helpers
 * Provides small, focused helpers used across the UI layer.
 *
 * Why: Many components import `cn` to compose class names safely.
 * This implementation avoids extra dependencies while staying type-safe.
 */

/**
 * Compose class names, filtering falsy values.
 * Example: cn('btn', isActive && 'btn-active', customClass)
 */
export function cn(
  ...classes: Array<string | null | undefined | false>
): string {
  return classes.filter(Boolean).join(' ');
}