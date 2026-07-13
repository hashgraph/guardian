import { assert } from 'chai';
import { WeightType } from '../../dist/analytics/compare/types/weight.type.js';

describe('analytics WeightType enum', () => {
    it('exposes representative CHILD/PROP/SCHEMA/GROUP/TOPIC/ROLE level keys', () => {
        for (const k of ['CHILD_LVL_1', 'CHILD_LVL_2', 'PROP_LVL_1', 'PROP_LVL_2',
                          'SCHEMA_LVL_0', 'SCHEMA_LVL_1', 'SCHEMA_LVL_2', 'SCHEMA_LVL_3', 'SCHEMA_LVL_4',
                          'GROUP_LVL_0', 'GROUP_LVL_1',
                          'TOPIC_LVL_0', 'TOPIC_LVL_1',
                          'ROLE_LVL_0',
                          'PROP_AND_CHILD', 'PROP_AND_CHILD_1', 'PROP_AND_CHILD_2', 'PROP_AND_CHILD_3',
                          'PROP_LVL_3']) {
            assert.equal(WeightType[k], k);
        }
    });
    it('has 19 entries (covers all granularity levels)', () => {
        assert.equal(Object.keys(WeightType).length, 19);
    });
});
