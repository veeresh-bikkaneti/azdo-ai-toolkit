import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { TestScenario, TestScenarioGenerator } from '../generators/TestScenarioGenerator';
import { GherkinGenerator } from '../generators/GherkinGenerator';
import { CypressGenerator } from '../generators/CypressGenerator';
import { PlaywrightGenerator } from '../generators/PlaywrightGenerator';
import { ManualTestGenerator } from '../generators/ManualTestGenerator';

export interface PbiContext {
    id: number;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    workItemType: string;
    state: string;
    assignedTo: string;
    areaPath: string;
    iterationPath: string;
    parentTitle?: string;
    parentDescription?: string;
    relatedItems?: Array<{ id: number; title: string; type: string; state: string }>;
    // Enhanced hierarchy support
    parentChain?: Array<{ id: number; title: string; type: string; state: string }>;
    children?: Array<{ id: number; title: string; type: string; state: string }>;
    dependencies?: Array<{ id: number; title: string; type: string; state: string }>;
}

export interface AnalysisResult {
    pbi: PbiContext;
    analysis: {
        storyAnalysis: string;
        testScenarios: TestScenario[];
        gherkin: string;
        cypressPseudo: string;
        playwrightPseudo: string;
        manualTestsMd: string;
    };
}

export class PbiAnalyzer {
    private _scenarioGenerator: TestScenarioGenerator;
    private _gherkinGenerator: GherkinGenerator;
    private _cypressGenerator: CypressGenerator;
    private _playwrightGenerator: PlaywrightGenerator;
    private _manualTestGenerator: ManualTestGenerator;

    constructor() {
        this._scenarioGenerator = new TestScenarioGenerator();
        this._gherkinGenerator = new GherkinGenerator();
        this._cypressGenerator = new CypressGenerator();
        this._playwrightGenerator = new PlaywrightGenerator();
        this._manualTestGenerator = new ManualTestGenerator();
    }

    public analyze(workItem: WorkItem, parentItem?: WorkItem | null, relatedItems?: WorkItem[]): AnalysisResult {
        const pbi = this.extractPbiContext(workItem, parentItem, relatedItems);

        const testScenarios = this._scenarioGenerator.generate(pbi.acceptanceCriteria);
        const gherkin = this._gherkinGenerator.generate(pbi.title, testScenarios);
        const cypressPseudo = this._cypressGenerator.generate(pbi.title, testScenarios);
        const playwrightPseudo = this._playwrightGenerator.generate(pbi.title, testScenarios);
        const manualTestsMd = this._manualTestGenerator.generate(pbi.title, testScenarios);
        const storyAnalysis = this.generateStoryAnalysis(pbi);

        return {
            pbi,
            analysis: {
                storyAnalysis,
                testScenarios,
                gherkin,
                cypressPseudo,
                playwrightPseudo,
                manualTestsMd,
            },
        };
    }

    private extractPbiContext(
        workItem: WorkItem,
        parentItem?: WorkItem | null,
        relatedItems?: WorkItem[]
    ): PbiContext {
        const fields = workItem.fields || {};
        const id = workItem.id || 0;
        const title = fields['System.Title'] || 'No Title';
        const descriptionHtml = fields['System.Description'] || '';
        const acceptanceCriteriaHtml = fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '';
        const workItemType = fields['System.WorkItemType'] || '';
        const state = fields['System.State'] || '';
        const assignedTo = fields['System.AssignedTo']?.displayName || fields['System.AssignedTo'] || '';
        const areaPath = fields['System.AreaPath'] || '';
        const iterationPath = fields['System.IterationPath'] || '';

        const description = this.stripHtml(descriptionHtml);
        const acceptanceCriteria = this.parseAcceptanceCriteria(acceptanceCriteriaHtml);

        const context: PbiContext = {
            id,
            title,
            description,
            acceptanceCriteria,
            workItemType,
            state,
            assignedTo,
            areaPath,
            iterationPath,
        };

        if (parentItem) {
            const parentFields = parentItem.fields || {};
            context.parentTitle = parentFields['System.Title'] || '';
            context.parentDescription = this.stripHtml(parentFields['System.Description'] || '');
        }

        if (relatedItems && relatedItems.length > 0) {
            context.relatedItems = relatedItems.map((item) => {
                const f = item.fields || {};
                return {
                    id: item.id || 0,
                    title: f['System.Title'] || '',
                    type: f['System.WorkItemType'] || '',
                    state: f['System.State'] || '',
                };
            });
        }

        return context;
    }

