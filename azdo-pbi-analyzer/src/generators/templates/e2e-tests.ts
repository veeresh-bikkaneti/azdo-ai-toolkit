import { PBIData, TestCase } from '../../models/pbi-data.js';

/**
 * Generate E2E and journey tests - complete user workflows
 */
export class E2ETestTemplate {
    public generate(pbi: PBIData, deliverables: string[]): TestCase[] {
        const tests: TestCase[] = [];

        // Test 1: Complete user journey
        tests.push({
            id: `E2E-${pbi.id}-001`,
            title: `E2E: ${pbi.title} - Complete User Journey`,
            category: 'e2e',
            priority: 'high',
            tags: ['e2e', 'user-journey', 'integration'],
            steps: this.generateJourneySteps(pbi, deliverables),
            expectedResult: 'User can complete entire workflow from start to finish',
            estimatedTime: '10 minutes',
            automationCandidate: true,
        });

        // Test 2: Multi-user scenario
        tests.push({
            id: `E2E-${pbi.id}-002`,
            title: `E2E: ${pbi.title} - Multi-User Scenario`,
            category: 'e2e',
            priority: 'medium',
            tags: ['e2e', 'multi-user', 'collaboration'],
            steps: [
                {
                    stepNumber: 1,
                    action: 'User A initiates a workflow',
                    expectedResult: 'Workflow started successfully',
                    testData: 'User A credentials',
                },
                {
                    stepNumber: 2,
                    action: 'User B accesses shared resource',
                    expectedResult: 'User B can view/modify as per permissions',
                    testData: 'User B credentials',
                },
                {
                    stepNumber: 3,
                    action: 'Verify changes are visible to both users',
                    expectedResult: 'Real-time or eventual consistency maintained',
                },
                {
                    stepNumber: 4,
                    action: 'Handle concurrent modifications',
                    expectedResult: 'Conflicts resolved or prevented',
                },
            ],
            expectedResult: 'Multi-user interactions work correctly',
            estimatedTime: '12 minutes',
            automationCandidate: false,
        });

        // Test 3: Cross-feature integration
        tests.push({
            id: `E2E-${pbi.id}-003`,
            title: `E2E: ${pbi.title} - Cross-Feature Integration`,
            category: 'e2e',
            priority: 'high',
            tags: ['e2e', 'integration', 'cross-feature'],
            steps: [
                {
                    stepNumber: 1,
                    action: 'Complete primary feature workflow',
                    expectedResult: 'Feature workflow successful',
                },
                {
                    stepNumber: 2,
                    action: 'Navigate to related feature',
                    expectedResult: 'Data from step 1 is accessible',
                },
                {
                    stepNumber: 3,
                    action: 'Perform action that depends on first feature',
                    expectedResult: 'Integration works seamlessly',
                },
                {
                    stepNumber: 4,
                    action: 'Verify end-to-end data flow',
                    expectedResult: 'Data consistency across features',
                },
            ],
            expectedResult: 'Features integrate correctly',
            estimatedTime: '8 minutes',
            automationCandidate: true,
        });

        // Test 4: Error recovery journey
        tests.push({
            id: `E2E-${pbi.id}-004`,
            title: `E2E: ${pbi.title} - Error Recovery`,
            category: 'e2e',
            priority: 'medium',
            tags: ['e2e', 'error-recovery', 'resilience'],
            steps: [
                {
                    stepNumber: 1,
                    action: 'Start a multi-step process',
                    expectedResult: 'Process initiated',
                },
                {
                    stepNumber: 2,
                    action: 'Simulate error at mid-point',
                    expectedResult: 'Error caught and user notified',
                },
                {
                    stepNumber: 3,
                    action: 'Attempt to recover/retry',
                    expectedResult: 'User can resume or restart',
                },
                {
                    stepNumber: 4,
                    action: 'Complete the process after recovery',
                    expectedResult: 'Process completes successfully',
                },
            ],
            expectedResult: 'System recovers gracefully from errors',
            estimatedTime: '9 minutes',
            automationCandidate: false,
        });

        return tests;
    }

    private generateJourneySteps(_pbi: PBIData, deliverables: string[]): any[] {
        const steps: any[] = [];

        if (deliverables.length > 0) {
            deliverables.forEach((deliverable, index) => {
                steps.push({
                    stepNumber: index + 1,
                    action: `Complete: ${deliverable}`,
                    expectedResult: 'Step completes successfully',
                });
            });

            // Add final verification step
            steps.push({
                stepNumber: deliverables.length + 1,
                action: 'Verify entire workflow completion',
                expectedResult: 'All deliverables achieved, workflow complete',
            });
        } else {
            // Default journey steps
            steps.push(
                {
                    stepNumber: 1,
                    action: 'User logs in and navigates to feature',
                    expectedResult: 'Successfully authenticated and feature loaded',
                },
                {
                    stepNumber: 2,
                    action: 'User initiates primary action',
                    expectedResult: 'Action accepted and processing started',
                },
                {
                    stepNumber: 3,
                    action: 'System processes the request',
                    expectedResult: 'Processing completes without errors',
                },
                {
                    stepNumber: 4,
                    action: 'User verifies outcome',
                    expectedResult: 'Expected results displayed correctly',
                },
                {
                    stepNumber: 5,
                    action: 'User completes workflow',
                    expectedResult: 'Workflow marked as complete, data persisted',
                }
            );
        }

        return steps;
    }
}
