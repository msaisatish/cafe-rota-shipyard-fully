import { NextResponse } from 'next/server';

import { validateQuery } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { weekQuerySchema } from '@/lib/rota/schema';
import { currentWeekStart, weekPlanFor } from '@/lib/rota/service';

/** `GET /api/week?week=YYYY-MM-DD` — one week's plan for the manager; this week if none given. */
export async function GET(request: Request) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const input = validateQuery(request.url, weekQuerySchema);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  try {
    const plan = await weekPlanFor(input.data.week ?? currentWeekStart());
    return NextResponse.json({ week: plan });
  } catch (error) {
    console.error('[rota] could not load a week', error);
    const message = "We couldn't load this week. Check your connection and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
