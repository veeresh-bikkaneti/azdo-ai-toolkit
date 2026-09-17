import * as assert from 'assert';
import * as vscode from 'vscode';

const EXPECTED_COMMANDS = [
    'azdoPbiAnalyzer.analyzePbi',
    'azdoPbiAnalyzer.openPanel',
    'azdoPbiAnalyzer.installAgents',
    'azdoPbiAnalyzer.setAiApiKey',
    'azdoPbiAnalyzer.clearAiApiKey',
];

const EXPECTED_CONFIG_KEYS = [
    'azdoPbiAnalyzer.organization',
    'azdoPbiAnalyzer.aiEnabled',
    'azdoPbiAnalyzer.aiProvider',
    'azdoPbiAnalyzer.aiModel',
    'azdoPbiAnalyzer.aiEndpoint',
];

suite('Extension manifest wiring', () => {
    test('extension activates', async () => {
        const ext = vscode.extensions.getExtension('RUNTechnologyConsultingServicesLLC.azdo-pbi-analyzer');
        assert.ok(ext, 'extension should be installed in the test host');
        await ext?.activate();
        assert.strictEqual(ext?.isActive, true);
    });

    test('all contributed commands are registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        for (const id of EXPECTED_COMMANDS) {
            assert.ok(commands.includes(id), `command not registered: ${id}`);
        }
    });

    test('configuration properties exist with sane defaults', () => {
        const config = vscode.workspace.getConfiguration();
        for (const key of EXPECTED_CONFIG_KEYS) {
            const inspected = config.inspect(key);
            assert.ok(inspected, `configuration key missing: ${key}`);
        }
        assert.strictEqual(config.get<string>('azdoPbiAnalyzer.aiProvider'), 'vscode');
        assert.strictEqual(config.get<boolean>('azdoPbiAnalyzer.aiEnabled'), true);
    });
});
