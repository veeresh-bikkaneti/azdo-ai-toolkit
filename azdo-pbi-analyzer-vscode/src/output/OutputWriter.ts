import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from '../analyzers/PbiAnalyzer';

/**
 * Writes analysis artifacts to the workspace in the structure:
 *   pbi/{pbi-number}/
 *     story-analysis.md
 *     manual-test-cases.md
 *     automated/
 *       cypress-pseudo.js
 *       playwright-pseudo.js
 */
export class OutputWriter {
    public async write(result: AnalysisResult): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open. Open a folder first.');
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const pbiDir = path.join(rootPath, 'pbi', String(result.pbi.id));
        const automatedDir = path.join(pbiDir, 'automated');

        // Create directories
        fs.mkdirSync(automatedDir, { recursive: true });

        // Write story analysis
        const storyPath = path.join(pbiDir, 'story-analysis.md');
        fs.writeFileSync(storyPath, result.analysis.storyAnalysis, 'utf-8');

        // Write manual test cases
        const testsPath = path.join(pbiDir, 'manual-test-cases.md');
        fs.writeFileSync(testsPath, result.analysis.manualTestsMd, 'utf-8');

        // Write Cypress pseudo-code
        const cypressPath = path.join(automatedDir, 'cypress-pseudo.js');
        fs.writeFileSync(cypressPath, result.analysis.cypressPseudo, 'utf-8');

        // Write Playwright pseudo-code
        const playwrightPath = path.join(automatedDir, 'playwright-pseudo.js');
        fs.writeFileSync(playwrightPath, result.analysis.playwrightPseudo, 'utf-8');

        // Write Gherkin spec
        const gherkinPath = path.join(pbiDir, 'gherkin-spec.feature');
        fs.writeFileSync(gherkinPath, result.analysis.gherkin, 'utf-8');

        return pbiDir;
    }
}
