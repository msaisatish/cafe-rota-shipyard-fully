/**
 * The files that belong to this app, as opposed to Shipyard's starter or an
 * installed component.
 *
 * `check-style.mjs` and `format.mjs` both work on this list. Component files
 * are left out on purpose: they are hashed at install time, and reformatting
 * one would make it look tampered with.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'tests', 'e2e'];
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/** Shipyard's own parts of the starter. Not yours, not formatted, not checked. */
const STARTER = ['src/seams/', 'src/components/', 'tests/contracts/', 'tests/seams.test.ts'];

function componentFiles(root) {
  const record = path.join(root, 'shipyard.components.json');
  if (!existsSync(record)) return new Set();
  const { components = [] } = JSON.parse(readFileSync(record, 'utf8'));
  return new Set(
    components
      .filter((component) => component.status !== 'removed')
      .flatMap((component) => component.files ?? [])
      .map((file) => file.replace(/\\/g, '/')),
  );
}

function walk(dir, found) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
}

/** The app's stylesheets, for checks that read CSS (`remote-loads.mjs`). */
export const STYLESHEETS = /\.css$/;

/** Paths relative to `root`, with forward slashes, sorted. */
export function projectFiles(root = process.cwd(), extensions = EXTENSIONS) {
  const owned = componentFiles(root);
  const found = [];
  for (const top of ROOTS) {
    if (existsSync(path.join(root, top))) walk(path.join(root, top), found);
  }
  return found
    .map((file) => path.relative(root, file).replace(/\\/g, '/'))
    .filter((file) => extensions.test(file))
    .filter((file) => !STARTER.some((prefix) => file.startsWith(prefix)))
    .filter((file) => !owned.has(file))
    .sort();
}
