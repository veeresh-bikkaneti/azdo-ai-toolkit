import { AzdoClient, WorkItem } from './azdoClient';

export interface TestHealth {
    id: number;
    title: string;
    state: 'Design' | 'Ready' | 'Closed' | 'Active'; // Mapped Azure States
    isDuplicate: boolean;
    duplicateOfId?: number;
    isObsolete: boolean;
    actionRequired: string;
}

export class TestLifecycleManager {
    constructor(private client: AzdoClient) { }

    /**
     * Orchestrates the review of linked test cases for a PBI.
     * Enforces: Design -> Ready -> Closed
     */
    async reviewTestPortfolio(pbiId: number): Promise<TestHealth[]> {
        // 1. Get PBI to find links
        const pbi = await this.client.getWorkItem(pbiId);
        const linkedTestIds = this.extractLinkedTests(pbi);

        if (linkedTestIds.length === 0) return [];

        const testCases = await this.client.getWorkItems(linkedTestIds);
        const healthReport: TestHealth[] = [];

        // 2. Load "Epic" or "Feature" context for duplicate check (optional heuristic)
        // For now, we compare against each other in the PBI

        for (const test of testCases) {
            const state = test.fields['System.State'] as any;
            const health: TestHealth = {
                id: test.id,
                title: test.fields['System.Title'],
                state: state,
                isDuplicate: false,
                isObsolete: false,
                actionRequired: 'None'
            };

            // Rule: Design -> Ready
            if (state === 'Design') {
                health.actionRequired = 'Review Steps & Move to Ready';
            }

            // Rule: Duplicate Check (Heuristic: Similarity with others)
            const duplicate = await this.checkDuplicateInSuite(test, testCases);
            if (duplicate) {
                health.isDuplicate = true;
                health.duplicateOfId = duplicate.id;
                health.actionRequired = `Possible Duplicate of ${duplicate.id}. Review & Retire.`;
            }

            healthReport.push(health);
        }

        return healthReport;
    }

    /**
     * Moves a test to "Closed" state (Retire)
     */
    async retireTest(testId: number, reason: string): Promise<boolean> {
        try {
            await this.client.updateWorkItem(testId, {
                'System.State': 'Closed',
                'System.History': `Retired by AI Agent: ${reason}`
            });
            return true;
        } catch (e) {
            console.error(`Failed to retire test ${testId}`, e);
            return false;
        }
    }

    /**
     * Naive text similarity check for duplicates within the current batch
     */
    private async checkDuplicateInSuite(current: WorkItem, suite: WorkItem[]): Promise<WorkItem | undefined> {
        const currentTitle = current.fields['System.Title'].toLowerCase();

        for (const other of suite) {
            if (other.id === current.id) continue;

            const otherTitle = other.fields['System.Title'].toLowerCase();
            if (this.calculateSimilarity(currentTitle, otherTitle) > 0.85) {
                return other;
            }
        }
        return undefined;
    }

    private extractLinkedTests(pbi: WorkItem): number[] {
        // relations is not in the clean interface yet, assuming it comes from API
        // WorkItem interface needs to be updated if strict typing is enforced, 
        // but JS generic prop access [key: string]: any handles it.
        const relations = (pbi as any).relations || [];
        return relations
            .filter((r: any) => r.rel === 'Microsoft.VSTS.Common.TestedBy-Forward' || r.attributes?.name === 'Tested By')
            .map((r: any) => {
                const parts = r.url.split('/');
                return parseInt(parts[parts.length - 1]);
            });
    }

    private calculateSimilarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;

        const costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }

        return (longer.length - costs[s2.length]) / longer.length;
    }
}