    private generateStoryAnalysis(pbi: PbiContext): string {
        const lines: string[] = [];

        lines.push(`# Story Analysis: ${pbi.title}`);
        lines.push('');
        lines.push(`**PBI ID:** ${pbi.id}  `);
        lines.push(`**Type:** ${pbi.workItemType}  `);
        lines.push(`**State:** ${pbi.state}  `);
        if (pbi.assignedTo) {
            lines.push(`**Assigned To:** ${pbi.assignedTo}  `);
        }
        lines.push(`**Area:** ${pbi.areaPath}  `);
        lines.push(`**Iteration:** ${pbi.iterationPath}  `);
        lines.push('');

        // Parent epic context
        if (pbi.parentTitle) {
            lines.push('## Parent Epic / Feature');
            lines.push('');
            lines.push(`**Title:** ${pbi.parentTitle}`);
            lines.push('');
            if (pbi.parentDescription) {
                lines.push(`> ${pbi.parentDescription.replace(/\n/g, '\n> ')}`);
                lines.push('');
            }
            lines.push(`This PBI contributes to the above by delivering: **${pbi.title}**.`);
            lines.push('');
        }

        // Description
        lines.push('## Description');
        lines.push('');
        if (pbi.description) {
            lines.push(pbi.description);
        } else {
            lines.push('*No description provided.*');
        }
        lines.push('');

        // Acceptance Criteria
        lines.push('## Acceptance Criteria');
        lines.push('');
        if (pbi.acceptanceCriteria.length > 0) {
            pbi.acceptanceCriteria.forEach((ac, i) => {
                lines.push(`${i + 1}. ${ac}`);
            });
        } else {
            lines.push('*No acceptance criteria defined.*');
        }
        lines.push('');

        // Flow description for devs and testers
        lines.push('## Expected Flow');
        lines.push('');
        lines.push('### Developer Perspective');
        lines.push('');
        if (pbi.acceptanceCriteria.length > 0) {
            lines.push('The implementation should satisfy the following flow:');
            lines.push('');
            pbi.acceptanceCriteria.forEach((ac, i) => {
                lines.push(`${i + 1}. Implement logic for: ${ac}`);
            });
        } else {
            lines.push('*Derive implementation steps from the description above.*');
        }
        lines.push('');

        lines.push('### Test Engineer Perspective');
        lines.push('');
        if (pbi.acceptanceCriteria.length > 0) {
            lines.push('Validate each acceptance criterion:');
            lines.push('');
            pbi.acceptanceCriteria.forEach((ac, i) => {
                lines.push(`${i + 1}. **Verify:** ${ac}`);
            });
        } else {
            lines.push('*Derive test cases from the description above.*');
        }
        lines.push('');

        // Unknowns and questions
        lines.push('## Unknowns & Questions');
        lines.push('');
        const questions = this.generateQuestions(pbi);
        if (questions.length > 0) {
            questions.forEach((q, i) => {
                lines.push(`${i + 1}. ${q}`);
            });
        } else {
            lines.push('*No obvious unknowns identified.*');
        }
        lines.push('');

        // Related items
        if (pbi.relatedItems && pbi.relatedItems.length > 0) {
            lines.push('## Related Work Items');
            lines.push('');
            lines.push('| ID | Title | Type | State |');
            lines.push('| --- | --- | --- | --- |');
            pbi.relatedItems.forEach((item) => {
                lines.push(`| ${item.id} | ${item.title} | ${item.type} | ${item.state} |`);
            });
            lines.push('');
        }

        return lines.join('\n');
    }

