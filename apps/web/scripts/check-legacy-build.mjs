import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const distDir = new URL('../dist/', import.meta.url);
const indexPath = new URL('index.html', distDir);

if (!existsSync(indexPath)) {
  throw new Error('Legacy build check failed: dist/index.html was not generated.');
}

const index = readFileSync(indexPath, 'utf8');
const legacyScripts = [...index.matchAll(/<script[^>]+(?:nomodule|data-src)[^>]*src="([^"]+)"/g)]
  .map((match) => match[1]);
const hasNomodule = /<script[^>]+nomodule[^>]*>/.test(index) || /<script[^>]+nomodule[^>]+src=/.test(index);

if (!hasNomodule || legacyScripts.length === 0) {
  throw new Error('Legacy build check failed: no legacy nomodule script found in dist/index.html.');
}

const assets = readdirSync(new URL('assets/', distDir)).filter((file) => file.endsWith('.js'));
const legacyAssets = assets.filter((file) => /polyfills-legacy|index-legacy|legacy/.test(file));
if (legacyAssets.length === 0) {
  throw new Error('Legacy build check failed: no legacy JavaScript asset found.');
}

const size = (file) => gzipSync(readFileSync(new URL(`assets/${file}`, distDir))).length;
const modernAssets = assets.filter((file) => !legacyAssets.includes(file));
const gzipBytes = (files) => files.reduce((total, file) => total + size(file), 0);

console.log(`Legacy build check passed: ${legacyAssets.length} legacy JS asset(s), ${gzipBytes(legacyAssets)} gzip bytes; ${modernAssets.length} modern JS asset(s), ${gzipBytes(modernAssets)} gzip bytes.`);
