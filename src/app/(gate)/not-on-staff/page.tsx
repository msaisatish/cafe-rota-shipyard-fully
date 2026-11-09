import { redirect } from 'next/navigation';

import { SignOutButton } from '@/lib/ui/SignOutButton';
import { cafeAccessForPage } from '@/lib/members/page-gate';

export default async function NotOnStaffPage() {
  const access = await cafeAccessForPage();
  if (access.kind !== 'not-on-staff') redirect('/');

  return (
    <div className="auth-card">
      <h1>Ask your manager to add you</h1>
      <p className="auth-lede rota-wrap">
        You&apos;ve made an account, but you&apos;re not on this café&apos;s staff list yet. Once
        your manager adds {access.email}, sign in again and your shifts will be here.
      </p>
      <SignOutButton />
    </div>
  );
}
