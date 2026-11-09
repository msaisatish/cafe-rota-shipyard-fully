import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

/**
 * Where the browser checks run: Shipyard's test copy of the app, never the
 * app the founder is using.
 *
 * The test copy is the same code with its own database (`shipyard_checks`,
 * reached through a role that cannot open the founder's) and its own build
 * folder, started by Shipyard for the browser checks. Shipyard writes its
 * address and process to `.shipyard/check-server.json`; that record is the
 * only authority:
 *
 * - `SHIPYARD_CHECK_URL` (set by Shipyard when it runs the checks) is used
 *   only when it is that same address. Anything else, such as the preview's
 *   address, is refused rather than followed.
 * - A record whose process has gone (Shipyard closed or crashed) is stale:
 *   whatever answers on that port now is not the test copy.
 *
 * There is deliberately no fallback to the preview. A check that records a
 * loan records it in whatever database the app it talks to uses, and run
 * against the preview that was the founder's own list (sample run 4c: "68
 * things are out", all of them test loans).
 *
 * @typedef {{ env?: Record<string, string | undefined>, read?: (file: string) => string,
 *   alive?: (pid: number) => boolean }} TargetIo
 * @param {TargetIo} [io]
 * @returns {{ url: string } | { error: string }}
 */
export function checkTarget(io = {}) {
  const env = io.env ?? process.env;
  const read = io.read ?? ((file) => readFileSync(file, 'utf8'));
  const alive = io.alive ?? processAlive;
  let server = null;
  try {
    server = JSON.parse(read('.shipyard/check-server.json'));
  } catch {
    // No test copy recorded yet.
  }
  if (!server?.running || !server.url) {
    return {
      error:
        'The test copy of the app is not running, so the browser checks did not run. ' +
        'Shipyard starts it, with its own database, for the browser-check steps and ' +
        'when you press Check now. They never run against the app you are using.',
    };
  }
  if (!Number.isInteger(server.pid) || !alive(server.pid)) {
    return {
      error:
        'The record of the test copy is out of date (its process has stopped), so ' +
        'the browser checks did not run. Press Check now and Shipyard starts it again.',
    };
  }
  const asked = env.SHIPYARD_CHECK_URL;
  if (asked && origin(asked) !== origin(server.url)) {
    return {
      error:
        `SHIPYARD_CHECK_URL (${asked}) is not Shipyard's test copy (${server.url}), ` +
        'so the browser checks did not run. They only ever run against the test copy.',
    };
  }
  return { url: server.url };
}

const LOCK_FILE = '.shipyard/checks.lock';
/** Held, for milliseconds, by whoever clears a stale lock; shared with Shipyard. */
const TAKEOVER_FILE = '.shipyard/checks.lock.takeover';
const TAKEOVER_STALE_MS = 10_000;
const STALE_AFTER_MS = 2 * 60 * 60_000;

/**
 * One browser-check run at a time on the test copy.
 *
 * Shipyard's own check runs and this one share the test copy; two at once
 * signed in as the same test Admin and emptied the database under each other
 * (sample run, 28 Oct 2026). Shipyard holds `.shipyard/checks.lock` while its
 * run goes and passes its token in `SHIPYARD_CHECK_LOCK`; a run started any
 * other way takes the lock itself, or is refused while someone else has it.
 * The lock is given back when this process exits.
 *
 * @typedef {{ env?: Record<string, string | undefined>, read?: (file: string) => string,
 *   write?: (file: string, text: string) => void, remove?: (file: string) => void,
 *   makeDir?: (dir: string) => void,
 *   alive?: (pid: number) => boolean, pid?: number, now?: number,
 *   onExit?: (release: () => void) => void }} LockIo
 * @param {LockIo} [io]
 * @returns {{ ok: true } | { error: string }}
 */
export function claimCheckRun(io = {}) {
  const env = io.env ?? process.env;
  const read = io.read ?? ((file) => readFileSync(file, 'utf8'));
  const write =
    io.write ?? ((file, text) => writeFileSync(file, text, { encoding: 'utf8', flag: 'wx' }));
  const remove = io.remove ?? ((file) => rmSync(file, { force: true }));
  const makeDir = io.makeDir ?? ((dir) => mkdirSync(dir, { recursive: true }));
  const alive = io.alive ?? processAlive;
  const now = io.now ?? Date.now();
  let lock = null;
  let seen = null;
  try {
    seen = read(LOCK_FILE);
    lock = JSON.parse(seen);
  } catch {
    // Nobody has it.
  }
  // Shipyard's own run, or a Playwright worker of this same run.
  if (env.SHIPYARD_CHECK_LOCK && lock?.token === env.SHIPYARD_CHECK_LOCK) return { ok: true };
  const age = lock ? now - Date.parse(lock.startedAt) : Infinity;
  if (lock && Number.isInteger(lock.pid) && age < STALE_AFTER_MS && alive(lock.pid)) {
    return {
      error:
        lock.by === 'shipyard'
          ? 'Shipyard is running its own checks on the test copy right now, ' +
            'so these browser checks did not run. ' +
            'Wait for them to finish; their results appear in Shipyard.'
          : 'Another browser-check run is already using the test copy, ' +
            'so this one did not run. Wait for it to finish.',
    };
  }
  const token = `${process.pid}-${now}-${Math.random().toString(36).slice(2)}`;
  const startedAt = new Date(now).toISOString();
  const mine = JSON.stringify({ pid: io.pid ?? process.pid, by: 'agent', token, startedAt });
  try {
    makeDir('.shipyard');
    try {
      write(LOCK_FILE, mine);
    } catch (error) {
      if (!lock) throw error;
      // A stale lock. Read, remove, write let two runs both win when they took
      // it over at once (audit CD-08), so it is removed only by whoever holds
      // the takeover file, and only if it is still the lock found stale.
      try {
        write(TAKEOVER_FILE, JSON.stringify({ pid: io.pid ?? process.pid, startedAt }));
      } catch (busy) {
        let since = NaN;
        try {
          since = Date.parse(JSON.parse(read(TAKEOVER_FILE)).startedAt);
        } catch {
          // Being written, or Shipyard clears it.
        }
        // One cut short by a crash would keep the lock stale for good.
        if (now - since > TAKEOVER_STALE_MS) remove(TAKEOVER_FILE);
        throw busy;
      }
      try {
        if (read(LOCK_FILE) !== seen) throw new Error('Claimed since it was read.');
        remove(LOCK_FILE);
        write(LOCK_FILE, mine);
      } finally {
        remove(TAKEOVER_FILE);
      }
    }
  } catch {
    return {
      error:
        'Another browser-check run took the test copy at the same moment, ' +
        'so this one did not run. Try again.',
    };
  }
  env.SHIPYARD_CHECK_LOCK = token;
  const release = () => {
    try {
      if (JSON.parse(read(LOCK_FILE)).token === token) remove(LOCK_FILE);
    } catch {
      // Already gone.
    }
  };
  (io.onExit ?? ((fn) => process.once('exit', fn)))(release);
  return { ok: true };
}

function origin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return String(url);
  }
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it exists, it is just not ours to signal.
    return error?.code === 'EPERM';
  }
}
