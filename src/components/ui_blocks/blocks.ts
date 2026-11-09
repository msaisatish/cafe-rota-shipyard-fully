/**
 * The decisions behind the blocks, separated from the rendering.
 *
 * Same arrangement as `ui_foundation`: everything that can be got wrong is a
 * pure function here, checked without a browser, and the `.tsx` files are thin
 * wrappers that call them. A wrapper cannot quietly disagree with a rule when
 * the rule is the only place its props come from.
 *
 * Five blocks, chosen because each one is a screen every application has and
 * each one is wrong in the same way every time it is written from scratch. The
 * mistakes are listed against each section below, because a rule whose reason
 * is not written down is a rule somebody deletes in six months.
 */

import { signInCopy } from './copy';

/* ------------------------------------------------------------------ the frame */

export interface NavItem {
  /** Where it goes. */
  href: string;
  /** What it is called, in the founder's words. */
  label: string;
}

export interface NavLink extends NavItem {
  current: boolean;
  /**
   * Present only on the current page.
   *
   * This is the attribute that carries "you are here". The highlight is
   * decoration: somebody who cannot see the highlight, or is reading with a
   * screen reader, gets nothing from it.
   */
  'aria-current'?: 'page';
}

/**
 * Where the skip link goes.
 *
 * A keyboard user landing on any page of an application with a sidebar has to
 * tab through every navigation item before reaching the content, on every page.
 * The skip link is one element and it is the single highest-value accessibility
 * feature in a shell, which is why it is not optional here.
 */
export const MAIN_ID = 'main-content';

function normalisePath(value: string): string {
  const path = value.split('?')[0]?.split('#')[0] ?? '/';
  if (path.length === 0) return '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function isUnder(href: string, path: string): boolean {
  if (href === path) return true;
  // "/" is a prefix of everything, so treating it as a section would mark home
  // as current on every page in the app.
  if (href === '/') return false;
  return path.startsWith(`${href}/`);
}

/**
 * Which navigation item is the current one.
 *
 * Two mistakes, both of which look like the menu being haunted rather than the
 * matching being wrong:
 *
 * **A bare `startsWith`.** `/admin` is a prefix of `/administrators`, so opening
 * the second highlights the first. The comparison has to land on a path
 * separator.
 *
 * **Every ancestor highlighted at once.** On `/settings/billing`, both
 * `/settings` and `/settings/billing` match. Exactly one item is the current
 * page — `aria-current="page"` on two links tells a screen reader the person is
 * in two places — so the most specific match wins and the rest do not.
 */
export function navigation(items: readonly NavItem[], path: string): NavLink[] {
  const here = normalisePath(path);

  let best = -1;
  let bestLength = -1;
  items.forEach((item, index) => {
    const href = normalisePath(item.href);
    if (!isUnder(href, here)) return;
    if (href.length > bestLength) {
      best = index;
      bestLength = href.length;
    }
  });

  return items.map((item, index) =>
    index === best
      ? { ...item, current: true, 'aria-current': 'page' as const }
      : { ...item, current: false },
  );
}

/* ---------------------------------------------------------------- signing in */

export type FieldName = 'email' | 'password';

export interface Field {
  name: FieldName;
  id: string;
  type: 'email' | 'password';
  /**
   * The token a password manager reads.
   *
   * `username` rather than `email` even though it holds an email address: that
   * is the token managers key on for the identifier half of a sign-in pair.
   * Getting these wrong does not break anything visibly — it just means the
   * manager never offers to fill the form, and people blame themselves.
   */
  autoComplete: 'username' | 'current-password';
  required: true;
}

export const SIGN_IN_FIELDS: readonly Field[] = [
  { name: 'email', id: 'sign-in-email', type: 'email', autoComplete: 'username', required: true },
  {
    name: 'password',
    id: 'sign-in-password',
    type: 'password',
    autoComplete: 'current-password',
    required: true,
  },
];

/** The id of the message belonging to a field. One place, so the wiring matches. */
export const errorId = (name: FieldName): string => `${name}-error`;

