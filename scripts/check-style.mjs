/**
 * Rules R7.1 and R7.2 in AGENTS.md, checked rather than hoped for.
 *
 * Lines at most 100 characters, and each kind of file under its hard size
 * limit. Nothing loaded from another site (`remote-loads.mjs`). Run with
 * `npm run check:style`; exits 1 and lists what to fix.
 */
import { readFileSync } from 'node:fs';
import { projectFiles, STYLESHEETS } from './project-files.mjs';
import { remoteLoads } from './remote-loads.mjs';

const MAX_LINE = 100;

const isTest = (file) =>
  file.startsWith('tests/') || file.startsWith('e2e/') || /\.(test|spec)\.[jt]sx?$/.test(file);

/** Hard limits from rule R7.2, most specific first. */
const LIMITS = [
  { kind: 'test file', test: isTest, max: 400 },
  { kind: 'screen', test: (f) => /^src\/app\/.*page\.tsx$/.test(f), max: 150 },
  { kind: 'route handler', test: (f) => /^src\/app\/api\/.*route\.ts$/.test(f), max: 120 },
  { kind: 'service or queries module', test: (f) => /\/(service|queries)\.ts$/.test(f), max: 300 },
  { kind: 'UI component', test: (f) => f.endsWith('.tsx'), max: 200 },
  { kind: 'file', test: () => true, max: 300 },
];

const problems = [];
const approved = [];
for (const file of [...projectFiles(), ...projectFiles(process.cwd(), STYLESHEETS)]) {
  for (const load of remoteLoads(readFileSync(file, 'utf8'))) {
    const where = `${file}:${load.line}: a ${load.kind} from ${load.url}`;
    if (load.approved) approved.push(where);
    else {
      problems.push(
        `${where} is loaded from another site. Serve it from the project, ` +
          'or ask the founder; once they agree, ' +
          'add "founder-approved: <why>" in a comment above it.',
      );
    }
  }
}
const remoteProblems = problems.length;
for (const file of projectFiles()) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const limit = LIMITS.find((rule) => rule.test(file));
  if (lines.length > limit.max) {
    const size = `${lines.length} lines; a ${limit.kind} may have at most ${limit.max}`;
    problems.push(`${file}: ${size}. Split it.`);
  }
  lines.forEach((line, index) => {
    if (line.length > MAX_LINE) {
      problems.push(`${file}:${index + 1}: ${line.length} characters; at most ${MAX_LINE}.`);
    }
  });
}

if (approved.length > 0) {
  console.log(`Loaded from another site, agreed with the founder:\n${approved.join('\n')}\n`);
}
if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} style problem(s).`);
  if (problems.length > remoteProblems) {
    console.error('Run "npm run format", then split what is too long.');
  }
  process.exit(1);
}
console.log('Style check passed.');