    private generateQuestions(pbi: PbiContext): string[] {
        const questions: string[] = [];

        // Completeness checks
        if (!pbi.description || pbi.description.trim().length < 20) {
            questions.push('📝 The description is missing or very brief. What is the detailed requirement?');
        }

        if (pbi.acceptanceCriteria.length === 0) {
            questions.push('✅ No acceptance criteria defined. What are the conditions of satisfaction?');
        }

        if (pbi.acceptanceCriteria.length < 3 && pbi.acceptanceCriteria.length > 0) {
            questions.push('🔍 Only a few acceptance criteria are listed. Are there additional edge cases or scenarios to cover?');
        }

        // Vague language detection (ambiguity)
        const vaguePatterns = ['should work', 'properly', 'correctly', 'as expected', 'appropriate', 'fast', 'slow', 'secure', 'safe', 'easy', 'simple', 'good'];
        const foundVague = new Set<string>();
        pbi.acceptanceCriteria.forEach((ac, i) => {
            const lower = ac.toLowerCase();
            for (const pattern of vaguePatterns) {
                if (lower.includes(pattern) && !foundVague.has(pattern)) {
                    questions.push(`⚠️ AC ${i + 1} uses vague language ("${pattern}"). Can you define specific measurable outcomes?`);
                    foundVague.add(pattern);
                    break;
                }
            }
        });

        // Contradiction analysis
        const descriptionLower = pbi.description.toLowerCase();
        const acText = pbi.acceptanceCriteria.join(' ').toLowerCase();
        if (descriptionLower.includes('read-only') && acText.includes('edit')) {
            questions.push('⚡ Potential contradiction: Description mentions "read-only" but AC includes "edit" functionality.');
        }
        if (descriptionLower.includes('simple') && pbi.acceptanceCriteria.length > 5) {
            questions.push('⚡ Potential complexity mismatch: Description says "simple" but there are many acceptance criteria.');
        }

        // NFR Detection (Non-Functional Requirements)
        const nfrChecks = [
            { keyword: 'performance', question: '⚡ No performance requirements mentioned. Are there response time or throughput targets?' },
            { keyword: 'security', question: '🔒 No security requirements mentioned. Are there authentication, authorization, or data protection needs?' },
            { keyword: 'accessibility', question: '♿ No accessibility requirements mentioned. Should this be WCAG 2.1 AA compliant?' },
            { keyword: 'error', question: '🚨 No error handling mentioned. How should the system handle failures or invalid input?' },
            { keyword: 'validation', question: '✔️ No validation mentioned. What input validation is required?' },
            { keyword: 'logging', question: '📊 No logging/monitoring mentioned. What should be logged for debugging and auditing?' },
        ];

        const allText = (pbi.description + ' ' + pbi.acceptanceCriteria.join(' ')).toLowerCase();
        nfrChecks.forEach((check) => {
            if (!allText.includes(check.keyword)) {
                questions.push(check.question);
            }
        });

        // Edge case detection
        if (!acText.includes('empty') && !acText.includes('null') && !acText.includes('invalid')) {
            questions.push('🧪 No edge cases mentioned (empty, null, invalid data). What are the boundary conditions?');
        }

        // Integration gaps
        if (acText.includes('api') || acText.includes('service') || acText.includes('integration')) {
            if (!acText.includes('timeout') && !acText.includes('retry') && !acText.includes('fallback')) {
                questions.push('🔗 Integration mentioned but no timeout, retry, or fallback strategy defined.');
            }
        }

        // Hierarchy context
        if (!pbi.parentTitle && !pbi.parentChain) {
            questions.push('🏗️ No parent epic/feature linked. What is the broader goal this PBI contributes to?');
        }

        if (pbi.children && pbi.children.length > 0) {
            const incompleteTasks = pbi.children.filter((c) => c.state !== 'Closed' && c.state !== 'Done');
            if (incompleteTasks.length > 0) {
                questions.push(`📋 ${incompleteTasks.length} child task(s) are not complete. Should they be done before this PBI?`);
            }
        }

        // Data validation
        if (acText.includes('form') || acText.includes('input') || acText.includes('field')) {
            if (!acText.includes('required') && !acText.includes('optional')) {
                questions.push('📝 Form/input mentioned but required vs. optional fields not specified.');
            }
        }

        return questions;
    }

    /**
     * Strips HTML tags and decodes common HTML entities.
     * Handles Azure DevOps rich-text fields reliably.
     */
    public stripHtml(html: string): string {
        if (!html) {
            return '';
        }

        let text = html;

        // Replace <br>, <br/>, <br /> with newlines
        text = text.replace(/<br\s*\/?>/gi, '\n');

        // Replace </p>, </div>, </li> with newlines to preserve structure
        text = text.replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]*>/g, '');

        // Decode common HTML entities
        text = text.replace(/&nbsp;/gi, ' ');
        text = text.replace(/&amp;/gi, '&');
        text = text.replace(/&lt;/gi, '<');
        text = text.replace(/&gt;/gi, '>');
        text = text.replace(/&quot;/gi, '"');
        text = text.replace(/&#39;/gi, "'");
        text = text.replace(/&#x27;/gi, "'");
        text = text.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)));
        text = text.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));

        // Collapse multiple whitespace (but not newlines) into single space
        text = text.replace(/[^\S\n]+/g, ' ');

        // Collapse multiple newlines into max 2
        text = text.replace(/\n{3,}/g, '\n\n');

        // Trim each line
        text = text
            .split('\n')
            .map((line) => line.trim())
            .join('\n');

        return text.trim();
    }

    /**
     * Parses acceptance criteria from Azure DevOps HTML.
     * Extracts items from <li> elements first, then falls back to <div>/<p>/<br> splitting.
     */
    public parseAcceptanceCriteria(html: string): string[] {
        if (!html) {
            return [];
        }

        // Strategy 1: Extract <li> items if present (ordered/unordered lists)
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        const liMatches: string[] = [];
        let match: RegExpExecArray | null;

        while ((match = liRegex.exec(html)) !== null) {
            const cleaned = this.stripHtml(match[1]);
            if (cleaned.length > 3) {
                liMatches.push(cleaned);
            }
        }

        if (liMatches.length > 0) {
            return liMatches;
        }

        // Strategy 2: Split by block-level elements
        const blockSplit = html
            .replace(/<\/(?:div|p|br)>/gi, '\n')
            .replace(/<(?:div|p|br)[^>]*>/gi, '\n');

        const lines = blockSplit
            .split('\n')
            .map((line) => this.stripHtml(line))
            .filter((line) => line.length > 5);

        if (lines.length > 0) {
            return lines;
        }

        // Strategy 3: Treat entire content as single criterion
        const single = this.stripHtml(html);
        if (single.length > 5) {
            return [single];
        }

        return [];
    }
}
