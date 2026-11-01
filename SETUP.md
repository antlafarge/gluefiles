# APP

# Init project

```bash
npm init -y
npm install -D @eslint/js @types/node eslint prettier tsx typescript typescript-eslint
```

# Setup

## First time

```bash
npm install
```

## Build

```bash
npm run build
npm run build:sea
```

The SEA build creates a native executable in `dist` (`gluefiles.exe` on
Windows). Windows builds use UPX 5.3.0 from its official release; the archive
checksum is verified before extraction. Linux SEA executables are not
compressed because UPX cannot currently pack their ELF layout. The UPX binary
and archive for Windows are cached under `~/.cache/gluefiles/upx` and reused on
subsequent builds. macOS builds require UPX to be installed locally. Build it on
the target operating system with Node.js 26 or newer, which provides the
built-in SEA executable builder. When run in an interactive terminal, the SEA
executable waits for Enter before closing.

## Tools
```bash
npm run lint
npm run lint:fix
npm run format
```

## Start

```bash
npm run development
npm run test
npm run staging
npm run production
```
