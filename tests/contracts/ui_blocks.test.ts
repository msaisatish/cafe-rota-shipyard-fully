import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  FOCUSABLE,
  MAIN_ID,
  SIGN_IN_FIELDS,
  addToast,
  dialogProps,
  dismissAfter,
  dismissPolicy,
  errorId,
  fieldAttributes,
  navigation,
  refusalText,
  signInNotice,
  statParts,
  toastAria,
  toastMotion,
  wrapFocus,
  type Field,
  type SignInFailure,
  type Toast,
} from '@/components/ui_blocks/blocks';
import { signInCopy } from '@/components/ui_blocks/copy';

/**
 * The contract for the five blocks.
 *
 * Every case here is a mistake that has shipped in somebody's application, and
 * most of them are invisible to the person who wrote the screen: they only show
 * up for somebody using a keyboard, somebody using a screen reader, somebody
 * who cannot tell two colours apart, or somebody typing an email address into a
 * form to find out whether a stranger has an account.
 */

const field = (name: 'email' | 'password'): Field => {
  const found = SIGN_IN_FIELDS.find((one) => one.name === name);
  if (!found) throw new Error(`no ${name} field`);
  return found;
};

describe('the frame knows which page you are on', () => {
  const items = [
    { href: '/', label: 'Home' },
    { href: '/admin', label: 'Admin' },
    { href: '/admin/people', label: 'People' },
    { href: '/administrators', label: 'Administrators' },
  ];

  const current = (path: string): string | undefined =>
    navigation(items, path).find((link) => link.current)?.label;

  it('marks the page being shown', () => {
    expect(current('/admin/people')).toBe('People');
  });

  it('does not mark a different page whose address merely starts the same way', () => {
    // The bare startsWith version of this marks "Admin" while you are looking
    // at "/administrators". It is the commonest bug in a sidebar and it looks
    // like the menu being haunted.
    expect(current('/administrators')).toBe('Administrators');
  });

  it('marks only the most specific of the items that match', () => {
    // Both /admin and /admin/people match this path. aria-current="page" on two
    // links tells a screen reader the person is in two places at once.
    const marked = navigation(items, '/admin/people').filter((link) => link.current);
    expect(marked).toHaveLength(1);
  });

  it('marks the section when you are somewhere inside it', () => {
    expect(current('/admin/settings/billing')).toBe('Admin');
  });

  it('does not mark home on every page', () => {
    expect(current('/admin')).toBe('Admin');
  });

  it('ignores a query string and a hash', () => {
    expect(current('/admin/people?page=2')).toBe('People');
    expect(current('/admin/people#top')).toBe('People');
  });

  it('ignores a trailing slash', () => {
    expect(current('/admin/people/')).toBe('People');
  });

  it('marks nothing when nothing matches', () => {
    expect(navigation(items, '/pricing').every((link) => !link.current)).toBe(true);
  });

  it('puts aria-current only on the current item, and leaves it off the rest', () => {
    // Not aria-current="false", which some screen readers announce.
    const links = navigation(items, '/admin');
    const admin = links.find((link) => link.label === 'Admin');
    const people = links.find((link) => link.label === 'People');
    expect(admin?.['aria-current']).toBe('page');
    expect(people).not.toHaveProperty('aria-current');
  });

  it('gives the skip link somewhere to land', () => {
    // A keyboard user tabs through every item in this menu on every page
    // without it.
    expect(MAIN_ID.length).toBeGreaterThan(0);
    expect(MAIN_ID).not.toContain(' ');
    expect(MAIN_ID).not.toContain('#');
  });
});

