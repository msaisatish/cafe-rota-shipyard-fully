# Progress

## Decisions
- Sign-in is real (auth component), despite PROJECT.md's "pretended" line; the founder's build message says real sign-in.
- One café only: no organisation scoping (organization_tenancy not installed, "more than one café" is out). `scoped()` is a stub; do not call it.
- Roles: rbac is not installed. Manager vs staff is stored on our own café-member record (role "manager" | "staff"), checked on the server in every route. Flagged to the founder that the rbac part fits and can replace it later.
- The first account ever created becomes the manager. Anyone else who registers on their own and is not on the staff list sees "Ask your manager to add you".
- Staff added by the manager get a starting password; on first sign-in they must choose their own before seeing anything else.
- Removing a staff member disables their account (keeps history); it does not delete shifts already worked.
- A published week can still be changed by the manager (Add/Remove stay; staff see changes at once). Staff cannot cancel a swap request.
- Auth has no "create user" or "set password" function, and its register route signs the caller in as the new user (would sign the manager out). So our members queries write the auth `User` row directly via `@/lib/prisma`, using only auth's exports `hashPassword`, `checkPassword`, `normaliseEmail` (password.ts) and `revokeAllSessions`, `createSession` (session.ts). Removing = `User.disabledAt` + `revokeAllSessions` (auth's session check already refuses disabled users). Do not copy auth code.
- Password rule: use auth's `checkPassword` (12+ characters, not common) everywhere and show its `issues[0]`. DESIGN.md's "Use at least 8 characters." is wrong for this app; show the component's sentence instead.
- "Manager" bootstrap: when no manager exists, the user with the earliest `User.createdAt` becomes manager on their first visit. `CafeMember.bootstrapKey` (unique, "first-manager") makes this race-safe.
- Adding an email that already has an account but no member record links that account (their own password stays, no forced change). Adding a removed person reactivates them with a new starting password.
- Removing someone: their waiting swap requests (as asker or colleague) become "turned down"; their future shifts stay and show "{name} (left)" on Plan the week so the manager can remove them.
- Only role "staff" members are put on shifts and offered as swap colleagues; the manager is not scheduled.
- Shifts start and end on the same day (no overnight). Times stored UTC; café time zone from `CAFE_TIME_ZONE` (default Europe/London). Weeks run Monday to Sunday, identified by the Monday's local date "YYYY-MM-DD". No new date library: Intl only.
- Approving a swap re-checks atomically that the shift still belongs to the asker and the colleague is still active; otherwise 409 "That shift has changed since the request, so nothing changed." and the request stays waiting for Turn down.
- Removing a shift deletes its swap requests with it.

