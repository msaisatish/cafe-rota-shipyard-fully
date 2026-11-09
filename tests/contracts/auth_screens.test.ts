import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AUTH_PATHS,
  isAuthScreen,
  safeNext,
  signInLinkFor,
} from '@/components/auth_screens/redirect';
import { RESET_REQUESTED, noticeFor } from '@/components/auth_screens/messages';
import { authCopy } from '@/components/auth_screens/copy';

/**
 * The contract for the screens people meet before they have an account.
 *
 * Two of these are security rules wearing the clothes of wording choices, and
 * both are the kind that get "improved" by somebody trying to be helpful.
 */

describe('where somebody lands after signing in', () => {
  /**
   * An open redirect is what makes phishing work against careful people: the
   * domain is genuinely yours, the certificate is genuinely yours, and the
   * browser is handed to a copy of your app the moment the password is taken.
   */
  it('refuses a destination on another site', () => {
    for (const attack of [
      'https://evil.example',
      'http://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'data:text/html,<script>',
    ]) {
      expect(safeNext(attack), attack).toBe('/');
    }
  });

  it('refuses one hidden behind percent-encoding', () => {
    // The browser decodes once, so a check that only looks at the raw string
    // sees a path and lets a protocol-relative URL through.
    expect(safeNext('/%2f%2fevil.example')).toBe('/');
    expect(safeNext('/%5cevil.example')).toBe('/');
  });

  it('refuses one hidden behind whitespace or control characters', () => {
    expect(safeNext('  //evil.example  ')).toBe('/');
    expect(safeNext('/ok\nSet-Cookie: x=1')).toBe('/');
    expect(safeNext('/%00/evil')).toBe('/');
  });

  it('refuses encoding it cannot read rather than guessing at it', () => {
    expect(safeNext('/%E0%A4%A')).toBe('/');
  });

  it('allows an ordinary path, with its query and fragment intact', () => {
    expect(safeNext('/rota')).toBe('/rota');
    expect(safeNext('/rota/week?page=2#top')).toBe('/rota/week?page=2#top');
  });

  it('falls back when there is nothing to go on', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
    expect(safeNext('   ')).toBe('/');
  });

  it('uses the fallback it is given', () => {
    expect(safeNext('//evil.example', '/home')).toBe('/home');
  });

  it('never sends somebody back to a sign-in screen', () => {
    // Otherwise signing in returns you to the form you just filled in, and
    // there is no button on that page that gets you out of the loop.
    for (const screen of AUTH_PATHS) {
      expect(safeNext(screen), screen).toBe('/');
    }
    expect(safeNext('/reset-password/abc123')).toBe('/');
    expect(isAuthScreen('/sign-in?next=%2Frota')).toBe(true);
    expect(isAuthScreen('/rota')).toBe(false);
  });

  it('builds a link that survives coming back', () => {
    const link = signInLinkFor('/rota/week?page=2');
    const next = new URL(link, 'https://app.example').searchParams.get('next');
    expect(safeNext(next)).toBe('/rota/week?page=2');
  });

  it('does not offer to bring somebody back to somewhere unsafe', () => {
    expect(signInLinkFor('//evil.example')).toBe('/sign-in');
  });
});

describe('what a refusal is allowed to say', () => {
  it('says the same thing however sign-in failed', () => {
    // The route verifies against a dummy hash so an unknown address and a
    // wrong password take the same time. That care is worth nothing if the
    // screen in front of it is more forthcoming.
    const unknown = noticeFor('sign-in', 401, { error: 'No account with that email' });
    const wrong = noticeFor('sign-in', 401, { error: 'Wrong password' });
    expect(unknown.text).toBe(wrong.text);
    expect(unknown.text).not.toMatch(/no account|not found|unknown/i);
  });

  it('never attaches a sign-in refusal to one of the fields', () => {
    // Putting it under the password box says the email was fine, which leaks
    // the same fact more quietly.
    for (const status of [400, 401, 403, 429, 500]) {
      expect(noticeFor('sign-in', status).placement).toBe('form');
    }
  });

  it('does say when somebody is being rate limited', () => {
    // The one case where saying more is safe and kind. A wait they cannot see
    // the end of reads as a ban.
    expect(noticeFor('sign-in', 429).text).toMatch(/too many|wait/i);
    expect(noticeFor('sign-in', 429).tone).toBe('warn');
  });

  it('does not blame the person for a fault at our end', () => {
    const notice = noticeFor('sign-in', 503);
    expect(notice.text).toMatch(/our end/i);
    expect(notice.text).toMatch(/nothing about your account has changed/i);
  });

  it('passes the server own words through on the screens where that is safe', () => {
    expect(noticeFor('register', 409, { error: 'That email address is already registered.' }).text)
      .toBe('That email address is already registered.');
  });

  it('says the same thing whether or not a reset address exists', () => {
    expect(RESET_REQUESTED).toMatch(/if that address has an account/i);
    expect(RESET_REQUESTED).not.toMatch(/we could not find|no account/i);
  });
});

