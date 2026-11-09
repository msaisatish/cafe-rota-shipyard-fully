import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { CafeMember, MemberRole } from './schema';

/**
 * Database reads and writes for the staff list.
 *
 * One café, so there is no organisation to scope by. The auth component has no
 * "create a user" function (its register route signs the caller in as the new
 * person), so the `users` row is written here, always with a hash from auth's
 * own `hashPassword`.
 */

/** Marks the one row that made someone the first manager; unique, so two tabs cannot both win. */
export const FIRST_MANAGER_KEY = 'first-manager';

const memberFields = {
  id: true,
  userId: true,
  name: true,
  role: true,
  mustChangePassword: true,
  removedAt: true,
  createdAt: true,
} as const;

type MemberRow = Omit<CafeMember, 'role'> & { role: string };

function toMember(row: MemberRow): CafeMember {
  const role: MemberRole = row.role === 'manager' ? 'manager' : 'staff';
  return { ...row, role };
}

function toMemberOrNull(row: MemberRow | null): CafeMember | null {
  return row ? toMember(row) : null;
}

export function isUniqueClash(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function findMemberByUserId(userId: string): Promise<CafeMember | null> {
  const row = await prisma.cafeMember.findUnique({ where: { userId }, select: memberFields });
  return toMemberOrNull(row);
}

export async function findMemberById(id: string): Promise<CafeMember | null> {
  const row = await prisma.cafeMember.findUnique({ where: { id }, select: memberFields });
  return toMemberOrNull(row);
}

/** Everyone currently on the staff list, by name. A café has a handful, so no paging. */
export async function listActiveMembers(): Promise<CafeMember[]> {
  const rows = await prisma.cafeMember.findMany({
    where: { removedAt: null },
    orderBy: { name: 'asc' },
    select: memberFields,
  });
  return rows.map(toMember);
}

export async function countActiveManagers(): Promise<number> {
  return prisma.cafeMember.count({ where: { role: 'manager', removedAt: null } });
}

/** The account that was made first: the person who set the app up. */
export async function findEarliestUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  return user?.id ?? null;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
}

/** Null when another request made the first manager a moment earlier. */
export async function createFirstManager(input: {
  userId: string;
  name: string;
}): Promise<CafeMember | null> {
  try {
    const row = await prisma.cafeMember.create({
      data: { ...input, role: 'manager', bootstrapKey: FIRST_MANAGER_KEY },
      select: memberFields,
    });
    return toMember(row);
  } catch (error) {
    if (isUniqueClash(error)) return null;
    throw error;
  }
}

export async function createStaffAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<CafeMember> {
  const { name, email, passwordHash } = input;
  const row = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
      select: { id: true },
    });
    return tx.cafeMember.create({
      data: { userId: user.id, name, role: 'staff', mustChangePassword: true },
      select: memberFields,
    });
  });
  return toMember(row);
}

/** Someone who already has an account joins the staff list with the password they have. */
export async function linkExistingUser(input: { userId: string; name: string }) {
  const row = await prisma.cafeMember.create({
    data: { ...input, role: 'staff', mustChangePassword: false },
    select: memberFields,
  });
  return toMember(row);
}

/** Someone who left comes back: account re-opened with a new starting password. */
export async function reactivateMember(input: {
  member: CafeMember;
  name: string;
  passwordHash: string;
}): Promise<CafeMember> {
  const { member, name, passwordHash } = input;
  const [, row] = await prisma.$transaction([
    prisma.user.update({
      where: { id: member.userId },
      data: { passwordHash, disabledAt: null, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.cafeMember.update({
      where: { id: member.id },
      data: { name, role: 'staff', removedAt: null, mustChangePassword: true },
      select: memberFields,
    }),
  ]);
  return toMember(row);
}

/** Takes them off the list and stops their account signing in. */
export async function markRemoved(member: CafeMember): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.cafeMember.update({ where: { id: member.id }, data: { removedAt: now } }),
    prisma.user.update({ where: { id: member.userId }, data: { disabledAt: now } }),
  ]);
}

export async function saveOwnPassword(input: {
  member: CafeMember;
  passwordHash: string;
}): Promise<void> {
  const { member, passwordHash } = input;
  await prisma.$transaction([
    prisma.user.update({ where: { id: member.userId }, data: { passwordHash } }),
    prisma.cafeMember.update({ where: { id: member.id }, data: { mustChangePassword: false } }),
  ]);
}
