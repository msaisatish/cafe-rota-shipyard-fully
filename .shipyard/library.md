# What is already built

<!-- Written by Shipyard. Do not edit — it is regenerated whenever the
     project changes, and anything you add here will be lost. -->

These are tested components this project can install. **Check this list
before writing anything that sounds like a job many products need.**

Installing one is quicker and safer than building it. Each comes with tests
that run inside this project, and those tests are part of what proves the
app is safe to launch.

## How to use this

Follow AGENTS.md section 3 (R3.1 to R3.5): when one of these fits, ask the
owner through Shipyard before building it, and never quietly write a parallel
version. If nothing here covers it, build it. Not finding something is the
normal case.

## What every screen is built on

These usually go in before anything else. If one of them is installed, use
it — a second set of colours or a second table is how a project ends up
with two of everything and one of them maintained.

- **A list people can sort and search** — `data_table` **(already installed)**
  - A table that sorts without shuffling rows, puts blanks last both ways, does not strand you on an empty page after a search, and works without a mouse.
  - Use it when they ask to: show a list of records; let people sort a table; let people search a list; add paging to a long list

- **How the app looks** — `ui_foundation` **(already installed)**
  - One place that decides every colour, corner and spacing step, with a theme file you own and a contrast check that will not let you ship something unreadable.
  - Use it when they ask to: make it look consistent; pick colours for my app; set up a design system; make the app match my brand

- **The screens every app starts with** — `ui_blocks` **(already installed)**
  - Five ready-made screens — a frame with navigation, signing in, the numbers on a dashboard, a dialog, and the messages in the corner — each one avoiding the mistakes that only show up for somebody using a keyboard or a screen reader.
  - Use it when they ask to: a sidebar and a page frame; a sign in screen; a login page; the numbers at the top of a dashboard

- **What a screen says when there is nothing to show** — `empty_states`
  - The screen everybody forgets, which is the first one a founder sees: a heading at the level the page needs, words you own, and a way out instead of a dead end.
  - Use it when they ask to: what to show when there is no data; the screen before anyone has added anything; what to say when a search finds nothing; stop showing a blank page

## Things a product owes its users

A missing one of these can stop a launch.

- **A person checking the decisions** — `human_review_workflow`
  - When your app makes a decision about someone, a person reviews it before it takes effect — and the reasoning is kept.
  - Use it when they ask to: a person checks the decision before it takes effect; approve or reject before it is final; review queue for a human; someone signs off on automated decisions

- **A record of who did what** — `audit_logging`
  - An append-only log of every meaningful action, so you can answer 'who changed this?' months later.
  - Use it when they ask to: record who did what and when; a history of changes; see who deleted a record; activity log for compliance

- **A way for you to see what is going on** — `admin_dashboard_shell`
  - An admin area with a navigation menu that only shows what the person signed in is actually allowed to open.
  - Use it when they ask to: an admin area to see what is going on; back office for staff; internal dashboard; management screens

- **Database foundation** — `postgres_schema` **(already installed)**
  - Somewhere to keep your information, with a health check that tells you when it is not reachable.
  - Use it when they ask to: keep information so it is still there tomorrow; save data in a database; store records permanently; health check to see if the app is up

- **Emailing your users** — `transactional_email` **(already installed)**
  - Send the emails your app has to send, with files such as a PDF attached, a provider you can change and a development mode that never emails a real person. No email has been sent through a live Resend account in testing.
  - Use it when they ask to: send an email to the user; email a receipt or confirmation; welcome email when someone signs up; notify people by email

- **Handing someone their data back, or deleting it** — `privacy_export_delete`
  - When a person asks for a copy of their data or asks you to erase it, you can answer it: the request is recorded, staff fetch the person's data as spreadsheets with a plain-English explanation, and once a staff member confirms the erasure plan, their rows are deleted or blanked out in your database, all at once or not at all.
  - Use it when they ask to: let someone download all their data; delete a person's data when they ask; gdpr data request; right to be forgotten

