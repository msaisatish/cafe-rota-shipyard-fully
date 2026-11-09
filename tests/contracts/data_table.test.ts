import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createElement } from 'react';

import { describe, expect, it } from 'vitest';

import { renderCell, tableClasses } from '@/components/data_table/presentation';

import {
  announce,
  ariaSortFor,
  clampPage,
  filterRows,
  isSortKey,
  nextSort,
  pageCount,
  pageOf,
  sortRows,
  tableView,
} from '@/components/data_table/table';

/**
 * The contract for a table.
 *
 * Every case here is a mistake that gets made every time a table is written
 * from scratch, and that looks like a data bug rather than a table bug when it
 * reaches somebody. That is the whole argument for this component existing: not
 * that sorting is hard, but that these four things are always wrong and nobody
 * notices until a customer says "it lost my records".
 */

const people = [
  { name: 'Ada', team: 'Care', lastSeen: '2026-03-01', hours: 12 },
  { name: 'Bo', team: 'Care', lastSeen: '', hours: 30 },
  { name: 'Cy', team: 'Admin', lastSeen: '2026-01-15', hours: 12 },
  { name: 'Di', team: 'Care', lastSeen: null, hours: 4 },
  { name: 'Ed', team: 'Admin', lastSeen: '2026-02-20', hours: 30 },
];

describe('sorting is stable', () => {
  it('keeps rows that tie in the order they arrived', () => {
    // Ada and Cy both have 12 hours. Sorting by hours and back must not shuffle
    // them — to a founder that looks exactly like the data changing.
    const byHours = sortRows(people, { column: 'hours', direction: 'asc' });
    const tied = byHours.filter((row) => row.hours === 12).map((row) => row.name);
    expect(tied).toEqual(['Ada', 'Cy']);
  });

  it('and still ties in the same order the other way round', () => {
    const byHours = sortRows(people, { column: 'hours', direction: 'desc' });
    const tied = byHours.filter((row) => row.hours === 30).map((row) => row.name);
    expect(tied).toEqual(['Bo', 'Ed']);
  });

  it('gives the same answer every time for the same list', () => {
    // Determinism, which is what a person means by "it did not change". Note
    // that re-sorting by a first column after sorting by a second does *not*
    // restore the first result, and should not: ties are then in the second
    // column's order, which is the useful behaviour and the reason stability
    // is worth having at all.
    const once = sortRows(people, { column: 'team', direction: 'asc' });
    const twice = sortRows(people, { column: 'team', direction: 'asc' });
    expect(twice.map((row) => row.name)).toEqual(once.map((row) => row.name));
  });

  it('clearing the sort gives back the order the data arrived in', () => {
    const sorted = sortRows(people, { column: 'hours', direction: 'desc' });
    expect(sorted.map((row) => row.name)).not.toEqual(people.map((row) => row.name));
    expect(sortRows(people, null).map((row) => row.name)).toEqual(people.map((row) => row.name));
  });

  it('never changes the list it was given', () => {
    // A sort that mutates its input is how a table and the data behind it
    // quietly stop agreeing.
    const before = people.map((row) => row.name);
    sortRows(people, { column: 'name', direction: 'desc' });
    expect(people.map((row) => row.name)).toEqual(before);
  });
});

describe('blanks go last, whichever way the arrow points', () => {
  it('ascending', () => {
    const sorted = sortRows(people, { column: 'lastSeen', direction: 'asc' });
    expect(sorted.slice(-2).map((row) => row.name).sort()).toEqual(['Bo', 'Di']);
  });

  it('and descending', () => {
    // The mistake: blanks sort as empty strings, so descending by "last seen"
    // fills the top of the screen with people nobody has ever seen.
    const sorted = sortRows(people, { column: 'lastSeen', direction: 'desc' });
    expect(sorted.slice(-2).map((row) => row.name).sort()).toEqual(['Bo', 'Di']);
    expect(sorted[0]?.name).toBe('Ada');
  });

  it('knows that zero and false are values, not blanks', () => {
    const rows = [{ n: 0 }, { n: null }, { n: 5 }];
    const sorted = sortRows(rows, { column: 'n', direction: 'asc' });
    expect(sorted.map((row) => row.n)).toEqual([0, 5, null]);
  });

  it('sorts numbers as numbers and text the way a person reads it', () => {
    const rows = [{ v: 'item 10' }, { v: 'item 9' }, { v: 'item 1' }];
    expect(sortRows(rows, { column: 'v', direction: 'asc' }).map((r) => r.v)).toEqual([
      'item 1',
      'item 9',
      'item 10',
    ]);
  });
});

