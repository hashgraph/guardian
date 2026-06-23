import assert from 'node:assert/strict';
import { DidURL } from '../../../dist/hedera-modules/vcjs/did/components/did-url.js';

describe('DidURL.getController', () => {
    it('returns the bare DID when there is no fragment/path/query', () => {
        assert.equal(DidURL.getController('did:hedera:testnet:abc_0.0.1'), 'did:hedera:testnet:abc_0.0.1');
    });

    it('strips a #fragment', () => {
        assert.equal(DidURL.getController('did:abc#key-1'), 'did:abc');
    });

    it('strips a /path', () => {
        assert.equal(DidURL.getController('did:abc/path'), 'did:abc');
    });

    it('strips a ?query', () => {
        assert.equal(DidURL.getController('did:abc?versionId=1'), 'did:abc');
    });

    it('throws on an empty string', () => {
        assert.throws(() => DidURL.getController(''), /DID cannot be/);
    });

    it('throws on a non-string', () => {
        assert.throws(() => DidURL.getController(123), /DID cannot be/);
        assert.throws(() => DidURL.getController(null), /DID cannot be/);
    });
});

describe('DidURL.getPath', () => {
    it('returns the fragment portion', () => {
        assert.equal(DidURL.getPath('did:abc#key-1'), 'key-1');
    });

    it('joins remaining segments without delimiters', () => {
        assert.equal(DidURL.getPath('did:abc/p?q'), 'pq');
    });

    it('returns null when there is no fragment/path/query', () => {
        assert.equal(DidURL.getPath('did:abc'), null);
    });

    it('throws on an empty string', () => {
        assert.throws(() => DidURL.getPath(''), /DID cannot be/);
    });

    it('throws on a non-string', () => {
        assert.throws(() => DidURL.getPath(undefined), /DID cannot be/);
    });
});
