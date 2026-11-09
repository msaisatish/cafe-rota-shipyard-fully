import { memberForPage } from '@/lib/members/page-gate';
import { staffListFor } from '@/lib/staff/service';
import { StaffScreen } from './_components/StaffScreen';

export default async function StaffPage() {
  const manager = await memberForPage('manager');
  const rows = await staffListFor(manager.id);
  return <StaffScreen rows={rows} />;
}
