import assert from 'node:assert/strict';
import { Examples, ObjectExamples } from '../../dist/middlewares/validation/examples.js';
import { CsvObjectExamples } from '../../dist/middlewares/validation/csv-examples.js';

describe('Examples enum', () => {
    it('is defined', () => {
        assert.equal(typeof Examples, 'object');
        assert.notEqual(Examples, null);
    });

    it('exposes a 24-hex-character Mongo DB_ID', () => {
        assert.match(Examples.DB_ID, /^[0-9a-f]{24}$/);
    });

    it('exposes a v4-shaped UUID', () => {
        assert.match(Examples.UUID, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('exposes a Hedera account id', () => {
        assert.match(Examples.ACCOUNT_ID, /^\d+\.\d+\.\d+$/);
    });

    it('exposes a did:hedera DID', () => {
        assert.ok(Examples.DID.startsWith('did:hedera:'));
    });

    it('exposes an ipfs:// reference', () => {
        assert.ok(Examples.IPFS.startsWith('ipfs://'));
    });

    it('exposes an ISO date string', () => {
        assert.equal(new Date(Examples.DATE).toISOString(), Examples.DATE);
    });

    it('exposes a hex color', () => {
        assert.match(Examples.COLOR, /^#[0-9a-fA-F]{6}$/);
    });

    it('exposes the SR role constant', () => {
        assert.equal(Examples.ROLE_SR, 'STANDARD_REGISTRY');
    });

    it('exposes the USER role constant', () => {
        assert.equal(Examples.ROLE_USER, 'USER');
    });

    it('exposes a numeric NUMBER value', () => {
        assert.equal(typeof Examples.NUMBER, 'number');
    });

    it('exposes a three-part JWT access token', () => {
        assert.equal(Examples.ACCESS_TOKEN.split('.').length, 3);
    });

    it('exposes a three-part JWT refresh token', () => {
        assert.equal(Examples.REFRESH_TOKEN.split('.').length, 3);
    });
});

describe('ObjectExamples map', () => {
    it('is a non-empty object', () => {
        assert.equal(typeof ObjectExamples, 'object');
        assert.ok(Object.keys(ObjectExamples).length > 0);
    });

    it('exposes known example keys', () => {
        assert.ok(Object.prototype.hasOwnProperty.call(ObjectExamples, 'BRANDING'));
        assert.ok(Object.prototype.hasOwnProperty.call(ObjectExamples, 'SCHEMA_RULE'));
    });

    it('every example value is defined', () => {
        for (const [key, value] of Object.entries(ObjectExamples)) {
            assert.notEqual(value, undefined, `${key} should be defined`);
        }
    });

    it('has no duplicate keys (object invariant)', () => {
        const keys = Object.keys(ObjectExamples);
        assert.equal(keys.length, new Set(keys).size);
    });
});

describe('CsvObjectExamples map', () => {
    it('is a non-empty object', () => {
        assert.equal(typeof CsvObjectExamples, 'object');
        assert.ok(Object.keys(CsvObjectExamples).length > 0);
    });

    it('every CSV sample is a data:text/csv payload', () => {
        for (const [key, value] of Object.entries(CsvObjectExamples)) {
            assert.equal(typeof value, 'string', `${key} should be a string`);
            assert.ok(value.startsWith('data:text/csv'), `${key} should start with data:text/csv`);
        }
    });

    it('includes the policy comparison sample', () => {
        assert.ok(Object.prototype.hasOwnProperty.call(CsvObjectExamples, 'COMPARE_POLICIES_EXPORT_CSV_RESPONSE'));
    });
});