export interface FieldAttributes {
  id: string;
  name: FieldName;
  type: 'email' | 'password';
  autoComplete: string;
  required: boolean;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/**
 * What an input renders as, with its message attached.
 *
 * The attachment is the whole point. A red border and a sentence underneath is
 * two unrelated things to a screen reader, which reads the input, says nothing
 * about it being wrong, and moves on. `aria-describedby` is what makes the
 * message part of the field rather than text that happens to be near it.
 */
export function fieldAttributes(field: Field, problem?: string): FieldAttributes {
  const base: FieldAttributes = {
    id: field.id,
    name: field.name,
    type: field.type,
    autoComplete: field.autoComplete,
    required: field.required,
  };
  if (!problem?.trim()) return base;
  return { ...base, 'aria-invalid': true, 'aria-describedby': errorId(field.name) };
}

export type SignInFailure =
  | 'unknown-email'
  | 'wrong-password'
  | 'locked'
  | 'rate-limited'
  | 'server';

export type SignInReason = 'credentials' | 'locked' | 'rate-limited' | 'server';

export interface SignInNotice {
  reason: SignInReason;
  /**
   * Always `null`. Kept in the shape rather than dropped so that the day
   * somebody wants to attach a server refusal to a field, they meet this
   * comment instead of a blank space.
   */
  field: null;
}

/**
 * What the form is allowed to say when the server refuses.
 *
 * **"No account with that email" tells a stranger which addresses are
 * registered.** Type a list in, keep the ones that come back "wrong password",
 * and you have a list of this product's customers — useful for phishing them,
 * and for knowing who a competitor's customers are. So the two credential
 * failures return one indistinguishable reason.
 *
 * And no server refusal is ever attached to a single field. Putting it under
 * the password box says the email was fine, which leaks the same fact more
 * quietly. Local validation — an empty box, an address with no `@` — *is* per
 * field, because the browser already knows and nothing is revealed.
 */
export function signInNotice(failure: SignInFailure): SignInNotice {
  switch (failure) {
    case 'unknown-email':
    case 'wrong-password':
      return { reason: 'credentials', field: null };
    case 'locked':
      return { reason: 'locked', field: null };
    case 'rate-limited':
      return { reason: 'rate-limited', field: null };
    case 'server':
      return { reason: 'server', field: null };
  }
}

/** A refusal with the server's own sentence: only ever shown for a lockout or a wait. */
export interface SignInRefusal {
  failure: SignInFailure;
  message?: string;
}

/**
 * The words to show for a refusal.
 *
 * The server's sentence is shown only for `locked` and `rate-limited`. Those
 * are the cases where it knows something the form cannot: how long the wait
 * is. The form's own "Wait a minute" stood over a 15-minute lockout, and a
 * person who tried again after a minute met the same refusal and took the app
 * for broken (round 10 depth check D15, both Shipyard builds). A credential
 * refusal always uses the one shared sentence, whatever the server sent,
 * so the rule in `signInNotice` cannot be talked round.
 */
export function refusalText(refused: SignInFailure | SignInRefusal): string {
  const { failure, message } = typeof refused === 'string' ? { failure: refused, message: undefined } : refused;
  const reason = signInNotice(failure).reason;
  const own = message?.trim();
  if (own && (reason === 'locked' || reason === 'rate-limited')) return own;
  return signInCopy.refused[reason];
}

/* -------------------------------------------------------- numbers on a dashboard */

export interface StatInput {
  label: string;
  /**
   * `null` means nobody has measured it yet.
   *
   * Which is not zero. "0 orders" and "we have never counted orders" are
   * different facts and a dashboard that shows the second as the first is
   * lying in the direction of bad news.
   */
  value: number | null;
  /** What period the number covers. There is no default — see `statParts`. */
  period: string;
  previous?: number | null;
  /** Which direction is good news. Not every number that rises is good. */
  goodWhen?: 'up' | 'down';
  format?: (value: number) => string;
}

export interface StatChange {
  /** The word. This is what stops the arrow and the colour being the message. */
  word: 'up' | 'down' | 'no change';
  mark: string;
  tone: 'ok' | 'warn' | 'neutral';
  percent: number;
}

export interface StatParts {
  label: string;
  value: string;
  /** Always says what period the number covers. */
  caption: string;
  change: StatChange | null;
  /** Why there is no comparison, when there is not. Never silently absent. */
  changeAbsent?: string;
}

const MARKS: Record<StatChange['word'], string> = {
  up: '▲',
  down: '▼',
  'no change': '–',
};

/**
 * One number on a dashboard.
 *
 * **A number with no period is not a fact.** "142 sign-ups" — since when? Ever?
 * This month? The two readings are different by orders of magnitude and the
 * founder shows the screen to an investor either way. `period` is required and
 * blank is refused rather than defaulted, because a default here would be a
 * guess printed as a measurement.
 *
 * **A change is never only a colour and an arrow.** Green-up/red-down is
 * invisible to a colour-blind reader and meaningless to a screen reader, and it
 * is also frequently backwards: churn falling is good, and a dashboard that
 * paints it red because the line went down is actively misleading. Hence
 * `word`, `mark` and `goodWhen`.
 *
 * **A percentage against zero is not a percentage.** Going from 0 to 5 is not
 * "500% up" and it is not "100% up"; there is no ratio. It says so instead.
 */
export function statParts(input: StatInput): StatParts {
  if (!input.period.trim()) {
    throw new Error(
      `The "${input.label}" figure needs to say what period it covers. A number on its own is not a fact.`,
    );
  }

  const format = input.format ?? ((value: number) => value.toLocaleString());
  const caption = input.period.trim();

  if (input.value === null) {
    return {
      label: input.label,
      value: '—',
      caption,
      change: null,
      changeAbsent: 'This has not been measured yet, which is not the same as none.',
    };
  }

  const parts: StatParts = {
    label: input.label,
    value: format(input.value),
    caption,
    change: null,
  };

  const previous = input.previous;
  if (previous === undefined || previous === null) {
    parts.changeAbsent = 'Nothing to compare it with yet.';
    return parts;
  }
  if (previous === 0) {
    parts.changeAbsent = 'The period before was zero, so there is no percentage to give.';
    return parts;
  }

  const difference = input.value - previous;
  const percent = Math.round((difference / Math.abs(previous)) * 100);
  const word: StatChange['word'] = difference === 0 ? 'no change' : difference > 0 ? 'up' : 'down';
  const goodWhen = input.goodWhen ?? 'up';
  const tone: StatChange['tone'] =
    word === 'no change' ? 'neutral' : word === goodWhen ? 'ok' : 'warn';

  parts.change = { word, mark: MARKS[word], tone, percent: Math.abs(percent) };
  return parts;
}

/* -------------------------------------------------------------------- dialogs */

export type DialogKind = 'message' | 'form' | 'confirm';

export interface DialogPolicy {
  /** Always true. A dialog with no keyboard way out is a trap. */
  escape: boolean;
  /** Whether a click on the backdrop closes it. */
  backdrop: boolean;
  /** Written down so nobody 'tidies' it away later. */
  because: string;
}

/**
 * How a dialog may be dismissed.
 *
 * Escape always works. That is not a preference — a modal that can be opened
 * from the keyboard and not closed from it has captured the person using it.
 *
 * The backdrop is the interesting one, and the usual default is wrong. A stray
 * click outside a form throws away everything typed into it with no warning and
 * no undo, and it is the single most common way people lose work in a web
 * application. So a dialog that holds input, or that is asking a question whose
 * answer matters, does not close when the page behind it is clicked.
 */
export function dismissPolicy(kind: DialogKind): DialogPolicy {
  switch (kind) {
    case 'message':
      return {
        escape: true,
        backdrop: true,
        because: 'There is nothing to lose by closing it.',
      };
    case 'form':
      return {
        escape: true,
        backdrop: false,
        because: 'A stray click outside would throw away what they had typed.',
      };
    case 'confirm':
      return {
        escape: true,
        backdrop: false,
        because: 'It is asking a question. A click beside it is not an answer.',
      };
  }
}

export interface DialogAttributes {
  role: 'dialog';
  'aria-modal': true;
  'aria-labelledby': string;
  'aria-describedby'?: string;
  tabIndex: -1;
}

/**
 * What the dialog element renders as.
 *
 * The name is required and is refused rather than defaulted. A modal with no
 * accessible name is announced as "dialog" and nothing else, so somebody using
 * a screen reader knows only that something has appeared over the page.
 */
export function dialogProps(titleId: string, descriptionId?: string): DialogAttributes {
  if (!titleId.trim()) {
    throw new Error('A dialog needs the id of its heading, or it announces itself as "dialog".');
  }
  return {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    ...(descriptionId?.trim() ? { 'aria-describedby': descriptionId } : {}),
    tabIndex: -1,
  };
}

/** What counts as reachable by Tab. Kept here so the trap and the CSS agree. */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Where Tab goes next inside a modal.
 *
 * Tab off the last control and focus lands on the browser's address bar, then
 * on the page behind — which is still there, still clickable, and now being
 * read out underneath a dialog the person thinks they are in. The trap wraps
 * instead.
 *
 * `-1` means there is nothing focusable and focus stays on the dialog itself.
 * That is why `dialogProps` sets `tabIndex: -1` on the container: somewhere has
 * to be able to hold focus, or it falls back to `<body>` and the trap is gone.
 *
 * A `current` of `-1` means focus is on the dialog itself rather than on any of
 * its controls, which is where it starts. Tab from there goes to the first
 * control and Shift+Tab to the last — not to "one before the first", which the
 * modulo on its own would give.
 */
export function wrapFocus(current: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}

/* --------------------------------------------------------------- the messages */

export type ToastTone = 'ok' | 'warn' | 'danger' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  text: string;
  /** An offer that comes with it, such as "Undo". */
  action?: { label: string };
}

