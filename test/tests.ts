import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tempDir = await mkdtemp(join(tmpdir(), 'gluefiles-test-'));

try {
  const expected = Array.from({ length: 5 }, () => randomBytes(16).toString('hex'));

  for (const [index, content] of expected.entries()) {
    await writeFile(join(tempDir, `sample.txt${index + 1}`), content);
  }

  const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
  const entryPoint = fileURLToPath(new URL('../src/index.ts', import.meta.url));
  const result = spawnSync(process.execPath, [tsxCli, entryPoint], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const actual = await readFile(join(tempDir, 'sample.txt'), 'utf8');
  assert.equal(actual, expected.join(''));

  console.log('Glue test passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
