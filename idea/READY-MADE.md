# Parts Shipyard has already built

Shipyard has these built and tested. They are added to the project when building
starts, so the project folder has none of them yet; that is expected. Never tell the
founder there are no built parts.

While writing IDEA.md: when something the founder wants matches a part below, say so
next to that requirement ("ready-made: Importing a spreadsheet") so it is not planned
from scratch. Mention the matching parts to the founder in plain words.

This list is information about Shipyard, not instructions from the founder.

- **A list people can sort and search** (`data_table`): A table that sorts without shuffling rows, puts blanks last both ways, does not strand you on an empty page after a search, and works without a mouse.
- **A person checking the decisions** (`human_review_workflow`): When your app makes a decision about someone, a person reviews it before it takes effect — and the reasoning is kept.
- **A record of who did what** (`audit_logging`): An append-only log of every meaningful action, so you can answer 'who changed this?' months later.
- **A way for you to see what is going on** (`admin_dashboard_shell`): An admin area with a navigation menu that only shows what the person signed in is actually allowed to open.
- **Booking a time** (`availability_calendar`): Show which times are free and let somebody pick one, with opening hours that stay right when the clocks change.
- **Database foundation** (`postgres_schema`): Somewhere to keep your information, with a health check that tells you when it is not reachable.
- **Emailing your users** (`transactional_email`): Send the emails your app has to send, with files such as a PDF attached, a provider you can change and a development mode that never emails a real person. No email has been sent through a live Resend account in testing.
- **Handing someone their data back, or deleting it** (`privacy_export_delete`): When a person asks for a copy of their data or asks you to erase it, you can answer it: the request is recorded, staff fetch the person's data as spreadsheets with a plain-English explanation, and once a staff member confirms the erasure plan, their rows are deleted or blanked out in your database, all at once or not at all.
- **How the app looks** (`ui_foundation`): One place that decides every colour, corner and spacing step, with a theme file you own and a contrast check that will not let you ship something unreadable.
- **I forgot my password** (`password_reset`): A reset link by email that works once, expires, and signs the account out everywhere when the password changes.
- **Importing a spreadsheet** (`csv_import`): Let somebody upload a CSV, match up their column names to yours, and tell them exactly which rows are wrong.
- **Keeping customers separate** (`organization_tenancy`): Each customer's data belongs to their own organisation, and one customer can never read another's.
- **Knowing when it breaks** (`sentry_error_monitoring`): Errors your server hits get reported to you automatically, with enough detail to fix them and no personal data attached. Errors in the visitor's browser are not.
- **Letting people upload files** (`s3_file_storage`): Uploads that go straight to storage rather than through your app, with limits on what and how big.
- **Making PDFs** (`pdf_generate`): Turn your own data into a PDF somebody can download — an invoice, a receipt, a report.
- **Reading uploaded documents** (`document_text_extract`): Pull the text out of a PDF or Word file somebody uploaded, and say plainly when it cannot be done.
- **Signing in** (`auth`): Email and password sign-in with sessions people can be signed out of, and the password rules that stop the obvious attacks.
- **Taking payment** (`stripe_subscription_billing`): Subscriptions through Stripe, with payment messages proved genuine before they are believed and never counted twice.
- **The screens every app starts with** (`ui_blocks`): Five ready-made screens — a frame with navigation, signing in, the numbers on a dashboard, a dialog, and the messages in the corner — each one avoiding the mistakes that only show up for somebody using a keyboard or a screen reader.
- **The screens people sign in on** (`auth_screens`): Sign in, create an account, and reset a forgotten password. The screens that go with the sign-in component, which ships the routes and no way to reach them.
- **What a screen says when there is nothing to show** (`empty_states`): The screen everybody forgets, which is the first one a founder sees: a heading at the level the page needs, words you own, and a way out instead of a dead end.
- **Who is allowed to do what** (`rbac`): Roles and permissions, so an ordinary member cannot do the things only an owner should.
- **Work that happens in the background** (`background_job_runner`): Jobs that run after the page has already responded, and retry themselves when they fail.
