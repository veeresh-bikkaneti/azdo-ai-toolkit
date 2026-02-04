
export interface GherkinScenario {
    name: string;
    steps: string[]; // Given/When/Then lines
}

export interface GherkinFeature {
    title: string;
    userStory: string; // As a... I want... So that...
    scenarios: GherkinScenario[];
}

export class GherkinGenerator {

    /**
     * Converts PBI data and requirements into a Gherkin Feature
     */
    public generateFeature(pbiTitle: string, userStory: string, requirements: string[]): GherkinFeature {
        const feature: GherkinFeature = {
            title: this.cleanTitle(pbiTitle),
            userStory: userStory,
            scenarios: []
        };

        // 1. Generate Scenario from Requirement
        requirements.forEach((req, index) => {
            feature.scenarios.push(this.createScenarioFromRequirement(req, index + 1));
        });

        // 2. Add default "Regression" scenario if critical
        // (Logic can be enhanced by AI later)

        return feature;
    }

    private createScenarioFromRequirement(requirement: string, index: number): GherkinScenario {
        // Simple heuristic to extract intent
        const cleanReq = requirement.replace(/^- /, '').trim();

        return {
            name: `Verify ${cleanReq.substring(0, 50)}...`, // Truncated name
            steps: [
                `Given the system is in a ready state`,
                `When I attempt to ${cleanReq}`,
                `Then the system should successfully complete the action`,
                `And the result should match the requirement: "${cleanReq}"`
            ]
        };
    }

    private cleanTitle(title: string): string {
        return title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    }

    /**
     * Formats the Gherkin Feature as a string string
     */
    public toGherkinString(feature: GherkinFeature): string {
        let output = `Feature: ${feature.title}\n`;
        output += `  ${feature.userStory.replace(/\n/g, '\n  ')}\n\n`;

        feature.scenarios.forEach(scenario => {
            output += `  Scenario: ${scenario.name}\n`;
            scenario.steps.forEach(step => {
                output += `    ${step}\n`;
            });
            output += `\n`;
        });

        return output;
    }
}