describe('the words belong to the founder and the rules do not', () => {
  it('keeps the wording in a file they may edit', () => {
    expect(authCopy.register.heading.length).toBeGreaterThan(0);
    expect(authCopy.forgot.lede.length).toBeGreaterThan(0);
  });

  it('states the password rule before they type rather than after they fail', () => {
    expect(authCopy.register.passwordHint).toMatch(/12|twelve/i);
  });
});

describe('the screens arrive looking like screens', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src', 'components', 'auth_screens', 'auth-screens.css'),
    'utf8',
  );
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

  it('paints from tokens rather than typed-in colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('never removes a focus ring without putting one back', () => {
    // A sign-in page is the worst screen on which to discover the keyboard
    // does not work.
    expect(css).not.toMatch(/outline:\s*none/);
    expect(css).toContain('var(--focus)');
  });

  it('marks an invalid field with more than a colour', () => {
    expect(css).toContain("input[aria-invalid='true']");
    expect(css).toContain('border-width');
  });
});

describe('every screen this component routes to actually exists', () => {
  /**
   * The test that was missing.
   *
   * `AUTH_PATHS` listed `/reset-password` from the first version, `noticeFor`
   * accepted it as a screen, and the reset email linked to it — but no page was
   * installed there, so the link in that email arrived at a 404 with a live
   * token in the URL. Every part was individually correct and the flow was
   * broken.
   *
   * Asserting against `AUTH_PATHS` rather than a list written out here means
   * adding a path to that array without building it fails immediately.
   */
  it('installs a page at each path in AUTH_PATHS', () => {
    for (const authPath of AUTH_PATHS) {
      const page = path.join(process.cwd(), 'src', 'app', authPath.replace(/^\//, ''), 'page.tsx');
      expect(existsSync(page), `${authPath} is routed to but has no page at ${page}`).toBe(true);
    }
  });
});

describe('the reset the sign-in screen offers is really there', () => {
  /**
   * The sign-in screen links to /forgot-password. Without password_reset's
   * routes behind it, that page said "check your email" and nothing was ever
   * sent (pilot 02). The component now requires password_reset, so both routes
   * must be in the project it was installed into.
   */
  it('has both reset routes installed beside it', () => {
    for (const step of ['request', 'confirm']) {
      const route = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'password-reset', step, 'route.ts');
      expect(existsSync(route), `the reset pages post to ${route}, which is not installed`).toBe(true);
    }
  });
});

describe('the page the emailed link lands on', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src', 'app', 'reset-password', 'page.tsx'),
    'utf8',
  );

  /**
   * The route spends the token on the first request that reaches it, including
   * one that then fails the password rules. So a typo in an unreadable field
   * costs the whole link, and the only defence is to ask twice and compare
   * before posting.
   */
  it('checks the two passwords match before it posts anything', () => {
    const submit = source.slice(source.indexOf('async function submit'), source.indexOf('if (done)'));
    const compare = submit.indexOf('confirm !== password');
    const post = submit.indexOf('fetch(');
    expect(compare, 'the two passwords are never compared').toBeGreaterThan(-1);
    expect(post, 'the page never posts').toBeGreaterThan(-1);
    expect(compare, 'the passwords are compared after the request, by which time the link is spent').toBeLessThan(post);
  });

  it('does not spend a request on a link that arrived without a token', () => {
    expect(source).toContain('if (!token)');
  });

  it('says that changing the password signed everything out', () => {
    // The sessions are revoked whether or not anybody is told. Being told is
    // what stops "why did my phone log out" becoming a support ticket.
    //
    // Asserted against the wording the page ships with rather than against
    // copy.ts, because copy.ts belongs to the founder: a project upgraded from
    // an earlier version has no `reset` section in it at all, and one that does
    // is free to reword this.
    expect(source).toMatch(/signed out/i);
  });

  /**
   * `copy.ts` belongs to the founder and an upgrade never overwrites it, so a
   * project that installed an earlier auth_screens has a copy.ts with no
   * `reset` section. Reading it directly would turn that upgrade into a failed
   * build, which is why the page merges over its own defaults.
   */
  it('survives a copy.ts written before this screen existed', () => {
    // Comments stripped first. The doc comment in the page explains this very
    // rule by quoting the thing it forbids, and a check that fires on somebody
    // writing the rule down is a check that gets deleted.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toMatch(/\.\.\.DEFAULTS/);
    expect(code).not.toMatch(/authCopy\.reset\./);
  });
});
