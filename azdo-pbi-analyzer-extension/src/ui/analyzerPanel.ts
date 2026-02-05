import * as vscode from 'vscode';
import { AzdoClient } from '../services/azdoClient';
import { PbiAnalyzer } from '../services/analyzer';
import { TestGenerator } from '../services/generator';
import { ConfigurationManager } from '../config/configuration';

export class AnalyzerPanel {
    public static currentPanel: AnalyzerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, private extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent();
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(extensionUri: vscode.Uri) {
        if (AnalyzerPanel.currentPanel) {
            AnalyzerPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'pbiAnalyzer',
                'AzDO PBI Analyzer',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            AnalyzerPanel.currentPanel = new AnalyzerPanel(panel, extensionUri);
        }
    }

    public dispose() {
        AnalyzerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                const command = message.command;
                const text = message.text;

                switch (command) {
                    case 'analyze':
                        await this._handleAnalyze(text);
                        return;
                    case 'generate':
                        await this._handleGenerate(text);
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private async _handleAnalyze(pbiId: string) {
        // Logic to analyze
        try {
            const id = parseInt(pbiId);
            if (isNaN(id)) throw new Error('Invalid ID');

            const context: any = (global as any).testContext; // Hack: need access to context/services. better DI needed later.
            // Re-instantiating services here for simplicity in this MVP file structure
            // In a real app, pass these in via constructor or DI container
            const config = new ConfigurationManager((AnalyzerPanel.currentPanel as any)._extensionContext);
            const client = new AzdoClient(config);
            const analyzer = new PbiAnalyzer();

            this._postMessage({ command: 'status', text: 'Fetching PBI...' });
            const workItem = await client.getWorkItem(id);

            this._postMessage({ command: 'status', text: 'Analyzing...' });
            const analysis = analyzer.analyze(workItem);

            this._postMessage({
                command: 'result',
                data: { workItem, analysis }
            });

        } catch (error: any) {
            this._postMessage({ command: 'error', text: error.message });
        }
    }

    private async _handleGenerate(pbiId: string) {
        try {
            const id = parseInt(pbiId);
            if (isNaN(id)) throw new Error('Invalid ID');

            // DI Hack again
            const context: any = (global as any).testContext;
            const config = new ConfigurationManager((AnalyzerPanel.currentPanel as any)._extensionContext);
            const client = new AzdoClient(config);
            const generator = new TestGenerator();

            const workItem = await client.getWorkItem(id);
            const gherkin = generator.generateGherkin(workItem);
            const cypress = generator.generateCypress(workItem);

            // Write files to workspace
            if (vscode.workspace.workspaceFolders) {
                const root = vscode.workspace.workspaceFolders[0].uri;
                const featureUri = vscode.Uri.joinPath(root, 'specs', `${id}.feature`);
                const specUri = vscode.Uri.joinPath(root, 'cypress', 'e2e', `${id}.cy.ts`);

                await vscode.workspace.fs.writeFile(featureUri, Buffer.from(gherkin));
                await vscode.workspace.fs.writeFile(specUri, Buffer.from(cypress));

                vscode.window.showInformationMessage(`Generated files for PBI ${id}`);
                this._postMessage({ command: 'status', text: `Files generated: ${id}.feature, ${id}.cy.ts` });
            } else {
                vscode.window.showErrorMessage('No workspace open to save files.');
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
        }
    }

    private _postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    private _getWebviewContent() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    .card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); padding: 15px; margin-bottom: 10px; border-radius: 5px; }
                    .score { font-size: 2em; font-weight: bold; }
                    .good { color: green; }
                    .bad { color: red; }
                    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    input { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px; }
                </style>
            </head>
            <body>
                <h1>PBI Analyzer</h1>
                <div class="card">
                    <label>PBI ID:</label>
                    <input type="text" id="pbiId" placeholder="e.g. 12345" />
                    <button id="analyzeBtn">Analyze</button>
                </div>
                <div id="status"></div>
                <div id="results" style="display:none;">
                    <div class="card">
                        <h2>Quality Score</h2>
                        <div id="scoreDisplay" class="score"></div>
                        <div id="issuesList"></div>
                    </div>
                    <button id="generateBtn">Generate Tests</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const analyzeBtn = document.getElementById('analyzeBtn');
                    const generateBtn = document.getElementById('generateBtn');
                    const pbiInput = document.getElementById('pbiId');

                    analyzeBtn.addEventListener('click', () => {
                        const id = pbiInput.value;
                        if(id) {
                            vscode.postMessage({ command: 'analyze', text: id });
                        }
                    });

                    generateBtn.addEventListener('click', () => {
                        const id = pbiInput.value;
                        vscode.postMessage({ command: 'generate', text: id });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'status':
                                document.getElementById('status').innerText = message.text;
                                break;
                            case 'error':
                                document.getElementById('status').innerText = 'Error: ' + message.text;
                                document.getElementById('status').style.color = 'red';
                                break;
                            case 'result':
                                const data = message.data;
                                document.getElementById('results').style.display = 'block';
                                const scoreEl = document.getElementById('scoreDisplay');
                                scoreEl.innerText = data.analysis.score + '/100';
                                scoreEl.className = 'score ' + (data.analysis.score > 80 ? 'good' : 'bad');
                                
                                const list = document.getElementById('issuesList');
                                list.innerHTML = '<h3>Issues:</h3>' + 
                                    (data.analysis.issues.length ? '<ul>' + data.analysis.issues.map(i => '<li>' + i + '</li>').join('') + '</ul>' : '<p>None!</p>') +
                                    '<h3>Suggestions:</h3>' + 
                                    (data.analysis.suggestions.length ? '<ul>' + data.analysis.suggestions.map(s => '<li>' + s + '</li>').join('') + '</ul>' : '<p>None!</p>');
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
