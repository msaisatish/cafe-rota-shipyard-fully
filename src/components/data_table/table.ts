/**
 * The behaviour of a table, as pure functions.
 *
 * Every one of these is something that looks trivial, gets written from scratch
 * on every project, and is wrong in the same way each time. They are separated
 * from the rendering because they are the part that must not be edited — and
 * because the only way to hold somebody to that is to make the rules checkable
 * without a browser.
 *
 * The four that are always wrong:
 *
 * **Sorting is not stable.** Two rows with the same value swap places every
 * time the user sorts by something else and back. It looks like the data
 * changed.
 *
 * **Blanks sort as empty strings.** They go first ascending and last
 * descending, so half the screen is blank rows and the user concludes the app
 * lost their data.
 *
 * **Paging does not clamp after a filter.** You are on page 5, you type in the
 * search box, there are now two pages, and the table is empty with no
 * explanation.
 *
 * **Sorting is mouse-only.** A header that responds to a click and not to Enter
 * is unusable by keyboard, and `aria-sort` is missing so nothing announces what
 * just happened.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

export type Row = Record<string, unknown>;

/** Is this value nothing at all? Blank strings count; `0` and `false` do not. */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

/**
 * Compare two values the way a person expects.
 *
 * Numbers numerically, dates chronologically, everything else as text with the
 * locale's own rules — so "Ärger" sorts where a German speaker expects rather
 * than after "Zebra", and "item 10" comes after "item 9".
 */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sort, stably, with blanks last in both directions.
 *
 * **Stable**: rows that compare equal keep the order they arrived in, so
 * sorting by one column and back does not shuffle the rest. `Array.sort` is
 * specified as stable in modern engines, and the index tiebreak here makes that
 * true of the comparison as well as of the sort.
 *
 * **Blanks last, both ways**: a blank is not a small value, it is an absent
 * one. Sorting descending by "last seen" should put the people you saw most
 * recently at the top, not the people you have never seen.
 */
export function sortRows<T extends Row>(rows: readonly T[], sort: SortState | null): T[] {
  if (!sort) return [...rows];
  const { column, direction } = sort;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = a.row[column];
      const right = b.row[column];

      const leftBlank = isBlank(left);
      const rightBlank = isBlank(right);
      // Deliberately outside the direction flip: blanks are last whichever way
      // the arrow is pointing.
      if (leftBlank && rightBlank) return a.index - b.index;
      if (leftBlank) return 1;
      if (rightBlank) return -1;

      const order = compareValues(left, right);
      if (order !== 0) return direction === 'asc' ? order : -order;
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

/** Rows containing the text, anywhere, case-insensitively. */
export function filterRows<T extends Row>(rows: readonly T[], query: string, columns?: readonly string[]): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => {
    const keys = columns ?? Object.keys(row);
    return keys.some((key) => {
      const value = row[key];
      return !isBlank(value) && String(value).toLowerCase().includes(needle);
    });
  });
}

export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Keep the page number inside the pages that exist.
 *
 * Called after anything that changes how many rows there are. Without it,
 * filtering while on page 5 leaves the user staring at an empty table with the
 * controls saying "page 5 of 2".
 */
export function clampPage(page: number, total: number, pageSize: number): number {
  const pages = pageCount(total, pageSize);
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), pages);
}

/** The rows on this page, after clamping. */
export function pageOf<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) return [...rows];
  const safe = clampPage(page, rows.length, pageSize);
  const start = (safe - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * What clicking a header does next.
 *
 * Three states, not two: ascending, descending, and back to however the data
 * arrived. The third is the one everybody leaves out, and without it there is
 * no way back to the order the server chose — which is usually the meaningful
 * one.
 */
export function nextSort(current: SortState | null, column: string): SortState | null {
  if (current?.column !== column) return { column, direction: 'asc' };
  if (current.direction === 'asc') return { column, direction: 'desc' };
  return null;
}

/** What a screen reader should say this column is doing. */
export function ariaSortFor(column: string, sort: SortState | null): 'ascending' | 'descending' | 'none' {
  if (sort?.column !== column) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

/**
 * Should this key press sort the column?
 *
 * Enter and Space, because that is what a button does, and a header that only
 * responds to a mouse is a table a keyboard user cannot order.
 */
export function isSortKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

/**
 * What to put in the live region after something changes.
 *
 * A sighted user sees the table reorder. Everybody else gets nothing unless
 * this is said out loud — and "nothing happened" is indistinguishable from a
 * broken control.
 *
 * Deliberately one sentence with the count in it: the number is the part that
 * tells somebody whether their filter did what they meant.
 */
export function announce(options: {
  sort: SortState | null;
  columnLabel?: string;
  total: number;
  filtered?: boolean;
}): string {
  const rows = `${options.total} ${options.total === 1 ? 'row' : 'rows'}`;
  const filtered = options.filtered ? `${rows} match` : rows;

  if (!options.sort || !options.columnLabel) {
    return options.filtered ? `${filtered}, in the original order.` : `${rows}, in the original order.`;
  }
  const direction = options.sort.direction === 'asc' ? 'A to Z' : 'Z to A';
  return `Sorted by ${options.columnLabel}, ${direction}. ${filtered}.`;
}

/**
 * Everything the table shows, worked out in one place.
 *
 * Filter, then sort, then clamp, then slice — in that order, because clamping
 * before filtering uses the old total and is the bug this exists to prevent.
 */
export interface TableView<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
  announcement: string;
}

export function tableView<T extends Row>(options: {
  rows: readonly T[];
  query?: string;
  searchColumns?: readonly string[];
  sort: SortState | null;
  columnLabel?: string;
  page: number;
  pageSize: number;
}): TableView<T> {
  const filtered = filterRows(options.rows, options.query ?? '', options.searchColumns);
  const sorted = sortRows(filtered, options.sort);
  const page = clampPage(options.page, sorted.length, options.pageSize);

  return {
    rows: pageOf(sorted, page, options.pageSize),
    total: filtered.length,
    page,
    pages: pageCount(sorted.length, options.pageSize),
    announcement: announce({
      sort: options.sort,
      ...(options.columnLabel ? { columnLabel: options.columnLabel } : {}),
      total: filtered.length,
      filtered: Boolean(options.query?.trim()),
    }),
  };
}
