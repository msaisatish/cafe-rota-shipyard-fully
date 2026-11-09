import type { CafeAccess } from './access';

/** Where each visitor belongs when they open the app. */
export function homePathFor(access: CafeAccess): string {
  if (access.kind === 'signed-out') return '/sign-in';
  if (access.kind === 'not-on-staff') return '/not-on-staff';
  if (access.kind === 'must-change-password') return '/choose-password';
  return access.member.role === 'manager' ? '/week' : '/my-shifts';
}
