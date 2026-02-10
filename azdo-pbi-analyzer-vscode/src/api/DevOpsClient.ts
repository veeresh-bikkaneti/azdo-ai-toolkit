import * as azdev from 'azure-devops-node-api';
import * as workItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi';

export class DevOpsClient {
    private _connection: azdev.WebApi;
    private _workItemTrackingApi: Promise<IWorkItemTrackingApi>;

    constructor(orgUrl: string, token: string) {
        const authHandler = azdev.getPersonalAccessTokenHandler(token);
        this._connection = new azdev.WebApi(orgUrl, authHandler);
        this._workItemTrackingApi = this._connection.getWorkItemTrackingApi();
    }

    public static parsePbiUrl(pbiUrl: string): { orgUrl: string; project: string; id: number } | null {
        try {
            const url = new URL(pbiUrl);
            const pathParts = url.pathname.split('/').filter((p) => p);

            let org = '';
            let project = '';
            let id = 0;
            let orgUrl = '';

            if (url.hostname === 'dev.azure.com') {
                if (pathParts.length >= 5 && pathParts[2] === '_workitems' && pathParts[3] === 'edit') {
                    org = pathParts[0];
                    project = pathParts[1];
                    id = parseInt(pathParts[4]);
                    orgUrl = `https://dev.azure.com/${org}`;
                }
            } else if (url.hostname.endsWith('.visualstudio.com')) {
                if (pathParts.length >= 4 && pathParts[1] === '_workitems' && pathParts[2] === 'edit') {
                    org = url.hostname.split('.')[0];
                    project = pathParts[0];
                    id = parseInt(pathParts[3]);
                    orgUrl = `https://${org}.visualstudio.com`;
                }
            }

            if (org && project && id) {
                return { orgUrl, project, id };
            }

            return null;
        } catch {
            return null;
        }
    }

    public async getWorkItem(
        id: number,
        project?: string
    ): Promise<workItemTrackingInterfaces.WorkItem | null> {
        try {
            const client = await this._workItemTrackingApi;
            const workItem = await client.getWorkItem(
                id,
                undefined,
                undefined,
                workItemTrackingInterfaces.WorkItemExpand.Relations
            );
            return workItem;
        } catch (e) {
            console.error(`Error fetching work item ${id}:`, e);
            throw e;
        }
    }

    /**
     * Fetches the parent work item (Epic/Feature) from the relations.
     */
    public async getParentWorkItem(
        workItem: workItemTrackingInterfaces.WorkItem
    ): Promise<workItemTrackingInterfaces.WorkItem | null> {
        const relations = workItem.relations || [];
        const parentRel = relations.find(
            (r) => r.attributes?.name === 'Parent' || r.rel === 'System.LinkTypes.Hierarchy-Reverse'
        );

        if (!parentRel || !parentRel.url) {
            return null;
        }

        const parentId = this.extractIdFromUrl(parentRel.url);
        if (!parentId) {
            return null;
        }

        try {
            return await this.getWorkItem(parentId);
        } catch {
            return null;
        }
    }

    /**
     * Fetches related work items (children, related, etc.) from the relations.
     * Returns up to maxItems related items.
     */
    public async getRelatedWorkItems(
        workItem: workItemTrackingInterfaces.WorkItem,
        maxItems: number = 10
    ): Promise<workItemTrackingInterfaces.WorkItem[]> {
        const relations = workItem.relations || [];
        const relatedUrls = relations
            .filter((r) => r.url && r.rel !== 'System.LinkTypes.Hierarchy-Reverse')
            .map((r) => r.url!)
            .slice(0, maxItems);

        const results: workItemTrackingInterfaces.WorkItem[] = [];

        for (const url of relatedUrls) {
            const id = this.extractIdFromUrl(url);
            if (id) {
                try {
                    const item = await this.getWorkItem(id);
                    if (item) {
                        results.push(item);
                    }
                } catch {
                    // Skip items we cannot fetch
                }
            }
        }

        return results;
    }

    private extractIdFromUrl(url: string): number | null {
        // Work item API URLs end with the ID: .../workItems/{id}
        const match = url.match(/\/workItems\/(\d+)/i);
        if (match) {
            return parseInt(match[1]);
        }
        return null;
    }
}