describe('paging clamps after a filter', () => {
  it('does not leave you on a page that no longer exists', () => {
    // The bug: you are on page 5, you type in the search box, and the table is
    // empty with the controls still saying "page 5".
    expect(clampPage(5, 3, 25)).toBe(1);
    expect(clampPage(5, 200, 25)).toBe(5);
    expect(clampPage(0, 200, 25)).toBe(1);
    expect(clampPage(Number.NaN, 200, 25)).toBe(1);
  });

  it('a filter that matches nothing still has one page', () => {
    expect(pageCount(0, 25)).toBe(1);
  });

  it('and the view clamps rather than showing an empty page', () => {
    const view = tableView({ rows: people, query: 'Admin', sort: null, page: 4, pageSize: 2 });
    expect(view.page).toBe(1);
    expect(view.total).toBe(2);
    expect(view.rows).toHaveLength(2);
  });

  it('slices the page it says it is on', () => {
    expect(pageOf([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(pageOf([1, 2, 3, 4, 5], 3, 2)).toEqual([5]);
  });
});

describe('filtering', () => {
  it('looks anywhere, ignoring case', () => {
    expect(filterRows(people, 'care').map((row) => row.name)).toEqual(['Ada', 'Bo', 'Di']);
  });

  it('an empty search is not a filter', () => {
    expect(filterRows(people, '   ')).toHaveLength(people.length);
  });

  it('never matches a blank', () => {
    // Searching for "null" must not find the rows whose value is missing.
    expect(filterRows(people, 'null')).toHaveLength(0);
  });
});

describe('a keyboard can do everything a mouse can', () => {
  it('Enter and Space sort', () => {
    expect(isSortKey('Enter')).toBe(true);
    expect(isSortKey(' ')).toBe(true);
    expect(isSortKey('a')).toBe(false);
  });

  it('cycles through ascending, descending, and back to how it arrived', () => {
    // The third state is the one everybody leaves out, and without it there is
    // no way back to the order the server chose.
    const first = nextSort(null, 'name');
    expect(first).toEqual({ column: 'name', direction: 'asc' });
    const second = nextSort(first, 'name');
    expect(second).toEqual({ column: 'name', direction: 'desc' });
    expect(nextSort(second, 'name')).toBeNull();
  });

  it('a different column starts again at ascending', () => {
    expect(nextSort({ column: 'name', direction: 'desc' }, 'team')).toEqual({
      column: 'team',
      direction: 'asc',
    });
  });
});

describe('what a screen reader is told', () => {
  it('marks the sorted column and only that one', () => {
    const sort = { column: 'name', direction: 'asc' } as const;
    expect(ariaSortFor('name', sort)).toBe('ascending');
    expect(ariaSortFor('team', sort)).toBe('none');
    expect(ariaSortFor('name', { column: 'name', direction: 'desc' })).toBe('descending');
    expect(ariaSortFor('name', null)).toBe('none');
  });

  it('puts the meaning in aria-sort, not in the arrow', () => {
    // The little triangle is decoration and is aria-hidden in the component.
    // If the arrow were the only signal, the sort state would be carried by a
    // shape a screen reader never sees — the same failure as carrying it by
    // colour alone.
    expect(ariaSortFor('name', { column: 'name', direction: 'asc' })).toBe('ascending');
    expect(ariaSortFor('name', { column: 'name', direction: 'desc' })).toBe('descending');
    // Three distinct values, so "not sorted" is stated rather than implied by
    // the absence of an arrow.
    expect(new Set(['ascending', 'descending', ariaSortFor('team', null)]).size).toBe(3);
  });

  it('says what changed, with the count', () => {
    // A sighted user watches the table reorder. Everybody else gets nothing
    // unless it is said, and nothing is indistinguishable from broken.
    const sorted = announce({
      sort: { column: 'name', direction: 'asc' },
      columnLabel: 'Name',
      total: 5,
    });
    expect(sorted).toMatch(/sorted by name/i);
    expect(sorted).toMatch(/A to Z/);
    expect(sorted).toMatch(/5 rows/);
  });

  it('says how many matched after a search', () => {
    const filtered = announce({ sort: null, total: 1, filtered: true });
    expect(filtered).toMatch(/1 row match/i);
  });

  it('gets the singular right', () => {
    expect(announce({ sort: null, total: 1 })).toMatch(/1 row,/);
    expect(announce({ sort: null, total: 2 })).toMatch(/2 rows,/);
  });
});

describe('the whole view', () => {
  it('filters, then sorts, then pages', () => {
    // In that order. Clamping before filtering uses the old total, which is the
    // bug the clamp exists to prevent.
    const view = tableView({
      rows: people,
      query: 'care',
      sort: { column: 'hours', direction: 'desc' },
      columnLabel: 'Hours',
      page: 1,
      pageSize: 2,
    });
    expect(view.total).toBe(3);
    expect(view.pages).toBe(2);
    expect(view.rows.map((row) => row.name)).toEqual(['Bo', 'Ada']);
    expect(view.announcement).toMatch(/3 rows match/);
  });

  it('a page size of zero shows everything rather than nothing', () => {
    // Dividing by it would be worse.
    expect(tableView({ rows: people, sort: null, page: 1, pageSize: 0 }).rows).toHaveLength(5);
  });
});

describe('the table arrives looking like a table', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src', 'components', 'data_table', 'table.css'),
    'utf8',
  );
  // These cases are about what the stylesheet does, so the comments in it are
  // not part of the subject. Checking the raw file makes a rule fire on the
  // sentence explaining the rule.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

  it('styles every class the component actually renders', () => {
    // Until this file existed the component shipped class names and no
    // stylesheet, so installing it produced a stack of unstyled rows.
    for (const selector of Object.values(tableClasses)) {
      expect(css).toContain(`.${selector}`);
    }
  });

  it('paints from tokens rather than typed-in colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('never removes a focus ring without putting one back', () => {
    expect(css).not.toMatch(/outline:\s*none/);
    expect(css).toContain('var(--focus)');
  });

  it('changes nothing about how the table behaves', () => {
    // The appearance is the founder's. Sorting, filtering and paging are not,
    // and a stylesheet that hides rows would be doing the second job.
    expect(css).not.toMatch(/\.data-table-row\s*\{[^}]*display:\s*none/);
  });
});

describe('a cell that is already rendered', () => {
  it('goes through untouched rather than becoming [object Object]', () => {
    // Found in the first sample project built on this component: the status
    // column passed a chip element and every row read "[object Object]",
    // because renderCell fell through to String() for anything it did not
    // recognise.
    const chip = createElement('span', { className: 'x' }, 'Covered');
    expect(renderCell(chip)).toBe(chip);
  });

  it('still formats the ordinary values', () => {
    expect(renderCell('Ada')).toBe('Ada');
    expect(renderCell(14)).toBe('14');
    expect(renderCell(true)).toBe('Yes');
  });
});
