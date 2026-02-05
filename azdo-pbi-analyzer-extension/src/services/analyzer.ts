import { WorkItem } from './azdoClient';

export interface AnalysisResult {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
    isReady: boolean;
}

export class PbiAnalyzer {
    analyze(workItem: WorkItem): AnalysisResult {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let score = 100;

        const title = workItem.fields['System.Title'] || '';
        const description = workItem.fields['System.Description'] || '';
        const ac = workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '';

        // 1. Title Analysis
        if (title.length < 10) {
            score -= 10;
            issues.push('Title is too short. It should be descriptive.');
        }

        // 2. Description Analysis
        if (!description || description.trim() === '') {
            score -= 30;
            issues.push('Description is missing.');
        } else {
            if (description.length < 50) {
                score -= 10;
                suggestions.push('Description seems brief. Consider adding more context.');
            }
        }

        // 3. Acceptance Criteria Analysis
        if (!ac || ac.trim() === '') {
            score -= 40;
            issues.push('Acceptance Criteria field is empty.');
        } else {
            // Check for Gherkin keywords (simple check)
            const lowerAc = ac.toLowerCase();
            const hasGiven = lowerAc.includes('given');
            const hasWhen = lowerAc.includes('when');
            const hasThen = lowerAc.includes('then');

            if (!hasGiven || !hasWhen || !hasThen) {
                score -= 10;
                suggestions.push('Acceptance Criteria does not appear to use Gherkin (Given/When/Then) format.');
            }
        }

        // 4. Clarity Checks (Heuristic)
        const ambiguityKeywords = ['maybe', 'might', 'roughly', 'approx', 'tbd', 'unknown'];
        const content = (title + description + ac).toLowerCase();
        const foundAmbiguities = ambiguityKeywords.filter(w => content.includes(w));

        if (foundAmbiguities.length > 0) {
            score -= 5 * foundAmbiguities.length;
            issues.push(`Found ambiguous terms: ${foundAmbiguities.join(', ')}`);
        }

        // Cap score
        score = Math.max(0, score);

        return {
            score,
            issues,
            suggestions,
            isReady: score > 80
        };
    }
}
