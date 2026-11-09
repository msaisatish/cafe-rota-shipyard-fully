/** See target.mjs: where the browser checks run (Shipyard's test copy, never the preview). */
export function checkTarget(io?: {
  env?: Record<string, string | undefined>;
  read?: (file: string) => string;
  alive?: (pid: number) => boolean;
}): { url: string } | { error: string };

/** See target.mjs: one browser-check run at a time on the test copy (`.shipyard/checks.lock`). */
export function claimCheckRun(io?: {
  env?: Record<string, string | undefined>;
  read?: (file: string) => string;
  write?: (file: string, text: string) => void;
  remove?: (file: string) => void;
  makeDir?: (dir: string) => void;
  alive?: (pid: number) => boolean;
  pid?: number;
  now?: number;
  onExit?: (release: () => void) => void;
}): { ok: true } | { error: string };
