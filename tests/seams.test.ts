import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SeamNotImplemented } from '@/seams/errors';
import { getCurrentUser, requireUser } from '@/seams/auth';
import { requireRole } from '@/seams/roles';
import { scoped } from '@/seams/db';
import { sendEmail } from '@/seams/email';
import { enqueue } from '@/seams/queue';
import { logAudit } from '@/seams/audit';
import {
  add,
  allocate,
  compare,
  format,
  fromDecimal,
  money,
  percentage,
  subtract,
  times,
  toDecimal,
} from '@/seams/money';
import {
  afterCursor,
  decodeCursor,
  encodeCursor,
  pageSize,
  toPage,
  MAX_PAGE_SIZE,
} from '@/seams/paginate';
import { field, validate } from '@/seams/validate';
import { z } from 'zod';

/**
 * The seams.
 *
 * Two different things are being checked here. The stubs are checked to fail
 * *usefully* — a seam that threw `undefined is not a function`, or worse did
 * nothing at all, would be no better than not having the seam. The conventions
 * are checked to be correct, because nothing is coming later to fix them.
 */

/**
 * Is this seam still a stub, or has a component filled it?
 *
 * Installing a component replaces the file behind a seam (ARC-03), so once
 * `auth` is in, `getCurrentUser()` returns a user instead of throwing. Without
 * this check, the very first component a founder installs turns four of these
 * into failures that say nothing about what they did wrong, and the natural
 * reading is that the install broke something.
 *
 * The marker is the right thing to key on. A stub re-exports
 * `SHIPYARD_SEAM_STUB` and an implementation deliberately does not, and that
 * absence is already load-bearing: it is what stops a later install
 * overwriting a file that now holds real behaviour.
 */
function stillAStub(seam: string): boolean {
  const source = readFileSync(path.join(process.cwd(), 'src', 'seams', `${seam}.ts`), 'utf8');
  return source.includes('SHIPYARD_SEAM_STUB');
}

describe('a seam with no component behind it says which one it needs', () => {
  // The dangerous alternative is a silent no-op. An audit log that discards
  // everything looks identical to one that works until somebody needs the
  // record, which is exactly when it is too late to find out.
  it.skipIf(!stillAStub('auth'))('getCurrentUser names the sign-in component', async () => {
    await expect(getCurrentUser()).rejects.toThrow(/Signing in/);
    await expect(getCurrentUser()).rejects.toThrow(/auth/);
  });

  it.skipIf(!stillAStub('auth'))('requireUser names the sign-in component', async () => {
    await expect(requireUser()).rejects.toThrow(/auth/);
  });

  it.skipIf(!stillAStub('roles'))('requireRole names the roles component, not the sign-in one', async () => {
    await expect(requireRole('admin')).rejects.toThrow(/rbac/);
  });

  it.skipIf(!stillAStub('db'))('the scoped database names tenant separation', () => {
    expect(() => scoped('org_1')).toThrow(/organization_tenancy/);
  });

  it.skipIf(!stillAStub('email'))('sendEmail names the email component', async () => {
    await expect(sendEmail({ to: 'a@b.com', subject: 'x', html: 'y' })).rejects.toThrow(
      /transactional_email/,
    );
  });

  it.skipIf(!stillAStub('queue'))('enqueue names the background jobs component', async () => {
    await expect(enqueue('job', {})).rejects.toThrow(/background_job_runner/);
  });

  it.skipIf(!stillAStub('audit'))('logAudit names the audit component and never silently succeeds', async () => {
    await expect(logAudit({ action: 'a.b', entityType: 'thing' })).rejects.toThrow(/audit_logging/);
  });

  it.skipIf(!stillAStub('auth'))('carries the component id as data, not only in the sentence', async () => {
    const error = await getCurrentUser().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SeamNotImplemented);
    expect((error as SeamNotImplemented).componentId).toBe('auth');
  });

  it.skipIf(!stillAStub('auth'))('tells you not to write your own', async () => {
    await expect(getCurrentUser()).rejects.toThrow(/do not write your own/i);
  });
});

