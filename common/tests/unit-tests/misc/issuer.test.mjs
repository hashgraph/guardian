import { assert } from 'chai';
import { Issuer } from '../../../dist/hedera-modules/vcjs/issuer.js';

describe('Issuer constructor and accessors', () => {
    it('returns the id passed in', () => {
        const i = new Issuer('did:hedera:testnet:abc');
        assert.equal(i.getId(), 'did:hedera:testnet:abc');
    });

    it('group defaults to null when not supplied', () => {
        const i = new Issuer('did:x');
        assert.isNull(i.getGroup());
    });

    it('preserves a non-empty group', () => {
        const i = new Issuer('did:x', 'group-A');
        assert.equal(i.getGroup(), 'group-A');
    });

    it('coerces empty string group to null (falsy)', () => {
        const i = new Issuer('did:x', '');
        assert.isNull(i.getGroup());
    });
});

describe('Issuer.toJsonTree', () => {
    it('returns the bare id string when group is absent', () => {
        const i = new Issuer('did:x');
        assert.equal(i.toJsonTree(), 'did:x');
    });

    it('returns an object with id and group when group is present', () => {
        const i = new Issuer('did:x', 'group-1');
        assert.deepEqual(i.toJsonTree(), { id: 'did:x', group: 'group-1' });
    });
});

describe('Issuer.fromJsonTree', () => {
    it('builds an Issuer from a bare id string', () => {
        const i = Issuer.fromJsonTree('did:y');
        assert.equal(i.getId(), 'did:y');
        assert.isNull(i.getGroup());
    });

    it('builds an Issuer from an {id, group} object', () => {
        const i = Issuer.fromJsonTree({ id: 'did:y', group: 'g' });
        assert.equal(i.getId(), 'did:y');
        assert.equal(i.getGroup(), 'g');
    });

    it('throws when input is null/undefined', () => {
        assert.throws(() => Issuer.fromJsonTree(null), /empty/i);
        assert.throws(() => Issuer.fromJsonTree(undefined), /empty/i);
    });
});

describe('Issuer.toJSON / fromJson round-trip', () => {
    it('round-trips a bare-id issuer through JSON', () => {
        const i = new Issuer('did:x');
        const back = Issuer.fromJson(i.toJSON());
        assert.equal(back.getId(), 'did:x');
        assert.isNull(back.getGroup());
    });

    it('round-trips an issuer with a group through JSON', () => {
        const i = new Issuer('did:x', 'g');
        const back = Issuer.fromJson(i.toJSON());
        assert.equal(back.getId(), 'did:x');
        assert.equal(back.getGroup(), 'g');
    });

    it('throws on malformed JSON input', () => {
        assert.throws(() => Issuer.fromJson('not-json{'), /not a valid Issuer/);
    });
});

describe('Issuer constants', () => {
    it('exposes ID and GROUP key names', () => {
        assert.equal(Issuer.ID, 'id');
        assert.equal(Issuer.GROUP, 'group');
    });
});
