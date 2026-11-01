import { createReadStream, createWriteStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { isSea } from "node:sea";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

async function main() {
    try {
        const dirents = await readdir('.', { recursive: false, withFileTypes: true });
        const filesToGlue = new Map<string, string[]>();

        for (const dirent of dirents) {
            if (dirent.isFile()) {
                const match = dirent.name.match(/^(.+?)(?:\.(?:part)?)?(\d+)$/i);

                if (match?.length && match[1]?.length && match[2]?.length) {
                    const fileName = match[1];
                    const id = Number(match[2]);

                    if (!filesToGlue.has(fileName)) {
                        filesToGlue.set(fileName, []);
                    }

                    const parts = filesToGlue.get(fileName)!;

                    if (parts[id]?.length) {
                        console.warn(`File ${parts[id]} conflicts with ${dirent.name}`);

                        continue;
                    }

                    parts[id] = dirent.name;
                }
            }
        }

        for (const [fileName, parts] of filesToGlue) {
            if (!parts[0]?.length) {
                parts.shift();
            }

            if (parts.length < 2) {
                continue;
            }

            let missingPart = false;

            for (let i = 0, sz = parts.length; i < sz; i++) {
                if (!parts[i]?.length) {
                    missingPart = true;

                    break;
                }
            }

            if (missingPart) {
                continue;
            }

            console.log(`Glue ${fileName}`);

            const readStream = Readable.from(async function* () {
                for (const part of parts) {
                    console.log(`\tGlue ${part}`);

                    for await (const chunk of createReadStream(part)) {
                        yield chunk;
                    }
                }
            }());

            const writeStream = createWriteStream(fileName, { flags: 'wx' });

            await pipeline(readStream, writeStream);

            console.log('Glued');
        }
    } catch (error) {
        console.error(error);

        process.exitCode = 1;
    } finally {
        if (isSea() && process.stdin.isTTY && process.stdout.isTTY) {
            const readline = createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            try {
                await readline.question("\nPress [Enter] to quit...");
            } finally {
                readline.close();
            }
        }
    }
}

void main();
