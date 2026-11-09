# Emailing your users

```ts
import { sendEmail } from '@/components/transactional_email/email';
import { welcomeEmail } from '@/components/transactional_email/templates';

const email = welcomeEmail({ name: user.name, appUrl: process.env.APP_URL! });
await sendEmail({ to: user.email, subject: email.subject, html: email.html });
```

## Nothing is sent until you say so

With no `EMAIL_API_KEY`, emails are printed to the server console. That is the
default rather than an option, because the accident it prevents — a test run or
a seed script emailing real customers — is the kind you cannot take back.

In production, with no key, only the address and subject are printed, not the
message. A published app's output goes to the hosting logs, and a password reset
link printed there is a working key to somebody's account (1.3.1).

Outside production there is a second catch: only addresses in `EMAIL_ALLOWLIST`
can be emailed at all, even with a working key. Set it to your own address, or
`@yourcompany.com` for the whole team.

## Sending a file, such as a PDF (1.4.0)

```ts
await sendEmail({
  to: client.email,
  subject: 'Your invoice',
  html: '<p>Your invoice is attached.</p>',
  attachments: [{ filename: 'invoice-1042.pdf', content: pdfBytes, contentType: 'application/pdf' }],
});
```

`content` is the file's bytes (a Node.js `Buffer` works). The same
`attachments` list works through the `sendEmail` seam in `src/seams/email.ts`.

It refuses, with a reason rather than silence: a file name with a line break
(that would land in the message's headers) or a folder in it, an empty file
(nearly always a document that failed to generate), and files adding up to more
than 10 MB, which many mailboxes refuse. For a bigger file, send a link.

In development the console prints each file's name and size, never its
contents.

This part sends a file you already have. Making the PDF is up to your code or
another part.

## Changing provider

`EMAIL_PROVIDER=resend` with a key. Adding another means writing one small
object in `providers.ts` — the rest of the app does not know or care which one
is in use.

## What it does not do

- One email at a time. This is not a newsletter tool.
- No opens, clicks or bounce handling. Those live in your provider's dashboard.
- **No email has been sent through a live Resend account in testing**, with or
  without a file attached. The provider is written against Resend's documented
  API, and the tests check what it would send against a stand-in for the
  network. Treat your first real send as the real test: send one to yourself,
  with a file if your app sends files.
