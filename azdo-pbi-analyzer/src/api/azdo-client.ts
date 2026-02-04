import * as azdev from 'azure-devops-node-api';
import { WorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi.js';
import { WorkItem, WorkItemExpand } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { PBIData, RelatedItem, RelationshipType, WorkItemType } from '../models/pbi-data.js';
import { RateLimiter } from './rate-limiter.js';

/**
 * Azure DevOps API client wrapper
 */
export class AzureDevOpsClient {
    private connection: azdev.WebApi;
    private witApi: WorkItemTrackingApi | null = null;
    private rateLimiter: RateLimiter;
    constructor(organizationUrl: string, pat: string) {   const authHandler = azdev.getPersonalAccessTokenHandler(pat);
        this.connection = new azdev.WebApi(organizationUrl, authHandler);
        this.rateLimiter = new RateLimiter();
    }

    /**
     * Initialize the Work Item Tracking API
     */
    private async getWitApi(): Promise<WorkItemTrackingApi> {
        if (!this.witApi) {
            this.witApi = await this.connection.getWorkItemTrackingApi();
        }
        return this.witApi;
    }

    /**
     * Fetch a work item by ID
     */
    public async getWorkItem(workItemId: number, project: string): Promise<PBIData> {
        await this.rateLimiter.throttle();

        const api = await this.getWitApi();
        const workItem = await api.getWorkItem(
            workItemId,
            undefined,
            undefined,
            undefined,
            project
        );

        if (!workItem) {
            throw new Error(`Work item ${workItemId} not found in project ${project}`);
        }

        return this.mapWorkItemToPBIData(workItem);
    }

    /**
     * Fetch related work items
     */
    public async getRelatedWorkItems(
        workItemId: number,
        project: string
    ): Promise<RelatedItem[]> {
        await this.rateLimiter.throttle();

        const api = await this.getWitApi();
        const workItem = await api.getWorkItem(
            workItemId,
            undefined,
            undefined,
            WorkItemExpand.Relations,
            project
        );

        if (!workItem || !workItem.relations) {
            return [];
        }

        const relatedItems: RelatedItem[] = [];
        const relatedIds: number[] = [];

        // Extract IDs from relations
        for (const relation of workItem.relations) {
            if (!relation.url) continue;

            const relType = this.mapRelationType(relation.rel || '');
            if (!relType) continue; // Skip unsupported relation types

            const id = this.extractIdFromUrl(relation.url);
            if (id) {
                relatedIds.push(id);
            }
        }

        // Batch fetch related work items
        if (relatedIds.length > 0) {
            await this.rateLimiter.throttle();
            const relatedWorkItems = await api.getWorkItems(
                relatedIds,
                undefined,
                undefined,
                undefined,
                undefined,
                project
            );

            for (let i = 0; i < relatedWorkItems.length; i++) {
                const rwi = relatedWorkItems[i];
                const relation = workItem.relations.find(r =>
                    r.url && this.extractIdFromUrl(r.url) === rwi.id
                );

                if (rwi.fields && relation) {
                    relatedItems.push({
                        id: rwi.id || 0,
                        type: (rwi.fields['System.WorkItemType'] || 'Unknown') as WorkItemType,
                        relationship: this.mapRelationType(relation.rel || '') as RelationshipType,
                        title: rwi.fields['System.Title'] || '',
                        state: rwi.fields['System.State'] || '',
                    });
                }
            }
        }

        return relatedItems;
    }

    /**
     * Map Work Item to PBIData structure
     */
    private mapWorkItemToPBIData(workItem: WorkItem): PBIData {
        const fields = workItem.fields || {};

        return {
            id: workItem.id || 0,
            title: fields['System.Title'] || '',
            description: fields['System.Description'] || '',
            acceptanceCriteria: fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '',
            priority: fields['Microsoft.VSTS.Common.Priority'] || 2,
            state: fields['System.State'] || '',
            assignedTo: fields['System.AssignedTo']?.displayName || 'Unassigned',
            createdDate: fields['System.CreatedDate'] || '',
            changedDate: fields['System.ChangedDate'] || '',
            areaPath: fields['System.AreaPath'] || '',
            iterationPath: fields['System.IterationPath'] || '',
            tags: fields['System.Tags'] ? fields['System.Tags'].split(';').map((t: string) => t.trim()) : [],
            relatedItems: [],
            businessValue: fields['Microsoft.VSTS.Common.BusinessValue']?.toString(),
        };
    }

    /**
     * Map Azure DevOps relation type to our RelationshipType
     */
    private mapRelationType(relType: string): RelationshipType | null {
        const mapping: Record<string, RelationshipType> = {
            'System.LinkTypes.Hierarchy-Forward': 'Child',
            'System.LinkTypes.Hierarchy-Reverse': 'Parent',
            'System.LinkTypes.Related': 'Related',
            'Microsoft.VSTS.Common.TestedBy-Forward': 'Tested By',
            'Microsoft.VSTS.Common.TestedBy-Reverse': 'Tests',
            'System.LinkTypes.Dependency-Forward': 'Successor',
            'System.LinkTypes.Dependency-Reverse': 'Predecessor',
        };

        return mapping[relType] || null;
    }

    /**
     * Extract work item ID from Azure DevOps URL
     */
    private extractIdFromUrl(url: string): number | null {
        const match = url.match(/\/(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Test connection to Azure DevOps
     */
    public async testConnection(): Promise<boolean> {
        try {
            await this.getWitApi();
            return true;
        } catch (error) {
            console.error('Failed to connect to Azure DevOps:', error);
            return false;
        }
    }
}

