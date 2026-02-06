import { WorkItem } from './azdoClient';
import { CommitInfo, FileImpact } from './gitService';

export class ContextGenerator {

    /**
     * Generates a comprehensive Markdown context for AI agents.
     */
    public generate(pbi: WorkItem, commits: CommitInfo[], impacts: FileImpact[]): string {
        const hasCodeContext = commits.length > 0;

        if (!hasCodeContext) {
            return this.generateExpertPromptFallback(pbi);
        }

        const pbiContext = this.formatPbiSection(pbi);
        const codeContext = this.formatCodeSection(commits, impacts);
        const testStrategy = this.formatStrategySection(impacts);

        return `# PBI ${pbi.id} Review Context
        
> **Generated on:** ${new Date().toISOString()}
> **Purpose:** Use this context to review the PBI, generate test cases, and perform a peer review of the code.

${pbiContext}

---

${codeContext}

---

${testStrategy}

---

## 🤖 Agent Instructions (Code Access Mode)

### 1. Requirements Check
- Verify if the **Code Changes** align with the **Acceptance Criteria**.
- Flag any missing requirements.

### 2. Sanity Test Generation
- Generate **Cypress/Playwright** test cases for the **Directly Changed Files**.
- Focus on the "Happy Path" defined in the AC.

### 3. Regression Test Generation
- Look at the **Regression Impact (Imported By)** section.
- Suggest 2-3 scenarios to verify that dependent modules were not broken.

### 4. Peer Review
- Review the **Code Diffs** for:
    - Code Style/Cleanliness
    - Error Handling (Are try/catch blocks used?)
    - Security Risks (SQLi, Secrets, etc.)

---
<!-- Metadata for Automation -->
\`\`\`json
{
    "pbiId": ${pbi.id},
    "generatedAt": "${new Date().toISOString()}",
    "impactedFiles": ${JSON.stringify(impacts.map(i => i.file))}
}
\`\`\`
`;
    }

    private generateExpertPromptFallback(pbi: WorkItem): string {
        const title = pbi.fields['System.Title'];
        const desc = this.stripHtml(pbi.fields['System.Description'] || 'No description');
        const ac = this.stripHtml(pbi.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || 'No AC');

        return `# Expert Prompt: PBI ${pbi.id} Analysis (No Code Access)

> **Context:** The system could not access Git commits. Use this **Expert Prompt** to manually query your AI Assistant (Copilot/ChatGPT) effectively.

---
**COPY & PASTE THE BELOW INTO YOUR AI CHAT:**

---

**Role:** You are an **Expert QA Automation Engineer** and **Product Owner** with deep experience in Azure DevOps.
**Task:** Analyze the following Product Backlog Item (PBI) and generate a Test Strategy.

## PBI Details
- **ID:** ${pbi.id}
- **Title:** ${title}
- **Description:** ${desc}
- **Acceptance Criteria (AC):**
${ac}

## Requirements for You (The AI):
1. **Scope Clarification**: Ask me specific "Socratic Questions" to understand the technical implementation (e.g., "Does this API change affect the Auth middleware?").
2. **Missing Info**: Identify what file names or modules you need me to provide code for.
3. **Test Generation**:
   - Generate **Manual Test Cases** (Step-by-Step) covering Happy Path and Edge Cases.
   - Generate **Gherkin Scenarios** for these tests.
4. **Lifecycle Check**: Ask if there are existing tests I should check for duplicates.

**Constraints:**
- Do not hallucinate code names. Ask me for them.
- Format output as a Markdown report.

---
`;
    }

    private formatPbiSection(pbi: WorkItem): string {
        const title = pbi.fields['System.Title'];
        const desc = this.stripHtml(pbi.fields['System.Description'] || 'No description');
        const ac = this.stripHtml(pbi.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || 'No AC');

        return `## 1. Requirements (Azure DevOps)

### Title
**${title}**

### Description
${desc}

### Acceptance Criteria
\`\`\`gherkin
${ac}
\`\`\``;
    }

    private formatCodeSection(commits: CommitInfo[], impacts: FileImpact[]): string {
        const commitSummary = commits.map(c => `- **${c.hash.substring(0, 7)}**: ${c.message} (${c.author})`).join('\n');

        let fileDetails = '';

        for (const impact of impacts) {
            const isLarge = impact.diff.split('\n').length > 500;
            const diffDisplay = isLarge
                ? `(Diff truncated: >500 lines. Review file manually at ${impact.file})`
                : impact.diff;

            fileDetails += `
### ${impact.changeType}: ${impact.file}
**Regression Risk:** Imported by ${impact.importedBy.length} files.

<details>
<summary>View Diff</summary>

\`\`\`diff
${diffDisplay}
\`\`\`
</details>

**Dependent Files (Potential Regression):**
${impact.importedBy.length > 0 ? impact.importedBy.map(f => `- ${f}`).join('\n') : '*No direct imports found.*'}
`;
        }

        return `## 2. Code Context

### Related Commits
${commitSummary || '*No linked commits found.*'}

### File Impact Analysis
${fileDetails || '*No file changes detected.*'}`;
    }

    private formatStrategySection(impacts: FileImpact[]): string {
        const sanityTargets = impacts.map(i => i.file);
        const regressionTargets = [...new Set(impacts.flatMap(i => i.importedBy))];

        const existingTests = impacts.flatMap(i => i.testFiles);

        return `## 3. Recommended Test Strategy

### Scope
- **Sanity (Concentrated)**: ${sanityTargets.length} files changed.
- **Regression (Ripple)**: ${regressionTargets.length} files potentially impacted.

### Existing Tests Detected
${existingTests.length > 0 ? existingTests.map(t => `- [ ] Run ${t}`).join('\n') : '**No existing tests found for these files.**'}
`;
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    }
}
