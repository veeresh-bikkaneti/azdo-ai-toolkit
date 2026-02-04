import { PBIData, TestCase, TestCoverageSummary } from '../models/pbi-data.js';
import { SanityTestTemplate } from './templates/sanity-tests.js';
import { SmokeTestTemplate } from './templates/smoke-tests.js';
import { RegressionTestTemplate } from './templates/regression-tests.js';
import { E2ETestTemplate } from './templates/e2e-tests.js';

/**
 * Orchestrates test case generation from multiple templates
 */
export class TestGenerator {
    private sanityTemplate: SanityTestTemplate;
    private smokeTemplate: SmokeTestTemplate;
    private regressionTemplate: RegressionTestTemplate;
    private e2eTemplate: E2ETestTemplate;

    constructor() {
        this.sanityTemplate = new SanityTestTemplate();
        this.smokeTemplate = new SmokeTestTemplate();
        this.regressionTemplate = new RegressionTestTemplate();
        this.e2eTemplate = new E2ETestTemplate();
    }

    /**
     * Generate comprehensive test suite for a PBI
     */
    public generateTestSuite(
        pbi: PBIData,
        requirements: string[],
        deliverables: string[],
        isCritical: boolean
    ): { testCases: TestCase[]; coverage: TestCoverageSummary } {
        const testCases: TestCase[] = [];

        // Generate sanity tests (always)
        const sanityTests = this.sanityTemplate.generate(pbi, requirements);
        testCases.push(...sanityTests);

        // Generate smoke tests (for critical PBIs or based on priority)
        const smokeTests = this.smokeTemplate.generate(pbi, isCritical);
        testCases.push(...smokeTests);

        // Generate regression tests (always)
        const regressionTests = this.regressionTemplate.generate(pbi, requirements);
        testCases.push(...regressionTests);

        // Generate E2E tests (always)
        const e2eTests = this.e2eTemplate.generate(pbi, deliverables);
        testCases.push(...e2eTests);

        // Calculate coverage summary
        const coverage = this.calculateCoverage(testCases);

        return { testCases, coverage };
    }

    /**
     * Calculate test coverage summary
     */
    private calculateCoverage(testCases: TestCase[]): TestCoverageSummary {
        const byCategoryCount: Record<string, number> = {
            sanity: 0,
            smoke: 0,
            regression: 0,
            e2e: 0,
            integration: 0,
        };

        let automationCandidates = 0;

        testCases.forEach(test => {
            byCategoryCount[test.category] = (byCategoryCount[test.category] || 0) + 1;
            if (test.automationCandidate) {
                automationCandidates++;
            }
        });

        return {
            totalGenerated: testCases.length,
            byCategoryCount: byCategoryCount as any,
            existingTestsFound: 0, // Will be updated by analyzer
            coverageGap: 0, // Will be calculated by analyzer
            automationCandidates,
        };
    }

    /**
     * Tag tests based on priority and type
     */
    public tagTests(testCases: TestCase[], pbi: PBIData): TestCase[] {
        return testCases.map(test => {
            const tags = [...test.tags];

            // Add priority-based tags
            if (pbi.priority === 1) {
                tags.push('p1');
            }

            // Add functional area tags
            if (pbi.tags.length > 0) {
                tags.push(...pbi.tags.slice(0, 2)); // Add first 2 PBI tags
            }

            // Add area path as tag
            const areaPathParts = pbi.areaPath.split('\\');
            if (areaPathParts.length > 0) {
                const area = areaPathParts[areaPathParts.length - 1];
                tags.push(area.toLowerCase().replace(/\s+/g, '-'));
            }

            // Mark as automation candidate if criteria met
            if (test.category === 'smoke' || test.category === 'sanity') {
                if (!tags.includes('automated')) {
                    tags.push('automation-ready');
                }
            }

            return {
                ...test,
                tags: [...new Set(tags)], // Remove duplicates
            };
        });
    }
}
