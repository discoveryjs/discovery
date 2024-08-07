import { scanFs } from '@discoveryjs/scan-fs';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'child_process';
import esbuild from 'esbuild';

const srcpath = resolvePath('../src');
const dstpath = resolvePath('../lib');

function resolvePath(p) {
    return new URL(p, import.meta.url).pathname;
}

export async function compile() {
    const startTime = Date.now();

    for (const file of (await scanFs(srcpath)).files) {
        const srcAbsPath = path.join(srcpath, file.path);
        let dstAbsPath = path.join(dstpath, file.path);

        if (path.extname(srcAbsPath) === '.ts') {
            // ignore .ts files when .js file exists
            if (fs.existsSync(srcAbsPath.replace(/\.ts$/, '.js'))) {
                continue;
            }

            const { code } = await esbuild.transform(fs.readFileSync(srcAbsPath), {
                loader: 'ts'
            });

            dstAbsPath = dstAbsPath.replace(/\.ts$/, '.js');
            await fs.promises.mkdir(path.dirname(dstAbsPath), { recursive: true });
            await fs.promises.writeFile(dstAbsPath, code);
        } else if (path.basename(srcAbsPath) === 'version.js') {
            await fs.promises.mkdir(path.dirname(dstAbsPath), { recursive: true });
            await fs.promises.writeFile(dstAbsPath, `export const version = "${JSON.parse(fs.readFileSync(resolvePath('../package.json'))).version}";\n`);
        } else {
            await fs.promises.mkdir(path.dirname(dstAbsPath), { recursive: true });
            await fs.promises.copyFile(srcAbsPath, dstAbsPath);
        }
    }

    try {
        execSync('npm run emit:types', {
            cwd: resolvePath('..'),
            stdio: 'inherit'
        });
    } catch {}

    console.log(`Compiled in ${Date.now() - startTime} ms`);
}

compile();
