import * as vscode from 'vscode';
import { DevOpsClient } from '../api/DevOpsClient';
import { PbiAnalyzer, AnalysisResult, PbiContext } from '../analyzers/PbiAnalyzer';
import { OutputWriter } from '../output/OutputWriter';
import { readEnvValue } from '../utils/envReader';

export class AnalyzerPanel {
    public static currentPanel: AnalyzerPanel | undefined;
    private static readonly viewType = 'azdoPbiAnalyzer';
    private static readonly patKey = 'azdoPbiAnalyzer.pat';

    /**
     * Fired with the analyzed PBI context after a successful analysis.
     * The extension host wires this to PbiChatParticipant.setCurrentPbi so
     * `@azdo` chat commands work on the PBI you just analyzed.
     */
    public static onDidAnalyzePbi: ((pbi: PbiContext) => void) | undefined;

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

            const defaultOrg = vscode.workspace
                .getConfiguration('azdoPbiAnalyzer')
                .get<string>('organization', '')
                .trim();
            const pbiInfo = DevOpsClient.parsePbiUrl(pbiUrl, defaultOrg || undefined);
            if (!pbiInfo) {
                throw new Error(
                    'Invalid PBI reference. Expected a work item URL ' +
                    '(https://dev.azure.com/{org}/{project}/_workitems/edit/{id}) or a numeric ID ' +
                    '(requires the "Azure DevOps PBI Analyzer: Organization" setting).'
                );
            }

            this._postStatus('Resolving PAT...');
            const finalPat = await this._resolvePat(pat);

            this._postStatus(`Fetching PBI ${pbiInfo.id} with full hierarchy from Azure DevOps...`);
            const client = new DevOpsClient(pbiInfo.orgUrl, finalPat);
            const tree = await client.getWorkItemRecursively(pbiInfo.id, 3);

            if (!tree) {
                throw new Error(`Work item ${pbiInfo.id} not found.`);
            }

            const hierarchy = client.buildWorkItemSummary(tree);
            const parentItem = tree.parent?.workItem ?? null;
            const relatedItems = tree.related.map((r) => r.workItem);

            this._postStatus('Analyzing requirements and generating artifacts...');
            const analyzer = new PbiAnalyzer();
            const result = analyzer.analyze(tree.workItem, parentItem, relatedItems, hierarchy);

            this._postStatus('Saving artifacts to workspace...');
            const outputWriter = new OutputWriter();
            const outputDir = await outputWriter.write(result);

            // Hand the analyzed PBI to the chat participant (@azdo).
            try {
                AnalyzerPanel.onDidAnalyzePbi?.(result.pbi);
            } catch {
                // Chat handoff is best-effort; the analysis already succeeded.
            }

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

        .output-path {
            background: var(--vscode-textCodeBlock-background);
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            margin-bottom: 12px;
        }

        /* ---- Tabs ---- */
        .tabs {
            display: flex;
            gap: 2px;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            margin-bottom: 14px;
        }

        .tab {
            background: transparent;
            color: var(--vscode-descriptionForeground);
            border: none;
            border-bottom: 2px solid transparent;
            border-radius: 0;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
        }

        .tab:hover { background: var(--vscode-textCodeBlock-background); }
        .tab.active {
            color: var(--vscode-button-background);
            border-bottom-color: var(--vscode-button-background);
        }

        .tab-pane { display: none; }
        .tab-pane.active { display: block; }

