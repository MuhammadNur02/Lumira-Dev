/**
 * `db.execute()` returns an array-like RowList with postgres-js but `{ rows }` with other drivers
 * (PGlite in tests). Normalize raw SQL results in one place.
 */
export function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === 'object' && 'rows' in result) return (result as { rows: T[] }).rows
  return []
}
