import { assert } from 'chai';
import fixConnectionString from '../../../dist/helpers/fix-connection-string.js';

describe('fixConnectionString — edge & quirks', () => {
    it('returns a bare scheme for an empty string', () => {
        assert.equal(fixConnectionString(''), 'mongodb://');
    });

    it('prepends when nothing precedes :// (regex needs a char on the left)', () => {
        assert.equal(fixConnectionString('://x'), 'mongodb://://x');
    });

    it('prepends when nothing follows :// (regex needs a char on the right)', () => {
        assert.equal(fixConnectionString('x://'), 'mongodb://x://');
    });

    it('prepends to a lone :// token', () => {
        assert.equal(fixConnectionString('://'), 'mongodb://://');
    });

    it('leaves an uppercase scheme untouched (scheme-agnostic match)', () => {
        assert.equal(fixConnectionString('MONGODB://h'), 'MONGODB://h');
    });
});