export interface ToastAria {
  role: 'status' | 'alert';
  'aria-live': 'polite' | 'assertive';
  'aria-atomic': true;
}

/**
 * How a message is announced.
 *
 * `alert` interrupts whatever is being read. That is right for the one that is
 * genuinely bad news and wrong for everything else — a screen reader that
 * interrupts to say "Saved" every time a field loses focus is one people turn
 * off, and then it is worth nothing on the day it matters.
 */
export function toastAria(tone: ToastTone): ToastAria {
  return tone === 'danger'
    ? { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': true }
    : { role: 'status', 'aria-live': 'polite', 'aria-atomic': true };
}

/** Roughly 170 words a minute, which is unhurried reading. */
const MS_PER_WORD = 350;
const FLOOR_MS = 5000;
const EXTRA_FOR_AN_ACTION_MS = 5000;

/**
 * How long a message stays, in milliseconds, or `null` for "until dismissed".
 *
 * **Bad news never dismisses itself.** A payment failure that fades after three
 * seconds is a payment failure the founder's customer never saw, and the only
 * evidence it happened is gone. It stays until somebody closes it.
 *
 * Everything else gets reading time rather than a constant. The usual three
 * seconds is fine for "Saved" and far too short for a sentence, and the person
 * most likely to need longer — reading on a phone, in a second language, with a
 * magnifier — is the person a constant is least built for.
 *
 * A message offering an action gets longer still, because a button that
 * disappears while you are moving towards it is worse than no button.
 */
export function dismissAfter(toast: Toast): number | null {
  if (toast.tone === 'danger') return null;
  const words = toast.text.trim().split(' ').filter((word) => word.length > 0).length;
  const reading = Math.max(FLOOR_MS, words * MS_PER_WORD);
  return reading + (toast.action ? EXTRA_FOR_AN_ACTION_MS : 0);
}

/**
 * Adding one to the stack.
 *
 * **An error is never dropped to make room.** If the cap is reached and
 * everything on screen is an error, the stack is allowed to grow instead:
 * silently discarding the message that says what went wrong is the one failure
 * this whole block exists to avoid.
 *
 * **The same message twice in a row is one message.** A retry loop fires the
 * identical error forty times; forty stacked copies of it is not more
 * information, it is a wall over the page.
 */
export function addToast(list: readonly Toast[], toast: Toast, max = 3): Toast[] {
  const last = list[list.length - 1];
  if (last && last.tone === toast.tone && last.text === toast.text) return [...list];

  const next = [...list, toast];
  while (next.length > max) {
    const oldest = next.findIndex((one) => one.tone !== 'danger');
    if (oldest === -1) break;
    next.splice(oldest, 1);
  }
  return next;
}

export interface Motion {
  /** A CSS transition value, or `none`. */
  transition: string;
  /** Whether the message slides in. */
  slide: boolean;
}

/**
 * Whether the message moves.
 *
 * `prefers-reduced-motion` is set by people for whom movement causes nausea,
 * dizziness or migraine — it is a medical setting, not a taste. The message
 * still appears and still says the same thing; it just arrives instead of
 * flying in. The CSS carries the same rule, so a block rendered on the server
 * before the preference is known is still right.
 */
export function toastMotion(reducedMotion: boolean): Motion {
  return reducedMotion
    ? { transition: 'none', slide: false }
    : { transition: 'opacity 150ms ease, transform 150ms ease', slide: true };
}
