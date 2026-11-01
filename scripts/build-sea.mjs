import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { compressSea } from './compress-sea.mjs';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const outputName = `gluefiles${process.platform === 'win32' ? '.exe' : ''}`;
const outputPath = join(distDir, outputName);
await mkdir(distDir, { recursive: true });

const workDir = await mkdtemp(join(distDir, '.gluefiles-sea-'));
const majorNodeVersion = process.versions.node.split('.')[0];

try {
  const bundlePath = join(workDir, 'main.cjs');
  const configPath = join(workDir, 'sea-config.json');
  const candidatePath = join(workDir, outputName);

  await build({
    entryPoints: [join(distDir, 'index.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: `node${majorNodeVersion}`,
    outfile: bundlePath,
  });

  await writeFile(
    configPath,
    JSON.stringify({
      main: bundlePath,
      executable: process.execPath,
      output: candidatePath,
      disableExperimentalSEAWarning: true,
    }),
  );

  const seaResult = spawnSync(process.execPath, ['--build-sea', configPath], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (seaResult.error) {
    throw seaResult.error;
  }
  if (seaResult.status !== 0) {
    throw new Error(`SEA build failed with exit code ${seaResult.status ?? 'unknown'}`);
  }

  await compressSea(candidatePath);
  await rename(candidatePath, outputPath);
  process.stdout.write(`Created ${outputPath}\n`);
} finally {
  await rm(workDir, { recursive: true, force: true });
}
