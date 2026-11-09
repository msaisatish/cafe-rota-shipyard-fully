# I forgot my password

A reset link by email, and the sign-out that has to come with it.

Fills the gap named in the sign-in component's own limitations. It needs both
[Signing in](./auth.md) and [Emailing your users](./transactional_email.md),
and it uses their code rather than repeating it.

## What you get

| | |
| --- | --- |
| `POST /api/auth/password-reset/request` | Takes `{ email }`. Always the same answer. |
| `POST /api/auth/password-reset/confirm` | Takes `{ token, password }`. Sets the new password. |
| `issueResetToken(userId)` | If you need to start a reset from your own code. |
| `revokeResetTokens(userId)` | Cancel outstanding links, e.g. when suspending an account. |

## The pages

This component installs no UI. `auth_screens` ("The screens people sign in on")
installs both pages, and since its 1.2.0 it brings this component with it, so
its "I have forgotten my password" link always has a working reset behind it.
Without `auth_screens`, build the two pages yourself, and only then put a
"forgot password" link on your sign-in page (`ui_blocks`' `SignInForm` shows
one only when you pass `forgotHref`). The pages:

| Page | What it does |
| --- | --- |
| `/forgot-password` | One email field. Posts to `…/request`. Show the message it returns, whatever was typed. |
| `/reset-password` | Reads `?token=` from the URL, asks for a new password, posts both to `…/confirm`. |

The link in the email points at `/reset-password?token=…`, built from `APP_URL`.
**In production no reset link is sent while `APP_URL` is missing** (an empty
value counts as missing): the answer to the form is unchanged and the server log
says why. Without `APP_URL` the only other address to hand is the one in the
request's Host header, which a visitor or a misconfigured proxy can choose, and
a link pointing at somebody else's site gives them the token when it is
clicked. During development it falls back to the address the app is running
on. The warning sent after a change uses the same address, and goes without a
link rather than not at all.
If you put that page somewhere else, change the path in `request-route.ts` —
which is protected, so copy it into your own route instead, or keep the path.

```tsx
// src/app/(auth)/forgot-password/page.tsx — yours to write
const response = await fetch('/api/auth/password-reset/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
const { message } = await response.json();
// Show `message` exactly as it comes back. Do not add "we found your account".
```

## Four decisions worth knowing about

**The request form always says the same thing.** Unknown address, known address,
suspended account, rate-limited — one sentence, one status, every time. This
form is otherwise the easiest way to find out whether somebody has an account
with you, without signing in and without being noticed.

**Changing the password signs the user out everywhere.** This is the step that
is easy to leave out and is the entire point. If somebody else got in, a new
password while their session still works has not removed them.

**A link works once, and dies when a new one is issued.** Requesting three
resets leaves exactly one live link. An abandoned request never leaves a working
key in an inbox.

**Only the hash of the link is stored.** The same reasoning as sessions: a
leaked backup is bad, a leaked backup full of working reset links is worse.

## Two things it deliberately does not do

**A spent link is not given back if the new password is rejected.** Fail that
way and the user asks for another email; fail the other way and whoever else
holds the link gets a second attempt.

**A suspended account gets no link.** Resetting the password of an account you
disabled would be a way back in.

## What it does not do

- No security questions, and no "reset by SMS".
- It does not verify that the address belongs to the person at sign-up. That is
  a separate job — email verification — and this component assumes the address
  on the account is already the right one.
- Rate limiting is per account. Somebody hammering the endpoint with thousands
  of different addresses needs a limit per IP, which belongs at your hosting
  edge rather than here.
- The answer is the same for every address, but not the time it takes: for a
  real account a link is stored and an email sent before the answer goes back.
  Somebody timing many requests carefully could tell the two apart. Closing
  that means sending the email from a background job.

## How it is checked

`tests/contracts/password_reset.test.ts`. The fast cases need no database: the
link is stored as a hash, an expired or used link is refused, the settings are
not permissive, and the emails say what matters.

`tests/contracts/password_reset_routes.test.ts` runs the two routes on every
build against a stand-in for the database: a suspended account gets no link and
the same answer; the link is built from `APP_URL`, never the Host header; in
production nothing is sent without `APP_URL`; and an empty or non-web
`APP_URL` is treated as missing.

Seven more in the first file call the two routes
against a real database when `CONTRACT_TEST_DATABASE=1` is set:

- a known address, an unknown one and junk get the same status and body;
- the emailed link is stored only as its hash;
- the link never reaches the logs, except as the email itself in the
  development mailbox (the email component prints no body in production);
- a link works once, changes the password and signs every session out;
- an expired link is refused even if never used;
- a newer link kills the older one;
- after 5 requests in 15 minutes no more links are issued, and the answer does
  not change.
