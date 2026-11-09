import { z } from 'zod';

/**
 * One schema, checked on both sides.
 *
 * A convention rather than a component. The rule it exists to enforce is that
 * the browser and the server validate against the **same** object — not two
 * that were written to agree and then drifted, which is how a form starts
 * accepting something the route rejects with a 500 nobody can reproduce.
 *
 * Client-side validation is a convenience for the person typing. Server-side
 * validation is the only one that is load-bearing, because the browser is not
 * where an attacker submits from. Sharing the schema is what makes the
 * convenience free rather than a second thing to maintain.
 */

export type { z };

export interface Invalid {
  ok: false;
  /** Field path → the first message for it, ready to show next to an input. */
  fieldErrors: Record<string, string>;
  /** One sentence for the top of the form or an API response. */
  message: string;
}

export type Validated<T> = { ok: true; data: T } | Invalid;

/**
 * Check a value against a schema.
 *
 * Returns rather than throws, because both callers — a form and a route
 * handler — have something better to do with a failure than unwind the stack.
 */
export function validate<T extends z.ZodTypeAny>(schema: T, input: unknown): Validated<z.infer<T>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_';
    // First message per field. A list of five complaints about one input is
    // not five times as useful as the first one.
    if (!(path in fieldErrors)) fieldErrors[path] = issue.message;
  }

  const first = result.error.issues[0];
  return {
    ok: false,
    fieldErrors,
    message: first ? first.message : 'Some of those details are not right.',
  };
}

/**
 * Read and check a request body in one step.
 *
 * `request.json()` throws on a malformed body, and an unhandled throw there is
 * a 500 where a 400 was correct — so it is caught here once rather than
 * remembered at every call site.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<Validated<z.infer<T>>> {
  const body: unknown = await request.json().catch(() => null);
  return validate(schema, body);
}

/** Check search-params from a URL, so list filters are validated too. */
export function validateQuery<T extends z.ZodTypeAny>(
  url: URL | string,
  schema: T,
): Validated<z.infer<T>> {
  const parsed = typeof url === 'string' ? new URL(url, 'http://local') : url;
  return validate(schema, Object.fromEntries(parsed.searchParams.entries()));
}

/**
 * Messages a person can act on, for the rules every app repeats.
 *
 * Zod's defaults ("String must contain at least 1 character(s)") are written
 * for a developer reading a stack trace, not for somebody filling in a form.
 */
export const field = {
  requiredText: (label: string) => z.string().trim().min(1, `Please enter ${label}.`),
  email: () => z.string().trim().toLowerCase().email('That does not look like an email address.'),
  optionalText: () => z.string().trim().optional(),
  id: () => z.string().min(1, 'That item could not be found.'),
  /** Money arrives as a decimal string so it never passes through a float. */
  decimalAmount: (label: string) =>
    z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d+)?$/, `Please enter ${label} as a number, for example 12.34.`),
};
