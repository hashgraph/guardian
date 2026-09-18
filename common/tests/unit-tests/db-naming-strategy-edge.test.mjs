import assert from 'node:assert/strict';
import { DataBaseNamingStrategy } from '../../dist/helpers/db-naming-strategy.js';

describe('DataBaseNamingStrategy.classToTableName — edges', () => {
    const strategy = new DataBaseNamingStrategy();

    it('returns an empty string unchanged', () => {
        assert.equal(strategy.classToTableName(''), '');
    });

    it('does not insert underscores around digits', () => {
        assert.equal(strategy.classToTableName('User2Factor'), 'user2factor');
    });

    it('splits a minimal lower-then-upper pair', () => {
        assert.equal(strategy.classToTableName('aB'), 'a_b');
    });

    it('does not split an acronym that runs into a word with no lower-upper boundary', () => {
        assert.equal(strategy.classToTableName('ABCdef'), 'abcdef');
    });
});
