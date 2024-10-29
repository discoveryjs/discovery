import { scanFs } from '@discoveryjs/scan-fs';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'child_process';
import esbuild from 'esbuild';

const srcpath = resolvePath('../src');
const dstpath = resolvePath('../lib');
const dstVersionFilename = path.join(dstpath, 'version.js');
const { version } = JSON.parse(fs.readFileSync(resolvePath('../package.json')));

function resolvePath(p) {
    return new URL(p, import.meta.url).pathname;
}

function replaceFileContent(filename, fn) {
    fs.writeFileSync(
        filename,
        fn(fs.readFileSync(filename, 'utf8'))
    );
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

    replaceFileContent(dstVersionFilename, content => content.replace('0.0.0-dev', version));
    replaceFileContent(dstVersionFilename.replace('.js', '.d.ts'), content => content.replace('0.0.0-dev', version));

    console.log(`Compiled in ${Date.now() - startTime} ms`);
}

compile();
