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
    async getWorkItems(ids: number[]): Promise<WorkItem[]> {
        if (ids.length === 0) return [];
        const pat = await this.config.getPat();
        const orgUrl = this.config.getOrgUrl();
        const project = this.config.getProject();
        const cleanOrgUrl = orgUrl?.replace(/\/$/, '');

        const auth = Buffer.from(`:${pat}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };

        try {
            const url = `${cleanOrgUrl}/${encodeURIComponent(project || '')}/_apis/wit/workitemsbatch?api-version=7.1-preview.1`;
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ids, $expand: 'all' })
            });

            if (!response.ok) throw new Error(`Failed to batch fetch: ${response.statusText}`);
            const data = await response.json() as any;
            return data.value;
        } catch (error: any) {
            console.error('AzDO Batch Error:', error);
            throw new Error(`Batch API Error: ${error.message}`);
        }
    }

    async queryByWiql(wiql: string): Promise<number[]> {
        const pat = await this.config.getPat();
        const orgUrl = this.config.getOrgUrl();
        const project = this.config.getProject();
        const cleanOrgUrl = orgUrl?.replace(/\/$/, '');

        const auth = Buffer.from(`:${pat}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };

        try {
            const url = `${cleanOrgUrl}/${encodeURIComponent(project || '')}/_apis/wit/wiql?api-version=7.1-preview.2`;
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: wiql })
            });

            if (!response.ok) throw new Error(`WIQL Query Failed: ${response.statusText}`);
            const data = await response.json() as any;
            return data.workItems.map((wi: any) => wi.id);
        } catch (error: any) {
            console.error('WIQL Error:', error);
            return [];
        }
    }

    async updateWorkItem(id: number, fields: any): Promise<WorkItem> {
        const pat = await this.config.getPat();
        const orgUrl = this.config.getOrgUrl();
        const project = this.config.getProject();
        const cleanOrgUrl = orgUrl?.replace(/\/$/, '');

        const auth = Buffer.from(`:${pat}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json-patch+json' };

        const patchDocument = Object.keys(fields).map(key => ({
            op: "add",
            path: `/fields/${key}`,
            value: fields[key]
        }));

        try {
            const url = `${cleanOrgUrl}/${encodeURIComponent(project || '')}/_apis/wit/workitems/${id}?api-version=7.1-preview.3`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(patchDocument)
            });

            if (!response.ok) throw new Error(`Update Failed: ${response.statusText}`);
            return await response.json() as WorkItem;
        } catch (error: any) {
            console.error('Update Error:', error);
            throw error;
        }
    }

    async getClassificationNodes(): Promise<{ areas: string[], iterations: string[] }> {
        const pat = await this.config.getPat();
        const orgUrl = this.config.getOrgUrl();
        const project = this.config.getProject();
        const cleanOrgUrl = orgUrl?.replace(/\/$/, '');
        const auth = Buffer.from(`:${pat}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };

        try {
            // Fetch Areas
            const areaUrl = `${cleanOrgUrl}/${encodeURIComponent(project || '')}/_apis/wit/classificationnodes/areas?api-version=7.1-preview.2&$depth=5`;
            const iterUrl = `${cleanOrgUrl}/${encodeURIComponent(project || '')}/_apis/wit/classificationnodes/iterations?api-version=7.1-preview.2&$depth=5`;

            const [areaRes, iterRes] = await Promise.all([
                fetch(areaUrl, { headers }),
                fetch(iterUrl, { headers })
            ]);

            const areas = areaRes.ok ? await areaRes.json() : { value: [] };
            const iterations = iterRes.ok ? await iterRes.json() : { value: [] };

            const flatten = (nodes: any[], prefix = ''): string[] => {
                let result: string[] = [];
                for (const node of nodes) {
                    const path = prefix ? `${prefix}\\${node.name}` : node.name;
                    result.push(path);
                    if (node.children) {
                        result.push(...flatten(node.children, path));
                    }
                }
                return result;
            };

            return {
                areas: flatten((areas as any).value || []),
                iterations: flatten((iterations as any).value || [])
            };

        } catch (error) {
            console.error('Failed to fetch nodes', error);
            return { areas: [], iterations: [] };
        }
    }
}
