import assert from 'node:assert/strict';
import { DataBaseHelper } from '@indexer/common';
import { SearchService } from '../dist/api/search.service.js';

/**
 * The /search handler pages two collections by subtraction: it fills the page from
 * TokenCache first, then asks Message for whatever is left. Both of these cover the
 * edges of that arithmetic.
 */
describe('SearchService.search', () => {
    let calls;
    let origGetEntityManager;

    /**
     * @param tokens rows the TokenCache query returns
     * @param tokensCount total TokenCache matches
     */
    function stubEntityManager(tokens, tokensCount, messages = [], messagesCount = 0) {
        calls = [];
        origGetEntityManager = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => ({
            async findAndCount(entity, filter, options) {
                calls.push({ method: 'findAndCount', entity: entity?.name, filter, options });
                // first call is TokenCache, second is Message
                return calls.filter((c) => c.method === 'findAndCount').length === 1
                    ? [tokens, tokensCount]
                    : [messages, messagesCount];
            },
            async count(entity, filter) {
                calls.push({ method: 'count', entity: entity?.name, filter });
                return messagesCount;
            },
        });
    }

    afterEach(() => {
        if (origGetEntityManager) {
            DataBaseHelper.getEntityManager = origGetEntityManager;
            origGetEntityManager = null;
        }
    });

    it('does not issue an unbounded Message query when tokens already fill the page', async () => {
        // pageSize 1 with one token match makes the remaining message limit 1 - 1 = 0,
        // and MongoDB treats limit(0) as no limit at all.
        stubEntityManager([{ id: 't1' }], 1, [], 42);

        const res = await new SearchService().search({ pageIndex: 1, pageSize: 1, search: '0.0.1234' });

        const messageFinds = calls.filter((c) => c.method === 'findAndCount' && c.entity === 'Message');
        assert.equal(messageFinds.length, 0, 'Message must not be queried for documents when the page is full');
        assert.ok(calls.some((c) => c.method === 'count' && c.entity === 'Message'), 'total still needs a count');

        // the page is still reported correctly
        assert.equal(res.body.total, 1 + 42);
        assert.equal(res.body.items.length, 1);
    });

    it('never passes limit 0 to the Message document query', async () => {
        stubEntityManager([{ id: 't1' }], 1, [], 7);

        await new SearchService().search({ pageIndex: 1, pageSize: 1, search: 'x' });

        for (const c of calls) {
            if (c.method === 'findAndCount' && c.entity === 'Message') {
                assert.notEqual(c.options?.limit, 0, 'limit 0 reaches the driver as "unlimited"');
            }
        }
    });

    it('still queries messages when the page has room left', async () => {
        stubEntityManager([{ id: 't1' }], 1, [{ id: 'm1' }], 5);

        const res = await new SearchService().search({ pageIndex: 1, pageSize: 10, search: 'x' });

        const messageFind = calls.find((c) => c.method === 'findAndCount' && c.entity === 'Message');
        assert.ok(messageFind, 'messages are still fetched when the page is not full');
        assert.equal(messageFind.options.limit, 9);
        assert.equal(res.body.items.length, 2);
    });

    it('does not throw when the optional search parameter is omitted', async () => {
        // the gateway declares `search` optional; escapeStringRegexp(undefined) throws.
        stubEntityManager([], 0, [], 0);

        const res = await new SearchService().search({ pageIndex: 1, pageSize: 10 });

        assert.ok(res.body, 'a missing search must not produce an error response');
        assert.equal(res.body.items.length, 0);
    });
});
