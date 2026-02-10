import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Reads a key from a .env file in the workspace root.
 * Returns undefined if the file or key is not found.
 */
export function readEnvValue(key: string): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env');

    if (!fs.existsSync(envPath)) {
        return undefined;
    }

    try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) {
                continue;
            }

            const envKey = trimmed.substring(0, eqIndex).trim();
            let envValue = trimmed.substring(eqIndex + 1).trim();

            // Remove surrounding quotes if present
            if (
                (envValue.startsWith('"') && envValue.endsWith('"')) ||
                (envValue.startsWith("'") && envValue.endsWith("'"))
            ) {
                envValue = envValue.slice(1, -1);
            }

            if (envKey === key) {
                return envValue;
            }
        }
    } catch {
        // Silently fail — .env reading is best-effort
    }

    return undefined;
}
