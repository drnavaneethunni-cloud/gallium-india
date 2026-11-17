import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

// A complete, lossless source bundle split into files suitable for browser uploads.
const root = dirname(fileURLToPath(import.meta.url));
const source = resolve(root, '.gallium-build/source');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };

function unpack() {
  const manifest = JSON.parse(readFileSync(resolve(root, 'site-manifest.json'), 'utf8'));
  check(manifest.format === 1 && Array.isArray(manifest.chunks) && Array.isArray(manifest.files), 'Invalid site manifest. Upload the complete package.');
  check(Number.isSafeInteger(manifest.uncompressedBytes) && manifest.uncompressedBytes > 0 && manifest.uncompressedBytes <= 150 * 1024 * 1024, 'Invalid bundle size.');
  const chunks = manifest.chunks.map((chunk, index) => {
    const expected = `gallium-site-${String(index + 1).padStart(2, '0')}.bin`;
    check(chunk.file === expected, 'Invalid bundle filename.');
    const path = resolve(root, chunk.file);
    check(existsSync(path), `Missing ${chunk.file}. Upload all eight files to the repository root.`);
    const data = readFileSync(path);
    check(data.length === chunk.bytes && hash(data) === chunk.sha256, `Incomplete or changed ${chunk.file}. Upload that file again.`);
    return data;
  });
  const payload = gunzipSync(Buffer.concat(chunks), {maxOutputLength: manifest.uncompressedBytes});
  check(payload.length === manifest.uncompressedBytes && hash(payload) === manifest.sha256, 'The site bundle failed its integrity check.');
  let offset = 0;
  const paths = new Set();
  const files = manifest.files.map(file => {
    check(typeof file.path === 'string' && file.path.length > 0 && !isAbsolute(file.path) && !file.path.includes('\\'), 'Invalid source filename.');
    check(file.path.split('/').every(part => part !== '..' && part !== '.' && part !== ''), 'Invalid source path.');
    const target = resolve(source, file.path);
    check(target.startsWith(source + sep) && !paths.has(target), 'Duplicate or invalid source path.');
    paths.add(target);
    check(Number.isSafeInteger(file.offset) && file.offset === offset && Number.isSafeInteger(file.size) && file.size >= 0 && file.offset + file.size <= payload.length, 'Invalid source file size.');
    const data = payload.subarray(file.offset, file.offset + file.size);
    check(hash(data) === file.sha256, `Source verification failed: ${file.path}`);
    offset += file.size;
    return {target, data};
  });
  check(offset === payload.length, 'Unexpected data in site bundle.');
  check(paths.has(resolve(source, 'public/index.html')), 'The homepage is missing from the bundle.');
  rmSync(source, {recursive: true, force: true});
  for (const {target, data} of files) {
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, data);
  }
  console.log(`Restored and verified ${files.length} original project files.`);
}

try {
  const mode = process.argv[2];
  check(process.argv.length <= 3 && (!mode || mode === '--test' || mode === '--unpack'), 'Usage: node build.mjs [--test|--unpack]');
  unpack();
  if (mode === '--test') {
    const tests = readdirSync(resolve(source, 'tests')).filter(name => name.endsWith('.test.mjs')).sort();
    check(tests.length > 0, 'No tests were found.');
    const result = spawnSync(process.execPath, ['--test', ...tests.map(name => `tests/${name}`)], {cwd: source, stdio: 'inherit'});
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } else if (mode === '--unpack') {
    console.log('Editable source is available in .gallium-build/source/.');
  } else {
    const output = resolve(root, 'dist');
    rmSync(output, {recursive: true, force: true});
    cpSync(resolve(source, 'public'), output, {recursive: true});
    console.log('Gallium website built successfully in dist/.');
  }
} catch (error) {
  console.error(`Gallium build failed: ${error.message}`);
  process.exitCode = 1;
}
