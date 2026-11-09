import { cache } from 'react';
import { redirect } from 'next/navigation';

import { getCafeAccess, type CafeAccess } from './access';
import { homePathFor } from './home';
import type { CafeMember, MemberRole } from './schema';

/** One look-up per request, however many layouts and pages ask. */
export const cafeAccessForPage = cache(async (): Promise<CafeAccess> => getCafeAccess());

/**
 * For screens inside the app: the signed-in member, or a redirect to where this
 * visitor belongs. A staff member opening a manager screen goes to their own.
 */
export async function memberForPage(role?: MemberRole): Promise<CafeMember> {
  const access = await cafeAccessForPage();
  if (access.kind !== 'member') redirect(homePathFor(access));
  if (role && access.member.role !== role) redirect(homePathFor(access));
  return access.member;
}
