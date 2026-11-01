import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const releaseVersion = '5.3.0';
const assets = {
  win32: {
    x64: {
      name: `upx-${releaseVersion}-win64.zip`,
      digest: 'd127996c76615e431be810e9c8d2910dbe3dd400600c5c0c50276fc5a17a9705',
    },
  },
  linux: {
    x64: {
      name: `upx-${releaseVersion}-amd64_linux.tar.xz`,
      digest: '79cea8a50b6fa102d10c7b79a419cd77dead3cc2d78661de2dc5e5815dc505c1',
    },
    arm64: {
      name: `upx-${releaseVersion}-arm64_linux.tar.xz`,
      digest: '2a4afa860ac7aa6968f88df7841823746e5d00ba56affdf9342c2f5254fb776f',
    },
  },
};

export async function compressSea(executablePath) {
  if (process.platform === 'darwin') {
    const result = spawnSync('upx', ['--best', executablePath], { stdio: 'inherit' });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`UPX compression failed with exit code ${result.status ?? 'unknown'}`);
    }
    process.stdout.write('Compressed SEA executable with system UPX\n');
    return;
  }

  if (process.platform === 'linux') {
    // Node.js SEA places ELF program headers non-adjacently; UPX 5.3.0 rejects that layout with bad e_phoff.
    process.stdout.write('Skipping UPX compression on Linux: UPX cannot pack Node.js SEA ELF executables\n');
    return;
  }

  const asset = assets[process.platform]?.[process.arch];
  if (!asset) {
    throw new Error(`UPX ${releaseVersion} is not available for ${process.platform}/${process.arch}`);
  }

  const cacheDir = join(
    homedir(),
    '.cache',
    'gluefiles',
    'upx',
    releaseVersion,
    `${process.platform}-${process.arch}`,
  );
  const archivePath = join(cacheDir, asset.name);
  const extractionDir = join(cacheDir, 'extracted');
  const upxPath =
    process.platform === 'win32'
      ? join(extractionDir, `upx-${releaseVersion}-win64`, 'upx.exe')
      : join(extractionDir, asset.name.replace('.tar.xz', ''), 'upx');

  await mkdir(extractionDir, { recursive: true });

  const cachedBinaryIsValid = existsSync(upxPath)
    ? spawnSync(upxPath, ['--version'], { encoding: 'utf8' })
    : null;
  const hasValidCachedBinary =
    cachedBinaryIsValid?.status === 0 &&
    `${cachedBinaryIsValid.stdout}${cachedBinaryIsValid.stderr}`.includes(releaseVersion);

  if (!hasValidCachedBinary) {
    let archive = existsSync(archivePath) ? await readFile(archivePath) : null;
    let digest = archive ? createHash('sha256').update(archive).digest('hex') : null;

    if (digest !== asset.digest) {
      archive = null;
      digest = null;
    }

    if (!archive) {
      const response = await globalThis.fetch(
        `https://github.com/upx/upx/releases/download/v${releaseVersion}/${asset.name}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to download UPX ${releaseVersion}: ${response.status} ${response.statusText}`);
      }

      archive = Buffer.from(await response.arrayBuffer());
      digest = createHash('sha256').update(archive).digest('hex');
      if (digest !== asset.digest) {
        throw new Error(`UPX archive checksum mismatch for ${asset.name}`);
      }

      await writeFile(archivePath, archive);
    }

    if (digest !== asset.digest) {
      throw new Error(`UPX archive checksum mismatch for ${asset.name}`);
    }

    const args =
      process.platform === 'win32'
        ? ['-xf', archivePath, '-C', extractionDir]
        : ['-xJf', archivePath, '-C', extractionDir];
    const result = spawnSync('tar', args, { stdio: 'inherit' });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`UPX archive extraction failed with exit code ${result.status ?? 'unknown'}`);
    }
  }

  if (!existsSync(upxPath)) {
    throw new Error(`UPX executable was not found after extracting ${asset.name}`);
  }

  const result = spawnSync(upxPath, ['--best', executablePath], { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`UPX compression failed with exit code ${result.status ?? 'unknown'}`);
  }

  process.stdout.write(`Compressed SEA executable with UPX ${releaseVersion}\n`);
}
