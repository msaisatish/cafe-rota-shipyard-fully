/**
 * Paging, by cursor rather than by page number.
 *
 * A convention, not a component — there is nothing to install later, and the
 * cost of two conventions in one app is that half the lists silently skip rows.
 *
 * Why cursors. `skip`/`take` is the obvious thing and it is wrong on any list
 * that changes while somebody is reading it: a row inserted above page 1 pushes
 * one row from page 1 down to page 2, and the reader never sees it. On a list
 * of orders that is a missed order. Cursors key off the last row seen, so
 * inserts above do not shift what comes next.
 *
 * The cursor is opaque on purpose. It encodes the sort value and the tie-break
 * id, and the caller is not invited to take it apart — that keeps the encoding
 * free to change without breaking anybody's saved link.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PageRequest {
  /** Opaque, from a previous page's `nextCursor`. */
  cursor?: string | null;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  /** Pass back as `cursor` for the next page. Null when there are no more. */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Cursor {
  /** The sort value of the last row on the page, as a string. */
  value: string;
  /** The id of that row, to break ties deterministically. */
  id: string;
}

/**
 * Clamp a requested size.
 *
 * A caller asking for 10,000 rows is either a mistake or someone finding out
 * what happens. Both get the maximum rather than an error, because failing a
 * list page over a query parameter helps nobody.
 */
export function pageSize(requested?: number): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) return DEFAULT_PAGE_SIZE;
  const whole = Math.floor(requested);
  if (whole < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(whole, MAX_PAGE_SIZE);
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify([cursor.value, cursor.id]), 'utf8').toString('base64url');
}

/**
 * Read a cursor, or return null.
 *
 * Never throws. A cursor arrives from a URL, so it can be truncated by a mail
 * client, edited by hand or left over from an older encoding. The right answer
 * to all of those is the first page, not a 500.
 */
export function decodeCursor(encoded?: string | null): Cursor | null {
  if (!encoded) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [value, id] = parsed;
    if (typeof value !== 'string' || typeof id !== 'string') return null;
    return { value, id };
  } catch {
    return null;
  }
}

/**
 * Turn rows into a page.
 *
 * Fetch `limit + 1` rows and hand them here: the extra row is how "is there
 * more?" is answered without a second `count(*)` over the whole table, which is
 * the query that gets slow first and is almost never actually needed.
 */
export function toPage<T>(
  rows: readonly T[],
  limit: number,
  cursorOf: (row: T) => Cursor,
): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : [...rows];
  const last = items[items.length - 1];
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(cursorOf(last)) : null,
  };
}

/**
 * The `where` clause for "everything after this cursor", descending.
 *
 * The tie-break on id is not optional. Two rows sharing a `createdAt` — which
 * happens constantly with bulk inserts — otherwise make the boundary between
 * pages ambiguous, and a row is either shown twice or skipped.
 */
export function afterCursor(
  cursor: Cursor | null,
  field: string,
): Record<string, unknown> | undefined {
  if (!cursor) return undefined;
  return {
    OR: [
      { [field]: { lt: cursor.value } },
      { [field]: cursor.value, id: { lt: cursor.id } },
    ],
  };
}
