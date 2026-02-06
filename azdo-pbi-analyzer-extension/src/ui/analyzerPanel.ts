import * as vscode from 'vscode';
import * as path from 'path';
import { AzdoClient } from '../services/azdoClient';
import { PbiAnalyzer } from '../services/analyzer';
import { TestGenerator } from '../services/generator';
import { ConfigurationManager } from '../config/configuration';
import { GitService, CommitInfo, FileImpact } from '../services/gitService';
import { ContextGenerator } from '../services/contextGenerator';
import { TestPlanService, ProposedTest } from '../services/testPlanService';
import { TestLifecycleManager } from '../services/testLifecycleManager';

export class AnalyzerPanel {
    public static currentPanel: AnalyzerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    // Temporary state to hold proposed tests before confirmation
    private _proposedTests: ProposedTest[] = [];

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
                const data = message.data;

                switch (command) {
                    case 'analyze':
                        await this._handleAnalyze(text);
                        return;
                    case 'generate':
                        await this._handleGenerate(text);
                        return;
                    case 'generateContext':
                        await this._handleGenerateAIContext(text);
                        return;
                    case 'reviewPublish':
                        await this._handleReviewPublication(text);
                        return;
                    case 'confirmPublish':
                        await this._handleConfirmPublication(data);
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private async _handleAnalyze(pbiId: string) {
        try {
            const id = parseInt(pbiId);
            if (isNaN(id)) throw new Error('Invalid ID');

            const context: any = (global as any).testContext;
            const config = new ConfigurationManager((AnalyzerPanel.currentPanel as any)._extensionContext);
            const client = new AzdoClient(config);
            const analyzer = new PbiAnalyzer();
            const lifecycle = new TestLifecycleManager(client);

            this._postMessage({ command: 'status', text: 'Fetching PBI...' });
            const workItem = await client.getWorkItem(id);

            this._postMessage({ command: 'status', text: 'Analyzing Quality...' });
            const analysis = analyzer.analyze(workItem);

            this._postMessage({ command: 'status', text: 'Checking Test Lifecycle...' });
            const healthReport = await lifecycle.reviewTestPortfolio(id);

            this._postMessage({
                command: 'result',
                data: { workItem, analysis, healthReport }
            });

        } catch (error: any) {
            this._postMessage({ command: 'error', text: error.message });
        }
    }

    private async _handleGenerateAIContext(pbiId: string) {
        // ... (Existing AI Context Code - kept concise here for brevity, assume implementation remains)
        // For full replacement, I'll include the previous logic but keep it minimal if unchanged
        try {
            const id = parseInt(pbiId);
            if (isNaN(id)) throw new Error('Invalid ID');

            if (!vscode.workspace.workspaceFolders) {
                // Fallback to simpler generation if no workspace? or just error.
                // Keeping original logic: requires workspace for file save.
                throw new Error('Please open a workspace folder.');
            }

            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const config = new ConfigurationManager((AnalyzerPanel.currentPanel as any)._extensionContext);
            const client = new AzdoClient(config);
            const gitService = new GitService(rootPath);
            const contextGen = new ContextGenerator();

            this._postMessage({ command: 'status', text: 'Generating Context...' });

            // Fetch PBI & Commits
            const [workItem, commits] = await Promise.all([
                client.getWorkItem(id),
                gitService.getCommitsForPbi(pbiId)
            ]);

            // Analyze
            let allImpacts: FileImpact[] = [];
            for (const commit of commits) {
                const impacts = await gitService.getImpactAnalysis(commit.hash);
                allImpacts.push(...impacts);
            }

            const markdown = contextGen.generate(workItem, commits, allImpacts);
            const contextDir = path.join(rootPath, '.ai', 'context');
            const fileName = `PBI_${id}_REVIEW.md`;
            const fileUri = vscode.Uri.file(path.join(contextDir, fileName));

            await vscode.workspace.fs.createDirectory(vscode.Uri.file(contextDir));
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(markdown));

            this._postMessage({ command: 'status', text: `Saved: ${fileName}` });
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });

        } catch (error: any) {
            this._postMessage({ command: 'error', text: error.message });
        }
    }

    private async _handleReviewPublication(pbiId: string) {
        // Simulates the AI proposing tests.
        // In a real flow, this would read from the AI-generated JSON artifact or LLM response.
        // For this demo/tool, we'll generate a "Proposed" sanity test based on the PBI title.

        try {
            const id = parseInt(pbiId);
            const config = new ConfigurationManager((AnalyzerPanel.currentPanel as any)._extensionContext);
            const client = new AzdoClient(config);
            const planService = new TestPlanService(client); // Use service to get template options
            const workItem = await client.getWorkItem(id);

            // Get standard template options
            this._postMessage({ command: 'status', text: 'Fetching Template Options...' });
            const templateOptions = await planService.getTemplateOptions();

            // Mock Proposal
            this._proposedTests = [{
                title: `Verify ${workItem.fields['System.Title']}`,
                description: 'Sanity check for PBI requirements',
                steps: ['Navigate to feature', 'Perform happy path', 'Validate output'],
                pbiId: id
            }];

            this._postMessage({
                command: 'reviewPayload',
                data: { tests: this._proposedTests, options: templateOptions }
            });
            this._postMessage({ command: 'status', text: 'Please customize & confirm tests.' });

        } catch (e: any) {
            this._postMessage({ command: 'error', text: e.message });
        }
    }

    private async _handleConfirmPublication(data: { area: string, iteration: string, tags: string }) {
        if (this._proposedTests.length === 0) return;

        try {
            const config = new ConfigurationManager((AnalyzerPanel.currentPanel as any)._extensionContext);
            const client = new AzdoClient(config);
            const planService = new TestPlanService(client);

            this._postMessage({ command: 'status', text: 'Publishing to Azure DevOps...' });

            // Apply customizations
            const tags = data.tags ? data.tags.split(',').map(t => t.trim()) : [];
            this._proposedTests.forEach(t => {
                t.areaPath = data.area;
                t.iterationPath = data.iteration;
                t.tags = tags;
            });

            const createdIds = await planService.publishTestPlan(this._proposedTests);

            this._postMessage({ command: 'status', text: `Success! Created IDs: ${createdIds.join(', ')}` });
            this._proposedTests = []; // Clear
            vscode.window.showInformationMessage(`Published ${createdIds.length} tests to AzDO with tags: ${tags.join(', ')} `);

        } catch (e: any) {
            this._postMessage({ command: 'error', text: e.message });
        }
    }

    private async _handleGenerate(pbiId: string) {
        // Legacy file gen
        this._postMessage({ command: 'status', text: 'Generating legacy files...' });
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
                    .good { color: green; } .bad { color: red; }
                    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; margin-right: 5px; }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                    button.danger { background: #d9534f; color: white; }
                    input, select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px; width: 100%; margin-bottom: 10px; box-sizing: border-box; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    h3 { margin-top: 0; }
                </style>
            </head>
            <body>
                <h1>PBI Analyzer</h1>
                <div class="card">
                    <label>PBI ID:</label>
                    <input type="text" id="pbiId" placeholder="e.g. 12345" />
                    <button id="analyzeBtn">Analyze</button>
                    <button id="aiContextBtn" class="secondary">Generate AI Context</button>
                </div>
                <div id="status"></div>
                
                <!-- Results Section -->
                <div id="results" style="display:none;">
                    <div class="card">
                        <h2>Quality Score</h2>
                        <div id="scoreDisplay" class="score"></div>
                        <div id="issuesList"></div>
                    </div>

                    <div class="card">
                        <h2>Test Lifecycle Health</h2>
                        <div id="healthList"></div>
                    </div>

                    <button id="reviewBtn" class="secondary">Review & Publish Tests</button>
                </div>

                <!-- Confirmation Section -->
                <div id="confirmSection" style="display:none;" class="card">
                    <h3>Confirm Publication</h3>
                    <p>Customize & Confirm the tests to be pushed to Azure DevOps:</p>
                    
                    <label>Area Path:</label>
                    <select id="areaInput"><option value="">Default</option></select>
                    
                    <label>Iteration Path:</label>
                    <select id="iterationInput"><option value="">Default</option></select>
                    
                    <label>Tags (comma separated):</label>
                    <input type="text" id="tagsInput" placeholder="Smoke, Critical, Sanity" value="Smoke, Sanity" />

                    <ul id="proposedList"></ul>
                    <button id="confirmBtn" class="danger">Confirm & Publish</button>
                    <button id="cancelBtn" class="secondary">Cancel</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const analyzeBtn = document.getElementById('analyzeBtn');
                    const aiContextBtn = document.getElementById('aiContextBtn');
                    const reviewBtn = document.getElementById('reviewBtn');
                    const confirmBtn = document.getElementById('confirmBtn');
                    const cancelBtn = document.getElementById('cancelBtn');
                    const pbiInput = document.getElementById('pbiId');
                    const areaInput = document.getElementById('areaInput');
                    const iterationInput = document.getElementById('iterationInput');
                    const tagsInput = document.getElementById('tagsInput');

                    analyzeBtn.addEventListener('click', () => {
                        const id = pbiInput.value;
                        if(id) vscode.postMessage({ command: 'analyze', text: id });
                    });

                    aiContextBtn.addEventListener('click', () => {
                        const id = pbiInput.value;
                        if(id) vscode.postMessage({ command: 'generateContext', text: id });
                    });

                    reviewBtn.addEventListener('click', () => {
                        const id = pbiInput.value;
                        vscode.postMessage({ command: 'reviewPublish', text: id });
                    });

                    confirmBtn.addEventListener('click', () => {
                        vscode.postMessage({ 
                            command: 'confirmPublish', 
                            data: {
                                area: areaInput.value,
                                iteration: iterationInput.value,
                                tags: tagsInput.value
                            }
                        });
                        document.getElementById('confirmSection').style.display = 'none';
                    });

                    cancelBtn.addEventListener('click', () => {
                        document.getElementById('confirmSection').style.display = 'none';
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'status':
                                document.getElementById('status').innerText = message.text;
                                document.getElementById('status').style.color = 'inherit';
                                break;
                            case 'error':
                                document.getElementById('status').innerText = 'Error: ' + message.text;
                                document.getElementById('status').style.color = 'red';
                                break;
                            case 'result':
                                const data = message.data;
                                document.getElementById('results').style.display = 'block';
                                
                                // Quality Score
                                const scoreEl = document.getElementById('scoreDisplay');
                                scoreEl.innerText = data.analysis.score + '/100';
                                scoreEl.className = 'score ' + (data.analysis.score > 80 ? 'good' : 'bad');
                                const list = document.getElementById('issuesList');
                                list.innerHTML = (data.analysis.issues.length ? '<ul>' + data.analysis.issues.map(i => '<li>' + i + '</li>').join('') + '</ul>' : '<p>No Issues</p>');
                                
                                // Health Report
                                const healthEl = document.getElementById('healthList');
                                if (data.healthReport && data.healthReport.length > 0) {
                                    healthEl.innerHTML = '<ul>' + data.healthReport.map(h => 
                                        '<li>' + 
                                        '<strong>' + h.title + '</strong> (' + h.state + ')' + 
                                        '<br/>Action: ' + h.actionRequired + 
                                        (h.isDuplicate ? '<br/>⚠️ DUPLICATE of ' + h.duplicateOfId : '') +
                                        '</li>'
                                    ).join('') + '</ul>';
                                } else {
                                    healthEl.innerHTML = '<p>No linked tests found.</p>';
                                }
                                break;
                                
                            case 'reviewPayload':
                                const tests = message.data.tests;
                                const options = message.data.options;
                                
                                document.getElementById('confirmSection').style.display = 'block';
                                
                                // Populate Dropdowns
                                areaInput.innerHTML = '<option value="">-- Select Area --</option>' + options.areas.map(a => '<option value="' + a + '">' + a + '</option>').join('');
                                iterationInput.innerHTML = '<option value="">-- Select Iteration --</option>' + options.iterations.map(i => '<option value="' + i + '">' + i + '</option>').join('');
                                
                                document.getElementById('proposedList').innerHTML = tests.map(t => '<li><strong>' + t.title + '</strong><br/>' + t.steps.length + ' steps</li>').join('');
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
