import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const targetDir = resolve(root, 'android', 'app', 'src', 'main', 'assets', 'public');

if (!existsSync(distDir)) {
  console.error('dist/ does not exist. Run "npm run build" first.');
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(distDir, targetDir, { recursive: true });

console.log(`Copied ${distDir} -> ${targetDir}`);