describe('signing in does not tell a stranger who has an account', () => {
  it('says the same thing whether the email is unknown or the password is wrong', () => {
    // Otherwise: type a list of addresses in, keep the ones that come back
    // "wrong password", and you have this product's customer list.
    expect(signInNotice('unknown-email').reason).toBe(signInNotice('wrong-password').reason);
  });

  it('never attaches a refusal to one of the two fields', () => {
    const failures: SignInFailure[] = [
      'unknown-email',
      'wrong-password',
      'locked',
      'rate-limited',
      'server',
    ];
    // A message under the password box says the email was fine, which leaks the
    // same fact more quietly.
    for (const failure of failures) expect(signInNotice(failure).field).toBeNull();
  });

  it('has a sentence for every reason it can give', () => {
    const failures: SignInFailure[] = [
      'unknown-email',
      'wrong-password',
      'locked',
      'rate-limited',
      'server',
    ];
    for (const failure of failures) {
      expect(signInCopy.refused[signInNotice(failure).reason]?.length).toBeGreaterThan(0);
    }
  });

  it('gives the two credential failures one shared sentence', () => {
    expect(signInCopy.refused[signInNotice('unknown-email').reason]).toBe(
      signInCopy.refused[signInNotice('wrong-password').reason],
    );
  });

  // Round 10 check D15: "Wait a minute" stood over a 15-minute lockout.
  it("shows the server's own wait for a lockout", () => {
    const wait = 'Too many attempts. Try again in 15 minutes.';
    expect(refusalText({ failure: 'rate-limited', message: wait })).toBe(wait);
    expect(refusalText({ failure: 'locked', message: wait })).toBe(wait);
  });

  it('never shows a server sentence for a wrong password, so it cannot leak who has an account', () => {
    const leak = 'No account with that email.';
    expect(refusalText({ failure: 'unknown-email', message: leak })).toBe(refusalText('wrong-password'));
    expect(refusalText({ failure: 'wrong-password', message: leak })).toBe(signInCopy.refused.credentials);
  });

  it('promises no particular wait when the server gave none', () => {
    expect(refusalText('rate-limited')).not.toMatch(/minute/i);
    expect(refusalText({ failure: 'rate-limited', message: '  ' })).toBe(signInCopy.refused['rate-limited']);
  });
});

describe('the sign-in form is one a password manager can fill', () => {
  it('asks for the identifier by the name managers key on', () => {
    expect(field('email').autoComplete).toBe('username');
  });

  it('asks for the existing password, not a new one', () => {
    // autocomplete="new-password" here makes managers offer to generate one.
    expect(field('password').autoComplete).toBe('current-password');
  });

  it('leaves a healthy field unmarked', () => {
    const attributes = fieldAttributes(field('email'));
    expect(attributes).not.toHaveProperty('aria-invalid');
    expect(attributes).not.toHaveProperty('aria-describedby');
  });

  it('attaches the message to the field it belongs to', () => {
    // A red border and a sentence underneath are two unrelated things to a
    // screen reader, which reads the box, says nothing about it being wrong,
    // and moves on.
    const attributes = fieldAttributes(field('email'), 'Enter your email address.');
    expect(attributes['aria-invalid']).toBe(true);
    expect(attributes['aria-describedby']).toBe(errorId('email'));
  });

  it('points at the id the message will actually have', () => {
    expect(fieldAttributes(field('password'), 'Required')['aria-describedby']).toBe(
      errorId('password'),
    );
  });

  it('treats a blank message as no message', () => {
    expect(fieldAttributes(field('email'), '   ')).not.toHaveProperty('aria-invalid');
  });
});

