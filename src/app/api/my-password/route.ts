import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/seams/auth';
import { validateBody } from '@/seams/validate';
import { requireMember } from '@/lib/members/access';
import { choosePasswordSchema } from '@/lib/members/schema';
import { chooseOwnPassword } from '@/lib/members/service';

/**
 * `POST /api/my-password` — a person replaces the starting password their
 * manager gave them. Only while they still have that starting password; after
 * that, changing it goes through "I have forgotten my password".
 */
export async function POST(request: Request) {
  const gate = await requireMember({ allowPasswordChange: true });
  if (!gate.ok) return gate.response;
  if (!gate.member.mustChangePassword) {
    return NextResponse.json(
      { error: 'You have already chosen your own password.' },
      { status: 403 },
    );
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const input = await validateBody(request, choosePasswordSchema);
  if (!input.ok) {
    return NextResponse.json(
      { error: input.message, fieldErrors: input.fieldErrors },
      { status: 400 },
    );
  }

  const result = await chooseOwnPassword({
    member: gate.member,
    email: user.email,
    password: input.data.password,
  });
  if (!result.ok) {
    const fieldErrors = { [result.field ?? 'password']: result.message };
    return NextResponse.json({ error: result.message, fieldErrors }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
