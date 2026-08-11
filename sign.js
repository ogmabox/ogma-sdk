#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function usage() {
  process.stderr.write('Usage: ogma-plugin-sign <plugin-directory> --key <ed25519-private-key.pem>\n');
  process.exit(2);
}

const args = process.argv.slice(2);
const keyIndex = args.indexOf('--key');
if (args.length < 3 || keyIndex < 0 || !args[keyIndex + 1]) usage();

const root = path.resolve(args[0]);
const keyPath = path.resolve(args[keyIndex + 1]);
const manifestPath = path.join(root, 'manifest.json');
const skippedDirectories = new Set(['node_modules', '.git', '.svn', '.cache', '.npm', '.yarn']);

function canonicalString(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalString).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalString(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new Error('Signed manifests may only contain safe integer numbers');
  }
  return JSON.stringify(value);
}

function ignoredDirectories() {
  const ignorePath = path.join(root, '.ogmaignore');
  if (!fs.existsSync(ignorePath)) return skippedDirectories;
  for (const line of fs.readFileSync(ignorePath, 'utf8').split(/\r?\n/)) {
    const value = line.trim();
    if (value && !value.startsWith('#')) skippedDirectories.add(value);
  }
  return skippedDirectories;
}

function inventory(directory, ignored, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${entry.name}`);
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) inventory(absolute, ignored, files);
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
  return files.sort();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
delete manifest.signature;

const digest = crypto.createHash('sha256');
digest.update('ogma-plugin-signature-v1\n');
digest.update(crypto.createHash('sha256').update(canonicalString(manifest)).digest());
digest.update('\tmanifest.json\n');
for (const relative of inventory(root, ignoredDirectories())) {
  if (relative === 'manifest.json') continue;
  const fileHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
  digest.update(`${fileHash}\t${relative}\n`);
}

const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('Signing key must be Ed25519');
const publicDer = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
const publicKey = publicDer.subarray(publicDer.length - 32);
const signature = crypto.sign(null, digest.digest(), privateKey);

manifest.signature = {
  algorithm: 'ed25519',
  public_key: publicKey.toString('base64'),
  value: signature.toString('base64'),
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Signed ${manifest.id} ${manifest.version}\n`);
