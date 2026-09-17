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

// ---------------------------------------------------------------------------
// Phase 2: typed errors, timeouts, secret scrubbing
// ---------------------------------------------------------------------------

import {
    AzdoApiError,
    toAzdoApiError,
    withTimeout,
    scrubSecrets,
} from '../../api/DevOpsClient';

suite('AzdoApiError typing', () => {
    test('401 maps to auth with a PAT-hint message', () => {
        const err = toAzdoApiError(Object.assign(new Error('Unauthorized'), { statusCode: 401 }), 'Fetching work item 1');
        assert.ok(err instanceof AzdoApiError);
        assert.strictEqual(err.code, 'auth');
        assert.ok(/PAT/i.test(err.message));
    });

    test('404 maps to not-found', () => {
        const err = toAzdoApiError(Object.assign(new Error('Not Found'), { statusCode: 404 }), 'x');
        assert.strictEqual(err.code, 'not-found');
    });

    test('DNS/connection failures map to network', () => {
        const err = toAzdoApiError(new Error('getaddrinfo ENOTFOUND dev.azure.com'), 'x');
        assert.strictEqual(err.code, 'network');
    });

    test('unknown errors keep a generic code', () => {
        const err = toAzdoApiError(new Error('weird transport failure'), 'x');
        assert.strictEqual(err.code, 'unknown');
    });

    test('scrubSecrets redacts Basic and Bearer credentials', () => {
        const dirty = 'failed with header Basic OmZha2UtcGF0LXRva2VuLXNlY3JldA== and Bearer abcdefghijklmnop.qrs';
        const clean = scrubSecrets(dirty);
        assert.ok(!clean.includes('OmZha2UtcGF0LXRva2VuLXNlY3JldA=='));
        assert.ok(clean.includes('Basic [redacted]'));
        assert.ok(clean.includes('Bearer [redacted]'));
    });

    test('root recursive fetch propagates typed auth error', async () => {
        const client = new DevOpsClient('https://dev.azure.com/org', 'fake-pat');
        (client as unknown as { _workItemTrackingApi: Promise<unknown> })._workItemTrackingApi =
            Promise.resolve({
                getWorkItem: async () => {
                    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
                },
            });
        await assert.rejects(client.getWorkItemRecursively(1), (e: unknown) => {
            return e instanceof AzdoApiError && e.code === 'auth';
        });
    });

    test('nested recursive failures are swallowed, root error is not', async () => {
        const root = wi(700, 'Root PBI', [relTo(999, 'System.LinkTypes.Hierarchy-Reverse', 'Parent')]);
        const client = new DevOpsClient('https://dev.azure.com/org', 'fake-pat');
        (client as unknown as { _workItemTrackingApi: Promise<unknown> })._workItemTrackingApi =
            Promise.resolve({
                getWorkItem: async (id: number) => {
                    if (id === 999) {
                        throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
                    }
                    const item = new Map([[700, root]]).get(id);
                    if (!item) {
                        throw new Error(`not found: ${id}`);
                    }
                    return item;
                },
            });
        const tree = await client.getWorkItemRecursively(700);
        assert.ok(tree);
        assert.strictEqual(tree.parent, null);
    });
});

suite('withTimeout', () => {
    test('resolves when the promise settles in time', async () => {
        const result = await withTimeout(Promise.resolve(42), 1000, 'test');
        assert.strictEqual(result, 42);
    });

    test('rejects with a typed timeout error when the promise hangs', async () => {
        const hanging = new Promise<never>(() => {});
        await assert.rejects(withTimeout(hanging, 30, 'Fetching work item 9'), (e: unknown) => {
            return e instanceof AzdoApiError && e.code === 'timeout' && /30|0\.03/.test(e.message);
        });
    });
});
