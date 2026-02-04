import { PBIData, TestCase } from '../../models/pbi-data.js';

/**
 * Generate smoke tests - critical path verification for CI/CD
 */
export class SmokeTestTemplate {
    public generate(pbi: PBIData, isCritical: boolean): TestCase[] {
        const tests: TestCase[] = [];

        // All smoke tests should be automated and tagged appropriately
        if (isCritical || pbi.priority === 1) {
            // Test 1: Critical functionality
            tests.push({
                id: `SMOKE-${pbi.id}-001`,
                title: `Smoke Test: ${pbi.title} - Core Functionality`,
                category: 'smoke',
                priority: 'critical',
                tags: ['smoke', 'critical', 'ci-cd', 'automated'],
                steps: [
                    {
                        stepNumber: 1,
                        action: 'Execute critical user flow',
                        expectedResult: 'Flow completes end-to-end',
                        testData: 'Valid test data set',
                    },
                    {
                        stepNumber: 2,
                        action: 'Verify system response time',
                        expectedResult: 'Response within acceptable limits (<3s)',
                    },
                    {
                        stepNumber: 3,
                        action: 'Check for error logs',
                        expectedResult: 'No critical errors logged',
                    },
                ],
                expectedResult: 'Critical functionality works without failures',
                estimatedTime: '1 minute',
                automationCandidate: true,
            });

            // Test 2: Integration points
            tests.push({
                id: `SMOKE-${pbi.id}-002`,
                title: `Smoke Test: ${pbi.title} - Integration Points`,
                category: 'smoke',
                priority: 'critical',
                tags: ['smoke', 'integration', 'critical'],
                steps: [
                    {
                        stepNumber: 1,
                        action: 'Verify API/service availability',
                        expectedResult: 'All required services are reachable',
                    },
                    {
                        stepNumber: 2,
                        action: 'Test data flow between components',
                        expectedResult: 'Data transfers correctly',
                    },
                    {
                        stepNumber: 3,
                        action: 'Validate error handling for service failures',
                        expectedResult: 'Graceful degradation on failures',
                    },
                ],
                expectedResult: 'Integration points are stable',
                estimatedTime: '2 minutes',
                automationCandidate: true,
            });
        }

        // Test 3: Build verification (always included)
        tests.push({
            id: `SMOKE-${pbi.id}-003`,
            title: `Smoke Test: ${pbi.title} - Build Verification`,
            category: 'smoke',
            priority: 'high',
            tags: ['smoke', 'build-verification', 'automated'],
            steps: [
                {
                    stepNumber: 1,
                    action: 'Deploy latest build to test environment',
                    expectedResult: 'Deployment succeeds',
                },
                {
                    stepNumber: 2,
                    action: 'Verify feature is accessible post-deployment',
                    expectedResult: 'Feature loads without errors',
                },
                {
                    stepNumber: 3,
                    action: 'Execute quick sanity check',
                    expectedResult: 'Basic functionality works',
                },
            ],
            expectedResult: 'Build is stable and deployable',
            estimatedTime: '2 minutes',
            automationCandidate: true,
        });

        return tests;
    }
}
