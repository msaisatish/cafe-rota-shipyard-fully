/**
 * How a published app starts. Runs inside the container (see Dockerfile).
 *
 * Three steps, in order:
 *
 *   1. Bring the database up to date (scripts/schema.mjs: migrations, or the
 *      schema, never accepting data loss). Skipped when the hosting already
 *      did it once for this deploy (SHIPYARD_SCHEMA_AT_DEPLOY=1, set by
 *      Shipyard's Google Cloud hosting), so a cold start does not wake the
 *      database for nothing.
 *   2. Start the website.
 *   3. Start the background worker, if the background jobs component is
 *      installed. Without it, queued jobs (emails, imports) would never run.
 *
 * Except where nothing runs between requests (SHIPYARD_RUNTIME=cloudrun, set
 * by Shipyard's hosting). There a forever-running worker is frozen between
 * requests or paid for all month, so it is not started; a scheduler calls the
 * component's POST /api/jobs/tick once a minute instead. Anything else —
 * unset, Railway, a founder's own computer — starts the worker as before.
 * Before anything else, this checks the tick can work (the route exists, the
 * secret is set), so jobs never silently stop.
 *
 * If the website or the worker stops, everything stops, so the hosting
 * provider restarts the app whole. A half-running app — pages working, jobs
 * silently not — is worse than a restart.
 *
 * Tools are run as `node <their script>`, not through node_modules/.bin. On
 * Windows those are .cmd files, which Node refuses to spawn without a shell
 * (EINVAL), so this script could not start an app on Windows at all.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';

import { applySchema } from './schema.mjs';

const port = process.env.PORT || '3000';
const windows = process.platform === 'win32';
const runtime = (process.env.SHIPYARD_RUNTIME ?? '').trim().toLowerCase();

// Tools the steps call by name (a seed running `tsx`) live here, as under npm.
process.env.PATH = `${resolve('node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}`;
const children = [];
/** The hosting asked the app to stop: a newer version took over, or it went to sleep. */
let asked = null;

/** The script a package runs as `name`, from its own package.json. */
function tool(pkg, name = pkg) {
  const manifest = JSON.parse(readFileSync(join('node_modules', pkg, 'package.json'), 'utf8'));
  const relative = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[name];
  if (!relative) throw new Error(`${pkg} has no "${name}" command; is it installed?`);
  return join('node_modules', pkg, relative);
}

function run(name, command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env, ...options });
  child.on('exit', (code, signal) => {
    // A stop the hosting asked for read like a crash after every deploy, to
    // the founder and the agent alike (go-live H-35). Only a stop nobody
    // asked for is one.
    if (asked) {
      console.info(
        `[start] ${name} stopped because the hosting asked (${asked}): a newer version took over, or the app is going to sleep. Nothing is wrong.`,
      );
    } else {
      console.error(
        `[start] ${name} stopped (${signal ?? `exit ${code}`}); stopping the app so it is restarted whole.`,
      );
    }
    for (const other of children) if (other !== child) other.kill('SIGTERM');
    process.exit(code ?? 1);
  });
  children.push(child);
  return child;
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const hasWorker = Boolean(pkg.scripts?.worker);
// Where the worker would run, it has to be able to; where it cannot, the tick
// has to. Checked before the database or the website is touched.
const workerHere = hasWorker && runtime !== 'cloudrun';
if (hasWorker && !workerHere) {
  if (!existsSync(join('src', 'app', 'api', 'jobs', 'tick', 'route.ts'))) {
    console.error(
      '[start] background jobs here need /api/jobs/tick, which this version of the background jobs component does not have; update it. Not starting.',
    );
    process.exit(1);
  }
  if ((process.env.JOBS_TICK_SECRET ?? '').length < 32) {
    console.error(
      '[start] background jobs here need JOBS_TICK_SECRET (at least 32 characters) for the scheduler to call /api/jobs/tick; jobs would never run. Not starting.',
    );
    process.exit(1);
  }
}
if (workerHere && !existsSync(join('node_modules', 'tsx', 'package.json'))) {
  console.error(
    '[start] the background worker is installed but tsx is missing; jobs would never run. Not starting.',
  );
  process.exit(1);
}

if (process.env.SHIPYARD_SCHEMA_AT_DEPLOY === '1') {
  console.info(
    '[start] the database was brought up to date when this version was deployed; not touching it now.',
  );
} else {
  const code = await applySchema();
  if (code !== 0) {
    console.error(
      '[start] the database schema could not be applied; not starting. See the lines above.',
    );
    process.exit(code);
  }
}

run('website', process.execPath, [tool('next'), 'start', '-p', port]);

if (workerHere) {
  // npm is a .cmd file on Windows, so there it goes through the shell. The
  // command is fixed text, never anything a request supplied.
  if (windows) run('worker', 'npm run worker', [], { shell: true });
  else run('worker', 'npm', ['run', 'worker']);
} else if (hasWorker) {
  console.info(
    '[start] no background worker on this hosting: a scheduler runs the jobs through /api/jobs/tick.',
  );
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    asked = signal;
    for (const child of children) child.kill(signal);
  });
}
