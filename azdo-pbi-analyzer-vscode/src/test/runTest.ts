import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../').replace('Prompt Manager', 'PROMPT~1');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index').replace('Prompt Manager', 'PROMPT~1');

        const os = require('os');
        const testRunDir = path.join(os.tmpdir(), 'vscode-test-custom');
        const extensionsDir = path.join(testRunDir, 'extensions');
        const userDataDir = path.join(testRunDir, 'user-data');

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                `--extensions-dir=${extensionsDir}`,
                `--user-data-dir=${userDataDir}`
            ]
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
