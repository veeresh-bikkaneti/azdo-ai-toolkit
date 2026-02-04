import { PBIMetadata } from '../models/pbi-data.js';

/**
 * Parses Azure DevOps PBI URLs and extracts metadata
 * Supports both dev.azure.com and visualstudio.com formats
 */

const URL_PATTERNS = [
    // https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
    /https?:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems\/edit\/(\d+)/,

    // https://{org}.visualstudio.com/{project}/_workitems/edit/{id}
    /https?:\/\/([^.]+)\.visualstudio\.com\/([^/]+)\/_workitems\/edit\/(\d+)/,

    // https://dev.azure.com/{org}/{project}/_workitems?id={id}
    /https?:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems\?.*id=(\d+)/,
];

export class URLParser {
    /**
     * Parse Azure DevOps work item URL
     * @param url - Full Azure DevOps work item URL
     * @returns PBIMetadata object with organization, project, and work item ID
     * @throws Error if URL format is invalid
     */
    public static parse(url: string): PBIMetadata {
        for (const pattern of URL_PATTERNS) {
            const match = url.match(pattern);
            if (match) {
                const [, organization, project, workItemId] = match;
                return {
                    organization,
                    project: decodeURIComponent(project),
                    workItemId: parseInt(workItemId, 10),
                };
            }
        }

        throw new Error(
            `Invalid Azure DevOps URL format. Expected formats:\n` +
            `  - https://dev.azure.com/{org}/{project}/_workitems/edit/{id}\n` +
            `  - https://{org}.visualstudio.com/{project}/_workitems/edit/{id}\n` +
            `Received: ${url}`
        );
    }

    /**
     * Validate if URL is a valid Azure DevOps URL
     * @param url - URL to validate
     * @returns true if valid, false otherwise
     */
    public static isValid(url: string): boolean {
        try {
            this.parse(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extract work item ID from URL
     * @param url - Azure DevOps URL
     * @returns Work item ID
     */
    public static extractWorkItemId(url: string): number {
        const metadata = this.parse(url);
        return metadata.workItemId;
    }
}
