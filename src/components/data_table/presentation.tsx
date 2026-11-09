/**
 * How the table looks and what it says. This file is yours.
 *
 * Change the wording, the classes, the way a cell is formatted — all of it.
 * Shipyard will never overwrite this file, including when the data_table
 * component is upgraded.
 *
 * What is **not** here, on purpose: sorting, filtering, paging, the keyboard
 * handling and the announcements. Those live in `table.ts`, they are the part
 * that is subtly wrong when it is written from scratch, and they are protected.
 * If you need them to behave differently, say so rather than editing them —
 * that file is replaced on upgrade and your change would disappear.
 */
import { isValidElement, type ReactNode } from 'react';

/** The words. Change them freely. */
export const tableCopy = {
  searchLabel: 'Search',
  searchPlaceholder: 'Type to narrow the list',
  empty: 'Nothing here yet.',
  noMatches: 'Nothing matches what you typed.',
  clearSearch: 'Clear',
  previous: 'Previous',
  next: 'Next',
  page: (page: number, pages: number): string => `Page ${page} of ${pages}`,
  sortHint: 'Press Enter to sort by this column',
};

/** How a value is shown. The default is deliberately plain. */
export function renderCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return <span aria-hidden="true">—</span>;
  // Something already rendered - a status chip, a link, a button - goes
  // through untouched. Without this it falls to String() at the bottom and
  // every such cell reads "[object Object]", which is what the first sample
  // project built on this component displayed in its status column.
  if (isValidElement(value)) return value;
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/** The arrow next to a sorted column. Hidden from screen readers — aria-sort already says it. */
export function sortMark(state: 'ascending' | 'descending' | 'none'): ReactNode {
  if (state === 'none') return null;
  return <span aria-hidden="true">{state === 'ascending' ? '▲' : '▼'}</span>;
}

export const tableClasses = {
  wrapper: 'data-table',
  table: 'data-table-grid',
  headerButton: 'data-table-sort',
  row: 'data-table-row',
  cell: 'data-table-cell',
  empty: 'data-table-empty',
  controls: 'data-table-controls',
};