        /* ---- Rendered markdown ---- */
        .md { font-size: 13px; }
        .md h2 { font-size: 17px; margin: 14px 0 8px; }
        .md h3 { font-size: 15px; margin: 12px 0 6px; }
        .md h4 { font-size: 13px; margin: 10px 0 4px; }
        .md p { margin: 6px 0; }
        .md ul, .md ol { margin: 6px 0 6px 20px; }
        .md li { margin-bottom: 4px; }
        .md blockquote {
            border-left: 3px solid var(--vscode-charts-blue);
            padding: 4px 12px;
            margin: 8px 0;
            color: var(--vscode-descriptionForeground);
        }
        .md code {
            background: var(--vscode-textCodeBlock-background);
            padding: 1px 5px;
            border-radius: 3px;
            font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
            font-size: 12px;
        }
        .md hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border, #444);
            margin: 12px 0;
        }
        .md table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 12px;
        }
        .md th, .md td {
            border: 1px solid var(--vscode-panel-border, #444);
            padding: 6px 10px;
            text-align: left;
        }
        .md th {
            background: var(--vscode-textCodeBlock-background);
            font-weight: 600;
        }

        /* ---- Code panes with copy ---- */
        .code-wrap { position: relative; }

        .code-wrap pre {
            padding-top: 36px;
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

        .copy-btn {
            position: absolute;
            top: 6px;
            right: 6px;
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 600;
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
                <div class="hint">Paste a work-item URL, board URL (with ?workitem=), or just the ID (e.g. 12345) when a default org is set.</div>
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

            <div class="tabs">
                <button class="tab active" data-tab="story" onclick="showTab('story')">📋 Story</button>
                <button class="tab" data-tab="scenarios" onclick="showTab('scenarios')">🧪 Scenarios</button>
                <button class="tab" data-tab="manual" onclick="showTab('manual')">📝 Manual</button>
                <button class="tab" data-tab="gherkin" onclick="showTab('gherkin')">🥒 Gherkin</button>
                <button class="tab" data-tab="cypress" onclick="showTab('cypress')">🌲 Cypress</button>
                <button class="tab" data-tab="playwright" onclick="showTab('playwright')">🎭 Playwright</button>
            </div>

            <div id="tab-story" class="tab-pane active">
                <div id="storyAnalysis" class="md"></div>
            </div>

            <div id="tab-scenarios" class="tab-pane">
                <div id="testScenarios"></div>
            </div>

            <div id="tab-manual" class="tab-pane">
                <div class="code-wrap">
                    <button class="copy-btn" onclick="copyBlock('manualTests', this)">Copy</button>
                    <pre id="manualTests"></pre>
                </div>
            </div>

            <div id="tab-gherkin" class="tab-pane">
                <div class="code-wrap">
                    <button class="copy-btn" onclick="copyBlock('gherkinCode', this)">Copy</button>
                    <pre id="gherkinCode"></pre>
                </div>
            </div>

            <div id="tab-cypress" class="tab-pane">
                <div class="code-wrap">
                    <button class="copy-btn" onclick="copyBlock('cypressCode', this)">Copy</button>
                    <pre id="cypressCode"></pre>
                </div>
            </div>

            <div id="tab-playwright" class="tab-pane">
                <div class="code-wrap">
                    <button class="copy-btn" onclick="copyBlock('playwrightCode', this)">Copy</button>
                    <pre id="playwrightCode"></pre>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const BT = String.fromCharCode(96); // backtick, kept out of the source template

        function analyzePbi() {
            const pbiUrl = document.getElementById('pbiUrl').value.trim();
            const pat = document.getElementById('pat').value.trim();

            if (!pbiUrl) {
                showError('Please enter a PBI URL or ID.');
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

        function inlineMd(text) {
            return text
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(new RegExp(BT + '([^' + BT + ']+)' + BT, 'g'), '<code>$1</code>');
        }

        function tableCells(row) {
            return row.split('|').slice(1, -1).map(function (c) { return c.trim(); });
        }

        function isTableRow(line) {
            return /^\|.*\|$/.test(line);
        }

        function isTableSeparator(line) {
            return line.indexOf('-') !== -1 && /^\|?[\s|:-]+\|?$/.test(line);
        }

        // Minimal markdown renderer: headings, bold, inline code, lists,
        // blockquotes, tables, horizontal rules, paragraphs.
        function renderMarkdown(src) {
            const lines = escapeHtml(src || '').split('\n');
            let html = '';
            let para = [];
            let listTag = '';
            let inTable = false;
            let tableHeaderDone = false;

            function flushPara() {
                if (para.length) {
                    html += '<p>' + inlineMd(para.join(' ')) + '</p>';
                    para = [];
                }
            }

            function closeList() {
                if (listTag) {
                    html += '</' + listTag + '>';
                    listTag = '';
                }
            }

            function closeTable() {
                if (inTable) {
                    html += '</tbody></table>';
                    inTable = false;
                    tableHeaderDone = false;
                }
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const t = line.trim();

                if (!t) {
                    flushPara(); closeList(); closeTable();
                    continue;
                }

                const hMatch = t.match(/^(#{1,4})\s+(.*)$/);
                if (hMatch) {
                    flushPara(); closeList(); closeTable();
                    const level = Math.min(hMatch[1].length + 1, 4);
                    html += '<h' + level + '>' + inlineMd(hMatch[2]) + '</h' + level + '>';
                    continue;
                }

                if (/^---+$/.test(t)) {
                    flushPara(); closeList(); closeTable();
                    html += '<hr/>';
                    continue;
                }

                if (isTableRow(t)) {
                    flushPara(); closeList();
                    if (isTableSeparator(t)) { continue; }
                    if (!inTable) {
                        html += '<table><thead>';
                        inTable = true;
                        tableHeaderDone = false;
                    }
                    const cells = tableCells(t);
                    const tag = tableHeaderDone ? 'td' : 'th';
                    html += '<tr>' + cells.map(function (c) {
                        return '<' + tag + '>' + inlineMd(c) + '</' + tag + '>';
                    }).join('') + '</tr>';
                    if (!tableHeaderDone) {
                        html += '</thead><tbody>';
                        tableHeaderDone = true;
                    }
                    continue;
                }
                closeTable();

                const quote = t.match(/^&gt;\s?(.*)$/);
                if (quote) {
                    flushPara(); closeList();
                    html += '<blockquote>' + inlineMd(quote[1]) + '</blockquote>';
                    continue;
                }

                const ul = t.match(/^[-*]\s+(.*)$/);
                const ol = t.match(/^\d+[.)]\s+(.*)$/);
                if (ul || ol) {
                    flushPara();
                    const tag = ul ? 'ul' : 'ol';
                    if (listTag !== tag) {
                        closeList();
                        html += '<' + tag + '>';
                        listTag = tag;
                    }
                    html += '<li>' + inlineMd((ul || ol)[1]) + '</li>';
                    continue;
                }
                closeList();

                para.push(t);
            }

            flushPara(); closeList(); closeTable();
            return html;
        }

        function showTab(name) {
            const tabs = document.querySelectorAll('.tab');
            for (let i = 0; i < tabs.length; i++) {
                tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === name);
            }
            const panes = document.querySelectorAll('.tab-pane');
            for (let i = 0; i < panes.length; i++) {
                panes[i].classList.toggle('active', panes[i].id === 'tab-' + name);
            }
        }

        function copyBlock(id, btn) {
            const text = document.getElementById(id).textContent || '';
            function done(ok) {
                btn.textContent = ok ? 'Copied ✓' : 'Failed';
                setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand('copy');
                    done(true);
                } catch (e) {
                    done(false);
                }
                document.body.removeChild(ta);
            }
        }

        function showResults(data, outputDir) {
            hideStatus();
            document.getElementById('analyzeBtn').disabled = false;

            if (outputDir) {
                document.getElementById('outputPath').textContent = '📁 Artifacts saved to: ' + outputDir;
            }

            // Story analysis rendered as markdown
            document.getElementById('storyAnalysis').innerHTML = renderMarkdown(data.analysis.storyAnalysis);

            // Test scenarios
            const scenariosHtml = data.analysis.testScenarios.map(function (s) {
                const tagClass = 'tag-' + s.tag.replace(' ', '-');
                const stepsHtml = s.steps.map(function (step) {
                    return '<li>' + escapeHtml(step) + '</li>';
                }).join('');

                return '<div style="margin-bottom:12px;padding:10px;background:var(--vscode-textCodeBlock-background);border-radius:4px;">'
                    + '<span class="tag ' + tagClass + '">' + escapeHtml(s.tag) + '</span> '
                    + '<strong>' + escapeHtml(s.title) + '</strong>'
                    + '<ol style="margin:6px 0 6px 20px;">' + stepsHtml + '</ol>'
                    + '<div style="margin-top:6px;"><strong>Expected:</strong> ' + escapeHtml(s.expected) + '</div>'
                    + '</div>';
            }).join('');
            document.getElementById('testScenarios').innerHTML = scenariosHtml;

            document.getElementById('manualTests').textContent = data.analysis.manualTestsMd;
            document.getElementById('gherkinCode').textContent = data.analysis.gherkin;
            document.getElementById('cypressCode').textContent = data.analysis.cypressPseudo;
            document.getElementById('playwrightCode').textContent = data.analysis.playwrightPseudo;

            showTab('story');
            document.getElementById('results').classList.add('visible');
            document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function showError(message) {
            hideStatus();
            document.getElementById('analyzeBtn').disabled = false;
            const el = document.getElementById('errorBanner');
            el.textContent = '❌ ' + message;
            el.classList.add('visible');
        }

        window.addEventListener('message', function (event) {
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
</html>
`;
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
