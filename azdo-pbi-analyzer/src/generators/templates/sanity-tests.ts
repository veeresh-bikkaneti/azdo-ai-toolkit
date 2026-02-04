import { PBIData, TestCase, TestStep } from '../../models/pbi-data.js';

/**
 * Generate sanity tests - basic functionality verification
 */
export class SanityTestTemplate {
    public generate(pbi: PBIData, requirements: string[]): TestCase[] {
        const tests: TestCase[] = [];

        // Test 1: Basic feature availability
        tests.push({
            id: `SANITY-${pbi.id}-001`,
            title: `Verify ${pbi.title} - Feature Availability`,
            category: 'sanity',
            priority: 'high',
            tags: ['sanity', 'quick-check'],
            steps: [
                {
                    stepNumber: 1,
                    action: 'Navigate to the feature/module',
                    expectedResult: 'Feature is accessible and loads successfully',
                },
                {
                    stepNumber: 2,
                    action: 'Verify all UI elements are displayed',
                    expectedResult: 'All buttons, forms, and controls are visible',
                },
                {
                    stepNumber: 3,
                    action: 'Check for console errors',
                    expectedResult: 'No JavaScript errors in console',
                },
            ],
            expectedResult: 'Feature is available and functional',
            estimatedTime: '2 minutes',
            automationCandidate: true,
        });

        // Test 2: Happy path workflow
        tests.push({
            id: `SANITY-${pbi.id}-002`,
            title: `Verify ${pbi.title} - Happy Path`,
            category: 'sanity',
            priority: 'critical',
            tags: ['sanity', 'happy-path', 'smoke'],
            steps: this.generateHappyPathSteps(pbi, requirements),
            expectedResult: 'Primary workflow completes successfully',
            estimatedTime: '3 minutes',
            automationCandidate: true,
        });

        // Test 3: Data validation
        tests.push({
            id: `SANITY-${pbi.id}-003`,
            title: `Verify ${pbi.title} - Data Persistence`,
            category: 'sanity',
            priority: 'medium',
            tags: ['sanity', 'data-validation'],
            steps: [
                {
                    stepNumber: 1,
                    action: 'Perform an action that creates/modifies data',
                    expectedResult: 'Action completes successfully',
                },
                {
                    stepNumber: 2,
                    action: 'Refresh the page or navigate away and return',
                    expectedResult: 'Changes persist correctly',
                },
                {
                    stepNumber: 3,
                    action: 'Verify data is displayed correctly',
                    expectedResult: 'All data is accurate and complete',
                },
            ],
            expectedResult: 'Data persistence works as expected',
            estimatedTime: '2 minutes',
            automationCandidate: true,
        });

        return tests;
    }

    private generateHappyPathSteps(_pbi: PBIData, requirements: string[]): TestStep[] {
        const steps: TestStep[] = [];

        // Generic happy path based on requirements
        if (requirements.length > 0) {
            requirements.slice(0, 3).forEach((req, index) => {
                steps.push({
                    stepNumber: index + 1,
                    action: `Execute: ${req}`,
                    expectedResult: 'Operation completes successfully',
                });
            });
        } else {
            // Default happy path steps
            steps.push(
                {
                    stepNumber: 1,
                    action: 'Access the feature with valid inputs',
                    expectedResult: 'Feature accepts input',
                },
                {
                    stepNumber: 2,
                    action: 'Execute primary action',
                    expectedResult: 'Action completes without errors',
                },
                {
                    stepNumber: 3,
                    action: 'Verify expected output',
                    expectedResult: 'Output matches expectations',
                }
            );
        }

        return steps;
    }
}
