import { memberForPage } from '@/lib/members/page-gate';
import { groupMyShifts } from '@/lib/rota/my-shifts';
import { upcomingPublishedShiftsFor } from '@/lib/rota/service';
import { mySwapsFor } from '@/lib/swaps/service';
import { MyShiftsScreen } from './_components/MyShiftsScreen';

/** Any member may open this; each person only ever gets their own shifts and requests. */
export default async function MyShiftsPage() {
  const member = await memberForPage();
  const [shifts, swaps] = await Promise.all([
    upcomingPublishedShiftsFor(member.id),
    mySwapsFor(member),
  ]);
  return <MyShiftsScreen view={groupMyShifts(shifts)} swaps={swaps} />;
}
