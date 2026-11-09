# A list people can sort and search

```tsx
import { DataTable } from '@/components/data_table/DataTable';

<DataTable
  caption="Everyone on your team"
  rows={people}
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'team', label: 'Team' },
    { key: 'lastSeen', label: 'Last seen' },
  ]}
/>
```

The caption is not optional decoration — a screen reader reads it before the
contents, and "table" on its own tells somebody nothing.

## Why this exists

Sorting a list is not hard. It is wrong in the same four ways every time, and
all four look like the data misbehaving rather than the table misbehaving, so
they get reported as "it lost my records".

**Sorting is not stable.** Two rows with the same value swap places whenever you
sort by something else and back.

**Blanks sort as empty strings.** They go first ascending and last descending,
so sorting by "last seen" newest-first fills the top of the screen with people
nobody has ever seen.

**Paging does not clamp.** You are on page 5, you type in the search box, there
are now two pages, and the table is empty with the controls still saying
"page 5".

**Sorting is mouse-only.** The header responds to a click and not to Enter, and
nothing announces what changed.

All four are fixed in `table.ts`, which is protected and has a test for each.

## What you can change, and what you should not

`presentation.tsx` is yours: the wording, the classes, how a value is shown.
Nothing will overwrite it.

`table.ts` is not. If it needs to behave differently, say so rather than editing
it — that file is replaced on upgrade and your change would go with it.

## What it does not do

It sorts and pages in the browser, so it is for hundreds of rows rather than
hundreds of thousands; a longer list needs the database to do the work. There is
no column resizing, no reordering, no saved views, no row selection.
