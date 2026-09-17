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

    /**
     * Parses a PBI reference into { orgUrl, project, id }.
     *
     * Accepts:
     * - Full work-item URLs: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
     * - Legacy visualstudio.com URLs
     * - Board URLs carrying ?workitem={id} (or ?id={id})
     * - On-premises TFS/Azure DevOps Server URLs
     * - A bare numeric ID (uses defaultOrgUrl when supplied)
     */
    public static parsePbiUrl(
        pbiUrl: string,
        defaultOrgUrl?: string
    ): { orgUrl: string; project: string; id: number } | null {
        const trimmed = (pbiUrl || '').trim();

        // Bare numeric ID, e.g. "12345"
        if (/^\d+$/.test(trimmed)) {
            const orgUrl = (defaultOrgUrl || '').trim().replace(/\/+$/, '');
            if (!orgUrl) {
                return null;
            }
            return { orgUrl, project: '', id: parseInt(trimmed, 10) };
        }

        try {
            const url = new URL(trimmed);
            const pathParts = url.pathname.split('/').filter((p) => p);
            const queryId = url.searchParams.get('workitem') || url.searchParams.get('id');
            const numericQueryId =
                queryId && /^\d+$/.test(queryId) ? parseInt(queryId, 10) : null;

            const editIndex = pathParts.findIndex(
                (p, i) => p === '_workitems' && pathParts[i + 1] === 'edit'
            );
            const editId =
                editIndex >= 0 && /^\d+$/.test(pathParts[editIndex + 2] || '')
                    ? parseInt(pathParts[editIndex + 2], 10)
                    : null;

            const id = editId ?? numericQueryId;
            if (!id) {
                return null;
            }

            if (url.hostname === 'dev.azure.com') {
                const org = pathParts[0];
                const project = pathParts[1] && pathParts[1] !== '_workitems' ? pathParts[1] : '';
                if (!org) {
                    return null;
                }
                return { orgUrl: `https://dev.azure.com/${org}`, project, id };
            }

            if (url.hostname.endsWith('.visualstudio.com')) {
                const org = url.hostname.split('.')[0];
                const project = pathParts[0] && pathParts[0] !== '_workitems' ? pathParts[0] : '';
                return { orgUrl: `https://${org}.visualstudio.com`, project, id };
            }

            // On-premises TFS / Azure DevOps Server:
            // http(s)://server[:port]/tfs/{collection}/{project}/_workitems/edit/{id}
            // or http(s)://server[:port]/{collection}/{project}/_workitems/edit/{id}
            const tfsIndex = pathParts.findIndex((p) => p.toLowerCase() === 'tfs');
            const baseParts = tfsIndex >= 0 ? pathParts.slice(0, tfsIndex + 2) : pathParts.slice(0, 1);
            const projectIndex = editIndex >= 0 ? editIndex - 1 : baseParts.length;
            const project =
                projectIndex >= baseParts.length && pathParts[projectIndex] && !pathParts[projectIndex].startsWith('_')
                    ? pathParts[projectIndex]
                    : '';
            const orgUrl = `${url.protocol}//${url.host}/${baseParts.join('/')}`;
            return { orgUrl, project, id };
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

    /**
     * Recursively fetches a work item with its full hierarchy.
     * @param id Work item ID
     * @param maxDepth Maximum recursion depth (default: 3)
     * @param visited Set of visited IDs to prevent infinite loops
     * @returns Hierarchical work item structure
     */
    public async getWorkItemRecursively(
        id: number,
        maxDepth: number = 3,
        visited: Set<number> = new Set()
    ): Promise<WorkItemTree | null> {
        if (maxDepth <= 0 || visited.has(id)) {
            return null;
        }

        visited.add(id);

        try {
            const workItem = await this.getWorkItem(id);
            if (!workItem) {
                return null;
            }

            const tree: WorkItemTree = {
                workItem,
                parent: null,
                children: [],
                related: [],
            };

            const relations = workItem.relations || [];

            // Fetch parent recursively
            const parentRel = relations.find(
                (r) => r.attributes?.name === 'Parent' || r.rel === 'System.LinkTypes.Hierarchy-Reverse'
            );
            if (parentRel && parentRel.url) {
                const parentId = this.extractIdFromUrl(parentRel.url);
                if (parentId && !visited.has(parentId)) {
                    tree.parent = await this.getWorkItemRecursively(parentId, maxDepth - 1, visited);
                }
            }

            // Fetch children recursively
            const childRels = relations.filter(
                (r) => r.attributes?.name === 'Child' || r.rel === 'System.LinkTypes.Hierarchy-Forward'
            );
            for (const childRel of childRels.slice(0, 10)) {
                // Limit to 10 children
                if (childRel.url) {
                    const childId = this.extractIdFromUrl(childRel.url);
                    if (childId && !visited.has(childId)) {
                        const childTree = await this.getWorkItemRecursively(childId, maxDepth - 1, visited);
                        if (childTree) {
                            tree.children.push(childTree);
                        }
                    }
                }
            }

            // Fetch related items (non-hierarchical)
            const relatedRels = relations.filter(
                (r) =>
                    r.rel !== 'System.LinkTypes.Hierarchy-Reverse' &&
                    r.rel !== 'System.LinkTypes.Hierarchy-Forward' &&
                    r.url
            );
            for (const relatedRel of relatedRels.slice(0, 5)) {
                // Limit to 5 related
                if (relatedRel.url) {
                    const relatedId = this.extractIdFromUrl(relatedRel.url);
                    if (relatedId && !visited.has(relatedId)) {
                        const relatedItem = await this.getWorkItem(relatedId);
                        if (relatedItem) {
                            tree.related.push({
                                workItem: relatedItem,
                                parent: null,
                                children: [],
                                related: [],
                            });
                        }
                    }
                }
            }

            return tree;
        } catch (e) {
            console.error(`Error recursively fetching work item ${id}:`, e);
            return null;
        }
    }

    /**
     * Builds a flattened summary of the work item tree for analysis.
     */
    public buildWorkItemSummary(tree: WorkItemTree | null): WorkItemHierarchy {
        if (!tree) {
            return {
                parentChain: [],
                children: [],
                dependencies: [],
            };
        }

        const summary: WorkItemHierarchy = {
            parentChain: [],
            children: [],
            dependencies: [],
        };

        // Build parent chain (from root to current)
        let current: WorkItemTree | null = tree.parent;
        const parents: WorkItemSummary[] = [];
        while (current) {
            parents.unshift(this.toWorkItemSummary(current.workItem));
            current = current.parent;
        }
        summary.parentChain = parents;

        // Flatten children
        const flattenChildren = (node: WorkItemTree): WorkItemSummary[] => {
            const items: WorkItemSummary[] = [];
            for (const child of node.children) {
                items.push(this.toWorkItemSummary(child.workItem));
                items.push(...flattenChildren(child));
            }
            return items;
        };
        summary.children = flattenChildren(tree);

        // Add related items
        summary.dependencies = tree.related.map((r) => this.toWorkItemSummary(r.workItem));

        return summary;
    }

    private toWorkItemSummary(workItem: workItemTrackingInterfaces.WorkItem): WorkItemSummary {
        const fields = workItem.fields || {};
        return {
            id: workItem.id || 0,
            title: fields['System.Title'] || '',
            type: fields['System.WorkItemType'] || '',
            state: fields['System.State'] || '',
        };
    }
}

export interface WorkItemTree {
    workItem: workItemTrackingInterfaces.WorkItem;
    parent: WorkItemTree | null;
    children: WorkItemTree[];
    related: WorkItemTree[];
}

export interface WorkItemSummary {
    id: number;
    title: string;
    type: string;
    state: string;
}

export interface WorkItemHierarchy {
    parentChain: WorkItemSummary[];
    children: WorkItemSummary[];
    dependencies: WorkItemSummary[];
}
