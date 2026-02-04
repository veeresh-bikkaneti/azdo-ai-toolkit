import { PBIData } from '../models/pbi-data.js';

/**
 * Analyzes PBIs to extract structured requirements and deliverables
 */
export class RequirementsAnalyzer {
    /**
     * Extract structured requirements from PBI description
     */
    public extractRequirements(pbi: PBIData): string[] {
        const requirements: string[] = [];
        const description = this.stripHtml(pbi.description);

        // Look for numbered lists or bullet points
        const listPatterns = [
            /\d+\.\s+(.+?)(?=\n\d+\.|\n-|\n\*|$)/g,
            /[-*]\s+(.+?)(?=\n-|\n\*|\n\d+\.|$)/g,
        ];

        for (const pattern of listPatterns) {
            const matches = description.matchAll(pattern);
            for (const match of matches) {
                const req = match[1].trim();
                if (req.length > 10 && !requirements.includes(req)) {
                    requirements.push(req);
                }
            }
        }

        // If no structured list found, extract sentences with requirement keywords
        if (requirements.length === 0) {
            const requirementKeywords = [
                'must', 'should', 'shall', 'need to', 'required to',
                'enable', 'allow', 'support', 'provide', 'implement'
            ];

            const sentences = description.split(/[.!?]+/);
            for (const sentence of sentences) {
                const lowerSentence = sentence.toLowerCase();
                if (requirementKeywords.some(kw => lowerSentence.includes(kw))) {
                    const trimmed = sentence.trim();
                    if (trimmed.length > 20) {
                        requirements.push(trimmed);
                    }
                }
            }
        }

        return requirements.slice(0, 10); // Limit to top 10 requirements
    }

    /**
     * Extract deliverables from acceptance criteria
     */
    public extractDeliverables(pbi: PBIData): string[] {
        const deliverables: string[] = [];
        const criteria = this.stripHtml(pbi.acceptanceCriteria);

        if (!criteria) {
            return ['Implementation of all requirements', 'Unit tests', 'Documentation'];
        }

        // Extract checkbox items or numbered lists
        const patterns = [
            /\[[ x]\]\s+(.+?)(?=\n|$)/gi,
            /\d+\.\s+(.+?)(?=\n\d+\.|\n-|$)/g,
            /[-*]\s+(.+?)(?=\n-|\n\*|$)/g,
        ];

        for (const pattern of patterns) {
            const matches = criteria.matchAll(pattern);
            for (const match of matches) {
                const deliverable = match[1].trim();
                if (deliverable.length > 5) {
                    deliverables.push(deliverable);
                }
            }
        }

        return deliverables.length > 0
            ? deliverables
            : this.extractRequirements(pbi);
    }

    /**
     * Extract dependencies from description and related items
     */
    public extractDependencies(pbi: PBIData): string[] {
        const dependencies: string[] = [];

        // Check related items
        const parentItems = pbi.relatedItems.filter(r => r.relationship === 'Parent');
        const predecessors = pbi.relatedItems.filter(r => r.relationship === 'Predecessor');

        if (parentItems.length > 0) {
            dependencies.push(...parentItems.map(p => `Parent: ${p.title} (${p.type})`));
        }

        if (predecessors.length > 0) {
            dependencies.push(...predecessors.map(p => `Depends on: ${p.title} (${p.type})`));
        }

        // Extract from description
        const description = this.stripHtml(pbi.description).toLowerCase();
        const dependencyKeywords = [
            'depends on', 'requires', 'prerequisite', 'blocked by', 'needs'
        ];

        for (const keyword of dependencyKeywords) {
            if (description.includes(keyword)) {
                const sentences = pbi.description.split(/[.!?]+/);
                for (const sentence of sentences) {
                    if (sentence.toLowerCase().includes(keyword)) {
                        dependencies.push(this.stripHtml(sentence).trim());
                        break;
                    }
                }
            }
        }

        return dependencies.length > 0
            ? dependencies
            : ['No explicit dependencies identified'];
    }

    /**
     * Determine functional area from tags and area path
     */
    public getFunctionalArea(pbi: PBIData): string {
        // Check tags first
        if (pbi.tags.length > 0) {
            return pbi.tags[0];
        }

        // Extract from area path
        const areaPathParts = pbi.areaPath.split('\\');
        return areaPathParts[areaPathParts.length - 1] || 'General';
    }

    /**
     * Determine if PBI is high priority/critical
     */
    public isCritical(pbi: PBIData): boolean {
        return pbi.priority === 1 ||
            pbi.tags.some(t => ['critical', 'high-priority', 'p0', 'p1'].includes(t.toLowerCase()));
    }

    /**
     * Strip HTML tags from text
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Get business value summary
     */
    public getBusinessValue(pbi: PBIData): string {
        if (pbi.businessValue) {
            return `Business Value: ${pbi.businessValue}`;
        }

        // Try to extract from description
        const description = this.stripHtml(pbi.description).toLowerCase();
        const valueKeywords = ['business value', 'impact', 'benefit', 'roi'];

        for (const keyword of valueKeywords) {
            if (description.includes(keyword)) {
                const sentences = pbi.description.split(/[.!?]+/);
                for (const sentence of sentences) {
                    if (sentence.toLowerCase().includes(keyword)) {
                        return this.stripHtml(sentence).trim();
                    }
                }
            }
        }

        return 'Business value not explicitly defined';
    }
}
