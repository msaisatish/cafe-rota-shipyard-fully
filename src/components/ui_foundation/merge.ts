/**
 * Putting the founder's theme on top of the defaults — and refusing one that
 * cannot be read.
 *
 * Two things happen here and the second one is the point.
 *
 * **The merge** is shallow per palette: a theme that sets one colour changes
 * one colour, and everything it does not mention keeps working. A theme is not
 * obliged to be complete, because nobody writing one knows the full list.
 *
 * **The refusal.** A theme that makes text unreadable does not load. Not a
 * warning in a console nobody opens — the pairs that fail keep their default
 * values and the problems are reported, so the app stays usable and somebody
 * can be told exactly which two colours are too close. A design system that
 * lets you ship an unreadable screen is decoration.
 */
import { contrastRatio, describeProblem, type ContrastProblem, type ContrastUse } from './contrast';
import { defaultTokens, type Palette, type Tokens } from './tokens';

export type ThemeOverrides = {
  light?: Partial<Palette>;
  dark?: Partial<Palette>;
} & Partial<Omit<Tokens, 'light' | 'dark'>>;

/**
 * The pairs that have to be readable, and what each is for.
 *
 * Declared rather than discovered. A check that iterates over "every colour
 * against every other colour" reports pairs that never appear together, and a
 * report full of irrelevant failures is one nobody reads.
 */
export const REQUIRED_PAIRS: readonly {
  name: string;
  fg: keyof Palette;
  bg: keyof Palette;
  use: ContrastUse;
}[] = [
  { name: 'body text on the page', fg: 'fg', bg: 'bg', use: 'text' },
  { name: 'body text on a panel', fg: 'fg', bg: 'surface', use: 'text' },
  // The one people get wrong. Grey-on-white at the shade that looks tasteful is
  // usually about 3:1.
  { name: 'secondary text on the page', fg: 'muted', bg: 'bg', use: 'text' },
  { name: 'secondary text on a panel', fg: 'muted', bg: 'surface', use: 'text' },
  { name: 'text on the main button', fg: 'accentFg', bg: 'accent', use: 'text' },
  { name: 'the success message', fg: 'okFg', bg: 'ok', use: 'text' },
  { name: 'the warning message', fg: 'warnFg', bg: 'warn', use: 'text' },
  { name: 'the error message', fg: 'dangerFg', bg: 'danger', use: 'text' },
  // Carries meaning with no words attached, so it is held to the non-text bar:
  // somebody who cannot see where the focus is cannot use the keyboard at all.
  { name: 'the focus ring against the page', fg: 'focus', bg: 'bg', use: 'non-text' },
];

/**
 * `line` is deliberately not in that list.
 *
 * A hairline between two panels carries no information — remove it and the
 * screen still says everything it said before. Holding it to 3:1 would mean a
 * palette of heavy grey rules that nobody would ship, and the check would fail
 * on the default palette and on every reasonable theme, which is how a check
 * gets switched off. A bar above the ceiling fails every honest attempt.
 *
 * Anything that does carry information — the focus ring, the edge of a control
 * you have to find — is in the list and is held to the bar.
 */

/** Every pair in this palette that is too close together to read. */
export function contrastProblems(palette: Palette): ContrastProblem[] {
  const problems: ContrastProblem[] = [];
  for (const pair of REQUIRED_PAIRS) {
    const problem = describeProblem(pair.name, palette[pair.fg], palette[pair.bg], pair.use);
    if (problem) problems.push(problem);
  }
  return problems;
}

/** Straight merge, no checking. Exported because the check needs to see it. */
export function mergeTokens(base: Tokens, overrides: ThemeOverrides = {}): Tokens {
  const { light, dark, ...scalars } = overrides;
  return {
    ...base,
    ...stripUndefined(scalars),
    light: { ...base.light, ...stripUndefined(light ?? {}) },
    dark: { ...base.dark, ...stripUndefined(dark ?? {}) },
  };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== ''),
  ) as Partial<T>;
}

export interface SafeTokens {
  tokens: Tokens;
  /** Everything wrong with the theme, in the words of whoever wrote it. */
  problems: { mode: 'light' | 'dark'; problem: ContrastProblem }[];
  /** Colours that were put back to the default because the override failed. */
  reverted: { mode: 'light' | 'dark'; key: keyof Palette }[];
}

/**
 * Merge a theme, and put back anything that made the app unreadable.
 *
 * The order matters, and it is chosen to keep the founder's **background**
 * colours wherever possible. A background is almost always the brand — the
 * colour they picked on purpose and would recognise — and a foreground is
 * almost always a consequence of it. So three attempts, cheapest loss first:
 *
 * 1. Put the default foreground back. Usually enough.
 * 2. Failing that, use plain white or plain black against their background,
 *    whichever reads better. Their brand colour survives and the text on it
 *    stops being a guess.
 * 3. Only if neither works is the background itself put back, because at that
 *    point the background is the thing that cannot be read against anything.
 *
 * Something readable always wins. There is no combination a theme can contain
 * that renders an unreadable screen.
 */
