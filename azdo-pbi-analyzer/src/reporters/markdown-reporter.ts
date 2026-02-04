import { AnalysisReport, TestCase, TestCategory } from '../models/pbi-data.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generates structured Markdown reports from analysis data
 */
export class MarkdownReporter {
    /**
     * Generate complete analysis report
     */
    public generateReport(report: AnalysisReport): string {
        const sections: string[] = [];

        // Header
        sections.push(this.generateHeader(report));
        sections.push('');

        // Summary
        sections.push(this.generateSummary(report));
        sections.push('');

        // NEW: Role-Based Analysis (Top Priority for Refinement)
        sections.push(this.generateRoleBasedAnalysis(report));
        sections.push('');

        // NEW: Gherkin Scenarios
        sections.push(this.generateGherkinSection(report));
        sections.push('');

        // Requirements & Deliverables
        sections.push(this.generateRequirementsSection(report));
        sections.push('');

        // Dependencies
        sections.push(this.generateDependenciesSection(report));
        sections.push('');

        // Test Cases by Category
        sections.push(this.generateTestCasesSection(report));
        sections.push('');

        // Coverage Analysis
        sections.push(this.generateCoverageSection(report));
        sections.push('');

        // Test Update Recommendations
        if (report.testUpdateRecommendations.length > 0) {
            sections.push(this.generateRecommendationsSection(report));
            sections.push('');
        }

        // Automation Candidates
        sections.push(this.generateAutomationSection(report));
        sections.push('');

        // Footer
        sections.push(this.generateFooter(report));

        return sections.join('\n');
    }

    /**
     * Save report to file
     */
    public async saveReport(report: AnalysisReport, outputDir: string): Promise<string> {
        const markdown = this.generateReport(report);
        const fileName = `PBI-${report.pbi.id}-Analysis-${this.formatDate(new Date())}.md`;
        const filePath = path.join(outputDir, fileName);

        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(filePath, markdown, 'utf-8');
        return filePath;
    }

    private generateHeader(report: AnalysisReport): string {
        return `# PBI Analysis Report: [${report.pbi.id}] ${report.pbi.title}

> **Generated:** ${report.generatedAt}  
> **Organization:** ${report.metadata.organization}  
> **Project:** ${report.metadata.project}`;
    }

    private generateSummary(report: AnalysisReport): string {
        const { pbi } = report;

        return `## 📋 Summary

| Attribute | Value |
|-----------|-------|
| **PBI ID** | ${pbi.id} |
| **Title** | ${pbi.title} |
| **Priority** | ${this.getPriorityBadge(pbi.priority)} |
| **State** | ${pbi.state} |
| **Assigned To** | ${pbi.assignedTo} |
| **Area** | ${pbi.areaPath} |
| **Iteration** | ${pbi.iterationPath} |
| **Tags** | ${pbi.tags.join(', ') || 'None'} |
| **Created** | ${this.formatDate(new Date(pbi.createdDate))} |
| **Last Modified** | ${this.formatDate(new Date(pbi.changedDate))} |`;
    }

    private generateRequirementsSection(report: AnalysisReport): string {
        const sections: string[] = ['## 📝 Requirements & Deliverables'];

        sections.push('\n### Requirements\n');
        if (report.requirements.length > 0) {
            report.requirements.forEach((req, index) => {
                sections.push(`${index + 1}. ${req}`);
            });
        } else {
            sections.push('_No explicit requirements identified_');
        }

        sections.push('\n### Acceptance Criteria / Deliverables\n');
        if (report.deliverables.length > 0) {
            report.deliverables.forEach(del => {
                sections.push(`- [ ] ${del}`);
            });
        } else {
            sections.push('_No acceptance criteria defined_');
        }

        return sections.join('\n');
    }

