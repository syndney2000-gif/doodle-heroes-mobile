// Export the actual native components for browser QA without changing app.json.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const preview = fs.mkdtempSync(path.join(os.tmpdir(), 'meadow-web-source-'));
const output = path.resolve(root, 'dist-web');
for (const name of ['App.js', 'index.js', 'package.json', 'src']) fs.cpSync(path.join(root, name), path.join(preview, name), { recursive: true });
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
config.expo.platforms = ['web'];
fs.writeFileSync(path.join(preview, 'app.json'), JSON.stringify(config));
fs.symlinkSync(fs.realpathSync(path.join(root, 'node_modules')), path.join(preview, 'node_modules'), 'dir');
execFileSync(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', output], { cwd: preview, stdio: 'inherit' });
console.log('Browser QA export: ' + output);
