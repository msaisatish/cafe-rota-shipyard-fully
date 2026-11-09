# The screens people sign in on

Four screens: sign in, create an account, ask for a password reset, and choose
a new password from the emailed link.

## Why this exists

A pilot build installed `auth` and found it ships four API routes and **not one
screen**. `POST /api/auth/login` worked perfectly and there was no way for a
person to reach it. "Install sign-in and you have sign-in" was not true, and
nobody had noticed because the component's own tests test the routes, which
pass.

So this is the other half. It talks to those routes and adds the two things that
are about your app rather than about forms in general.

## What is protected, and why

Two files, and both are security rules that look like wording choices. That is
exactly why they are not in the file you edit freely.

### `redirect.ts` - where somebody lands afterwards

A sign-in page carries `?next=` so that somebody sent to sign in ends up back
where they were going. The obvious implementation is one line:

```ts
router.push(searchParams.get('next') ?? '/');   // do not do this
```

That is an **open redirect**, and it is what makes phishing work against
careful people. The attacker sends
`https://your-app.com/sign-in?next=https://your-app.evil.com/`. The link is
genuinely your domain. The certificate is genuinely yours. The sign-in page is
genuinely yours. The moment the password is accepted, the browser is handed to
a copy of your app that asks for it again, and nothing in the address bar looked
wrong until it was too late.

`safeNext()` allows a path inside your app and nothing else. It refuses
protocol-relative URLs (`//evil.com`), the backslash variant that some browsers
normalise (`/\evil.com`), percent-encoded versions of both, control characters,
and encoding it cannot read. There is no setting for allowing other hosts,
because every product that added one regretted it.

It also refuses to send anybody back to a sign-in screen, which is a loop with
no button that gets you out of it.

### `messages.ts` - what a refusal may say

The sign-in route takes real care not to reveal whether an address is
registered: an unknown address and a wrong password produce the same sentence,
and it verifies against a dummy hash so the two take the same time.

All of that is worth nothing if the screen in front of it is more helpful. So
the mapping from a status to a sentence lives here, protected, rather than
inline in the page where somebody will later make it friendlier.

**The screen never says more than the server did.** It may translate a status
into a sentence; it may not infer.

## What is yours

`copy.ts` is every word on the three screens. `auth-screens.css` is how they
look. Both are never overwritten by an upgrade.

The screens are deliberately plain. They use your theme's colours and nothing
else, so they will look unbranded until you change them, and that is a better
starting point than something you have to undo.

## One trade you are making, stated plainly

**Registering still reveals whether an address is already in use.** The register
route answers `409 That email address is already registered.` and this screen
passes it through.

That is the opposite of what sign-in does, and it is a genuine trade rather than
an oversight: a registration form that will not tell you your address is taken
is a registration form people fail at repeatedly. Most products make the same
choice. It is worth knowing you are making it, because it means an attacker with
a list of addresses can still sort them into customers and strangers using the
registration form, just not the sign-in one.

If that matters for your product, the fix is on the route, not on this screen.

## Password reset comes with it

The sign-in screen links to "I have forgotten my password", so the reset has to
work wherever the screens are installed. Since 1.2.0 they require
`password_reset`, which brings the two routes the reset pages post to (and
`transactional_email`, which sends the link). Before that, a project could have
these screens without the routes: `/forgot-password` said a link was on its way
and nothing was ever sent (pilot 02, 2026-10-15).

While testing, nothing is emailed unless your own address is in
`EMAIL_ALLOWLIST`; with no email account set up the message, link included, is
printed in the app's terminal output instead.

Updating an older install to 1.2.0 is refused until `password_reset` is added,
and says so.

## What it will not do

- Email and password only. No Google sign-in, no magic links, no two-factor.
