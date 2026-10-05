// Contrôle des Edge Functions (S2.5b) : lint, types et tests Deno dans le conteneur officiel `denoland/deno`, épinglé
// par empreinte. Rien à installer (Docker suffit) ; même commande en local (`npm run edge:test`) et en CI (job `edge`).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const IMAGE = 'denoland/deno:2.5.6@sha256:3ea71953ff50e3ff15c377ead1a8521f624e2f43d27713675a8bed7b33f166aa';
const dossier = resolve('supabase/functions');
const points = readdirSync(dossier, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && existsSync(join(dossier, e.name, 'index.ts')))
    .map((e) => `${e.name}/index.ts`);

// Dépendances verrouillées (deno.lock versionné ; --frozen : échec si une dépendance change). Après un changement de
// version voulu : `node scripts/edge-test.mjs --maj-verrou`.
const tests = readdirSync(dossier, { recursive: true })
    .map((f) => String(f).split('\\').join('/'))
    .filter((f) => f.endsWith('_test.ts'));
const verrou = process.argv.includes('--maj-verrou') ? ['--lock=deno.lock'] : ['--lock=deno.lock', '--frozen'];
const etapes = [['lint'], ['check', ...verrou, ...points, ...tests], ['test', ...verrou, '--no-prompt']];
for (const args of etapes) {
    console.log(`\n> deno ${args.join(' ')}`);
    const r = spawnSync('docker', ['run', '--rm', '-v', `${dossier}:/app`, '-w', '/app', IMAGE, 'deno', ...args], {
        stdio: 'inherit',
        env: { ...process.env, MSYS_NO_PATHCONV: '1' },
    });
    if (r.status !== 0) {
        process.exit(r.status ?? 1);
    }
}
