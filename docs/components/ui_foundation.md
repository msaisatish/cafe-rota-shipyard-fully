# How the app looks

Nothing to wire up in a project made from the current starter. Its root layout
already renders `<ThemeStyles />` through the theme seam (`@/seams/theme`), and
installing this fills that seam, so the colours, corners and spacing reach every
page straight away.

A project made before the theme seam existed has no such line: check that
`src/app/layout.tsx` renders `<ThemeStyles />` (imported from `@/seams/theme`)
inside `<head>`, and add it if not. Without it the theme never reaches the page.

Then change `src/theme.ts`. That file is yours and nothing will overwrite it.

```ts
export const theme: ThemeOverrides = {
  light: { accent: '#7a3cc0', accentFg: '#ffffff' },
  dark: { accent: '#c9a6f0', accentFg: '#1a1024' },
};
```

Anything you leave out keeps the default, so one line is a perfectly good theme.

## One source of truth, and it is not the stylesheet

`tokens.ts` decides every colour, corner and spacing step. The CSS is generated
from it at render time rather than kept in a `.css` file beside it, because a
stylesheet somebody maintains alongside the tokens starts out matching them and
stops matching them the first time anyone is in a hurry.

The custom property names are the ones the starter template already published —
`--bg`, `--fg`, `--muted`, `--line` — so installing this does not break code
that was already using them. It adds to that list rather than starting a second
one.

## A theme that cannot be read does not load

If you pick a text colour that disappears into its background, that one colour
goes back to the default and `themeProblems()` says which pair was the problem,
in words. Your brand colour survives; only the thing you got wrong is lost.

This is not advice. It runs every time the stylesheet is generated, and the
contract test checks **the merged palette** — the defaults with your theme on
top — rather than only the defaults. Checking a design system against the one
configuration nobody ships is not checking it.

## Three building blocks

**`<Button>`** is always `type="button"`, because the HTML default is `submit`
and a button inside a form that forgets it reloads the page — which arrives as
"the app lost my work". While it is busy it stays focusable and says
`aria-busy`, rather than going disabled and silent.

An icon-only button **must** be given a label. It throws otherwise. A wrong
label is worse than a missing one, because nothing reports it.

**`<Status>`** is a word, a shape and a colour, in that order. A red chip and a
green chip are the same chip to somebody who cannot tell them apart, so the
colour is the third signal and never the only one. It refuses to render without
a word.

**`<VisuallyHidden>`** is for text a screen reader needs and the screen does
not. It uses the clip-rect approach rather than `display: none`, which hides it
from everybody including the people it is for — a mistake that is invisible to
whoever makes it.

## What it does not do

It is colours, spacing and three primitives. It is not a set of finished
screens, and it does not change how anything behaves.