## Done
- [phase-1a] Members foundation: CafeMember model + init migration (all tables), src/lib/members/{schema,queries,service,access}.ts, 24 tests. Exports: getCafeAccess(), requireMember({role?,allowPasswordChange?}); service addStaffMember, removeMember, chooseOwnPassword, ensureFirstManager. Manager cannot remove themselves.
- [phase-1b] Gates + frame: / routes by access (src/lib/members/home.ts; manager -> /staff until /week exists), (gate)/choose-password, (gate)/not-on-staff, (app)/layout.tsx with RotaFrame (src/lib/ui) + SignOutButton. Manager pages start with `await memberForPage('manager')` from @/lib/members/page-gate. Placeholders for /week /staff /swaps /my-shifts. Swaps step adds the waiting count to the nav in (app)/layout.tsx.
- [phase-1c] Staff screen: list (removed people shown last as Removed), add/remove dialogs, /api/staff (GET, POST), /api/staff/[memberId] (DELETE). src/lib/staff/{queries,service,rows}.ts. 10 tests.
- [phase-2a] Plan the week: RotaWeek+Shift models + migration 20261109010000, src/lib/cafe-time/time.ts, src/lib/rota/{schema,queries,service,plan}.ts, /week screen, /api/week, /api/week/publish, /api/shifts, /api/shifts/[shiftId]. Manager home is /week. tests/rota/fake-rota-db.ts is an in-memory stand-in to extend. CAFE_TIME_ZONE in .env.example.
- [phase-2b] My shifts: upcomingPublishedShiftsFor(memberId, now?) in rota service -> MyShift[]; src/lib/rota/my-shifts.ts; screen in (app)/my-shifts with NextShiftCard({shift,action?}), ShiftCard({shift,action?}), ShiftWeek({week,actionFor?}), MyShiftsScreen({view}).
- [phase-2c] Swaps: SwapRequest model + migration 20261109020000, src/lib/swaps/*, /api/swaps, /api/swaps/[swapId], /swaps screen, Ask to swap + My swap requests on My shifts, nav count. Removing a member turns down their waiting swaps. Lists capped (all waiting + latest 50 decided).

## Next
- [phase-1] Members: models below (CafeMember only), `src/lib/members/{schema,queries,service,access}.ts`, bootstrap of the first manager, tests in `tests/members/` (bootstrap, link/reactivate, remove disables + revokes sessions, staff refused on manager routes, mustChangePassword blocks every route but its own).
- [phase-1] Gate screens + home: `src/app/page.tsx` routes by access (signed out -> /sign-in, not on staff -> /not-on-staff, must change -> /choose-password, manager -> /staff for now, staff -> /my-shifts); `src/app/(gate)/choose-password/page.tsx` + `src/app/api/my-password/route.ts`; `src/app/(gate)/not-on-staff/page.tsx`; `src/app/(app)/layout.tsx` (gate + ui_blocks AppShell, links by role, Sign out via `src/lib/ui/SignOutButton.tsx` calling POST /api/auth/logout).
- [phase-1] Staff screen: `src/app/(app)/staff/page.tsx` + `_components/` (StaffTable on data_table DataTable, AddStaffDialog, RemoveStaffDialog on ui_blocks Dialog), `src/app/api/staff/route.ts` (GET, POST add), `src/app/api/staff/[memberId]/route.ts` (DELETE = remove). DESIGN.md section 3.
- [phase-2] Plan the week: Week + Shift models, `src/lib/cafe-time/time.ts` (+ tests incl. clock-change weeks), `src/lib/rota/{schema,queries,service}.ts`, `src/app/(app)/week/page.tsx?week=YYYY-MM-DD` + `_components/`, `src/app/api/week/route.ts` (GET), `src/app/api/week/publish/route.ts` (POST), `src/app/api/shifts/route.ts` (POST), `src/app/api/shifts/[shiftId]/route.ts` (DELETE). Manager home becomes /week. DESIGN.md section 2. Tests: manager only, end after start, staff must be active "staff".
- [phase-2] My shifts: `src/app/(app)/my-shifts/page.tsx` + `_components/` (NextShiftCard, ShiftCard, week headings), reading via `src/lib/rota/service.ts` `upcomingPublishedShiftsFor(memberId)`. No swap button yet. DESIGN.md section 4. Tests: only own, only published, no past.
- [phase-2] Swap requests: SwapRequest model, `src/lib/swaps/{schema,queries,service}.ts`, `src/app/api/swaps/route.ts` (GET manager list, POST staff ask), `src/app/api/swaps/[swapId]/route.ts` (POST {decision}), `src/app/(app)/swaps/page.tsx` + `_components/`, AskSwapDialog + "My swap requests" on My shifts, waiting count in the nav link. DESIGN.md sections 4-5. Tests: own upcoming published shift only, one waiting request per shift, approve re-check, no double decision, staff cannot decide.
- [phase-3] Show it: every role lands right after sign-in and register (register page already sends people to /sign-in), sign-in heading "Sign in to Café rota" and app words in `src/components/auth_screens/copy.ts` / `src/components/ui_blocks/copy.ts`, starter text gone from `/`, empty/loading/broken states checked against DESIGN.md, `.env.example` has `CAFE_TIME_ZONE` and `APP_URL`, one browser check per flow (`npm run test:e2e`).

### Data model (paste below "// Your own models go here." in prisma/schema.prisma)
Phase 1 adds CafeMember only; phase 2 steps add the rest. `userId` is auth's User.id: plain id, no relation.
```prisma
model CafeMember {
  id                 String    @id @default(cuid())
  userId             String    @unique
  name               String
  role               String    // "manager" | "staff"
  mustChangePassword Boolean   @default(false)
  removedAt          DateTime?
  bootstrapKey       String?   @unique // "first-manager" on the first manager only
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  @@index([role, removedAt])
  @@map("cafe_members")
}
model RotaWeek {
  id          String    @id @default(cuid())
  weekStart   String    @unique // café-local Monday, "YYYY-MM-DD"
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  shifts      Shift[]
  @@map("rota_weeks")
}
model Shift {
  id        String        @id @default(cuid())
  weekId    String
  week      RotaWeek      @relation(fields: [weekId], references: [id], onDelete: Cascade)
  memberId  String        // CafeMember.id
  startsAt  DateTime      // UTC
  endsAt    DateTime      // UTC
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  swaps     SwapRequest[]
  @@index([weekId, startsAt])
  @@index([memberId, startsAt])
  @@map("shifts")
}
model SwapRequest {
  id           String    @id @default(cuid())
  shiftId      String
  shift        Shift     @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  fromMemberId String    // CafeMember.id of the asker
  toMemberId   String    // CafeMember.id of the colleague
  status       String    @default("waiting") // "waiting" | "approved" | "turned_down"
  decidedAt    DateTime?
  createdAt    DateTime  @default(now())
  @@index([status, createdAt])
  @@index([fromMemberId, createdAt])
  @@index([shiftId, status])
  @@map("swap_requests")
}
```

### Shared helpers (build once, phase 1 and 2; everyone else imports them)
- `src/lib/members/access.ts`: `getCafeAccess()` for pages -> `{ kind: 'signed-out' } | { kind: 'not-on-staff', email } | { kind: 'must-change-password', member } | { kind: 'member', member }` (runs the manager bootstrap; uses `getCurrentUser` from `@/seams/auth`). `requireMember({ role?, allowPasswordChange? })` for routes -> `{ ok: true, member } | { ok: false, response }` (401 via `requireUser` from `@/components/auth/current-user`; 403 for no member, removed, wrong role, or mustChangePassword). Never `scoped()` or `requireRole()`.
- `src/lib/cafe-time/time.ts`: `cafeTimeZone()`, `weekStartOf(instant)`, `daysOfWeek(weekStart)`, `localToUtc(date, "HH:MM")`, `formatDay`, `formatTime`, `formatWeekLabel` ("Week of Monday 11 Nov"). Intl only, tested around clock changes.
- Validation: each `schema.ts` uses `validate` / `validateBody` / `field` from `@/seams/validate`, same schema in the dialog and the route.
- Database: `prisma` from `@/lib/prisma` in `queries.ts` files only. Lists are short (one café) but still sorted in the query; no skip/take.
- UI: AppShell, Dialog, Toasts from ui_blocks; Button, Status from ui_foundation; DataTable from data_table; CSS variables only. `src/lib/ui/SignOutButton.tsx` is the one sign-out button.

- [phase-3 polish] Sign-in/register get our own layouts (`src/app/sign-in/layout.tsx`, `src/app/register/layout.tsx`, via `src/lib/members/signed-in-gate.ts`): a signed-in visitor goes to their home, so registering (which signs you in, then opens /sign-in) lands on the right screen. Words in auth_screens/ui_blocks `copy.ts` ("Sign in to Café rota", 12-character + mix hint). Page title "Café rota"; not-found restyled as a card; app-wide `src/app/error.tsx` catches failures in the frame/gate. Duplicate staff email now says "That email is already on your staff list." (DESIGN wording).
