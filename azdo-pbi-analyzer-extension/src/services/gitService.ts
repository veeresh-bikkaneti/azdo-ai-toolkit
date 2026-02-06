import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as util from 'util';

const exec = util.promisify(cp.exec);

export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: string;
}

export interface FileImpact {
    file: string;
    changeType: 'ADD' | 'MODIFY' | 'DELETE';
    diff: string;
    // Files that import this file (potential regression)
    importedBy: string[];
    // Related test files (sanity target)
    testFiles: string[];
}

export class GitService {
    private workingDir: string;

    constructor(workspaceRoot: string) {
        this.workingDir = workspaceRoot;
    }

    /**
     * Find commits related to a PBI ID.
     * Looks for ID in commit message (e.g., #1234) or checks if current branch contains ID.
     */
    async getCommitsForPbi(pbiId: string | number): Promise<CommitInfo[]> {
        try {
            // 1. Check for commits with PBI ID in message
            const grepCommand = `git log --grep="#${pbiId}" --pretty=format:"%H|%s|%an|%ad" --date=short -n 10`;
            const { stdout: grepOutput } = await exec(grepCommand, { cwd: this.workingDir });

            // 2. Check if current branch relates to PBI
            // If branch is feature/1234-something, gets recent commits on this branch
            let branchCommits: string = '';
            try {
                const { stdout: branchName } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: this.workingDir });
                if (branchName.trim().includes(pbiId.toString())) {
                    // Get last 5 commits on this branch
                    const logCommand = `git log --pretty=format:"%H|%s|%an|%ad" --date=short -n 5`;
                    const { stdout } = await exec(logCommand, { cwd: this.workingDir });
                    branchCommits = stdout;
                }
            } catch (ignore) { /* Not a git repo or separate head */ }

            const lines = [...grepOutput.split('\n'), ...branchCommits.split('\n')]
                .filter(line => line.trim().length > 0);

            // Deduplicate by hash
            const uniqueCommits = new Map<string, CommitInfo>();
            
            lines.forEach(line => {
                const [hash, message, author, date] = line.split('|');
                if (hash && !uniqueCommits.has(hash)) {
                    uniqueCommits.set(hash, { hash, message, author, date });
                }
            });

            return Array.from(uniqueCommits.values());
        } catch (error) {
            console.error('Git Error:', error);
            // Return empty if git fails (e.g. no repo)
            return [];
        }
    }

    /**
     * Get detailed impact analysis for a specific commit
     */
    async getImpactAnalysis(commitHash: string): Promise<FileImpact[]> {
        const impactList: FileImpact[] = [];
        
        try {
            // Get list of changed files
            // --name-status gives: M src/foo.ts
            const { stdout } = await exec(`git show --name-status --pretty="" ${commitHash}`, { cwd: this.workingDir });
            
            const lines = stdout.split('\n').filter(l => l.trim().length > 0);
            
            for (const line of lines) {
                const [status, filePath] = line.split('\t');
                
                // Get the Diff
                let diff = '';
                try {
                    const diffCmd = `git show ${commitHash} -- "${filePath}"`;
                    const { stdout: diffOut } = await exec(diffCmd, { cwd: this.workingDir });
                    diff = diffOut;
                } catch (e) { diff = '(Context: Could not retrieve diff)'; }

                const fullPath = path.join(this.workingDir, filePath);
                
                // Analyze dependencies (Regression)
                const importedBy = await this.findImportingFiles(filePath);
                
                // Find potential test files (Sanity)
                const testFiles = await this.findRelatedTestFiles(filePath);

                impactList.push({
                    file: filePath,
                    changeType: this.mapStatus(status),
                    diff: diff,
                    importedBy,
                    testFiles
                });
            }
        } catch (error) {
            console.error(`Impact Analysis failed for ${commitHash}`, error);
        }

        return impactList;
    }

    private mapStatus(status: string): 'ADD' | 'MODIFY' | 'DELETE' {
        if (status.startsWith('A')) return 'ADD';
        if (status.startsWith('D')) return 'DELETE';
        return 'MODIFY';
    }

    /**
     * Scans workspace to find files that import the target file.
     * Uses simple grep/string matching for performance, robust enough for TS/JS.
     */
    private async findImportingFiles(targetFile: string): Promise<string[]> {
        // Normalize path for import search: src/services/auth.ts -> services/auth
        const ext = path.extname(targetFile);
        const baseName = path.basename(targetFile, ext); // auth
        // simple heuristic: search for the filename without extension
        // This is a naive search, but effective for impact estimation
        
        try {
            // Find files containing the base name of the file
            // exclude node_modules, .git, and the file itself
            const command = `grep -r -l "${baseName}" . --exclude-dir=node_modules --exclude-dir=.git --exclude="${path.basename(targetFile)}"`;
            const { stdout } = await exec(command, { cwd: this.workingDir });
            
            return stdout.split('\n')
                .filter(f => f.trim().length > 0)
                .map(f => path.relative(process.cwd(), f)); // ensure relative paths
        } catch (e) {
            // Grep returns exit code 1 if no matches found, which throws error in exec
            return [];
        }
    }

    /**
     * Heuristic to find existing tests for a file.
     * e.g., auth.ts -> auth.test.ts, auth.spec.ts
     */
    private async findRelatedTestFiles(sourceFile: string): Promise<string[]> {
        const dir = path.dirname(sourceFile);
        const ext = path.extname(sourceFile);
        const base = path.basename(sourceFile, ext);
        
        // Common patterns
        const patterns = [
            `${base}.test${ext}`,
            `${base}.spec${ext}`,
            path.join(dir, '__tests__', `${base}.test${ext}`)
        ];

        const found: string[] = [];
        
        for (const p of patterns) {
            const fullPath = path.join(this.workingDir, p);
            if (fs.existsSync(fullPath)) {
                found.push(p);
            }
        }

        // Also check if we can find it via glob if exact match failed
        if (found.length === 0) {
             // fallback: search for *base*.test.ts or *base*.spec.ts
            const searchPattern = `**/${base}*.{test,spec}.${ext.replace('.', '')}`;
            const matches = await vscode.workspace.findFiles(searchPattern, '**/node_modules/**');
            matches.forEach(m => found.push(vscode.workspace.asRelativePath(m)));
        }

        return found;
    }
}
