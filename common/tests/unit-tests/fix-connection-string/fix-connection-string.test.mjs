import { assert } from 'chai';
import fixConnectionString from '../../../dist/helpers/fix-connection-string.js';

describe('fixConnectionString', () => {
    it('prepends mongodb:// to a bare host:port', () => {
        assert.equal(fixConnectionString('localhost:27017'), 'mongodb://localhost:27017');
    });

    it('prepends mongodb:// to a bare host', () => {
        assert.equal(fixConnectionString('mongo'), 'mongodb://mongo');
    });

    it('leaves an mongodb:// URI unchanged', () => {
        assert.equal(
            fixConnectionString('mongodb://user:pass@host/db'),
            'mongodb://user:pass@host/db',
        );
    });

    it('leaves an mongodb+srv:// URI unchanged', () => {
        assert.equal(
            fixConnectionString('mongodb+srv://cluster.example/db'),
            'mongodb+srv://cluster.example/db',
        );
    });

    it('leaves any scheme://… URI unchanged (not mongodb-aware)', () => {
        // Documents the regex: anything with `://` is left alone.
        assert.equal(fixConnectionString('postgres://x'), 'postgres://x');
    });
});
