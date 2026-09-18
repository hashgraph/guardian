import { assert } from 'chai';
import {
    GetGroupedCategories,
    GetConditionsPoliciesByCategories,
} from '../../../dist/helpers/policy-category.js';
import { DatabaseServer } from '../../../dist/database-modules/index.js';

describe('GetGroupedCategories', () => {
    it('groups category ids by their `type`', () => {
        const result = GetGroupedCategories([
            { id: 'a1', type: 'TYPE_A' },
            { id: 'b1', type: 'TYPE_B' },
            { id: 'a2', type: 'TYPE_A' },
        ]);
        assert.deepEqual(result.TYPE_A, ['a1', 'a2']);
        assert.deepEqual(result.TYPE_B, ['b1']);
    });

    it('returns {} for an empty list', () => {
        assert.deepEqual(GetGroupedCategories([]), {});
    });

    it('preserves first-seen insertion order within each bucket', () => {
        const result = GetGroupedCategories([
            { id: 'x', type: 'T' },
            { id: 'y', type: 'T' },
            { id: 'z', type: 'T' },
        ]);
        assert.deepEqual(result.T, ['x', 'y', 'z']);
    });
});

describe('GetConditionsPoliciesByCategories', () => {
    let savedFind;

    beforeEach(() => {
        savedFind = DatabaseServer.prototype.find;
    });

    afterEach(() => {
        DatabaseServer.prototype.find = savedFind;
    });

    it('returns only the PUBLISH status condition when no text and no categoryIds', async () => {
        DatabaseServer.prototype.find = async () => {
            throw new Error('find should not be called');
        };
        const conditions = await GetConditionsPoliciesByCategories([], '');
        assert.deepEqual(conditions, [{ status: { $eq: 'PUBLISH' } }]);
    });

    it('adds a case-insensitive name regex when text is provided', async () => {
        DatabaseServer.prototype.find = async () => {
            throw new Error('find should not be called');
        };
        const conditions = await GetConditionsPoliciesByCategories(undefined, 'solar');
        assert.deepEqual(conditions, [
            { status: { $eq: 'PUBLISH' } },
            { name: { $regex: '.*solar.*', $options: 'i' } },
        ]);
    });

    it('queries categories and pushes one $in condition per category type', async () => {
        let queriedFilter;
        DatabaseServer.prototype.find = async (_entity, filter) => {
            queriedFilter = filter;
            return [
                { id: 'a1', type: 'TYPE_A' },
                { id: 'a2', type: 'TYPE_A' },
                { id: 'b1', type: 'TYPE_B' },
            ];
        };
        const conditions = await GetConditionsPoliciesByCategories(['a1', 'a2', 'b1'], '');
        assert.deepEqual(queriedFilter, { id: { $in: ['a1', 'a2', 'b1'] } });
        assert.deepEqual(conditions, [
            { status: { $eq: 'PUBLISH' } },
            { categories: { $in: ['a1', 'a2'] } },
            { categories: { $in: ['b1'] } },
        ]);
    });

    it('combines the text regex and category conditions together', async () => {
        DatabaseServer.prototype.find = async () => [{ id: 'c1', type: 'T' }];
        const conditions = await GetConditionsPoliciesByCategories(['c1'], 'wind');
        assert.deepEqual(conditions, [
            { status: { $eq: 'PUBLISH' } },
            { name: { $regex: '.*wind.*', $options: 'i' } },
            { categories: { $in: ['c1'] } },
        ]);
    });

    it('skips the category query when categoryIds is empty', async () => {
        let called = false;
        DatabaseServer.prototype.find = async () => {
            called = true;
            return [];
        };
        const conditions = await GetConditionsPoliciesByCategories([], 'hydro');
        assert.isFalse(called);
        assert.deepEqual(conditions, [
            { status: { $eq: 'PUBLISH' } },
            { name: { $regex: '.*hydro.*', $options: 'i' } },
        ]);
    });
});
