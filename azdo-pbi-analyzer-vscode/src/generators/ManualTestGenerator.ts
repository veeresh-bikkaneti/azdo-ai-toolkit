import { TestScenario } from './TestScenarioGenerator';

export class ManualTestGenerator {
    /**
     * Generates a markdown document with test cases in Azure DevOps
     * bulk import compatible CSV format plus a readable table.
     * Reference: https://learn.microsoft.com/en-us/azure/devops/test/bulk-import-export-test-cases
     */
    public generate(pbiTitle: string, scenarios: TestScenario[]): string {
        const lines: string[] = [];

        lines.push(`# Manual Test Cases`);
        lines.push('');
        lines.push(`**PBI:** ${pbiTitle}`);
        lines.push('');

        if (scenarios.length === 0) {
            lines.push('*No test scenarios generated.*');
            return lines.join('\n');
        }

        // Readable table view
        lines.push('## Test Case Summary');
        lines.push('');
        lines.push('| # | Title | Tag | Steps | Expected Result |');
        lines.push('| --- | --- | --- | --- | --- |');

        scenarios.forEach((scenario, i) => {
            const stepsText = scenario.steps
                .map((s, si) => `${si + 1}. ${s}`)
                .join(' ');
            lines.push(
                `| ${i + 1} | ${scenario.title} | ${scenario.tag} | ${stepsText} | ${scenario.expected} |`
            );
        });

        lines.push('');

        // Detailed test cases
        lines.push('## Detailed Test Cases');
        lines.push('');

        scenarios.forEach((scenario, i) => {
            lines.push(`### TC-${i + 1}: ${scenario.title}`);
            lines.push('');
            lines.push(`**Tag:** \`${scenario.tag}\``);
            lines.push('');
            lines.push('**Steps:**');
            lines.push('');
            scenario.steps.forEach((step, si) => {
                lines.push(`${si + 1}. ${step}`);
            });
            lines.push('');
            lines.push(`**Expected Result:** ${scenario.expected}`);
            lines.push('');
            lines.push('---');
            lines.push('');
        });

        // CSV block for Azure DevOps bulk import
        lines.push('## Azure DevOps Bulk Import CSV');
        lines.push('');
        lines.push('Copy the block below and save as `.csv` for import into Azure Test Plans.');
        lines.push('');
        lines.push('```csv');
        lines.push(this.generateCsv(scenarios));
        lines.push('```');
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Generates CSV content compatible with Azure DevOps bulk import.
     */
    public generateCsv(scenarios: TestScenario[]): string {
        const headers = [
            'ID',
            'Work Item Type',
            'Title',
            'Test Step',
            'Step Action',
            'Step Expected',
            'Priority',
            'Assigned To',
            'State',
            'Tags',
        ];

        let csv = headers.join(',') + '\n';

        scenarios.forEach((scenario) => {
            const testCaseTitle = this.escapeCsv(scenario.title);
            const priority = scenario.tag === 'critical' ? '1' : scenario.tag === 'smoke' ? '2' : '3';

            scenario.steps.forEach((step, index) => {
                const isFirstStep = index === 0;
                const stepNumber = index + 1;
                const action = this.escapeCsv(step);
                const expected = index === scenario.steps.length - 1
                    ? this.escapeCsv(scenario.expected)
                    : '';

                const row = [
                    '',
                    isFirstStep ? 'Test Case' : '',
                    isFirstStep ? testCaseTitle : '',
                    stepNumber,
                    action,
                    expected,
                    isFirstStep ? priority : '',
                    '',
                    isFirstStep ? 'Design' : '',
                    isFirstStep ? scenario.tag : '',
                ];

                csv += row.join(',') + '\n';
            });
        });

        return csv.trim();
    }

    private escapeCsv(field: string): string {
        if (!field) {
            return '';
        }

        if (
            field.includes(',') ||
            field.includes('"') ||
            field.includes('\n') ||
            field.includes('\r')
        ) {
            return `"${field.replace(/"/g, '""')}"`;
        }

        return field;
    }
}
