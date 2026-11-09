import { redirect } from 'next/navigation';

import { cafeAccessForPage } from '@/lib/members/page-gate';
import { ChoosePasswordForm } from './_components/ChoosePasswordForm';

export default async function ChoosePasswordPage() {
  const access = await cafeAccessForPage();
  if (access.kind !== 'must-change-password') redirect('/');
  return <ChoosePasswordForm />;
}
