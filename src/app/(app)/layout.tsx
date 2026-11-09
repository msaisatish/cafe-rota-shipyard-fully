import type { ReactNode } from 'react';

import type { NavItem } from '@/components/ui_blocks/blocks';
import { memberForPage } from '@/lib/members/page-gate';
import type { CafeMember } from '@/lib/members/schema';
import { countWaitingSwaps } from '@/lib/swaps/service';
import { RotaFrame } from '@/lib/ui/RotaFrame';

export const dynamic = 'force-dynamic';

const STAFF_LINKS: readonly NavItem[] = [{ href: '/my-shifts', label: 'My shifts' }];

/** The manager's links; "Swap requests (2)" when two are waiting for them. */
async function managerLinks(): Promise<readonly NavItem[]> {
  const waiting = await countWaitingSwaps();
  return [
    { href: '/week', label: 'Plan the week' },
    { href: '/staff', label: 'Staff' },
    { href: '/swaps', label: waiting > 0 ? `Swap requests (${waiting})` : 'Swap requests' },
  ];
}

function linksFor(member: CafeMember): Promise<readonly NavItem[]> {
  return member.role === 'manager' ? managerLinks() : Promise.resolve(STAFF_LINKS);
}

/** Every screen inside the app: only members get here, each with their own links. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const member = await memberForPage();
  return <RotaFrame items={await linksFor(member)}>{children}</RotaFrame>;
}
