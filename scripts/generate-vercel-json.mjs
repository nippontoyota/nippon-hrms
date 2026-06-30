#!/usr/bin/env node
/**
 * Generate apps/web/vercel.json from your Railway API URL.
 *
 * Usage:
 *   node scripts/generate-vercel-json.mjs https://your-api.up.railway.app
 *
 * Or set RAILWAY_API_URL:
 *   set RAILWAY_API_URL=https://your-api.up.railway.app
 *   node scripts/generate-vercel-json.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'apps', 'web', 'vercel.json');

const raw = process.argv[2] || process.env.RAILWAY_API_URL || '';
if (!raw) {
  console.error('Usage: node scripts/generate-vercel-json.mjs <RAILWAY_API_URL>');
  console.error('Example: node scripts/generate-vercel-json.mjs https://payslip-api.up.railway.app');
  process.exit(1);
}

let base = raw.trim().replace(/\/+$/, '');
if (!base.startsWith('http://') && !base.startsWith('https://')) {
  base = `https://${base}`;
}

let host;
try {
  host = new URL(base);
} catch {
  console.error(`Invalid URL: ${raw}`);
  process.exit(1);
}

const destination = `${host.origin}/api/:path*`;

const vercel = {
  rewrites: [
    {
      source: '/api/:path*',
      destination,
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
};

fs.writeFileSync(outPath, `${JSON.stringify(vercel, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
console.log(`  /api/* -> ${destination}`);