    private generateDependenciesSection(report: AnalysisReport): string {
        const sections: string[] = ['## 🔗 Dependencies & Related Items'];

        sections.push('\n### Dependencies\n');
        if (report.dependencies.length > 0) {
            report.dependencies.forEach(dep => {
                sections.push(`- ${dep}`);
            });
        } else {
            sections.push('_No dependencies identified_');
        }

        if (report.pbi.relatedItems.length > 0) {
            sections.push('\n### Related Work Items\n');
            sections.push('| ID | Type | Relationship | Title | State |');
            sections.push('|----|------|--------------|-------|-------|');

            report.pbi.relatedItems.forEach(item => {
                sections.push(`| ${item.id} | ${item.type} | ${item.relationship} | ${item.title} | ${item.state} |`);
            });
        }

        return sections.join('\n');
    }

    private generateTestCasesSection(report: AnalysisReport): string {
        const sections: string[] = ['## 🧪 Generated Test Cases'];

        const categories: TestCategory[] = ['sanity', 'smoke', 'regression', 'e2e', 'integration'];

        categories.forEach(category => {
            const tests = report.testCases.filter(t => t.category === category);
            if (tests.length === 0) return;

            const categoryTitle = category.toUpperCase() === 'E2E' ? 'E2E' :
                category.charAt(0).toUpperCase() + category.slice(1);

            sections.push(`\n### ${this.getCategoryIcon(category)} ${categoryTitle} Tests (${tests.length})\n`);

            tests.forEach(test => {
                sections.push(this.formatTestCase(test));
                sections.push('');
            });
        });

        return sections.join('\n');
    }

