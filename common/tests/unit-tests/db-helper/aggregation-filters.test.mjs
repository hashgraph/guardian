import { assert } from 'chai';
import {
    DataBaseHelper,
    MAP_ATTRIBUTES_AGGREGATION_FILTERS,
    MAP_TASKS_AGGREGATION_FILTERS,
} from '../../../dist/helpers/db-helper.js';

describe('DataBaseHelper.getAttributesAggregationFilters', () => {
    it('returns the documented pipeline for the RESULT key', () => {
        const pipeline = DataBaseHelper.getAttributesAggregationFilters(
            MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT,
            'foo',
            ['existing-1', 'existing-2']
        );
        assert.isArray(pipeline);
        assert.isAbove(pipeline.length, 0);
    });

    it('first stage projects only the attributes field', () => {
        const pipeline = DataBaseHelper.getAttributesAggregationFilters(
            MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT,
            'foo',
            []
        );
        assert.deepEqual(pipeline[0], { $project: { attributes: '$attributes' } });
    });

    it('embeds the supplied regex (case-insensitive) into a $match stage', () => {
        const pipeline = DataBaseHelper.getAttributesAggregationFilters(
            MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT,
            'svc-name',
            []
        );
        const match = pipeline.find(
            (s) => s.$match && s.$match.attributes && s.$match.attributes.$regex === 'svc-name'
        );
        assert.ok(match, 'expected a $match stage with the supplied regex');
        assert.equal(match.$match.attributes.$options, 'i');
    });

    it('embeds existingAttributes into a $not/$in exclusion match', () => {
        const existing = ['svc:already', 'env:done'];
        const pipeline = DataBaseHelper.getAttributesAggregationFilters(
            MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT,
            'foo',
            existing
        );
        const exclude = pipeline.find(
            (s) => s.$match && s.$match.attributes && s.$match.attributes.$not
        );
        assert.ok(exclude);
        assert.deepEqual(exclude.$match.attributes.$not.$in, existing);
    });

    it('caps results at 20 unique values via a $limit stage', () => {
        const pipeline = DataBaseHelper.getAttributesAggregationFilters(
            MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT,
            'foo',
            []
        );
        const limit = pipeline.find((s) => s.$limit !== undefined);
        assert.ok(limit);
        assert.equal(limit.$limit, 20);
    });

    it('returns undefined for an unknown map key', () => {
        const out = DataBaseHelper.getAttributesAggregationFilters('not-result', 'x', []);
        assert.equal(out, undefined);
    });
});

describe('DataBaseHelper.getTasksAggregationFilters', () => {
    it('returns a non-empty pipeline for the RESULT key', () => {
        const pipeline = DataBaseHelper.getTasksAggregationFilters(
            MAP_TASKS_AGGREGATION_FILTERS.RESULT,
            30000
        );
        assert.isArray(pipeline);
        assert.isAbove(pipeline.length, 0);
    });

    it('first stage matches sent=true and done!=true', () => {
        const pipeline = DataBaseHelper.getTasksAggregationFilters(
            MAP_TASKS_AGGREGATION_FILTERS.RESULT,
            30000
        );
        const match = pipeline[0].$match;
        assert.equal(match.sent, true);
        assert.deepEqual(match.done, { $ne: true });
    });

    it('returns undefined for an unknown map key', () => {
        const out = DataBaseHelper.getTasksAggregationFilters('not-a-key', 1000);
        assert.equal(out, undefined);
    });
});

describe('DataBaseHelper aggregation map constants', () => {
    it('MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT is the literal "result"', () => {
        assert.equal(MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT, 'result');
    });

    it('MAP_TASKS_AGGREGATION_FILTERS.RESULT is the literal "result"', () => {
        assert.equal(MAP_TASKS_AGGREGATION_FILTERS.RESULT, 'result');
    });
});
