import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const baseSchema = () => ({
    uuid: 'uuid-1',
    version: '1.0.0',
    contextURL: 'https://x',
    creator: 'did:creator',
    owner: 'did:owner',
    document: {
        $id: 'https://x#uuid-1&1.0.0',
        $comment: '{"previousVersion":"1.0.0"}',
    },
});

describe('SchemaHelper.updateVersion', () => {
    it('rejects an invalid version string', () => {
        const data = baseSchema();
        assert.throws(
            () => SchemaHelper.updateVersion(data, 'v2.0'),
            /Invalid version format/,
        );
    });

    it('rejects when new version is not greater than previousVersion', () => {
        const data = baseSchema();
        assert.throws(
            () => SchemaHelper.updateVersion(data, '1.0.0'),
            /Version must be greater than 1\.0\.0/,
        );
        assert.throws(
            () => SchemaHelper.updateVersion(data, '0.9.0'),
            /Version must be greater than 1\.0\.0/,
        );
    });

    it('accepts a strictly newer version and rebuilds $id', () => {
        const data = baseSchema();
        const result = SchemaHelper.updateVersion(data, '1.1.0');
        assert.equal(result.version, '1.1.0');
        assert.equal(result.document.$id, '#uuid-1&1.1.0');
    });

    it('uses creator (or owner fallback) for owner/creator after update', () => {
        const data = baseSchema();
        delete data.creator;
        const result = SchemaHelper.updateVersion(data, '1.1.0');
        assert.equal(result.creator, 'did:owner');
        assert.equal(result.owner, 'did:owner');
    });
});
