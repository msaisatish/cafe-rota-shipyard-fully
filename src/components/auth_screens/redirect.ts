/**
 * Where to send somebody after they sign in.
 *
 * This is the whole reason this component has a protected file. Sign-in pages
 * carry a `?next=` so that somebody who was sent to sign in ends up back where
 * they were trying to go, and the obvious implementation is one line:
 *
 * ```ts
 * router.push(searchParams.get('next') ?? '/');   // do not do this
 * ```
 *
 * That is an **open redirect**, and it is the vulnerability that makes phishing
 * work against careful people. The attacker sends
 * `https://your-app.com/sign-in?next=https://your-app.evil.com/`. The link is
 * genuinely your domain, the certificate is genuinely yours, the sign-in page
 * is genuinely yours, and the moment the password is accepted the browser is
 * handed to a copy of your app that asks for it again. Nothing in the address
 * bar looks wrong until it is too late.
 *
 * So: a destination is a path inside this app, or it is the fallback. There is
 * no configuration for allowing other hosts, because every product that added
 * one regretted it.
 */

/** Control characters, which browsers strip and validators usually do not. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

/**
 * The prefixes that leave the site while looking like a path.
 *
 * `//evil.com` is protocol-relative: the browser reads it as an absolute URL
 * and keeps the current scheme. `/\evil.com` is the same trick with a
 * backslash, which several browsers normalise to a forward slash before
 * anybody's validator sees it.
 */
function leavesTheSite(path: string): boolean {
  const second = path[1];
  return second === '/' || second === '\\';
}

/**
 * Percent-encoding hides the two characters above from a naive check.
 *
 * Decoded once only, and deliberately: the browser decodes once, so decoding
 * repeatedly would reject destinations that are in fact safe. A string that
 * cannot be decoded is refused rather than guessed at.
 */
function decodedOnce(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * A destination inside this app, or the fallback.
 *
 * Never throws. A refused destination is not an error the founder needs to
 * handle; it is somebody being sent home, which is the correct outcome and
 * should not produce a stack trace on a sign-in page.
 */
export function safeNext(value: string | null | undefined, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (CONTROL.test(trimmed)) return fallback;

  // A destination is a path. Anything with a scheme, and anything that does not
  // start at the root, is somewhere else.
  if (!trimmed.startsWith('/')) return fallback;
  if (leavesTheSite(trimmed)) return fallback;

  const decoded = decodedOnce(trimmed);
  if (decoded === null) return fallback;
  if (CONTROL.test(decoded)) return fallback;
  if (!decoded.startsWith('/') || leavesTheSite(decoded)) return fallback;

  // Sending somebody back to the sign-in page after signing in is a loop they
  // cannot get out of by pressing anything.
  if (isAuthScreen(decoded)) return fallback;

  return trimmed;
}

/** The screens this component owns. Nobody should be redirected back to one. */
export const AUTH_PATHS = ['/sign-in', '/register', '/forgot-password', '/reset-password'];

export function isAuthScreen(path: string): boolean {
  const withoutQuery = path.split('?')[0]?.split('#')[0] ?? '';
  return AUTH_PATHS.some(
    (one) => withoutQuery === one || withoutQuery.startsWith(`${one}/`),
  );
}

/**
 * The link that sends somebody to sign in and brings them back.
 *
 * Built here rather than at each call site so that the encoding is done once
 * and correctly. A `next` assembled by hand with template literals breaks the
 * first time a path contains a query string of its own.
 */
export function signInLinkFor(path: string): string {
  const destination = safeNext(path, '');
  return destination ? `/sign-in?next=${encodeURIComponent(destination)}` : '/sign-in';
}
