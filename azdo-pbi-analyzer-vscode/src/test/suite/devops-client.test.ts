import * as assert from 'assert';
import { DevOpsClient } from '../../api/DevOpsClient';
import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

function wi(id: number, title: string, relations: WorkItem['relations'] = []): WorkItem {
    return {
        id,
        fields: {
            'System.Title': title,
            'System.WorkItemType': 'Product Backlog Item',
            'System.State': 'New',
        },
        relations,
    } as WorkItem;
}

const API_URL = 'https://dev.azure.com/org/_apis/wit/workItems';

function relTo(id: number, rel: string, name?: string) {
    return { rel, url: `${API_URL}/${id}`, attributes: name ? { name } : {} };
}

/** DevOpsClient with the network layer replaced by an in-memory fake. */
function clientWithFake(items: Map<number, WorkItem>, failOn: number[] = []): DevOpsClient {
    const client = new DevOpsClient('https://dev.azure.com/org', 'fake-pat');
    const fakeApi = {
        getWorkItem: async (id: number) => {
            if (failOn.includes(id)) {
                throw new Error('boom');
            }
            const item = items.get(id);
            if (!item) {
                throw new Error(`not found: ${id}`);
            }
            return item;
        },
    };
    (client as unknown as { _workItemTrackingApi: Promise<unknown> })._workItemTrackingApi =
        Promise.resolve(fakeApi);
    return client;
}

suite('DevOpsClient (mocked API)', () => {
    test('getParentWorkItem resolves the parent via Hierarchy-Reverse link', async () => {
        const parent = wi(100, 'Parent Epic');
        const child = wi(200, 'Child PBI', [
            relTo(100, 'System.LinkTypes.Hierarchy-Reverse', 'Parent'),
        ]);
        const client = clientWithFake(new Map([[100, parent], [200, child]]));

        const result = await client.getParentWorkItem(child);
        assert.ok(result);
        assert.strictEqual(result.id, 100);
        assert.strictEqual(result.fields?.['System.Title'], 'Parent Epic');
    });

    test('getParentWorkItem returns null when there is no parent link', async () => {
        const orphan = wi(300, 'Orphan PBI');
        const client = clientWithFake(new Map([[300, orphan]]));

        assert.strictEqual(await client.getParentWorkItem(orphan), null);
    });

    test('getParentWorkItem returns null when the parent fetch fails', async () => {
        const child = wi(400, 'Child PBI', [
            relTo(999, 'System.LinkTypes.Hierarchy-Reverse', 'Parent'),
        ]);
        const client = clientWithFake(new Map(), [999]);

        assert.strictEqual(await client.getParentWorkItem(child), null);
    });

    test('getRelatedWorkItems skips the parent link and caps at maxItems', async () => {
        const items = new Map<number, WorkItem>();
        for (let i = 1; i <= 6; i++) {
            items.set(i, wi(i, `Related ${i}`));
        }
        const pbi = wi(500, 'PBI', [
            relTo(900, 'System.LinkTypes.Hierarchy-Reverse', 'Parent'),
            ...[1, 2, 3, 4, 5, 6].map((i) => relTo(i, 'System.LinkTypes.Related')),
        ]);
        const client = clientWithFake(items);

        const related = await client.getRelatedWorkItems(pbi, 3);
        assert.strictEqual(related.length, 3);
        assert.deepStrictEqual(related.map((r) => r.id), [1, 2, 3]);
    });

    test('getRelatedWorkItems tolerates individual fetch failures', async () => {
        const items = new Map<number, WorkItem>([[1, wi(1, 'Good')]]);
        const pbi = wi(600, 'PBI', [
            relTo(1, 'System.LinkTypes.Related'),
            relTo(2, 'System.LinkTypes.Related'),
        ]);
        const client = clientWithFake(items, [2]);

        const related = await client.getRelatedWorkItems(pbi);
        assert.strictEqual(related.length, 1);
        assert.strictEqual(related[0].id, 1);
    });
});