describe('a number on a dashboard is not shown as a fact it is not', () => {
  it('refuses a figure that does not say what period it covers', () => {
    // "142 sign-ups" — since when? Ever? This month? The readings differ by
    // orders of magnitude and the screenshot gets shown to an investor either
    // way.
    expect(() => statParts({ label: 'Sign-ups', value: 142, period: '' })).toThrow(/period/i);
  });

  it('refuses a period of only spaces', () => {
    expect(() => statParts({ label: 'Sign-ups', value: 1, period: '   ' })).toThrow();
  });

  it('does not show never-measured as zero', () => {
    const stat = statParts({ label: 'Refunds', value: null, period: 'the last 30 days' });
    expect(stat.value).not.toBe('0');
    expect(stat.changeAbsent).toMatch(/not been measured/i);
  });

  it('still shows a real zero', () => {
    expect(statParts({ label: 'Refunds', value: 0, period: 'the last 30 days' }).value).toBe('0');
  });

  it('says why there is no comparison rather than leaving a gap', () => {
    const stat = statParts({ label: 'Orders', value: 10, period: 'this week' });
    expect(stat.change).toBeNull();
    expect(stat.changeAbsent?.length).toBeGreaterThan(0);
  });

  it('refuses a percentage against zero', () => {
    // Going from 0 to 5 is not "500% up" and it is not "100% up". There is no
    // ratio, and inventing one puts a number on a dashboard that means nothing.
    const stat = statParts({ label: 'Orders', value: 5, period: 'this week', previous: 0 });
    expect(stat.change).toBeNull();
    expect(stat.changeAbsent).toMatch(/zero/i);
  });

  it('works out a rise', () => {
    const stat = statParts({ label: 'Orders', value: 120, period: 'this week', previous: 100 });
    expect(stat.change?.word).toBe('up');
    expect(stat.change?.percent).toBe(20);
  });

  it('works out a fall', () => {
    const stat = statParts({ label: 'Orders', value: 80, period: 'this week', previous: 100 });
    expect(stat.change?.word).toBe('down');
    expect(stat.change?.percent).toBe(20);
  });

  it('says so when nothing changed', () => {
    const stat = statParts({ label: 'Orders', value: 100, period: 'this week', previous: 100 });
    expect(stat.change?.word).toBe('no change');
    expect(stat.change?.tone).toBe('neutral');
  });

  it('knows that a falling number is sometimes the good news', () => {
    // Churn going down is not a red figure. A dashboard that paints every fall
    // red is actively misleading about the thing it exists to report.
    const stat = statParts({
      label: 'Churn',
      value: 3,
      period: 'this month',
      previous: 5,
      goodWhen: 'down',
    });
    expect(stat.change?.word).toBe('down');
    expect(stat.change?.tone).toBe('ok');
  });

  it('knows that a rising number is sometimes the bad news', () => {
    const stat = statParts({
      label: 'Churn',
      value: 8,
      period: 'this month',
      previous: 5,
      goodWhen: 'down',
    });
    expect(stat.change?.tone).toBe('warn');
  });

  it('never carries the change in the colour alone', () => {
    // Green-up and red-down are the same chip to a colour-blind reader and
    // silence to a screen reader. The word is the message; the tone is the
    // third signal.
    const stat = statParts({ label: 'Orders', value: 120, period: 'this week', previous: 100 });
    expect(stat.change?.word.length).toBeGreaterThan(0);
    expect(stat.change?.mark.length).toBeGreaterThan(0);
  });

  it('copes with a negative previous figure', () => {
    const stat = statParts({ label: 'Balance', value: -5, period: 'today', previous: -10 });
    expect(stat.change?.word).toBe('up');
    expect(stat.change?.percent).toBe(50);
  });

  it('uses the formatter it is given', () => {
    const stat = statParts({
      label: 'Revenue',
      value: 1234,
      period: 'this month',
      format: (value) => `£${value}`,
    });
    expect(stat.value).toBe('£1234');
  });
});

describe('a dialog can always be left, and does not throw work away', () => {
  it('lets Escape close it whatever kind it is', () => {
    // A modal that can be opened from the keyboard and not closed from it has
    // captured the person using it.
    for (const kind of ['message', 'form', 'confirm'] as const) {
      expect(dismissPolicy(kind).escape).toBe(true);
    }
  });

  it('does not close a form when the page behind it is clicked', () => {
    // A stray click outside a half-filled form throwing it all away is the
    // commonest way people lose work in a web application.
    expect(dismissPolicy('form').backdrop).toBe(false);
  });

  it('does not close a question when the page behind it is clicked', () => {
    expect(dismissPolicy('confirm').backdrop).toBe(false);
  });

  it('does close a message that has nothing to lose', () => {
    expect(dismissPolicy('message').backdrop).toBe(true);
  });

  it('says why, for each kind', () => {
    for (const kind of ['message', 'form', 'confirm'] as const) {
      expect(dismissPolicy(kind).because.length).toBeGreaterThan(0);
    }
  });

  it('refuses a dialog with no accessible name', () => {
    // Without one it is announced as "dialog" and nothing else, so somebody
    // using a screen reader knows only that something appeared.
    expect(() => dialogProps('')).toThrow(/heading/i);
  });

  it('marks it modal and points at its heading', () => {
    const props = dialogProps('title-1');
    expect(props.role).toBe('dialog');
    expect(props['aria-modal']).toBe(true);
    expect(props['aria-labelledby']).toBe('title-1');
  });

  it('can hold focus itself, so the trap has somewhere to put it', () => {
    expect(dialogProps('title-1').tabIndex).toBe(-1);
  });

  it('describes it only when there is a description', () => {
    expect(dialogProps('title-1')).not.toHaveProperty('aria-describedby');
    expect(dialogProps('title-1', 'body-1')['aria-describedby']).toBe('body-1');
  });
});

