import { fakeDb } from '../members/fake-db';

/**
 * The staff tables from the members stand-in plus the two rota tables, so the
 * rota tests run on every build with no database. Only the calls
 * `src/lib/rota` and `src/lib/members` make.
 */

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;
type Args = {
  where?: Where;
  data?: Row;
  create?: Row;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
};

const weeks: Row[] = [];
const shifts: Row[] = [];
let nextId = 1;

/** A related row, looked up for a filter such as `week: { publishedAt: ... }`. */
type Relations = Record<string, (row: Row) => Row | undefined>;

function sortable(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function fieldMatches(value: unknown, wanted: unknown): boolean {
  if (wanted instanceof Date) return sortable(value) === sortable(wanted);
  if (!wanted || typeof wanted !== 'object') return value === wanted;
  if ('in' in wanted) return (wanted.in as unknown[]).includes(value);
  if ('gt' in wanted) return value !== null && sortable(value) > sortable(wanted.gt);
  if ('not' in wanted) return value !== wanted.not;
  return false;
}

function matches(row: Row, where: Where = {}, relations: Relations = {}): boolean {
  return Object.entries(where).every(([key, wanted]) => {
    const related = relations[key];
    if (related) {
      const other = related(row);
      return other !== undefined && matches(other, wanted as Where);
    }
    return fieldMatches(row[key] ?? null, wanted);
  });
}

function tableApi(table: Row[], relations: Relations = {}) {
  const find = (where?: Where) => table.find((row) => matches(row, where, relations));
  return {
    findUnique: async ({ where }: Args) => {
      const row = find(where);
      return row ? { ...row } : null;
    },
    findFirst: async ({ where }: Args) => {
      const row = find(where);
      return row ? { ...row } : null;
    },
    findMany: async ({ where, orderBy, take }: Args) => {
      const found = table
        .filter((row) => matches(row, where, relations))
        .map((row) => ({ ...row }));
      const [key, direction] = Object.entries(orderBy ?? {})[0] ?? [];
      const sign = direction === 'desc' ? -1 : 1;
      if (key) found.sort((a, b) => (sortable(a[key]) < sortable(b[key]) ? -sign : sign));
      return found.slice(0, take ?? found.length);
    },
    count: async ({ where }: Args) => table.filter((row) => matches(row, where, relations)).length,
    create: async ({ data }: Args) => {
      const row: Row = { id: `row_${nextId++}`, createdAt: new Date(), ...data };
      table.push(row);
      return { ...row };
    },
    upsert: async ({ where, create }: Args) => {
      const existing = find(where);
      if (existing) return { ...existing };
      const row: Row = { id: `row_${nextId++}`, publishedAt: null, ...create };
      table.push(row);
      return { ...row };
    },
    update: async ({ where, data }: Args) => {
      const row = find(where);
      if (!row) throw new Error('Record to update not found.');
      Object.assign(row, data);
      return { ...row };
    },
    updateMany: async ({ where, data }: Args) => {
      const found = table.filter((row) => matches(row, where, relations));
      for (const row of found) Object.assign(row, data);
      return { count: found.length };
    },
    deleteMany: async ({ where }: Args) => {
      const doomed = table.filter((row) => matches(row, where, relations));
      for (const row of doomed) table.splice(table.indexOf(row), 1);
      return { count: doomed.length };
    },
  };
}

const membersTable = tableApi(fakeDb.members);

const client = {
  ...fakeDb.client,
  cafeMember: { ...fakeDb.client.cafeMember, findMany: membersTable.findMany },
  rotaWeek: tableApi(weeks),
  shift: tableApi(shifts, { week: (shift) => weeks.find((week) => week.id === shift.weekId) }),
  swapRequest: tableApi(fakeDb.swapRequests),
  // Runs the work against this client; there is no rollback, so code under test
  // must check before it writes, as the real transaction does.
  $transaction: async (work: unknown): Promise<unknown> => {
    if (Array.isArray(work)) return Promise.all(work);
    return (work as (tx: unknown) => Promise<unknown>)(client);
  },
};

export const fakeRotaDb = {
  client,
  weeks,
  shifts,
  swapRequests: fakeDb.swapRequests,
  reset() {
    fakeDb.reset();
    weeks.length = 0;
    shifts.length = 0;
    nextId = 1;
  },
  addUser: fakeDb.addUser,
  addMember: fakeDb.addMember,
};
