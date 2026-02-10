import * as vscode from 'vscode';
import { DevOpsClient } from '../api/DevOpsClient';
import { PbiAnalyzer, AnalysisResult } from '../analyzers/PbiAnalyzer';
import { OutputWriter } from '../output/OutputWriter';
import { readEnvValue } from '../utils/envReader';

export class AnalyzerPanel {
    public static currentPanel: AnalyzerPanel | undefined;
    private static readonly viewType = 'azdoPbiAnalyzer';
    private static readonly patKey = 'azdoPbiAnalyzer.pat';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(context: vscode.ExtensionContext, pbiUrl?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (AnalyzerPanel.currentPanel) {
            AnalyzerPanel.currentPanel._panel.reveal(column);
            if (pbiUrl) {
                AnalyzerPanel.currentPanel._sendPbiUrl(pbiUrl);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            AnalyzerPanel.viewType,
            'Azure DevOps PBI Analyzer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        AnalyzerPanel.currentPanel = new AnalyzerPanel(panel, context, pbiUrl);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        pbiUrl?: string
    ) {
        this._panel = panel;
        this._context = context;

        this._update(pbiUrl);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'analyzePbi':
                        await this._handleAnalyzePbi(message.pbiUrl, message.pat);
                        break;
                    case 'error':
                        vscode.window.showErrorMessage(message.text);
                        break;
                    case 'info':
                        vscode.window.showInformationMessage(message.text);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private _sendPbiUrl(pbiUrl: string) {
        this._panel.webview.postMessage({ command: 'setPbiUrl', pbiUrl });
    }

    private async _resolvePat(userProvidedPat: string): Promise<string> {
        // 1. User-provided PAT
        if (userProvidedPat) {
            await this._context.secrets.store(AnalyzerPanel.patKey, userProvidedPat);
            return userProvidedPat;
        }

        // 2. .env file in workspace root
        const envPat = readEnvValue('AZDO_PAT');
        if (envPat) {
            return envPat;
        }

        // 3. VS Code secrets store
        const storedPat = await this._context.secrets.get(AnalyzerPanel.patKey);
        if (storedPat) {
            return storedPat;
        }

        throw new Error(
            'Personal Access Token (PAT) is required. ' +
            'Provide it in the input field, add AZDO_PAT to your workspace .env file, ' +
            'or it will be remembered after first use.'
        );
    }

    private async _handleAnalyzePbi(pbiUrl: string, pat: string) {
        try {
            this._postStatus('Parsing PBI URL...');

            const pbiInfo = DevOpsClient.parsePbiUrl(pbiUrl);
            if (!pbiInfo) {
                throw new Error(
                    'Invalid PBI URL. Expected format: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}'
                );
            }

            this._postStatus('Resolving PAT...');
            const finalPat = await this._resolvePat(pat);

            this._postStatus(`Fetching PBI ${pbiInfo.id} from Azure DevOps...`);
            const client = new DevOpsClient(pbiInfo.orgUrl, finalPat);
            const workItem = await client.getWorkItem(pbiInfo.id, pbiInfo.project);

            if (!workItem) {
                throw new Error(`Work item ${pbiInfo.id} not found.`);
            }

            this._postStatus('Fetching parent epic/feature...');
            const parentItem = await client.getParentWorkItem(workItem);

            this._postStatus('Fetching related work items...');
            const relatedItems = await client.getRelatedWorkItems(workItem, 10);

            this._postStatus('Analyzing requirements and generating artifacts...');
            const analyzer = new PbiAnalyzer();
            const result = analyzer.analyze(workItem, parentItem, relatedItems);

            this._postStatus('Saving artifacts to workspace...');
            const outputWriter = new OutputWriter();
            const outputDir = await outputWriter.write(result);

            this._panel.webview.postMessage({
                command: 'analysisComplete',
                data: result,
                outputDir,
            });

            vscode.window.showInformationMessage(
                `PBI ${pbiInfo.id} analyzed! Artifacts saved to: pbi/${pbiInfo.id}/`
            );
        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'error',
                message: error.message || 'Failed to analyze PBI',
            });
        }
    }

    private _postStatus(status: string) {
        this._panel.webview.postMessage({ command: 'analyzing', status });
    }

    private async _update(pbiUrl?: string) {
        const storedPat = await this._context.secrets.get(AnalyzerPanel.patKey);
        const envPat = readEnvValue('AZDO_PAT');
        const hasStoredPat = !!(storedPat || envPat);
        this._panel.webview.html = this._getHtmlForWebview(pbiUrl, hasStoredPat);
    }

    private _getHtmlForWebview(pbiUrl?: string, hasStoredPat?: boolean) {
        const patHint = hasStoredPat
            ? 'PAT detected (from .env or saved). Leave blank to use it.'
            : 'Your Azure DevOps PAT (stored securely, or add AZDO_PAT to .env)';

        const patStatus = hasStoredPat
            ? '✅ PAT available. Enter a new one to override.'
            : 'Add AZDO_PAT=your_token to a .env file in workspace root, or enter it here.';

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure DevOps PBI Analyzer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }

        .container { max-width: 960px; margin: 0 auto; }

        h1 { font-size: 22px; margin-bottom: 16px; }
        h2 { font-size: 18px; margin: 16px 0 10px; }
        h3 { font-size: 15px; margin: 12px 0 6px; }

        .input-section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border, #444);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .form-group { margin-bottom: 12px; }

        label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            font-size: 13px;
        }

        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 8px 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, #555);
            border-radius: 4px;
            font-size: 13px;
        }

        input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .hint {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        }

        button:hover { background: var(--vscode-button-hoverBackground); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        .status {
            margin: 12px 0;
            padding: 10px 14px;
            background: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-charts-blue);
            border-radius: 4px;
            font-size: 13px;
            display: none;
        }

        .status.visible { display: block; }

        .results { display: none; }
        .results.visible { display: block; }

        .section {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border, #333);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .output-path {
            background: var(--vscode-textCodeBlock-background);
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            margin-bottom: 16px;
        }

        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .tag-smoke { background: #1a6b1a; color: #fff; }
        .tag-critical { background: #b33030; color: #fff; }
        .tag-non-regression { background: #4a4a8a; color: #fff; }

        ul, ol { margin-left: 20px; margin-top: 4px; }
        li { margin-bottom: 4px; font-size: 13px; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 12px;
        }

        th, td {
            border: 1px solid var(--vscode-panel-border, #444);
            padding: 6px 10px;
            text-align: left;
        }

        th {
            background: var(--vscode-textCodeBlock-background);
            font-weight: 600;
        }

        .error-banner {
            background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
            border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
            border-radius: 4px;
            padding: 10px 14px;
            margin: 12px 0;
            display: none;
        }

        .error-banner.visible { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Azure DevOps PBI Analyzer</h1>

        <div class="input-section">
            <div class="form-group">
                <label for="pbiUrl">PBI URL</label>
                <input
                    type="text"
                    id="pbiUrl"
                    placeholder="https://dev.azure.com/org/project/_workitems/edit/12345"
                    value="${pbiUrl || ''}"
                />
            </div>

            <div class="form-group">
                <label for="pat">Personal Access Token (PAT)</label>
                <input
                    type="password"
                    id="pat"
                    placeholder="${patHint}"
                />
                <div class="hint">${patStatus}</div>
            </div>

            <button id="analyzeBtn" onclick="analyzePbi()">🚀 Analyze PBI</button>
        </div>

        <div id="status" class="status"></div>
        <div id="errorBanner" class="error-banner"></div>

        <div id="results" class="results">
            <div id="outputPath" class="output-path"></div>

            <div class="section">
                <h2>📋 Story Analysis</h2>
                <pre id="storyAnalysis"></pre>
            </div>

            <div class="section">
                <h2>🧪 Test Scenarios</h2>
                <div id="testScenarios"></div>
            </div>

            <div class="section">
                <h2>📝 Manual Test Cases</h2>
                <pre id="manualTests"></pre>
            </div>

            <div class="section">
                <h2>🥒 Gherkin Specification</h2>
                <pre id="gherkinCode"></pre>
            </div>

            <div class="section">
                <h2>🌲 Cypress Pseudo-code</h2>
                <pre id="cypressCode"></pre>
            </div>

            <div class="section">
                <h2>🎭 Playwright Pseudo-code</h2>
                <pre id="playwrightCode"></pre>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function analyzePbi() {
            const pbiUrl = document.getElementById('pbiUrl').value.trim();
            const pat = document.getElementById('pat').value.trim();

            if (!pbiUrl) {
                vscode.postMessage({ command: 'error', text: 'Please enter a PBI URL' });
                return;
            }

            document.getElementById('analyzeBtn').disabled = true;
            document.getElementById('errorBanner').classList.remove('visible');
            document.getElementById('results').classList.remove('visible');
            showStatus('Starting analysis...');

            vscode.postMessage({ command: 'analyzePbi', pbiUrl, pat });
        }

        function showStatus(message) {
            const el = document.getElementById('status');
            el.textContent = message;
            el.classList.add('visible');
        }

        function hideStatus() {
            document.getElementById('status').classList.remove('visible');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showResults(data, outputDir) {
            hideStatus();
            document.getElementById('analyzeBtn').disabled = false;

            // Output path
            if (outputDir) {
                document.getElementById('outputPath').textContent = '📁 Artifacts saved to: ' + outputDir;
            }

            // Story analysis (plain text, already markdown)
            document.getElementById('storyAnalysis').textContent = data.analysis.storyAnalysis;

            // Test scenarios
            const scenariosHtml = data.analysis.testScenarios.map(function(s) {
                const tagClass = 'tag-' + s.tag.replace(' ', '-');
                const stepsHtml = s.steps.map(function(step, i) {
                    return '<li>' + escapeHtml(step) + '</li>';
                }).join('');

                return '<div style="margin-bottom:12px;padding:10px;background:var(--vscode-textCodeBlock-background);border-radius:4px;">'
                    + '<span class="tag ' + tagClass + '">' + escapeHtml(s.tag) + '</span> '
                    + '<strong>' + escapeHtml(s.title) + '</strong>'
                    + '<ol style="margin-top:6px;">' + stepsHtml + '</ol>'
                    + '<div style="margin-top:6px;"><strong>Expected:</strong> ' + escapeHtml(s.expected) + '</div>'
                    + '</div>';
            }).join('');
            document.getElementById('testScenarios').innerHTML = scenariosHtml;

            // Manual tests
            document.getElementById('manualTests').textContent = data.analysis.manualTestsMd;

            // Gherkin
            document.getElementById('gherkinCode').textContent = data.analysis.gherkin;

            // Cypress
            document.getElementById('cypressCode').textContent = data.analysis.cypressPseudo;

            // Playwright
            document.getElementById('playwrightCode').textContent = data.analysis.playwrightPseudo;

            document.getElementById('results').classList.add('visible');
        }

        function showError(message) {
            hideStatus();
            document.getElementById('analyzeBtn').disabled = false;
            const el = document.getElementById('errorBanner');
            el.textContent = '❌ ' + message;
            el.classList.add('visible');
        }

        window.addEventListener('message', function(event) {
            const message = event.data;

            switch (message.command) {
                case 'setPbiUrl':
                    document.getElementById('pbiUrl').value = message.pbiUrl;
                    break;
                case 'analyzing':
                    showStatus(message.status);
                    break;
                case 'analysisComplete':
                    showResults(message.data, message.outputDir);
                    break;
                case 'error':
                    showError(message.message);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose() {
        AnalyzerPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
