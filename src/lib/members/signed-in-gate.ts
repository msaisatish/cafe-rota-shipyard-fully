import { redirect } from 'next/navigation';

import { getCafeAccess } from './access';
import { homePathFor } from './home';

/** Where a visitor who is already signed in belongs, or null to show the screen. */
async function signedInHome(): Promise<string | null> {
  try {
    const access = await getCafeAccess();
    return access.kind === 'signed-out' ? null : homePathFor(access);
  } catch (error) {
    // Unsure who this is: the sign-in screen is the safe thing to show.
    console.error('Could not check whether this visitor is signed in', error);
    return null;
  }
}

/**
 * For the sign-in and register screens. Registering signs the new person in and
 * then opens /sign-in; without this they would be asked to sign in again.
 */
export async function sendSignedInVisitorHome(): Promise<void> {
  const home = await signedInHome();
  if (home) redirect(home);
}
