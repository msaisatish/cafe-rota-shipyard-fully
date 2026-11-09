import { validate } from '@/seams/validate';
import { memberForPage } from '@/lib/members/page-gate';
import { weekQuerySchema } from '@/lib/rota/schema';
import { currentWeekStart, weekPlanFor } from '@/lib/rota/service';
import { WeekScreen } from './_components/WeekScreen';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Which week to show: the one in the address if it is a real Monday, otherwise this week. */
function chosenWeek(week: string | string[] | undefined): string {
  const checked = validate(weekQuerySchema, { week: typeof week === 'string' ? week : undefined });
  return (checked.ok ? checked.data.week : undefined) ?? currentWeekStart();
}

export default async function PlanTheWeekPage({ searchParams }: { searchParams: SearchParams }) {
  await memberForPage('manager');
  const plan = await weekPlanFor(chosenWeek((await searchParams).week));
  return <WeekScreen plan={plan} />;
}
