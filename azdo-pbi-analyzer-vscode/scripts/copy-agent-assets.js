/**
 * Copies the agent-assets/.agent corpus into dist/assets/.agent so the
 * packaged extension can install it via the "Install AI Agents" command.
 * Run as part of compile / watch / package.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'agent-assets', '.agent');
const dest = path.join(root, 'dist', 'assets', '.agent');

if (!fs.existsSync(src)) {
    console.error(`[copy-agent-assets] source not found: ${src}`);
    process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

const count = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).reduce(
        (n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1),
        0
    );
console.log(`[copy-agent-assets] copied ${count(dest)} files -> ${dest}`);
