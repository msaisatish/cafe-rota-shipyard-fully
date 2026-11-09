import { cssFor, safeTokens } from './merge';
import { theme } from '@/theme';

/**
 * The stylesheet, put on the page.
 *
 * Generated at render time from the tokens rather than from a `.css` file
 * somebody maintains alongside them. That is not a convenience — it is what
 * makes "the tokens are the source of truth" true. A stylesheet that is written
 * by hand starts out matching the tokens and stops matching them the first time
 * somebody is in a hurry.
 *
 * Put it in the root layout, once:
 *
 * ```tsx
 * import { ThemeStyles } from '@/components/ui_foundation/Styles';
 *
 * <head><ThemeStyles /></head>
 * ```
 *
 * `dangerouslySetInnerHTML` is the right tool here and is not dangerous in this
 * use: the content is generated from typed values in this project's own files
 * and never from anything a user typed.
 */
export function ThemeStyles() {
  const { tokens } = safeTokens(theme);
  return <style id="ui-foundation-tokens" dangerouslySetInnerHTML={{ __html: cssFor(tokens) }} />;
}

/**
 * Everything wrong with the theme, if anything is.
 *
 * Returned rather than logged, so a project can decide where to say it. The
 * default is to say nothing in a finished app and to show it while building —
 * a contrast failure the founder never hears about is one that ships.
 */
export function themeProblems(): string[] {
  return safeTokens(theme).problems.map(({ mode, problem }) => `${mode}: ${problem.says}`);
}
