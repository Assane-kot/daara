// Injecte l'état du projet au démarrage de chaque session Claude Code.
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const run = (cmd) => { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return '(indisponible)'; } };

let out = '=== ÉTAT DU PROJET DAARA ===\n';
if (existsSync('docs/PROGRESS.md')) {
  const lines = readFileSync('docs/PROGRESS.md', 'utf8').split('\n');
  out += '\n--- docs/PROGRESS.md (fin) ---\n' + lines.slice(-40).join('\n') + '\n';
}
out += '\n--- 8 derniers commits ---\n' + run('git log --oneline -8') + '\n';
out += '\n--- Fichiers modifiés non commités ---\n' + (run('git status --short') || '(aucun)') + '\n';
out += '\nReprends à partir de « Prochaine étape » de PROGRESS.md sauf instruction contraire.\n';
console.log(out);
