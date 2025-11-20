/**
 * Array utility functions for better performance and readability
 */

/**
 * Check if an array is not empty
 * More performant than array.length > 0 for large arrays
 * @param array - Array to check
 * @returns true if array has at least one element
 */
export function isNotEmpty<T>(array: T[] | null | undefined): array is T[] {
  return Array.isArray(array) && array.length > 0;
}

/**
 * Check if an array is empty
 * @param array - Array to check
 * @returns true if array is empty or null/undefined
 */
export function isEmpty<T>(array: T[] | null | undefined): array is [] | null | undefined {
  return !Array.isArray(array) || array.length === 0;
}

/**
 * Get the first element of an array if it exists
 * @param array - Array to get first element from
 * @returns First element or undefined
 */
export function first<T>(array: T[] | null | undefined): T | undefined {
  return isNotEmpty(array) ? array[0] : undefined;
}

/**
 * Get the last element of an array if it exists
 * @param array - Array to get last element from
 * @returns Last element or undefined
 */
export function last<T>(array: T[] | null | undefined): T | undefined {
  return isNotEmpty(array) ? array[array.length - 1] : undefined;
}

/**
 * Safely get array length (returns 0 for null/undefined)
 * @param array - Array to get length from
 * @returns Array length or 0
 */
export function safeLength<T>(array: T[] | null | undefined): number {
  return Array.isArray(array) ? array.length : 0;
}

