import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const managedDirectory = path.join(repositoryRoot, 'managed', 'veil-allowlist');
const publicDirectory = path.join(repositoryRoot, 'public');

for (const assetDirectory of ['keys', 'zkir']) {
  const source = path.join(managedDirectory, assetDirectory);
  const destination = path.join(publicDirectory, assetDirectory);

  if (!existsSync(source)) {
    throw new Error(`Missing ${source}. Run npm run contracts:compile first.`);
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}

console.log('Synced Midnight proof assets to public/keys and public/zkir.');