export function safeTokens(overrides: ThemeOverrides = {}, base: Tokens = defaultTokens): SafeTokens {
  const merged = mergeTokens(base, overrides);
  const problems: SafeTokens['problems'] = [];
  const reverted: SafeTokens['reverted'] = [];

  for (const mode of ['light', 'dark'] as const) {
    const palette = { ...merged[mode] };

    for (const pair of REQUIRED_PAIRS) {
      const problem = describeProblem(pair.name, palette[pair.fg], palette[pair.bg], pair.use);
      if (!problem) continue;
      problems.push({ mode, problem });

      const background = palette[pair.bg];
      const candidates = [base[mode][pair.fg], '#ffffff', '#000000'];
      const rescued = candidates.find(
        (candidate) => contrastRatio(candidate, background) >= problem.needs,
      );

      if (rescued) {
        palette[pair.fg] = rescued;
        reverted.push({ mode, key: pair.fg });
        continue;
      }

      // Nothing reads against their background, so the background is the
      // problem and it goes back too.
      palette[pair.fg] = base[mode][pair.fg];
      palette[pair.bg] = base[mode][pair.bg];
      reverted.push({ mode, key: pair.fg }, { mode, key: pair.bg });
    }

    // One colour can appear in two pairs — `fg` sits on both the page and a
    // panel — so a theme can be internally contradictory: a dark page and a
    // light panel have no single text colour that works on both. Fixing one
    // pair then breaks the other, and chasing that in a loop does not converge.
    //
    // At that point the theme is not repairable, so the whole mode goes back to
    // the defaults. Losing a theme is a disappointment; shipping a screen
    // nobody can read is not a trade worth making.
    if (contrastProblems(palette).length > 0) {
      for (const key of Object.keys(palette) as (keyof Palette)[]) {
        if (palette[key] !== base[mode][key]) reverted.push({ mode, key });
      }
      merged[mode] = { ...base[mode] };
      continue;
    }

    merged[mode] = palette;
  }

  return { tokens: merged, problems, reverted };
}

/**
 * The stylesheet, generated from the tokens.
 *
 * Generated rather than hand-written, which is the whole reason `tokens.ts` is
 * the source of truth: a stylesheet somebody maintains beside the tokens is a
 * second source of truth that starts out identical and does not stay that way.
 *
 * Dark mode follows the operating system. A project that adds a manual switch
 * sets `data-theme` on `<html>` and the second block picks it up.
 */
export function cssFor(tokens: Tokens): string {
  const vars = (palette: Palette): string =>
    Object.entries(palette)
      .map(([key, value]) => `  --${kebab(key)}: ${value};`)
      .join('\n');

  return [
    ':root {',
    '  color-scheme: light dark;',
    vars(tokens.light),
    `  --radius: ${tokens.radius};`,
    `  --space: ${tokens.space};`,
    `  --font-family: ${tokens.fontFamily};`,
    `  --font-size: ${tokens.fontSize};`,
    `  --line-height: ${tokens.lineHeight};`,
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    vars(tokens.dark).replace(/^/gm, '  '),
    '  }',
    '}',
    '',
    ':root[data-theme="dark"] {',
    vars(tokens.dark),
    '}',
    '',
    // Asked for by the viewer, not decided by us. A founder who has turned
    // animation down has usually done it for a reason that matters to them.
    '@media (prefers-reduced-motion: reduce) {',
    '  *, *::before, *::after {',
    '    animation-duration: 0.01ms !important;',
    '    animation-iteration-count: 1 !important;',
    '    transition-duration: 0.01ms !important;',
    '    scroll-behavior: auto !important;',
    '  }',
    '}',
    '',
    PRIMITIVES,
  ].join('\n');
}

/**
 * The classes `primitives.ts` hands out.
 *
 * These belong here rather than in a `.css` file for the same reason the tokens
 * do: they are generated from the tokens, so they cannot drift from them.
 *
 * They were missing entirely until now, which was not a cosmetic gap.
 * `buttonProps()` returns `className: 'ui-button ui-button-primary'` and
 * `statusParts()` returns `ui-status ui-status-ok`, and nothing anywhere
 * defined either, so every project got unstyled buttons. Worse,
 * `data_table` marks its live region `ui-visually-hidden`: with no rule for
 * that class the region was not hidden at all, and every table in every project
 * printed "Sorted by Name, A to Z. 23 rows." on the page as visible text.
 */
const PRIMITIVES = `.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space) * 2);
  padding: calc(var(--space) * 2) calc(var(--space) * 4);
  border: 1px solid transparent;
  border-radius: var(--radius);
  font: inherit;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.ui-button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.ui-button[disabled] {
  opacity: 0.55;
  cursor: default;
}

.ui-button-primary {
  background: var(--accent);
  color: var(--accent-fg);
}

.ui-button-quiet {
  background: var(--surface);
  color: var(--fg);
  border-color: var(--line);
}

.ui-button-danger {
  background: var(--danger);
  color: var(--danger-fg);
}

/* Busy is not disabled: it stays focusable and keeps its label, and the cursor
   is the only thing that changes. A disabled button announces nothing. */
.ui-button.is-busy {
  cursor: progress;
}

.ui-status {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space) * 1);
  padding: 0 calc(var(--space) * 2);
  border-radius: 999px;
  font-size: 0.8125em;
  font-weight: 600;
}

.ui-status-ok { background: var(--ok); color: var(--ok-fg); }
.ui-status-warn { background: var(--warn); color: var(--warn-fg); }
.ui-status-danger { background: var(--danger); color: var(--danger-fg); }
.ui-status-neutral { background: var(--surface); color: var(--muted); }

/* Hidden from the screen, not from a screen reader. display:none and
   visibility:hidden remove it from the people this is for. */
.ui-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}`;

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
