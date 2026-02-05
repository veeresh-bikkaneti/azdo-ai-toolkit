import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/configuration';

export interface WorkItem {
    id: number;
    fields: {
        'System.Title': string;
        'System.Description'?: string;
        'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
        'System.WorkItemType': string;
        [key: string]: any;
    };
    _links: {
        html: { href: string };
    };
}

export class AzdoClient {
    constructor(private config: ConfigurationManager) { }

    async getWorkItem(id: number): Promise<WorkItem> {
        const pat = await this.config.getPat();
        const orgUrl = this.config.getOrgUrl();
        const project = this.config.getProject();

        if (!pat || !orgUrl || !project) {
            throw new Error('Azure DevOps configuration missing. Please run "Set PAT" command.');
        }

        // Clean URL ensure no trailing slash
        const cleanOrgUrl = orgUrl.replace(/\/$/, '');

        // Setup Basic Auth
        const auth = Buffer.from(`:${pat}`).toString('base64');
        const headers = {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };

        try {
            const url = `${cleanOrgUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/${id}?$expand=all&api-version=7.1-preview.3`;
            const response = await fetch(url, { headers });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized. Please check your PAT.');
                }
                if (response.status === 404) {
                    throw new Error(`Work Item ${id} not found.`);
                }
                throw new Error(`Failed to fetch Work Item: ${response.statusText}`);
            }

            return await response.json() as WorkItem;
        } catch (error: any) {
            console.error('AzDO API Error:', error);
            throw new Error(`API Error: ${error.message}`);
        }
    }
}
