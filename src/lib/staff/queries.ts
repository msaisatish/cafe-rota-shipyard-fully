import { prisma } from '@/lib/prisma';

/**
 * Database reads for the Staff screen. One café, so there is no organisation
 * to scope by. The email lives on auth's `users` table, joined here by id.
 */

export interface StaffRecord {
  id: string;
  userId: string;
  name: string;
  role: string;
  removedAt: Date | null;
  email: string;
}

/** Everyone who is or was on the staff list, with their sign-in email. */
export async function listStaffRecords(): Promise<StaffRecord[]> {
  const members = await prisma.cafeMember.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, userId: true, name: true, role: true, removedAt: true },
  });
  if (members.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: members.map((member) => member.userId) } },
    select: { id: true, email: true },
  });
  const emailByUser = new Map(users.map((user) => [user.id, user.email]));
  return members.map((member) => ({ ...member, email: emailByUser.get(member.userId) ?? '' }));
}
