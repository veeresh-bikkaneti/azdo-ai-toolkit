import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class AnalyzerPanel {
    public static currentPanel: AnalyzerPanel | undefined;
    private static readonly viewType = 'azdoPbiAnalyzer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, pbiUrl?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (AnalyzerPanel.currentPanel) {
            AnalyzerPanel.currentPanel._panel.reveal(column);
            if (pbiUrl) {
                AnalyzerPanel.currentPanel._sendPbiUrl(pbiUrl);
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            AnalyzerPanel.viewType,
            'Azure DevOps PBI Analyzer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')],
                retainContextWhenHidden: true
            }
        );

        AnalyzerPanel.currentPanel = new AnalyzerPanel(panel, extensionUri, pbiUrl);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, pbiUrl?: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(pbiUrl);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
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
        this._panel.webview.postMessage({
            command: 'setPbiUrl',
            pbiUrl: pbiUrl
        });
    }

    private async _handleAnalyzePbi(pbiUrl: string, pat: string) {
        try {
            // Send "analyzing" status
            this._panel.webview.postMessage({
                command: 'analyzing',
                status: 'Starting analysis...'
            });

            // TODO: Implement actual PBI analysis
            // For now, send mock data
            setTimeout(() => {
                this._panel.webview.postMessage({
                    command: 'analysisComplete',
                    data: {
                        pbi: {
                            id: '12345',
                            title: 'Sample PBI Title',
                            description: 'Sample PBI description that would come from Azure DevOps API',
                            acceptanceCriteria: [
                                'User can log in with valid credentials',
                                'Error message displayed for invalid credentials',
                                'Session persists after page refresh'
                            ]
                        },
                        analysis: {
                            testScenarios: [
                                {
                                    title: 'Valid Login',
                                    steps: ['Navigate to login page', 'Enter valid credentials', 'Click login button'],
                                    expected: 'User is redirected to dashboard'
                                },
                                {
                                    title: 'Invalid Login',
                                    steps: ['Navigate to login page', 'Enter invalid credentials', 'Click login button'],
                                    expected: 'Error message is displayed'
                                }
                            ],
                            gherkin: `Feature: User Login\n\nScenario: Successful login with valid credentials\n  Given the user is on the login page\n  When the user enters valid credentials\n  And clicks the login button\n  Then the user should be redirected to the dashboard\n\nScenario: Failed login with invalid credentials\n  Given the user is on the login page\n  When the user enters invalid credentials\n  And clicks the login button\n  Then an error message should be displayed`,
                            cypress: `describe('User Login', () => {\n  it('should login successfully with valid credentials', () => {\n    cy.visit('/login');\n    cy.get('[data-testid=\"username\"]').type('validuser');\n    cy.get('[data-testid=\"password\"]').type('validpass');\n    cy.get('[data-testid=\"login-button\"]').click();\n    cy.url().should('include', '/dashboard');\n  });\n\n  it('should show error with invalid credentials', () => {\n    cy.visit('/login');\n    cy.get('[data-testid=\"username\"]').type('invaliduser');\n    cy.get('[data-testid=\"password\"]').type('invalidpass');\n    cy.get('[data-testid=\"login-button\"]').click();\n    cy.get('[data-testid=\"error-message\"]').should('be.visible');\n  });\n});`
                        }
                    }
                });
            }, 2000);

        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'error',
                message: error.message || 'Failed to analyze PBI'
            });
        }
    }

    private _update(pbiUrl?: string) {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview, pbiUrl);
    }

    private _getHtmlForWebview(webview: vscode.Webview, pbiUrl?: string) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure DevOps PBI Analyzer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        h1 {
            font-size: 24px;
            margin-bottom: 20px;
            color: var(--vscode-editor-foreground);
        }
        
        .input-section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--vscode-editor-foreground);
        }
        
        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 8px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 14px;
        }
        
        input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .status {
            margin: 20px 0;
            padding: 10px;
            background: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-charts-blue);
            border-radius: 3px;
            display: none;
        }
        
        .status.visible {
            display: block;
        }
        
        .results {
            display: none;
        }
        
        .results.visible {
            display: block;
        }
        
        .result-section {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .result-section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: var(--vscode-editor-foreground);
        }
        
        .result-section h3 {
            font-size: 16px;
            margin: 15px 0 10px 0;
            color: var(--vscode-editor-foreground);
        }
        
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 3px;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .scenario {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 3px;
            margin-bottom: 10px;
        }
        
        .scenario-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-charts-blue);
        }
        
        .copy-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            margin-top: 10px;
        }
        
        .copy-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        ul {
            margin-left: 20px;
            margin-top: 5px;
        }
        
        li {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Azure DevOps PBI Analyzer</h1>
        
        <div class="input-section">
            <div class="form-group">
                <label for="pbiUrl">PBI URL or ID</label>
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
                    placeholder="Your Azure DevOps PAT (kept secure in VS Code)"
                />
                <small style="color: var(--vscode-descriptionForeground);">
                    Your PAT is stored securely and never leaves VS Code.
                </small>
            </div>
            
            <button id="analyzeBtn" onclick="analyzePbi()">Analyze PBI</button>
        </div>
        
        <div id="status" class="status"></div>
        
        <div id="results" class="results">
            <div class="result-section">
                <h2>📋 PBI Details</h2>
                <div id="pbiDetails"></div>
            </div>
            
            <div class="result-section">
                <h2>🧪 Test Scenarios</h2>
                <div id="testScenarios"></div>
            </div>
            
            <div class="result-section">
                <h2>🥒 Gherkin Specification</h2>
                <pre id="gherkinCode"></pre>
                <button class="copy-btn" onclick="copyGherkin()">Copy Gherkin</button>
            </div>
            
            <div class="result-section">
                <h2>🌲 Cypress Tests</h2>
                <pre id="cypressCode"></pre>
                <button class="copy-btn" onclick="copyCypress()">Copy Cypress Code</button>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function analyzePbi() {
            const pbiUrl = document.getElementById('pbiUrl').value;
            const pat = document.getElementById('pat').value;
            
            if (!pbiUrl) {
                vscode.postMessage({ command: 'error', text: 'Please enter a PBI URL' });
                return;
            }
            
            if (!pat) {
                vscode.postMessage({ command: 'error', text: 'Please enter your PAT' });
                return;
            }
            
            document.getElementById('analyzeBtn').disabled = true;
            showStatus('Analyzing PBI...');
            
            vscode.postMessage({
                command: 'analyzePbi',
                pbiUrl: pbiUrl,
                pat: pat
            });
        }
        
        function showStatus(message) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.classList.add('visible');
        }
        
        function hideStatus() {
            const statusEl = document.getElementById('status');
            statusEl.classList.remove('visible');
        }
        
        function showResults(data) {
            hideStatus();
            document.getElementById('analyzeBtn').disabled = false;
            
            // PBI Details
            const pbiDetails = \`
                <h3>Title: \${data.pbi.title}</h3>
                <p><strong>ID:</strong> \${data.pbi.id}</p>
                <p><strong>Description:</strong> \${data.pbi.description}</p>
                <h4>Acceptance Criteria:</h4>
                <ul>
                    \${data.pbi.acceptanceCriteria.map(ac => \`<li>\${ac}</li>\`).join('')}
                </ul>
            \`;
            document.getElementById('pbiDetails').innerHTML = pbiDetails;
            
            // Test Scenarios
            const scenarios = data.analysis.testScenarios.map(scenario => \`
                <div class="scenario">
                    <div class="scenario-title">\${scenario.title}</div>
                    <strong>Steps:</strong>
                    <ul>
                        \${scenario.steps.map(step => \`<li>\${step}</li>\`).join('')}
                    </ul>
                    <strong>Expected:</strong> \${scenario.expected}
                </div>
            \`).join('');
            document.getElementById('testScenarios').innerHTML = scenarios;
            
            // Gherkin
            document.getElementById('gherkinCode').textContent = data.analysis.gherkin;
            
            // Cypress
            document.getElementById('cypressCode').textContent = data.analysis.cypress;
            
            document.getElementById('results').classList.add('visible');
        }
        
        function copyGherkin() {
            const text = document.getElementById('gherkinCode').textContent;
            navigator.clipboard.writeText(text);
            vscode.postMessage({ command: 'info', text: 'Gherkin code copied to clipboard!' });
        }
        
        function copyCypress() {
            const text = document.getElementById('cypressCode').textContent;
            navigator.clipboard.writeText(text);
            vscode.postMessage({ command: 'info', text: 'Cypress code copied to clipboard!' });
        }
        
        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'setPbiUrl':
                    document.getElementById('pbiUrl').value = message.pbiUrl;
                    break;
                case 'analyzing':
                    showStatus(message.status);
                    break;
                case 'analysisComplete':
                    showResults(message.data);
                    break;
                case 'error':
                    hideStatus();
                    document.getElementById('analyzeBtn').disabled = false;
                    vscode.postMessage({ command: 'error', text: message.message });
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
