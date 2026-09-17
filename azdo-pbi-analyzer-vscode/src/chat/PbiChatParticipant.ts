import * as vscode from 'vscode';
import { PbiAnalyzer, PbiContext } from '../analyzers/PbiAnalyzer';
import type { AiResolution } from '../ai/aiConfig';
import { buildPersonaMessages, buildPbiContextBlock, isPersonaId, PersonaId } from '../ai/prompts';

export class PbiChatParticipant {
    private _participant: vscode.ChatParticipant | undefined;
    private _currentPbi: PbiContext | null = null;
    private _aiResolver?: () => Promise<AiResolution>;
    /** Persisted once the user acknowledges AI data sharing. */
    private static readonly consentKey = 'azdoPbiAnalyzer.aiDataSharingConsent';

    constructor(private context: vscode.ExtensionContext) { }

    public initialize(): void {
        this._participant = vscode.chat.createChatParticipant('azdo.pbi-analyst', this.handleChatRequest.bind(this));
        this._participant.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'icon.png');

        this.context.subscriptions.push(this._participant);
    }

    public setCurrentPbi(pbi: PbiContext): void {
        this._currentPbi = pbi;
    }

    /**
     * Registers how this participant obtains an AI provider. When no resolver
     * is set (or it resolves to null), the participant falls back to the
     * built-in rule-based heuristics so it still works fully offline.
     */
    public setAiResolver(resolver: () => Promise<AiResolution>): void {
        this._aiResolver = resolver;
    }

    private async handleChatRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        if (!this._currentPbi) {
            stream.markdown('⚠️ No PBI is currently analyzed. Please analyze a PBI first using the extension.\n\n');
            stream.markdown('To analyze a PBI:\n1. Open Command Palette (`Ctrl+Shift+P`)\n2. Run `AzDO PBI Analyzer: Analyze PBI`\n3. Enter the PBI URL\n');
            return;
        }

        const command = request.command || 'analyze';
        const prompt = request.prompt.trim();

        try {
            // Persona commands go through a real AI provider when one is
            // configured; otherwise the rule-based heuristics below run.
            if (isPersonaId(command)) {
                const handledByAi = await this.tryAiPersona(command, this._currentPbi, prompt || undefined, stream, token);
                if (handledByAi) {
                    return;
                }
            }

            switch (command) {
                case 'analyze':
                    await this.handleFullAnalysis(stream, this._currentPbi);
                    break;
                case 'critical-review':
                    await this.handleCriticalReview(stream, this._currentPbi);
                    break;
                case 'qa-engineer':
                    await this.handleQaEngineer(stream, this._currentPbi);
                    break;
                case 'qa-architect':
                    await this.handleQaArchitect(stream, this._currentPbi);
                    break;
                case 'manual-test':
                    await this.handleManualTester(stream, this._currentPbi);
                    break;
                case 'automation':
                    await this.handleAutomationEngineer(stream, this._currentPbi);
                    break;
                default:
                    if (prompt) {
                        await this.handleGenericQuestion(stream, this._currentPbi, prompt);
                    } else {
                        stream.markdown('Available commands:\n');
                        stream.markdown('- `/analyze` - Full multi-persona analysis\n');
                        stream.markdown('- `/critical-review` - Critical thinking analysis\n');
                        stream.markdown('- `/qa-engineer` - Test case design\n');
                        stream.markdown('- `/qa-architect` - Testing strategy\n');
                        stream.markdown('- `/manual-test` - Exploratory testing focus\n');
                        stream.markdown('- `/automation` - Automation strategy\n');
                    }
            }
        } catch (error) {
            stream.markdown(`❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
        }
    }

    /**
     * Attempts to answer with the configured AI provider. Returns true when
     * the AI produced the response; false when the caller should fall back
     * to the built-in rule-based heuristics (provider not configured, or the
     * call failed and the failure was already surfaced to the user).
     */
    /**
     * One-time, dismissible notice that AI personas send the analyzed PBI's
     * content to the configured model endpoint. Declining falls back to the
     * offline heuristics; consent is remembered in global state.
     */
    private async ensureAiConsent(providerName: string): Promise<boolean> {
        if (this.context.globalState.get<boolean>(PbiChatParticipant.consentKey)) {
            return true;
        }
        const choice = await vscode.window.showInformationMessage(
            `The ${providerName} persona will send this PBI's title, description, and acceptance criteria to ${providerName} for analysis.`,
            'Continue',
            'Not now'
        );
        if (choice === 'Continue') {
            await this.context.globalState.update(PbiChatParticipant.consentKey, true);
            return true;
        }
        return false;
    }

    private async tryAiPersona(
        persona: PersonaId,
        pbi: PbiContext,
        userQuestion: string | undefined,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<boolean> {
        if (!this._aiResolver) {
            return false;
        }

        let resolution: AiResolution;
        try {
            resolution = await this._aiResolver();
        } catch {
            return false;
        }

        const provider = resolution.provider;
        if (!provider) {
            // Not configured (or disabled): silent fallback to heuristics.
            return false;
        }

        // OWASP LLM06: PBI content may be sensitive internal data. Get explicit
        // one-time consent before sending it to the model endpoint.
        if (!(await this.ensureAiConsent(provider.displayName))) {
            return false;
        }

        try {
            stream.progress(`Consulting ${provider.displayName}…`);
            const messages = buildPersonaMessages(persona, pbi, userQuestion);
            await provider.complete(
                messages,
                { temperature: 0.3, maxTokens: 4000 },
                (t) => stream.markdown(t),
                token
            );
            stream.markdown('\n');
            return true;
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            stream.markdown(
                `\n> ⚠️ AI provider (${provider.displayName}) failed: ${detail}\n` +
                `> Falling back to rule-based analysis.\n\n`
            );
            return false;
        }
    }

    private async handleFullAnalysis(stream: vscode.ChatResponseStream, pbi: PbiContext): Promise<void> {
        stream.progress('Orchestrating QA personas...');

        stream.markdown(`# 🎭 QA Orchestration Report: ${pbi.title}\n\n`);
        stream.markdown(`**PBI ID**: ${pbi.id} | **Type**: ${pbi.workItemType} | **State**: ${pbi.state}\n\n`);

        // Executive summary
        const riskLevel = this.assessRiskLevel(pbi);
        stream.markdown(`## Executive Summary\n`);
        stream.markdown(`Risk Level: **${riskLevel}** | Complexity: **${this.assessComplexity(pbi)}**\n\n`);

        // Delegate to personas
        await this.handleCriticalReview(stream, pbi);
        await this.handleQaEngineer(stream, pbi);
        await this.handleQaArchitect(stream, pbi);
        await this.handleManualTester(stream, pbi);
        await this.handleAutomationEngineer(stream, pbi);

        // Final recommendations
        stream.markdown(`\n## 📋 Action Items\n\n`);
        stream.markdown(`- [ ] **P0**: Clarify vague acceptance criteria\n`);
        stream.markdown(`- [ ] **P1**: Define NFRs (performance, security, accessibility)\n`);
        stream.markdown(`- [ ] **P2**: Create automated regression suite\n`);
    }

    private async handleCriticalReview(stream: vscode.ChatResponseStream, pbi: PbiContext): Promise<void> {
        stream.markdown(`\n## 🧠 Critical Thinker\n\n`);

        const assumptions: string[] = [];
        const gaps: string[] = [];

        if (!pbi.description || pbi.description.length < 50) {
            gaps.push('Description is too brief - lacks implementation details');
        }

        if (pbi.acceptanceCriteria.length === 0) {
            gaps.push('No acceptance criteria defined');
        }

        if (!pbi.parentTitle && !pbi.parentChain) {
            assumptions.push('This PBI is not part of a larger epic/feature');
        }

        const hasSecurityMention = (pbi.description + pbi.acceptanceCriteria.join(' ')).toLowerCase().includes('security');
        if (!hasSecurityMention && pbi.workItemType.toLowerCase().includes('feature')) {
            gaps.push('No security requirements mentioned');
        }

        stream.markdown(`**🚨 Assumptions Identified**:\n`);
        if (assumptions.length > 0) {
            assumptions.forEach((a, i) => stream.markdown(`${i + 1}. ${a}\n`));
        } else {
            stream.markdown(`*No critical assumptions identified*\n`);
        }

        stream.markdown(`\n**⚠️ Gaps**:\n`);
        if (gaps.length > 0) {
            gaps.forEach((g, i) => stream.markdown(`${i + 1}. ${g}\n`));
        } else {
            stream.markdown(`*No critical gaps identified*\n`);
        }
    }

    private async handleQaEngineer(stream: vscode.ChatResponseStream, pbi: PbiContext): Promise<void> {
        stream.markdown(`\n## 🧪 QA Engineer\n\n`);

        const scenarioCount = pbi.acceptanceCriteria.length * 2; // Positive + negative per AC
        stream.markdown(`**Test Scenarios**: ${scenarioCount} scenarios identified\n\n`);

        stream.markdown(`**Example Test Cases**:\n`);
        pbi.acceptanceCriteria.slice(0, 3).forEach((ac, i) => {
            stream.markdown(`- **TC-${i + 1}**: Verify ${ac.toLowerCase()}\n`);
        });

        stream.markdown(`\n**Coverage**: ${pbi.acceptanceCriteria.length > 0 ? '100%' : '0%'} of acceptance criteria\n`);
    }

    private async handleQaArchitect(stream: vscode.ChatResponseStream, pbi: PbiContext): Promise<void> {
        stream.markdown(`\n## 🏗️ QA Architect\n\n`);

        const framework = this.recommendFramework(pbi);
        stream.markdown(`**Recommended Framework**: ${framework}\n\n`);

        stream.markdown(`**Test Pyramid**:\n`);
        stream.markdown(`- Unit Tests: 60%\n`);
        stream.markdown(`- Integration Tests: 25%\n`);
        stream.markdown(`- E2E Tests: 10%\n`);
        stream.markdown(`- Exploratory: 5%\n\n`);

        stream.markdown(`**Quality Gates**:\n`);
        stream.markdown(`- Code Coverage: ≥ 80%\n`);
        stream.markdown(`- Test Pass Rate: ≥ 95%\n`);
        stream.markdown(`- Performance: Response time ≤ 2s\n`);
    }

    private async handleManualTester(stream: vscode.ChatResponseStream, pbi: PbiContext): Promise<void> {
        stream.markdown(`\n## 🔍 Manual Tester\n\n`);

        stream.markdown(`**Exploratory Focus**:\n`);
        stream.markdown(`- Input validation (special chars, edge cases)\n`);
        stream.markdown(`- Cross-browser compatibility\n`);
        stream.markdown(`- Accessibility (keyboard nav, screen reader)\n`);
        stream.markdown(`- Mobile responsiveness\n\n`);

        stream.markdown(`**Estimated Effort**: 2-4 hours\n`);
    }

    private async handleAutomationEngineer(stream: vscode.ChatResponseStream, pbi: PbiContext): Promise<void> {
        stream.markdown(`\n## ⚙️ Automation Engineer\n\n`);

        const automationPercent = pbi.acceptanceCriteria.length > 0 ? 75 : 50;
        stream.markdown(`**Automation Coverage**: ${automationPercent}% automatable\n\n`);

        stream.markdown(`**Recommended Tools**:\n`);
        stream.markdown(`- E2E: Playwright\n`);
        stream.markdown(`- API: REST Assured / Postman\n`);
        stream.markdown(`- CI/CD: GitHub Actions\n\n`);

        stream.markdown(`**Estimated Effort**: 1-2 days (setup + implementation)\n`);
    }

    private async handleGenericQuestion(
        stream: vscode.ChatResponseStream,
        pbi: PbiContext,
        question: string
    ): Promise<void> {
        // A free-form question also deserves a real answer when AI is available.
        if (this._aiResolver) {
            try {
                const resolution = await this._aiResolver();
                if (resolution.provider) {
                    const provider = resolution.provider;
                    stream.progress(`Consulting ${provider.displayName}…`);
                    await provider.complete(
                        [
                            {
                                role: 'system',
                                content:
                                    'You are an expert QA assistant. Answer the user\'s question about the Azure DevOps ' +
                                    'PBI below precisely, referencing its acceptance criteria where relevant. ' +
                                    'Format the answer in Markdown.',
                            },
                            {
                                role: 'user',
                                content: `PBI context:\n${buildPbiContextBlock(pbi)}\n\nQuestion: ${question}`,
                            },
                        ],
                        { temperature: 0.3, maxTokens: 2000 },
                        (t) => stream.markdown(t),
                        undefined
                    );
                    stream.markdown('\n');
                    return;
                }
            } catch (error) {
                const detail = error instanceof Error ? error.message : String(error);
                stream.markdown(`\n> ⚠️ AI provider failed: ${detail}\n\n`);
            }
        }

        stream.markdown(`I can help with questions about **${pbi.title}**.\n\n`);
        stream.markdown(`Try using one of the specialized commands like \`/critical-review\` or \`/qa-engineer\` for detailed analysis.\n`);
    }

    private assessRiskLevel(pbi: PbiContext): string {
        let riskScore = 0;

        if (!pbi.description || pbi.description.length < 50) riskScore += 2;
        if (pbi.acceptanceCriteria.length === 0) riskScore += 3;
        if (pbi.workItemType.toLowerCase().includes('epic')) riskScore += 1;

        const text = (pbi.description + pbi.acceptanceCriteria.join(' ')).toLowerCase();
        if (text.includes('payment') || text.includes('auth') || text.includes('security')) riskScore += 2;

        if (riskScore >= 5) return 'HIGH 🔴';
        if (riskScore >= 3) return 'MEDIUM 🟡';
        return 'LOW 🟢';
    }

    private assessComplexity(pbi: PbiContext): string {
        const acCount = pbi.acceptanceCriteria.length;
        if (acCount >= 7) return 'High';
        if (acCount >= 4) return 'Medium';
        return 'Low';
    }

    private recommendFramework(pbi: PbiContext): string {
        const text = (pbi.description + pbi.acceptanceCriteria.join(' ')).toLowerCase();

        if (text.includes('mobile') || text.includes('ios') || text.includes('android')) {
            return 'Appium / Detox';
        }
        if (text.includes('api') || text.includes('rest') || text.includes('graphql')) {
            return 'REST Assured / Postman';
        }
        return 'Playwright / Cypress';
    }
}
