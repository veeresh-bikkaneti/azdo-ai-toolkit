import { TestScenario } from './TestScenarioGenerator';

export class GherkinGenerator {
    public generate(title: string, scenarios: TestScenario[]): string {
        const lines: string[] = [];

        lines.push(`Feature: ${title}`);
        lines.push('');

        if (scenarios.length === 0) {
            lines.push('  # No scenarios generated');
            return lines.join('\n');
        }

        scenarios.forEach((scenario) => {
            lines.push(`  @${scenario.tag}`);
            lines.push(`  Scenario: ${scenario.title}`);
            lines.push(`    Given the user is on the application`);

            scenario.steps.forEach((step) => {
                lines.push(`    When ${step.toLowerCase()}`);
            });

            lines.push(`    Then ${scenario.expected.toLowerCase()}`);
            lines.push('');
        });

        return lines.join('\n');
    }
}