- **Keeping customers separate** — `organization_tenancy`
  - Each customer's data belongs to their own organisation, and one customer can never read another's.
  - Use it when they ask to: each customer only sees their own data; separate one company from another; teams or workspaces; multi tenant

- **Knowing when it breaks** — `sentry_error_monitoring`
  - Errors your server hits get reported to you automatically, with enough detail to fix them and no personal data attached. Errors in the visitor's browser are not.
  - Use it when they ask to: find out when the app breaks; get alerted about errors; track crashes in production
  - Not fully proven: Not verified against a live Sentry account here. The scrubbing and the automatic reporting are tested against a stand-in for Sentry's library; the delivery is not. That is what the test event is for.

- **Letting people upload files** — `s3_file_storage`
  - Uploads that go straight to storage rather than through your app, with limits on what and how big.
  - Use it when they ask to: let people upload files; store uploaded documents and images; attach a file to a record; download a file again later
  - Not fully proven: Not run against a live bucket here. The key handling and the limits are tested; the round trip is not.

- **Signing in** — `auth` **(already installed)**
  - Email and password sign-in with sessions people can be signed out of, and the password rules that stop the obvious attacks.
  - Use it when they ask to: let people sign in with an email and password; create an account; log in and log out; register new users

- **Taking payment** — `stripe_subscription_billing`
  - Subscriptions through Stripe, with payment messages proved genuine before they are believed and never counted twice.
  - Use it when they ask to: take payment from customers; charge a monthly subscription; accept card payments; customers pay their invoices online
  - Not fully proven: Not run against a live Stripe account here; the money has never moved. The signature check runs Stripe's own library in the tests, and the protection against counting a payment twice, retries after a failure, refunds, disputes and out-of-order messages are tested against a stand-in for the database, not a real one.

- **The screens people sign in on** — `auth_screens` **(already installed)**
  - Sign in, create an account, and reset a forgotten password. The screens that go with the sign-in component, which ships the routes and no way to reach them.
  - Use it when they ask to: a sign in screen; a login page; let people create an account; a forgot password screen

- **Who is allowed to do what** — `rbac`
  - Roles and permissions, so an ordinary member cannot do the things only an owner should.
  - Use it when they ask to: only admins can do certain things; different permissions for different people; control who is allowed to delete; roles like owner admin and member

- **Work that happens in the background** — `background_job_runner`
  - Jobs that run after the page has already responded, and retry themselves when they fail.
  - Use it when they ask to: do slow work in the background; run a job after the page responds; retry something that failed; queue of tasks

## Jobs of work

A missing one of these just means somebody writes it by hand, worse.

- **Booking a time** — `availability_calendar`
  - Show which times are free and let somebody pick one, with opening hours that stay right when the clocks change.
  - Use it when they ask to: show which slots are free and let somebody book one; let customers book an appointment; pick a time slot from available times; show our availability for bookings

- **I forgot my password** — `password_reset` **(already installed)**
  - A reset link by email that works once, expires, and signs the account out everywhere when the password changes.
  - Use it when they ask to: I forgot my password; let people reset their password; send a password reset link by email; recover an account when the password is lost

- **Importing a spreadsheet** — `csv_import`
  - Let somebody upload a CSV, match up their column names to yours, and tell them exactly which rows are wrong.
  - Use it when they ask to: let people upload a spreadsheet of data; bulk import records from a csv file; import a list of customers or products; upload a csv and check it for mistakes

- **Making PDFs** — `pdf_generate`
  - Turn your own data into a PDF somebody can download — an invoice, a receipt, a report.
  - Use it when they ask to: generate a pdf invoice; let people download a receipt as a pdf; produce a report as a pdf; create a printable document from data

- **Reading uploaded documents** — `document_text_extract`
  - Pull the text out of a PDF or Word file somebody uploaded, and say plainly when it cannot be done.
  - Use it when they ask to: read the text out of an uploaded PDF; pull text from a Word document somebody uploaded; let candidates upload their CV and read it; extract text from an uploaded file

## Already in this project

Their files are listed in `.shipyard/protected.json` and in AGENTS.md
section 11. Do not edit inside them (R3.5, R4.2).
