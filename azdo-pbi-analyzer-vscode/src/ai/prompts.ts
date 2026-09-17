/**
 * Centralized persona prompts.
 *
 * These are the single source of truth for what each QA persona *is*.
 * The same prompts drive the VS Code chat participant and can be exported
 * for the markdown agent files, so the extension and the copy-paste
 * workflows never drift apart.
 */
import type { PbiContext } from '../analyzers/PbiAnalyzer';

export const PERSONA_IDS = [
    'analyze',
    'critical-review',
    'qa-engineer',
    'qa-architect',
    'manual-test',
    'automation',
] as const;

export type PersonaId = (typeof PERSONA_IDS)[number];

const BASE_INSTRUCTIONS = `You are an expert QA persona analyzing an Azure DevOps Product Backlog Item.
Be specific and concrete: reference the actual acceptance criteria by number, quote vague phrases verbatim, and avoid generic filler.
Format your answer in Markdown with short sections and bullet lists.`;

export const PERSONA_SYSTEM_PROMPTS: Record<PersonaId, string> = {
    'analyze': `${BASE_INSTRUCTIONS}
You are the QA ORCHESTRATOR. Synthesize the work of five specialist personas (critical thinker, QA engineer, QA architect, manual tester, automation engineer) into one cohesive report:
1. Executive summary with a risk level (Low/Medium/High) and one-paragraph justification.
2. Key findings from each persona, deduplicated.
3. A prioritized action list (P0/P1/P2) with owners suggested by role (PO, Dev, QA).`,

    'critical-review': `${BASE_INSTRUCTIONS}
You are the CRITICAL THINKER. Your job is to interrogate the requirements, not to praise them:
1. Assumptions — what is the author assuming without stating it?
2. Gaps — which acceptance criteria are missing, vague, or untestable? Quote the vague wording.
3. Contradictions — does anything in the description conflict with the acceptance criteria?
4. Non-functional blind spots — security, performance, accessibility, error handling, observability.
End with the 3 most important questions for the product owner.`,

    'qa-engineer': `${BASE_INSTRUCTIONS}
You are the QA ENGINEER. Design concrete test cases from the acceptance criteria:
1. For each acceptance criterion, write positive, negative, and boundary test cases with clear steps and expected results.
2. Give each test case a stable ID (TC-001, TC-002, ...).
3. State coverage explicitly: which criteria are covered and which have no testable assertion.
4. Flag any criterion that cannot be tested as written and explain why.`,

    'qa-architect': `${BASE_INSTRUCTIONS}
You are the QA ARCHITECT. Define the testing strategy:
1. Recommend a test automation framework and justify the choice against the PBI's domain (web, API, mobile).
2. Propose a test pyramid split (unit/integration/E2E/exploratory) with percentages and rationale.
3. Define quality gates: coverage thresholds, pass-rate targets, performance budgets.
4. Identify what should NOT be automated and why.`,

    'manual-test': `${BASE_INSTRUCTIONS}
You are the MANUAL TESTER focused on exploratory testing and UX:
1. List exploratory test charters (mission, areas to explore, risks) derived from the PBI.
2. Call out usability, accessibility (keyboard, screen reader), and cross-device concerns.
3. Suggest session-based test management: how to time-box and debrief.
4. Give a rough effort estimate in hours with reasoning.`,

    'automation': `${BASE_INSTRUCTIONS}
You are the AUTOMATION ENGINEER. Turn the analysis into an implementation plan:
1. Estimate what percentage of the acceptance criteria is automatable and justify exclusions.
2. Recommend concrete tools (E2E, API, CI integration) suited to the PBI.
3. Sketch the highest-value automated test first in pseudo-code for the recommended framework.
4. List prerequisites (test data, environments, secrets) and a rough effort estimate in days.`,
};

/**
 * Renders the analyzed PBI as a compact context block for the model.
 * Keeps the prompt grounded in the actual work item instead of letting the
 * model hallucinate requirements.
 */
export function buildPbiContextBlock(pbi: PbiContext): string {
    const lines: string[] = [];
    lines.push(`PBI #${pbi.id}: ${pbi.title}`);
    lines.push(`Type: ${pbi.workItemType} | State: ${pbi.state}`);
    if (pbi.areaPath) {
        lines.push(`Area: ${pbi.areaPath} | Iteration: ${pbi.iterationPath}`);
    }
    if (pbi.parentTitle) {
        lines.push(`Parent epic/feature: ${pbi.parentTitle}`);
    }
    lines.push('');
    lines.push('Description:');
    lines.push(pbi.description || '(no description provided)');
    lines.push('');
    lines.push('Acceptance criteria:');
    if (pbi.acceptanceCriteria.length === 0) {
        lines.push('(none defined)');
    } else {
        pbi.acceptanceCriteria.forEach((ac, i) => lines.push(`AC-${i + 1}: ${ac}`));
    }
    if (pbi.children && pbi.children.length > 0) {
        lines.push('');
        lines.push(`Child tasks (${pbi.children.length}):`);
        pbi.children.slice(0, 10).forEach((c) => lines.push(`- #${c.id} [${c.state}] ${c.title}`));
    }
    return lines.join('\n');
}

/** Builds the full message list for a persona turn. */
export function buildPersonaMessages(
    persona: PersonaId,
    pbi: PbiContext,
    userQuestion?: string
): Array<{ role: 'system' | 'user'; content: string }> {
    const userContent = userQuestion?.trim()
        ? `PBI context:\n${buildPbiContextBlock(pbi)}\n\nUser question: ${userQuestion.trim()}`
        : `Analyze the following PBI:\n\n${buildPbiContextBlock(pbi)}`;
    return [
        { role: 'system', content: PERSONA_SYSTEM_PROMPTS[persona] },
        { role: 'user', content: userContent },
    ];
}

export function isPersonaId(value: string): value is PersonaId {
    return (PERSONA_IDS as readonly string[]).includes(value);
}
