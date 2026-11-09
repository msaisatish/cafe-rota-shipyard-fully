/**
 * Money, as whole minor units. Never a float.
 *
 * This is implemented rather than stubbed, because it is a convention rather
 * than a component: there is nothing to install later, and the moment one
 * price is held in a `number` the rounding is already wrong somewhere.
 *
 * `0.1 + 0.2 === 0.30000000000000004` is the whole argument. An invoice built
 * from floats is correct on every example anybody tries by hand and wrong on
 * about one line in a hundred, which is the worst possible failure rate —
 * frequent enough to matter, rare enough to ship.
 *
 * So: amounts are integers of the smallest unit (pence, cents, paise), the
 * currency travels with the amount, and arithmetic that cannot be exact
 * refuses rather than rounding quietly.
 */

export interface Money {
  /** Whole minor units. 1234 in GBP is £12.34. */
  readonly minorUnits: number;
  /** ISO 4217, upper case. */
  readonly currency: string;
}

/** Currencies whose minor unit is not 1/100. Extend as needed. */
const EXPONENTS: Readonly<Record<string, number>> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  BHD: 3,
  JOD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
};

export function exponentFor(currency: string): number {
  return EXPONENTS[currency.toUpperCase()] ?? 2;
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    // Adding two currencies needs a rate and a date. Silently treating them as
    // one number is how a total ends up meaning nothing.
    throw new TypeError(`Cannot combine ${left.currency} and ${right.currency} without a conversion rate.`);
  }
}

/**
 * Build an amount from whole minor units.
 *
 * Refuses a fractional or unsafe value rather than rounding it: a fraction
 * here means the caller did arithmetic in floats somewhere upstream, and
 * accepting it would hide that.
 */
export function money(minorUnits: number, currency: string): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new TypeError(`Money must be whole minor units; got ${minorUnits}. Use fromDecimal() for "12.34".`);
  }
  if (!Number.isSafeInteger(minorUnits)) {
    throw new TypeError('That amount is too large to be represented exactly.');
  }
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new TypeError(`"${currency}" is not a three-letter currency code.`);
  }
  return { minorUnits, currency: code };
}

/**
 * Parse a decimal string such as "12.34".
 *
 * A **string**, not a number, so the value never passes through a float on its
 * way in. `fromDecimal(0.1 + 0.2, …)` is exactly the bug this exists to stop.
 */
export function fromDecimal(amount: string, currency: string): Money {
  const code = currency.trim().toUpperCase();
  const exponent = exponentFor(code);
  const text = amount.trim();

  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new TypeError(`"${amount}" is not a decimal amount.`);

  const [, sign, whole, fraction = ''] = match;
  if (fraction.length > exponent) {
    throw new TypeError(`${code} has ${exponent} decimal places; "${amount}" has ${fraction.length}.`);
  }

  const padded = fraction.padEnd(exponent, '0');
  const minor = Number.parseInt(`${whole}${padded}`, 10);
  return money(sign === '-' ? -minor : minor, code);
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.minorUnits + right.minorUnits, left.currency);
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.minorUnits - right.minorUnits, left.currency);
}

/** Multiply by a whole quantity — three of something, not 3.5% of something. */
export function times(amount: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) {
    throw new TypeError(`Quantity must be whole; got ${quantity}. Use allocate() or percentage().`);
  }
  return money(amount.minorUnits * quantity, amount.currency);
}

/**
 * Split an amount into parts without losing or inventing a penny.
 *
 * The remainder is handed out one unit at a time to the earliest parts, so the
 * parts always sum exactly back to the original. Rounding each share
 * independently does not: £10 split three ways becomes £3.33 × 3 = £9.99, and
 * the missing penny turns up in a reconciliation months later.
 */
export function allocate(amount: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) throw new TypeError('Cannot allocate across no parts.');
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new TypeError('Allocation weights must be zero or more.');
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) throw new TypeError('Allocation weights must add up to more than zero.');

  const shares = weights.map((weight) => Math.floor((amount.minorUnits * weight) / total));
  let remainder = amount.minorUnits - shares.reduce((sum, share) => sum + share, 0);

  for (let i = 0; remainder > 0; i = (i + 1) % shares.length) {
    shares[i] = (shares[i] ?? 0) + 1;
    remainder -= 1;
  }

  return shares.map((share) => money(share, amount.currency));
}

/** A percentage — tax, a discount, a fee — rounded half up, once, at the end. */
export function percentage(amount: Money, percent: number): Money {
  if (!Number.isFinite(percent)) throw new TypeError('Percentage must be a number.');
  const exact = (amount.minorUnits * percent) / 100;
  return money(Math.round(exact), amount.currency);
}

export function isZero(amount: Money): boolean {
  return amount.minorUnits === 0;
}

export function compare(left: Money, right: Money): number {
  assertSameCurrency(left, right);
  return left.minorUnits === right.minorUnits ? 0 : left.minorUnits < right.minorUnits ? -1 : 1;
}

/** "12.34" — for storing, comparing and sending. Not for showing to a person. */
export function toDecimal(amount: Money): string {
  const exponent = exponentFor(amount.currency);
  const negative = amount.minorUnits < 0;
  const digits = Math.abs(amount.minorUnits).toString().padStart(exponent + 1, '0');
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = exponent === 0 ? '' : `.${digits.slice(digits.length - exponent)}`;
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

/** "£12.34" — for showing to a person, in their locale. */
export function format(amount: Money, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: amount.currency,
    minimumFractionDigits: exponentFor(amount.currency),
  }).format(amount.minorUnits / 10 ** exponentFor(amount.currency));
}
