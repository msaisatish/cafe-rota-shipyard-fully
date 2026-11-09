/**
 * Scripts, stylesheets and fonts the app would load from another site.
 *
 * Designs pasted in from outside (a section prompt from a design library, a
 * v0 or Webflow export) often bring a font link, an animation library from a
 * CDN or a tracking snippet with them. Each one runs someone else's code, or
 * tells someone else who visited, every time a page opens. The skill
 * `designing-the-interface` says to leave them out; `check-style.mjs` runs this
 * so leaving one in is caught rather than hoped against.
 *
 * Links (`<a href>`), images and the app's own addresses are not checked. A
 * load the founder agreed to in the chat is allowed by putting
 * `founder-approved: <why>` in a comment on the line before it; it is still
 * listed, so the agreement stays visible.
 */

const REMOTE = String.raw`(?:https?:)?\/\/`;
const QUOTE = String.raw`\{?\s*['"\x60]`;

const RULES = [
  {
    kind: 'script',
    pattern: new RegExp(String.raw`<script\b[^>]*?\bsrc\s*=\s*${QUOTE}${REMOTE}`, 'gi'),
  },
  {
    kind: 'stylesheet or font',
    pattern: new RegExp(
      String.raw`<link\b` +
        String.raw`(?=[^>]*\brel\s*=\s*${QUOTE}(?:stylesheet|preload|modulepreload|preconnect))` +
        String.raw`[^>]*?\bhref\s*=\s*${QUOTE}${REMOTE}`,
      'gi',
    ),
  },
  {
    kind: 'stylesheet or font',
    pattern: new RegExp(String.raw`@import\s+(?:url\(\s*)?['"]?${REMOTE}`, 'gi'),
  },
  {
    kind: 'font',
    pattern: new RegExp(String.raw`url\(\s*['"]?${REMOTE}[^)]*\.(?:woff2?|ttf|otf|eot)\b`, 'gi'),
  },
  {
    kind: 'script',
    pattern: new RegExp(String.raw`\bimport\s*\(\s*['"\x60]${REMOTE}`, 'g'),
  },
];

// A reason must follow: the `*/` that closes an empty comment is not one.
const APPROVED = /founder-approved:\s*(?!\*\/)\S/;

/**
 * Every remote load in one file's text, in order of where it appears.
 * `approved` is true when the line above it carries `founder-approved: <why>`.
 *
 * @param {string} text
 * @returns {{ line: number, kind: string, url: string, approved: boolean }[]}
 */
export function remoteLoads(text) {
  const lines = text.split(/\r?\n/);
  const starts = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  const lineAt = (index) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (starts[mid] <= index) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
  const found = new Map();
  const flat = text.replace(/\r\n/g, '\n');
  for (const rule of RULES) {
    for (const match of flat.matchAll(rule.pattern)) {
      const at = match.index + match[0].search(new RegExp(REMOTE));
      const url = /^[^\s'"\x60)}]+/.exec(flat.slice(at))?.[0] ?? '';
      const line = lineAt(at);
      const key = `${line}:${url}`;
      if (found.has(key)) continue;
      // The comment goes above the tag, which may span several lines.
      const above = lines[lineAt(match.index) - 2] ?? '';
      found.set(key, { line, kind: rule.kind, url, approved: APPROVED.test(above) });
    }
  }
  return [...found.values()].sort((a, b) => a.line - b.line);
}
