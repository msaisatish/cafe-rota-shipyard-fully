/**
 * Format this app's own files with Prettier (rule R7.1).
 *
 * Only the app's files: the starter's seams and every installed component are
 * left exactly as they were installed, because they are hashed and a
 * reformatted one looks tampered with.
 *
 * Prettier is run through Node directly, not a shell, so the same command
 * works on Windows, macOS and Linux. Files go in batches to stay well under
 * the command-line length limit on Windows.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { projectFiles } from './project-files.mjs';

const PRETTIER = path.join('node_modules', 'prettier', 'bin', 'prettier.cjs');
const BATCH = 50;

const files = projectFiles();
if (files.length === 0) {
  console.log('Nothing to format yet.');
  process.exit(0);
}

for (let start = 0; start < files.length; start += BATCH) {
  const batch = files.slice(start, start + BATCH);
  const args = [PRETTIER, '--write', '--log-level', 'warn', ...batch];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Formatted ${files.length} file(s).`);
