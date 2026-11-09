'use client';

import { useMemo, useState } from 'react';

import {
  ariaSortFor,
  isSortKey,
  nextSort,
  tableView,
  type Row,
  type SortState,
} from './table';
import { renderCell, sortMark, tableClasses, tableCopy } from './presentation';

import './table.css';

export interface Column<T extends Row> {
  /** The key in the row. */
  key: string & keyof T;
  /** What the column is called, in the founder's words. */
  label: string;
  /** Off for a column where ordering means nothing, like an actions column. */
  sortable?: boolean;
}

/**
 * A table that sorts, filters and pages without any of the usual mistakes.
 *
 * Thin on purpose. Everything that can be got wrong is in `table.ts` and is
 * checked there; this file wires it to the DOM and hands the appearance to
 * `presentation.tsx`, which belongs to the project.
 *
 * The three things this file itself has to get right are all about people who
 * are not using a mouse:
 *
 * - the header is a real `<button>` inside the `<th>`, so it is reachable and
 *   operable by keyboard without inventing a `tabIndex`;
 * - `aria-sort` sits on the `<th>`, which is where a screen reader looks;
 * - a live region says what changed, because reordering a table is silent.
 */
export function DataTable<T extends Row>({
  rows,
  columns,
  pageSize = 25,
  searchable = true,
  caption,
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  /** What this table is a list of. Read out before the contents. */
  caption: string;
}) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const view = useMemo(
    () =>
      tableView({
        rows,
        query,
        searchColumns: columns.map((column) => column.key),
        sort,
        ...(sort ? { columnLabel: columns.find((c) => c.key === sort.column)?.label } : {}),
        page,
        pageSize,
      }),
    [rows, columns, query, sort, page, pageSize],
  );

  const toggle = (key: string): void => {
    setSort((current) => nextSort(current, key));
    // Back to the first page: the row they were looking at is somewhere else
    // now, and page 4 of a reordered list is a random place.
    setPage(1);
  };

  return (
    <div className={tableClasses.wrapper}>
      {searchable && (
        <div className={tableClasses.controls}>
          <label>
            {tableCopy.searchLabel}
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // Clamping happens in tableView as well; this keeps the control
                // honest rather than showing "page 5" for one render.
                setPage(1);
              }}
              placeholder={tableCopy.searchPlaceholder}
              type="search"
            />
          </label>
        </div>
      )}

      {/* Polite, not assertive: a table reordering is information, not an
          emergency, and an assertive region interrupts whatever is being read. */}
      <div role="status" aria-live="polite" className="ui-visually-hidden">
        {view.announcement}
      </div>

      <table className={tableClasses.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const state = ariaSortFor(column.key, sort);
              return (
                <th key={column.key} scope="col" aria-sort={column.sortable === false ? undefined : state}>
                  {column.sortable === false ? (
                    column.label
                  ) : (
                    <button
                      type="button"
                      className={tableClasses.headerButton}
                      onClick={() => toggle(column.key)}
                      onKeyDown={(event) => {
                        if (!isSortKey(event.key)) return;
                        // Space scrolls the page otherwise, which moves the
                        // table out from under the person who pressed it.
                        event.preventDefault();
                        toggle(column.key);
                      }}
                    >
                      {column.label} {sortMark(state)}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row, index) => (
            <tr key={index} className={tableClasses.row}>
              {columns.map((column) => (
                <td key={column.key} className={tableClasses.cell}>
                  {renderCell(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {view.total === 0 && (
        <p className={tableClasses.empty}>{query.trim() ? tableCopy.noMatches : tableCopy.empty}</p>
      )}

      {view.pages > 1 && (
        <div className={tableClasses.controls}>
          <button type="button" onClick={() => setPage(view.page - 1)} disabled={view.page <= 1}>
            {tableCopy.previous}
          </button>
          <span>{tableCopy.page(view.page, view.pages)}</span>
          <button type="button" onClick={() => setPage(view.page + 1)} disabled={view.page >= view.pages}>
            {tableCopy.next}
          </button>
        </div>
      )}
    </div>
  );
}
