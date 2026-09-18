import assert from 'node:assert/strict';
import { ObjectId } from '@mikro-orm/mongodb';
import { DatabaseServer } from '../../../dist/database-modules/database-server.js';

describe('DatabaseServer.dbID', () => {
    it('builds a valid ObjectId from a 24-char hex string', () => {
        const hex = new ObjectId().toHexString();
        const id = DatabaseServer.dbID(hex);
        assert.ok(id instanceof ObjectId);
        assert.equal(id.toHexString(), hex);
    });

    it('returns null for a malformed input', () => {
        assert.equal(DatabaseServer.dbID('not-an-objectid'), null);
        assert.equal(DatabaseServer.dbID('zzz'), null);
    });

    it('returns null for an empty string', () => {
        // Empty string is invalid for ObjectId construction.
        assert.equal(DatabaseServer.dbID(''), null);
    });
});