    private formatTestCase(test: TestCase): string {
        const lines: string[] = [];

        lines.push(`#### ${test.title}`);
        lines.push('');
        lines.push(`**Test ID:** \`${test.id}\`  `);
        lines.push(`**Priority:** ${this.getPriorityBadge(test.priority as any)}  `);
        lines.push(`**Tags:** ${test.tags.map(t => `\`${t}\``).join(', ')}  `);
        lines.push(`**Estimated Time:** ${test.estimatedTime || 'N/A'}  `);
        lines.push(`**Automation Candidate:** ${test.automationCandidate ? '✅ Yes' : '❌ No'}  `);
        lines.push('');

        lines.push('**Test Steps:**');
        lines.push('');
        lines.push('| Step | Action | Expected Result | Test Data |');
        lines.push('|------|--------|-----------------|-----------|');

        test.steps.forEach(step => {
            const testData = step.testData || '-';
            lines.push(`| ${step.stepNumber} | ${step.action} | ${step.expectedResult} | ${testData} |`);
        });

        lines.push('');
        lines.push(`**Expected Outcome:** ${test.expectedResult}`);

        return lines.join('\n');
    }

    private generateCoverageSection(report: AnalysisReport): string {
        const { coverage } = report;

        return `## 📊 Test Coverage Analysis

| Metric | Count |
|--------|-------|
| **Total Test Cases Generated** | ${coverage.totalGenerated} |
| **Sanity Tests** | ${coverage.byCategoryCount.sanity || 0} |
| **Smoke Tests** | ${coverage.byCategoryCount.smoke || 0} |
| **Regression Tests** | ${coverage.byCategoryCount.regression || 0} |
| **E2E/Journey Tests** | ${coverage.byCategoryCount.e2e || 0} |
| **Automation Candidates** | ${coverage.automationCandidates} |
| **Existing Tests Found** | ${coverage.existingTestsFound} |
| **Coverage Gap** | ${coverage.coverageGap} tests needed |`;
    }

    private generateRecommendationsSection(report: AnalysisReport): string {
        const sections: string[] = ['## 🔄 Test Update Recommendations'];

        sections.push('\nThe following existing test cases may need review or updates:\n');
        sections.push('| Test ID | Title | Recommended Action | Reason |');
        sections.push('|---------|-------|-------------------|--------|');

        report.testUpdateRecommendations.forEach(rec => {
            const action = rec.suggestedAction === 'update' ? '🔄 Update' :
                rec.suggestedAction === 'retire' ? '🗑️ Retire' : '👁️ Review';

            sections.push(`| ${rec.testCaseId} | ${rec.testCaseTitle} | ${action} | ${rec.reason} |`);
        });

        return sections.join('\n');
    }

    private generateAutomationSection(report: AnalysisReport): string {
        const automationTests = report.testCases.filter(t => t.automationCandidate);

        const sections: string[] = ['## 🤖 Automation Recommendations'];

        sections.push(`\n**Total Automation Candidates:** ${automationTests.length}\n`);

        if (automationTests.length > 0) {
            sections.push('### Priority Tests for Automation\n');

            const criticalTests = automationTests.filter(t => t.priority === 'critical');
            const smokeTests = automationTests.filter(t => t.category === 'smoke');

            if (criticalTests.length > 0) {
                sections.push('**Critical Priority:**');
                criticalTests.forEach(t => sections.push(`- ${t.id}: ${t.title}`));
                sections.push('');
            }

            if (smokeTests.length > 0) {
                sections.push('**Smoke/CI-CD Tests:**');
                smokeTests.forEach(t => sections.push(`- ${t.id}: ${t.title}`));
            }
        }

        return sections.join('\n');
    }

    private generateFooter(report: AnalysisReport): string {
        return `---

## 💡 Next Steps

1. **Review Test Cases:** Validate generated tests align with requirements
2. **Prioritize Automation:** Focus on smoke and critical tests first
3. **Update Azure Test Plans:** Import relevant test cases
4. **Execute Tests:** Run manual tests, automate where applicable
5. **Track Coverage:** Monitor test execution and results

---

*This report was generated by Azure DevOps PBI Analyzer*  
*Generated at: ${report.generatedAt}*`;
    }

    // Helper methods
    private getPriorityBadge(priority: number | string): string {
        const badges: Record<string, string> = {
            '1': '🔴 Critical (P1)',
            '2': '🟠 High (P2)',
            '3': '🟡 Medium (P3)',
            '4': '🟢 Low (P4)',
            'critical': '🔴 Critical',
            'high': '🟠 High',
            'medium': '🟡 Medium',
            'low': '🟢 Low',
        };

        return badges[priority.toString()] || `P${priority}`;
    }

    private getCategoryIcon(category: TestCategory): string {
        const icons: Record<TestCategory, string> = {
            sanity: '🏥',
            smoke: '💨',
            regression: '🔁',
            e2e: '🛤️',
            integration: '🔌',
        };

        return icons[category] || '📝';
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private generateRoleBasedAnalysis(report: AnalysisReport): string {
        const sections: string[] = ['## 👥 Team Refinement Insights'];

        // Product Owner Section
        sections.push('\n### 👑 For Product Owner');
        sections.push('- [ ] **Acceptance Criteria**: Review the Gherkin scenarios below for accuracy.');
        sections.push('- [ ] **Prioritization**: Confirm business value and priority.');

        // Developer Section
        sections.push('\n### 👨‍💻 For Developers');
        sections.push('- [ ] **Dependencies**: Check the "Dependencies" section for blockers.');
        sections.push('- [ ] **Impact**: Review potential side effects on existing features.');

        // QA Section
        sections.push('\n### 🕵️ For QA / Testers');
        sections.push(`- [ ] **Coverage**: ${report.testCases.filter(t => t.automationCandidate).length} candidates identified for automation.`);
        sections.push('- [ ] **Strategy**: Review the "Test Coverage Analysis" table.`);

        return sections.join('\n');
    }

    private generateGherkinSection(report: AnalysisReport): string {
        return `## 🥒 Gherkin Scenarios (Draft)\n\n\`\`\`gherkin\n${report.gherkin || '# No requirements found to generate Gherkin'}\n\`\`\``;
    }
}
