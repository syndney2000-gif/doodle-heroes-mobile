// Build an app-only branch without changing the checkout or duplicating source.
// Usage: npm run snack; git push origin snack
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const git = (args, input) => execFileSync('git', args, { input, encoding: 'utf8' }).trim();
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const files = new Map();
for (const filename of git(['ls-files', '-z', '--', 'App.js', 'src']).split('\0').filter(Boolean)) {
  if (!/\.(js|jsx|ts|tsx|json)$/.test(filename)) throw new Error(`Unexpected app file: ${filename}`);
  files.set(filename, readFileSync(filename, 'utf8'));
}
files.set('package.json', JSON.stringify({ name: manifest.name, version: manifest.version, private: true, dependencies: manifest.dependencies }, null, 2) + '\n');
files.set('app.json', readFileSync('app.json', 'utf8'));
files.set('README.md', '# Meadow Tiles · Snack\n\nThis branch contains only the native app source. Use Expo SDK 55.\n\nThe complete project, tests, design previews and development instructions are on main.\nRegenerate this branch from main with npm run snack. Do not edit generated files here.\n');
const root = new Map();
for (const [filename, contents] of files) {
  const parts = filename.split('/');
  const name = parts.pop();
  let directory = root;
  for (const part of parts) {
    if (!directory.has(part)) directory.set(part, new Map());
    directory = directory.get(part);
  }
  directory.set(name, git(['hash-object', '-w', '--stdin'], contents));
}
function tree(directory) {
  const entries = [...directory].map(([name, item]) => item instanceof Map
    ? { name, mode: '040000', type: 'tree', hash: tree(item), key: `${name}/` }
    : { name, mode: '100644', type: 'blob', hash: item, key: name });
  entries.sort((a, b) => Buffer.compare(Buffer.from(a.key), Buffer.from(b.key)));
  return git(['mktree'], entries.map(e => `${e.mode} ${e.type} ${e.hash}\t${e.name}\n`).join(''));
}
const nextTree = tree(root);
let previous;
try { previous = git(['rev-parse', '--verify', 'refs/heads/snack']); } catch { /* First export. */ }
if (previous && git(['rev-parse', `${previous}^{tree}`]) === nextTree) {
  console.log('Snack branch already matches app source.'); process.exit(0);
}
const revision = git(['rev-parse', '--short', 'HEAD']);
const commit = git(['commit-tree', nextTree, ...(previous ? ['-p', previous] : []), '-m', `Export native app for Snack from ${revision}`]);
git(['update-ref', 'refs/heads/snack', commit, previous || '0000000000000000000000000000000000000000']);
console.log(`Updated snack branch (${commit.slice(0, 7)}): ${files.size} source/config files; no assets or dev dependencies.`);
