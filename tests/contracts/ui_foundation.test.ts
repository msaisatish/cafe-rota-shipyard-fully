import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { contrastRatio, meetsContrast, parseHex } from '@/components/ui_foundation/contrast';
import {
  REQUIRED_PAIRS,
  contrastProblems,
  cssFor,
  mergeTokens,
  safeTokens,
} from '@/components/ui_foundation/merge';
import { buttonProps, statusParts, visuallyHiddenStyle } from '@/components/ui_foundation/primitives';
import { defaultTokens } from '@/components/ui_foundation/tokens';
import { theme } from '@/theme';

/**
 * The contract for the look of this app.
 *
 * Two things are being proven here and the second is the one that matters.
 *
 * The **defaults** are readable. That is table stakes and it is easy.
 *
 * The **merged palette** — the defaults with this project's own `src/theme.ts`
 * on top — is readable too. That is the assertion that keeps working after
 * somebody changes the colours, which is the only time any of this is at risk.
 * A design system checked only against its own defaults is checked against the
 * one configuration nobody ships.
 */

describe('contrast, as arithmetic rather than opinion', () => {
  it('knows the two extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('reads the shorthand people actually type', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('#ffffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('fails a colour it cannot read, rather than passing it', () => {
    // A typo in a theme file must never produce a pass.
    expect(contrastRatio('rebeccapurple', '#ffffff')).toBe(0);
    expect(meetsContrast('not a colour', '#ffffff')).toBe(false);
  });

  it('holds text to 4.5 and non-text to 3', () => {
    // #767676 on white is the canonical "just passes body text" grey.
    expect(meetsContrast('#767676', '#ffffff', 'text')).toBe(true);
    expect(meetsContrast('#949494', '#ffffff', 'text')).toBe(false);
    expect(meetsContrast('#949494', '#ffffff', 'non-text')).toBe(true);
  });
});

describe('the palette people will actually see', () => {
  // The assertion that survives somebody editing src/theme.ts.
  const merged = safeTokens(theme);

  it('is readable in light mode, after this project has had its say', () => {
    expect(contrastProblems(merged.tokens.light)).toEqual([]);
  });

  it('and in dark mode', () => {
    expect(contrastProblems(merged.tokens.dark)).toEqual([]);
  });

  it('checks the pairs that appear together, not every possible pair', () => {
    // A check that reports pairs which never meet on screen is a check nobody
    // reads to the end of.
    expect(REQUIRED_PAIRS.length).toBeGreaterThan(5);
    expect(REQUIRED_PAIRS.some((pair) => pair.fg === 'muted' && pair.bg === 'bg')).toBe(true);
  });

  it('does not hold a decorative hairline to the bar for things that mean something', () => {
    // Holding `line` to 3:1 would fail the default palette and every reasonable
    // theme, which is how a check gets switched off. A rule between two panels
    // carries no information; a focus ring does.
    expect(REQUIRED_PAIRS.some((pair) => pair.fg === 'line')).toBe(false);
    expect(REQUIRED_PAIRS.some((pair) => pair.fg === 'focus')).toBe(true);
  });

  it('holds secondary text to the same bar as everything else', () => {
    // The one people get wrong. Tasteful grey is usually about 3:1.
    expect(meetsContrast(defaultTokens.light.muted, defaultTokens.light.bg, 'text')).toBe(true);
    expect(meetsContrast(defaultTokens.dark.muted, defaultTokens.dark.bg, 'text')).toBe(true);
  });
});

