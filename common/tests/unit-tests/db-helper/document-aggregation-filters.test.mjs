import { assert } from 'chai';
import {
    DataBaseHelper,
    MAP_DOCUMENT_AGGREGATION_FILTERS,
    MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS
} from '../../../dist/helpers/db-helper.js';

function mockAggregation() {
    const calls = [];
    return {
        calls,
        push(...stages) {
            calls.push(...stages);
            return this;
        }
    };
}

describe('DataBaseHelper.getDocumentAggregationFilters', () => {
    it('appends the BASE pipeline stages onto the aggregation', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.BASE
        });
        assert.isAbove(aggregation.calls.length, 0);
        assert.property(aggregation.calls[0], '$match');
    });

    it('SORT stage uses the supplied sortObject', () => {
        const aggregation = mockAggregation();
        const sortObject = { createDate: -1 };
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.SORT,
            sortObject
        });
        assert.deepEqual(aggregation.calls[0], { $sort: sortObject });
    });

    it('PAGINATION stage computes skip = itemsPerPage * page and limit', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.PAGINATION,
            itemsPerPage: 10,
            page: 3
        });
        assert.deepEqual(aggregation.calls[0], { $skip: 30 });
        assert.deepEqual(aggregation.calls[1], { $limit: 10 });
    });

    it('VC_DOCUMENTS stage matches the supplied policyId', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.VC_DOCUMENTS,
            policyId: 'pol-1'
        });
        assert.deepEqual(aggregation.calls[0], { $match: { policyId: { $eq: 'pol-1' } } });
    });

    it('HISTORY stage looks up document_state when not dry-run', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.HISTORY,
            dryRun: false
        });
        assert.equal(aggregation.calls[0].$lookup.from, 'document_state');
    });

    it('HISTORY stage looks up dry_run when dryRun=true', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.HISTORY,
            dryRun: true
        });
        assert.equal(aggregation.calls[0].$lookup.from, 'dry_run');
    });

    it('DRY_RUN_SAVEPOINT includes savepointId $in when ids supplied', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.DRY_RUN_SAVEPOINT,
            savepointIds: ['s1', 's2']
        });
        const orArr = aggregation.calls[0].$match.$or;
        assert.deepInclude(orArr, { savepointId: { $in: ['s1', 's2'] } });
    });

    it('DRY_RUN_SAVEPOINT omits the $in clause when no ids supplied', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getDocumentAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_DOCUMENT_AGGREGATION_FILTERS.DRY_RUN_SAVEPOINT,
            savepointIds: null
        });
        const orArr = aggregation.calls[0].$match.$or;
        assert.equal(orArr.length, 2);
        assert.deepInclude(orArr, { savepointId: { $exists: false } });
        assert.deepInclude(orArr, { savepointId: null });
    });
});

describe('DataBaseHelper.getTransactionsSerialsAggregationFilters', () => {
    it('appends a $project counting serials for the COUNT key', () => {
        const aggregation = mockAggregation();
        DataBaseHelper.getTransactionsSerialsAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS.COUNT
        });
        assert.deepEqual(aggregation.calls[0], { $project: { serials: { $size: '$serials' } } });
    });
});

describe('DataBaseHelper._getTransactionsSerialsAggregation', () => {
    it('matches only mintRequestId when no transferStatus', () => {
        const pipeline = DataBaseHelper._getTransactionsSerialsAggregation('req-1');
        assert.deepEqual(pipeline[0].$match, { mintRequestId: 'req-1' });
    });

    it('includes transferStatus in the match when provided', () => {
        const pipeline = DataBaseHelper._getTransactionsSerialsAggregation('req-1', 'COMPLETED');
        assert.deepEqual(pipeline[0].$match, { mintRequestId: 'req-1', transferStatus: 'COMPLETED' });
    });

    it('groups and reduces serials into a flat array', () => {
        const pipeline = DataBaseHelper._getTransactionsSerialsAggregation('req-1');
        assert.property(pipeline[1], '$group');
        assert.property(pipeline[2], '$project');
        assert.property(pipeline[2].$project.serials, '$reduce');
    });
});
