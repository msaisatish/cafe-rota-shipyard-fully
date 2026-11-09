import { memberForPage } from '@/lib/members/page-gate';
import { swapRequestsForManager } from '@/lib/swaps/service';
import { SwapsScreen } from './_components/SwapsScreen';

/** Only the manager decides swaps; staff are sent to their own shifts. */
export default async function SwapRequestsPage() {
  await memberForPage('manager');
  const swaps = await swapRequestsForManager();
  return <SwapsScreen swaps={swaps} />;
}
