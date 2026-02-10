export type TestTag = 'smoke' | 'critical' | 'non-regression';

export interface TestScenario {
    title: string;
    steps: string[];
    expected: string;
    tag: TestTag;
}

const CRITICAL_KEYWORDS = [
    'login', 'auth', 'password', 'payment', 'checkout', 'security',
    'permission', 'role', 'access', 'token', 'session', 'encrypt',
    'delete', 'remove', 'data loss',
];

const SMOKE_KEYWORDS = [
    'display', 'show', 'render', 'page load', 'navigate', 'view',
    'visible', 'appear', 'open', 'launch', 'homepage', 'landing',
];

export class TestScenarioGenerator {
    public generate(criteria: string[]): TestScenario[] {
        return criteria.map((ac, index) => {
            const tag = this.assignTag(ac);
            const titlePrefix = `[${tag.toUpperCase()}]`;
            const truncated = ac.length > 60 ? ac.substring(0, 60) + '...' : ac;

            return {
                title: `${titlePrefix} AC${index + 1}: ${truncated}`,
                steps: [
                    'Navigate to the relevant page/feature',
                    `Perform action to verify: ${ac}`,
                    'Observe the result and validate against expected outcome',
                ],
                expected: `The criterion "${ac}" is satisfied.`,
                tag,
            };
        });
    }

    private assignTag(criterion: string): TestTag {
        const lower = criterion.toLowerCase();

        for (const keyword of CRITICAL_KEYWORDS) {
            if (lower.includes(keyword)) {
                return 'critical';
            }
        }

        for (const keyword of SMOKE_KEYWORDS) {
            if (lower.includes(keyword)) {
                return 'smoke';
            }
        }

        return 'non-regression';
    }
}