describe('Tab does not escape a dialog', () => {
  it('wraps from the last control back to the first', () => {
    // Otherwise focus lands on the page behind, which is still there, still
    // clickable, and being read out underneath a dialog the person thinks they
    // are inside.
    expect(wrapFocus(2, 3, 1)).toBe(0);
  });

  it('wraps backwards from the first to the last', () => {
    expect(wrapFocus(0, 3, -1)).toBe(2);
  });

  it('moves normally in between', () => {
    expect(wrapFocus(0, 3, 1)).toBe(1);
    expect(wrapFocus(2, 3, -1)).toBe(1);
  });

  it('goes to the first control when focus is on the dialog itself', () => {
    expect(wrapFocus(-1, 3, 1)).toBe(0);
  });

  it('goes to the last control on Shift+Tab from the dialog itself', () => {
    // The plain modulo gives the second-to-last here, which is the sort of
    // wrong that nobody notices until they are relying on it.
    expect(wrapFocus(-1, 3, -1)).toBe(2);
  });

  it('reports that there is nowhere to go when nothing is focusable', () => {
    expect(wrapFocus(0, 0, 1)).toBe(-1);
  });

  it('does not count controls that are disabled or removed from the tab order', () => {
    expect(FOCUSABLE).toContain('button:not([disabled])');
    expect(FOCUSABLE).toContain('[tabindex]:not([tabindex="-1"])');
  });
});

describe('a message that matters does not disappear on its own', () => {
  const toast = (tone: Toast['tone'], text: string, action?: { label: string }): Toast => ({
    id: `${tone}-${text}`,
    tone,
    text,
    ...(action ? { action } : {}),
  });

  it('interrupts for bad news and not for anything else', () => {
    // A screen reader that interrupts to say "Saved" every time a field loses
    // focus is one people turn off, and then it is worth nothing on the day it
    // matters.
    expect(toastAria('danger').role).toBe('alert');
    expect(toastAria('ok').role).toBe('status');
    expect(toastAria('info')['aria-live']).toBe('polite');
    expect(toastAria('danger')['aria-live']).toBe('assertive');
  });

  it('never dismisses bad news by itself', () => {
    // A payment failure that fades after three seconds is a payment failure
    // nobody saw, and the only evidence it happened is gone.
    expect(dismissAfter(toast('danger', 'Your payment was declined.'))).toBeNull();
  });

  it('keeps a short message up long enough to notice', () => {
    expect(dismissAfter(toast('ok', 'Saved'))).toBeGreaterThanOrEqual(5000);
  });

  it('keeps a long message up longer', () => {
    const short = dismissAfter(toast('ok', 'Saved')) ?? 0;
    const long =
      dismissAfter(
        toast(
          'info',
          'We have started importing your customers and will email you when it has finished, which usually takes about ten minutes for a file this size.',
        ),
      ) ?? 0;
    expect(long).toBeGreaterThan(short);
  });

  it('gives longer still when it is offering something to press', () => {
    const plain = dismissAfter(toast('ok', 'Deleted')) ?? 0;
    const withUndo = dismissAfter(toast('ok', 'Deleted', { label: 'Undo' })) ?? 0;
    // A button that disappears while you are moving towards it is worse than
    // no button.
    expect(withUndo).toBeGreaterThan(plain);
  });

  it('never drops an error to make room', () => {
    const errors = [
      toast('danger', 'one'),
      toast('danger', 'two'),
      toast('danger', 'three'),
    ];
    const next = addToast(errors, toast('danger', 'four'), 3);
    expect(next).toHaveLength(4);
    expect(next.map((one) => one.text)).toEqual(['one', 'two', 'three', 'four']);
  });

  it('drops the oldest ordinary message first', () => {
    const list = [toast('ok', 'one'), toast('danger', 'bad'), toast('ok', 'three')];
    const next = addToast(list, toast('ok', 'four'), 3);
    expect(next.map((one) => one.text)).toEqual(['bad', 'three', 'four']);
  });

  it('does not stack the same message twice running', () => {
    // A retry loop fires the identical error forty times. Forty copies of it is
    // not more information, it is a wall over the page.
    const list = [toast('danger', 'Could not reach the server.')];
    expect(addToast(list, toast('danger', 'Could not reach the server.'))).toHaveLength(1);
  });

  it('does add a different message', () => {
    const list = [toast('danger', 'Could not reach the server.')];
    expect(addToast(list, toast('danger', 'Something else happened.'))).toHaveLength(2);
  });

  it('does not move when reduced motion is asked for', () => {
    // prefers-reduced-motion is set by people for whom movement causes nausea,
    // dizziness or migraine. It is a medical setting, not a taste.
    expect(toastMotion(true)).toEqual({ transition: 'none', slide: false });
  });

  it('moves otherwise', () => {
    expect(toastMotion(false).slide).toBe(true);
  });
});