describe('a theme that cannot be read does not load', () => {
  it('keeps a theme that is fine', () => {
    const result = safeTokens({ light: { accent: '#0b3d91', accentFg: '#ffffff' } });
    expect(result.problems).toEqual([]);
    expect(result.tokens.light.accent).toBe('#0b3d91');
  });

  it('keeps the brand colour and fixes the text on it', () => {
    const result = safeTokens({ light: { accent: '#ffe08a', accentFg: '#fff4cc' } });
    expect(result.problems.length).toBeGreaterThan(0);
    // The colour they picked on purpose survives. The default white would not
    // have read on it either, so the text becomes black rather than reverting
    // to a value that was still wrong.
    expect(result.tokens.light.accent).toBe('#ffe08a');
    expect(result.tokens.light.accentFg).toBe('#000000');
    expect(contrastProblems(result.tokens.light)).toEqual([]);
  });

  it('leaves a theme that works completely alone', () => {
    const result = safeTokens({ light: { accent: '#0b3d91', accentFg: '#ffffff' } });
    expect(result.reverted).toEqual([]);
    expect(result.problems).toEqual([]);
  });

  it('and says which two colours were the problem, in words', () => {
    const result = safeTokens({ light: { muted: '#e8e8e8' } });
    expect(result.problems[0]?.problem.says).toMatch(/secondary text/i);
    expect(result.problems[0]?.problem.says).toMatch(/too close together/i);
  });

  it('gives up on a theme that contradicts itself, rather than half-fixing it', () => {
    // A near-black page with the template's near-white panel: no single text
    // colour reads on both, so fixing one pair breaks the other. Chasing that
    // does not converge, and a half-fixed palette is still unreadable
    // somewhere.
    const result = safeTokens({ light: { fg: '#1b1b1b', bg: '#1a1a1a' } });
    expect(contrastProblems(result.tokens.light)).toEqual([]);
    expect(result.tokens.light).toEqual(defaultTokens.light);
    expect(result.problems.length).toBeGreaterThan(0);
  });

  it('and a contradiction in one mode does not cost the other', () => {
    const result = safeTokens({ light: { fg: '#1b1b1b', bg: '#1a1a1a' }, dark: { accent: '#c9a6f0' } });
    expect(result.tokens.light).toEqual(defaultTokens.light);
    expect(result.tokens.dark.accent).toBe('#c9a6f0');
  });

  it('survives a theme that is nonsense', () => {
    const result = safeTokens({ light: { fg: 'not a colour' } });
    expect(contrastProblems(result.tokens.light)).toEqual([]);
    expect(result.problems[0]?.problem.says).toMatch(/not a colour this can read/i);
  });

  it('a theme that sets one thing changes one thing', () => {
    const merged = mergeTokens(defaultTokens, { radius: '0' });
    expect(merged.radius).toBe('0');
    expect(merged.light.bg).toBe(defaultTokens.light.bg);
    expect(merged.dark.fg).toBe(defaultTokens.dark.fg);
  });
});

