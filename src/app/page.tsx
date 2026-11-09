import { redirect } from 'next/navigation';

import { getCafeAccess } from '@/lib/members/access';
import { homePathFor } from '@/lib/members/home';

export const dynamic = 'force-dynamic';

async function destination(): Promise<string> {
  try {
    return homePathFor(await getCafeAccess());
  } catch (error) {
    // The front door must always answer: if the look-up fails, offer sign-in.
    console.error('Could not work out where to send this visitor', error);
    return '/sign-in';
  }
}

export default async function Home() {
  redirect(await destination());
}
