import type { ReactNode } from 'react';

import { sendSignedInVisitorHome } from '@/lib/members/signed-in-gate';

export const dynamic = 'force-dynamic';

/** Someone already signed in goes straight to their own screen. */
export default async function SignedOutOnlyLayout({ children }: { children: ReactNode }) {
  await sendSignedInVisitorHome();
  return children;
}
