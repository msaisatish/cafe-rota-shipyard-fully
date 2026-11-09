import { NextResponse } from 'next/server';

import { validateBody } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { publishWeekSchema } from '@/lib/rota/schema';
import { publishWeek } from '@/lib/rota/service';

/** `POST /api/week/publish` — the manager lets staff see a week. */
export async function POST(request: Request) {
  const gate = await requireMember({ role: 'manager' });
  if (!gate.ok) return gate.response;

  const input = await validateBody(request, publishWeekSchema);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  try {
    const result = await publishWeek(input.data.weekStart);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ publishedAt: result.publishedAt.toISOString() });
  } catch (error) {
    console.error('[rota] could not publish a week', error);
    const message = "The week wasn't published. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