describe('nothing is painted outside the theme', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src', 'components', 'ui_blocks', 'blocks.css'),
    'utf8',
  );

  // The comments are stripped first, because these cases are about what the
  // stylesheet *does*. The first version of this checked the raw file and
  // failed on the comment explaining why `outline: none` is a mistake — a check
  // that fires on somebody writing down the rule is a check that gets deleted.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

  it('has no hex colours anywhere in it', () => {
    // A hard-coded colour escapes the theme, ignores dark mode, and slips past
    // the contrast repair — which only ever sees values that came through the
    // tokens. One typed-in grey is how an app becomes unreadable for exactly
    // the people that repair exists for.
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('declares its one literal colour in one named place', () => {
    // The scrim behind a dialog. The palette has no token for "the page, but
    // darker", so it is named rather than hidden, and nothing is ever read
    // against it.
    const literal = css
      .split('\n')
      .filter((line) => line.includes('rgb(') || line.includes('hsl('));
    expect(literal).toHaveLength(1);
    expect(literal[0]).toContain('--blk-scrim');
  });

  it('never removes the focus ring without putting one back', () => {
    // outline: none with nothing in its place makes the whole application
    // unusable without a mouse, and it is the commonest mistake in a
    // stylesheet.
    expect(css).not.toMatch(/outline:\s*none/);
    expect(css).toContain('outline: 2px solid var(--focus)');
  });

  it('keeps the current-page highlight as decoration only', () => {
    // The meaning is in aria-current. If the highlight were the only signal,
    // the menu would say nothing at all to a screen reader.
    expect(css).toContain('.blk-nav-link.is-current');
    expect(navigation([{ href: '/a', label: 'A' }], '/a')[0]?.['aria-current']).toBe('page');
  });
});

describe('the sign-in form offers no reset the app does not have', () => {
  /**
   * The form linked to `/password/forgot` by default, a page nothing installs.
   * Every app built on it showed "I have forgotten my password" while its own
   * sign-in component said password reset was not included (pilot 02).
   */
  const source = readFileSync(
    path.join(process.cwd(), 'src', 'components', 'ui_blocks', 'SignInForm.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('has no default reset page', () => {
    expect(source).not.toMatch(/forgotHref\s*=\s*['"`]/);
  });

  it('shows the link only when it is given somewhere to go', () => {
    expect(source).toMatch(/forgotHref\s*\?\s*<a href=\{forgotHref\}>/);
  });
});
