import assert from 'node:assert/strict';
import { DataBaseNamingStrategy } from '../../dist/helpers/db-naming-strategy.js';

describe('DataBaseNamingStrategy.classToTableName', () => {
    const strategy = new DataBaseNamingStrategy();

    it('converts CamelCase entity names to snake_case table names', () => {
        assert.equal(strategy.classToTableName('VcDocument'), 'vc_document');
        assert.equal(strategy.classToTableName('PolicyAction'), 'policy_action');
        assert.equal(strategy.classToTableName('User'), 'user');
    });

    it('keeps single-word lowercase names unchanged', () => {
        assert.equal(strategy.classToTableName('user'), 'user');
        assert.equal(strategy.classToTableName('topic'), 'topic');
    });

    it('handles consecutive capitals: only inserts an underscore between lower-then-upper boundary', () => {
        // 'XMLParser' has no lower-then-upper transition until 'r' (no transition) — output is xmlparser
        assert.equal(strategy.classToTableName('XMLParser'), 'xmlparser');
        // 'JSONHelper' likewise
        assert.equal(strategy.classToTableName('JSONHelper'), 'jsonhelper');
    });

    it('inserts the underscore at every lowerUpper transition', () => {
        assert.equal(strategy.classToTableName('AaBbCc'), 'aa_bb_cc');
    });
});