describe('the stylesheet is generated from the tokens', () => {
  const css = cssFor(safeTokens(theme).tokens);

  it('carries every token as a custom property', () => {
    // If these could drift, the tokens would not be the source of truth.
    expect(css).toContain(`--bg: ${safeTokens(theme).tokens.light.bg};`);
    expect(css).toContain(`--accent-fg: ${safeTokens(theme).tokens.light.accentFg};`);
    expect(css).toContain(`--radius: ${safeTokens(theme).tokens.radius};`);
  });

  it('keeps the names the starter template already published', () => {
    // Installing this must not break code that already used them.
    for (const name of ['--bg', '--fg', '--muted', '--line']) {
      expect(css).toContain(`${name}:`);
    }
  });

  it('follows the operating system into dark mode, and can be overridden', () => {
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('[data-theme="light"]');
  });

  it('respects a viewer who has asked for less animation', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});

describe('the button', () => {
  it('never submits a form by accident', () => {
    // The HTML default is submit, so a button inside a form that forgets this
    // reloads the page — which the founder reports as losing their work.
    expect(buttonProps().type).toBe('button');
  });

  it('says it is working without going silent', () => {
    const props = buttonProps({ busy: true });
    expect(props['aria-busy']).toBe(true);
    // Disabled removes it from the tab order and announces nothing, so a screen
    // reader user gets silence where a sighted user sees a spinner.
    expect(props.disabled).toBe(false);
  });

  it("reports a toggle's state, not just its colour", () => {
    expect(buttonProps({ pressed: false })['aria-pressed']).toBe(false);
    expect(buttonProps({ pressed: true })['aria-pressed']).toBe(true);
    expect(buttonProps({})['aria-pressed']).toBeUndefined();
  });

  it('refuses an icon-only button with no name', () => {
    // A wrong label is worse than a missing one, so it is never guessed.
    expect(() => buttonProps({ iconOnly: true })).toThrow(/screen reader/i);
    expect(buttonProps({ iconOnly: true, label: 'Delete this row' })['aria-label']).toBe(
      'Delete this row',
    );
  });
});

describe('the status', () => {
  it('is a word and a shape before it is a colour', () => {
    const parts = statusParts('ok', 'Paid');
    expect(parts.label).toBe('Paid');
    expect(parts.mark).not.toBe('');
    // Two tones a colour-blind reader cannot tell apart must still differ.
    expect(statusParts('ok', 'Paid').mark).not.toBe(statusParts('danger', 'Failed').mark);
  });

  it('refuses to be only a colour', () => {
    expect(() => statusParts('danger', '  ')).toThrow(/needs a word/i);
  });

  it('only interrupts for bad news', () => {
    expect(statusParts('ok', 'Saved', { announce: true }).role).toBe('status');
    expect(statusParts('danger', 'Payment failed', { announce: true }).role).toBe('alert');
    // A status that was always on screen is not news and must not announce.
    expect(statusParts('ok', 'Paid').role).toBeUndefined();
  });
});

describe('visually hidden', () => {
  it('hides from the screen and not from a screen reader', () => {
    // display:none and visibility:hidden remove it from everybody, including
    // the people it is for — and that mistake is invisible to whoever makes it.
    expect(visuallyHiddenStyle.position).toBe('absolute');
    expect(visuallyHiddenStyle.clip).toBe('rect(0, 0, 0, 0)');
    // The two properties that would remove it from everybody. `overflow:
    // hidden` is part of the clip technique and is meant to be here, so this
    // names the properties rather than searching the values for a word.
    expect(visuallyHiddenStyle).not.toHaveProperty('display');
    expect(visuallyHiddenStyle).not.toHaveProperty('visibility');
  });
});

describe('the generated stylesheet defines the classes the primitives hand out', () => {
  const css = cssFor(defaultTokens);

  /**
   * This is a regression test for a real gap, not a formality.
   *
   * `buttonProps()` returned `ui-button ui-button-primary` and `statusParts()`
   * returned `ui-status ui-status-ok`, and nothing defined either class, so
   * every project rendered unstyled buttons. A class name handed out by code
   * that no stylesheet claims is a promise nobody kept.
   */
  it('styles every tone a button can have', () => {
    for (const tone of ['primary', 'quiet', 'danger'] as const) {
      expect(buttonProps({ tone }).className.split(' ')).toContain(`ui-button-${tone}`);
      expect(css).toContain(`.ui-button-${tone}`);
    }
    expect(css).toContain('.ui-button {');
  });

  it('styles every tone a status can have', () => {
    for (const tone of ['ok', 'warn', 'danger', 'neutral'] as const) {
      expect(statusParts(tone, 'Something').className.split(' ')).toContain(`ui-status-${tone}`);
      expect(css).toContain(`.ui-status-${tone}`);
    }
  });

  it('actually hides the class that other components hide things with', () => {
    // `data_table` marks its live region `ui-visually-hidden`. Until this
    // existed, the region was not hidden, and every table printed
    // "Sorted by Name, A to Z. 23 rows." on the page as visible text.
    expect(css).toContain('.ui-visually-hidden');
    expect(css).toMatch(/\.ui-visually-hidden\s*\{[^}]*clip: rect\(0, 0, 0, 0\)/);
  });

  it('keeps busy focusable rather than disabling it', () => {
    // A disabled button leaves the tab order and announces nothing, so somebody
    // on a screen reader gets silence exactly when something is happening.
    expect(buttonProps({ busy: true }).disabled).toBe(false);
    expect(css).not.toMatch(/\.ui-button\.is-busy\s*\{[^}]*pointer-events:\s*none/);
  });

  it('never removes a focus ring without putting one back', () => {
    expect(css).not.toMatch(/outline:\s*none/);
    expect(css).toContain('outline: 2px solid var(--focus)');
  });

  it('paints the primitives from tokens rather than typed-in colours', () => {
    // A hex code here escapes the theme and slips past the contrast repair,
    // which only ever sees values that came through the tokens. The palette
    // block at the top of the sheet is where hex belongs, so this checks the
    // part after it.
    const primitives = css.slice(css.indexOf('.ui-button {'));
    expect(primitives).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

describe('the values reach the page', () => {
  // Before 1.2.0 the layout line was a manual step, and a part installed
  // without it (a table, an empty state) showed with none of the values its
  // stylesheet uses. Nothing else catches that: the build passes and the
  // tests run without a browser.
  const read = (file: string): string => readFileSync(path.join(process.cwd(), file), 'utf8');

  it('fills the theme seam with the real stylesheet', () => {
    const seam = read('src/seams/theme.ts');
    expect(seam).not.toMatch(/^[ \t]*(?:export|import)\b[^;\r\n]*\bSHIPYARD_SEAM_STUB\b/m);
    expect(seam).toContain('@/components/ui_foundation/Styles');
  });

  it('and the root layout renders it', () => {
    expect(read('src/app/layout.tsx'), 'src/app/layout.tsx must render <ThemeStyles /> from @/seams/theme').toMatch(
      /<ThemeStyles\s*\/>/,
    );
  });
});
