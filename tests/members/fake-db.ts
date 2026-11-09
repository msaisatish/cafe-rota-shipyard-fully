import { Prisma } from '@prisma/client';

/**
 * A stand-in for the two tables the staff list touches, so these tests run
 * on every build with no database. Only the calls `src/lib/members` makes.
 */

type Row = Record<string, unknown>;
type Args = { where?: Row; data?: Row; orderBy?: Row };

const users: Row[] = [];
const members: Row[] = [];
const swapRequests: Row[] = [];
let nextId = 1;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, value]) => (row[key] ?? null) === value);
}

function clash(field: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${field}`, {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function checkUnique(table: Row[], row: Row, fields: string[]): void {
  for (const field of fields) {
    const value = row[field];
    if (value == null) continue;
    if (table.some((other) => other !== row && other[field] === value)) throw clash(field);
  }
}

function tableApi(table: Row[], uniqueFields: string[]) {
  const find = ({ where }: Args) => table.find((row) => matches(row, where));
  return {
    findUnique: async (args: Args) => {
      const row = find(args);
      return row ? { ...row } : null;
    },
    findFirst: async () => {
      const sorted = [...table].sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
      return sorted[0] ? { ...sorted[0] } : null;
    },
    findMany: async ({ where }: Args) =>
      table.filter((row) => matches(row, where)).map((row) => ({ ...row })),
    count: async ({ where }: Args) => table.filter((row) => matches(row, where)).length,
    create: async ({ data }: Args) => {
      const row: Row = { id: `id_${nextId++}`, createdAt: new Date(), ...data };
      checkUnique(table, row, uniqueFields);
      table.push(row);
      return { ...row };
    },
    update: async ({ where, data }: Args) => {
      const row = find({ where });
      if (!row) throw new Error('Record to update not found.');
      Object.assign(row, data);
      return { ...row };
    },
    updateMany: async ({ where, data }: Args) => {
      const found = table.filter((row) => matches(row, where));
      for (const row of found) Object.assign(row, data);
      return { count: found.length };
    },
  };
}

const client = {
  user: tableApi(users, ['email']),
  cafeMember: tableApi(members, ['userId', 'bootstrapKey']),
  swapRequest: tableApi(swapRequests, []),
  $transaction: async (work: unknown): Promise<unknown> => {
    if (Array.isArray(work)) return Promise.all(work);
    return (work as (tx: unknown) => Promise<unknown>)(client);
  },
};

export const fakeDb = {
  client,
  users,
  members,
  swapRequests,
  reset() {
    users.length = 0;
    members.length = 0;
    swapRequests.length = 0;
    nextId = 1;
  },
  addUser(row: Row): Row {
    const user: Row = { name: null, disabledAt: null, passwordHash: 'old', ...row };
    users.push(user);
    return user;
  },
  addMember(row: Row): Row {
    const member: Row = {
      id: `member_${row.userId as string}`,
      role: 'staff',
      mustChangePassword: false,
      removedAt: null,
      bootstrapKey: null,
      createdAt: new Date(),
      ...row,
    };
    members.push(member);
    return member;
  },
};
