/**
 * Bring the database up to date with the code. Run by `scripts/start.mjs`
 * before the website starts, or on its own (`node scripts/schema.mjs`) by
 * hosting that does it once per deploy instead.
 *
 * With migrations in prisma/migrations, apply them (`prisma migrate deploy`);
 * without any, match the tables to prisma/schema.prisma (`prisma db push`).
 * The same order Shipyard's preview uses, so an app that starts there starts
 * here. Never with --accept-data-loss: a change that would delete data stops
 * here instead, and the deploy shows as failed rather than quietly losing
 * somebody's customers' records.
 *
 * Once per deploy, not once per start: on hosting that scales to zero, every
 * cold start would otherwise connect to the database — waking a database that
 * sleeps too — just to find nothing to change. Shipyard's Google Cloud hosting
 * runs this file once with the new version before it takes any traffic, and
 * sets SHIPYARD_SCHEMA_AT_DEPLOY=1 so start.mjs skips it.
 *
 * Through the database's direct address: a pooled address (Neon's `-pooler`
 * host, `pgbouncer=true`) goes through PgBouncer, which schema changes must
 * not — Prisma Migrate holds a lock for the whole session, and PgBouncer hands
 * the session to someone else between statements. The website keeps the
 * pooled address.
 *
 * Tools are run as `node <their script>`, not through node_modules/.bin (see
 * start.mjs: Windows refuses to spawn .cmd files without a shell).
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The script a package runs as `name`, from its own package.json. */
function tool(pkg, name = pkg) {
  const manifest = JSON.parse(readFileSync(join('node_modules', pkg, 'package.json'), 'utf8'));
  const relative = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[name];
  if (!relative) throw new Error(`${pkg} has no "${name}" command; is it installed?`);
  return join('node_modules', pkg, relative);
}

/** The same database's direct address, for a pooled one; anything else as it is. Never printed. */
export function schemaUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('-pooler.')) return url;
    parsed.hostname = parsed.hostname.replace('-pooler.', '.');
    parsed.searchParams.delete('pgbouncer');
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Run a Prisma command to the end, showing its output and keeping a copy. */
function prisma(args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [tool('prisma'), ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL: schemaUrl(process.env.DATABASE_URL) },
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on('error', (error) => done({ code: 1, output: String(error) }));
    child.on('exit', (code) => done({ code: code ?? 1, output }));
  });
}

/** Apply the schema. Resolves to 0 when the database matches the code. */
export async function applySchema() {
  const migrations = join('prisma', 'migrations');
  const hasMigrations =
    existsSync(migrations) &&
    readdirSync(migrations, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && existsSync(join(migrations, entry.name, 'migration.sql')),
    );

  let schema = hasMigrations ? await prisma(['migrate', 'deploy']) : await prisma(['db', 'push', '--skip-generate']);
  if (hasMigrations && schema.code !== 0 && /\bP3005(?!\d)/.test(schema.output)) {
    // Tables made by `db push` before the app had migrations, so the database
    // has no record of them. Match the tables to the schema as before; this
    // check runs again on the next deploy.
    console.error('[schema] the database has no migration history; matching it to prisma/schema.prisma instead.');
    schema = await prisma(['db', 'push', '--skip-generate']);
  }
  if (schema.code !== 0) console.error('[schema] the database schema could not be applied. See the lines above.');
  return schema.code;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(await applySchema());
}
