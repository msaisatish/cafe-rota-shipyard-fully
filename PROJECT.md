# project

<!-- Written by Shipyard from the answers you gave when you started this project.
     Your AI reads this before it does anything. Edit it whenever your plans change. -->

## What we are building

A café with eight part-time staff plans shifts in a group chat. Nobody is sure who is on when, swaps get agreed in private messages, and the manager finds out when somebody does not turn up.

Built for one small café: the manager plans the week in a few minutes, staff see only their own shifts on their phone, and a swap is asked for and approved in the app, so the manager always knows who is really working.

## Ready-made parts that may fit

These tested parts in the Shipyard library may match what has been asked for.
They are not installed. Before building one of these things yourself, check that
IDEA.md really asks for it; if it does, do not write it from scratch — tell the
owner the part exists (AGENTS.md R3.3) and carry on with the rest. Never suggest a
part for something IDEA.md leaves out.

- **The screens every app starts with** — Five ready-made screens — a frame with navigation, signing in, the numbers on a dashboard, a dialog, and the messages in the corner — each one avoiding the mistakes that only show up for somebody using a keyboard or a screen reader.
- **The screens people sign in on** — Sign in, create an account, and reset a forgotten password. The screens that go with the sign-in component, which ships the routes and no way to reach them.
- **Emailing your users** — Send the emails your app has to send, with files such as a PDF attached, a provider you can change and a development mode that never emails a real person. No email has been sent through a live Resend account in testing.
- **Knowing when it breaks** — Errors your server hits get reported to you automatically, with enough detail to fix them and no personal data attached. Errors in the visitor's browser are not.
- **Keeping customers separate** — Each customer's data belongs to their own organisation, and one customer can never read another's.
- **Signing in** — Email and password sign-in with sessions people can be signed out of, and the password rules that stop the obvious attacks.

If one of them is genuinely wrong for what is being asked, say which and why
rather than quietly building your own.

## Ready-made parts and experts

Shipyard has a library of ready-made parts (sign-in, roles, payments, email, file uploads and
more), each already built and tested, with its tests and security checks on its page. Browse
them on the **Ready-made parts** screen or at https://library-site-production-29e0.up.railway.app/library/.
When one fits, Shipyard asks you first and shows the hours it saves and what it costs; it is
added only if you say yes. Experts (the rules for a role) and specialists (helpers with one job)
are free. Your AI assistant follows the rules for both in AGENTS.md section 3.

## The requirements

The requirements are in IDEA.md, in your own words, as you confirmed them. They are
not copied here, so there is one copy to keep up to date and your AI reads it once.

## How far we are taking it: a working prototype

The main thing your product does, actually working. Not something strangers should sign into.

**This includes:**

- Every screen, working, with real navigation between them
- Real information you can add, change and delete, that is still there tomorrow
- Runs on your computer, and can go behind a private link when you want to show someone

**This deliberately does not include:**

- Proper accounts and passwords — signing in is pretended
- Taking payments
- Standing up to anyone deliberately trying to break it
- Backups. If the information goes, it is gone.

## How we are working

Something the owner can look at comes first, every time. Build the screen with made-up 
information, get it running, and let them see it. Only once they have reacted to it do you 
wire up what sits behind it. A screen they can click through is worth more to them than a 
correct database they cannot see.

The app must start and be worth looking at at the end of every working session. If a screen 
needs something from the back end that does not exist yet, fake it and carry on rather than 
leaving the app unable to run.

One feature at a time, finished front to back before the next one starts. The app should be runnable and not visibly broken at the end of every working session.

## The plan

### Phase 1: The first real feature

One thing, finished properly: the screen first so you can see it, then everything behind it. It tells us the shape of the rest.

_Depends on how big that one feature is_

### Phase 2: The rest of the features

Each one finished before the next one starts, so the app is never half-broken.

_Depends on how many features there are_

### Phase 3: Show it to someone

A private link you can send. The information is real, and so is sign-in if your app has it, but nothing is backed up, so do not put anything in it you cannot lose.

_Shipyard puts it online for you_

## What runs this

| Piece | Why | Status |
| --- | --- | --- |
| Node | Runs your app. | Shipyard provides it |
| PostgreSQL | Remembers everything your app stores. | Shipyard provides it |
| Live updates | People see each other’s changes without refreshing. | Installed automatically |

## Working agreement

- The person you are building this for is not a programmer. Explain in ordinary words.
- Always leave the app in a state where it runs. They check it by looking at it.
- Finish a phase before starting the next one, and say when a phase is done.
- If a decision needs their input, ask a question about their business, not about technology.