describe('money is never a float', () => {
  it('refuses a fractional minor unit rather than rounding it', () => {
    // A fraction here means someone did float arithmetic upstream. Accepting
    // it would hide that.
    expect(() => money(12.5, 'GBP')).toThrow(/whole minor units/);
  });

  it('parses a decimal string without going through a float', () => {
    expect(fromDecimal('12.34', 'GBP').minorUnits).toBe(1234);
    expect(fromDecimal('0.01', 'GBP').minorUnits).toBe(1);
    expect(fromDecimal('-5.00', 'GBP').minorUnits).toBe(-500);
  });

  it('knows currencies with no minor unit', () => {
    expect(fromDecimal('500', 'JPY').minorUnits).toBe(500);
    expect(() => fromDecimal('5.00', 'JPY')).toThrow(/0 decimal places/);
  });

  it('knows currencies with three', () => {
    expect(fromDecimal('1.234', 'KWD').minorUnits).toBe(1234);
  });

  it('refuses nonsense', () => {
    expect(() => fromDecimal('twelve', 'GBP')).toThrow();
    expect(() => money(1, 'pounds')).toThrow(/three-letter/);
  });

  it('adds and subtracts exactly', () => {
    const a = fromDecimal('0.10', 'GBP');
    const b = fromDecimal('0.20', 'GBP');
    // The whole argument for this file: 0.1 + 0.2 !== 0.3 in floats.
    expect(toDecimal(add(a, b))).toBe('0.30');
    expect(toDecimal(subtract(b, a))).toBe('0.10');
  });

  it('refuses to add two currencies', () => {
    expect(() => add(money(100, 'GBP'), money(100, 'USD'))).toThrow(/conversion rate/);
  });

  it('multiplies only by whole quantities', () => {
    expect(times(fromDecimal('1.50', 'GBP'), 3).minorUnits).toBe(450);
    expect(() => times(fromDecimal('1.50', 'GBP'), 1.5)).toThrow(/whole/);
  });

  it('splits without losing a penny', () => {
    // £10 three ways is 3.34 / 3.33 / 3.33 — not 3.33 three times, which
    // loses a penny that turns up in a reconciliation months later.
    const parts = allocate(fromDecimal('10.00', 'GBP'), [1, 1, 1]);
    expect(parts.map(toDecimal)).toEqual(['3.34', '3.33', '3.33']);
    expect(parts.reduce((sum, part) => sum + part.minorUnits, 0)).toBe(1000);
  });

  it('splits by weight and still adds up', () => {
    const parts = allocate(fromDecimal('100.00', 'GBP'), [3, 1]);
    expect(parts.reduce((sum, part) => sum + part.minorUnits, 0)).toBe(10_000);
  });

  it('takes a percentage, rounded once', () => {
    expect(toDecimal(percentage(fromDecimal('100.00', 'GBP'), 20))).toBe('20.00');
    expect(toDecimal(percentage(fromDecimal('9.99', 'GBP'), 20))).toBe('2.00');
  });

  it('compares and formats', () => {
    expect(compare(money(100, 'GBP'), money(200, 'GBP'))).toBe(-1);
    expect(format(fromDecimal('12.34', 'GBP'), 'en-GB')).toContain('12.34');
  });

  it('round-trips through its decimal form', () => {
    for (const value of ['0.00', '0.05', '12.34', '-7.09', '1000000.99']) {
      expect(toDecimal(fromDecimal(value, 'GBP'))).toBe(value);
    }
  });
});

describe('paging by cursor', () => {
  it('round-trips a cursor', () => {
    const cursor = { value: '2026-01-01T00:00:00.000Z', id: 'abc' };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('treats a damaged cursor as the first page rather than an error', () => {
    // Cursors travel in URLs, so they get truncated by mail clients and edited
    // by hand. The right answer is page one, not a 500.
    expect(decodeCursor('not-base64!!')).toBeNull();
    expect(decodeCursor(Buffer.from('{}').toString('base64url'))).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('clamps the page size instead of failing', () => {
    expect(pageSize(10)).toBe(10);
    expect(pageSize(10_000)).toBe(MAX_PAGE_SIZE);
    expect(pageSize(-1)).toBeGreaterThan(0);
    expect(pageSize(undefined)).toBeGreaterThan(0);
  });

  it('answers "is there more" from one extra row, not a count', () => {
    const rows = [1, 2, 3, 4].map((n) => ({ id: String(n), createdAt: `t${n}` }));
    const page = toPage(rows, 3, (row) => ({ value: row.createdAt, id: row.id }));
    expect(page.items).toHaveLength(3);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
  });

  it('has no next cursor on the last page', () => {
    const rows = [{ id: '1', createdAt: 't1' }];
    const page = toPage(rows, 3, (row) => ({ value: row.createdAt, id: row.id }));
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('breaks ties on id so a row is never shown twice or skipped', () => {
    const where = afterCursor({ value: 't1', id: 'b' }, 'createdAt') as {
      OR: Record<string, unknown>[];
    };
    expect(where.OR).toHaveLength(2);
    expect(where.OR[1]).toHaveProperty('id');
  });

  it('has no clause at all without a cursor', () => {
    expect(afterCursor(null, 'createdAt')).toBeUndefined();
  });
});

describe('one schema, both sides', () => {
  const Schema = z.object({ email: field.email(), name: field.requiredText('your name') });

  it('accepts good input and normalises it', () => {
    const result = validate(Schema, { email: '  SAM@Example.COM ', name: ' Sam ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('sam@example.com');
      expect(result.data.name).toBe('Sam');
    }
  });

  it('returns errors per field rather than throwing', () => {
    const result = validate(Schema, { email: 'nope', name: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.email).toMatch(/email address/);
      expect(result.fieldErrors.name).toMatch(/your name/);
    }
  });

  it('writes messages for the person typing, not for a log file', () => {
    const result = validate(Schema, { email: 'nope', name: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toMatch(/String must contain|ZodError|invalid_type/);
    }
  });

  it('gives one message per field, not five', () => {
    const result = validate(z.object({ a: z.string().min(5).max(2) }), { a: 'xxx' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors)).toHaveLength(1);
  });

  it('takes money as a string so it never passes through a float', () => {
    const Amount = z.object({ price: field.decimalAmount('the price') });
    expect(validate(Amount, { price: '12.34' }).ok).toBe(true);
    expect(validate(Amount, { price: '12.34.5' }).ok).toBe(false);
  });
});
