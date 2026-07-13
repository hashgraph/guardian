import assert from 'node:assert/strict';
import { ArtifactModel } from '../../dist/analytics/compare/models/artifact.model.js';
import { TokenModel } from '../../dist/analytics/compare/models/token.model.js';

const propAll = { propLvl: 'All' };
const propSimple = { propLvl: 'Simple' };
const idAll = { idLvl: 'All' };
const idNone = { idLvl: 'None' };

describe('ArtifactModel', () => {
    const json = {
        name: 'logo.png',
        uuid: 'u-1',
        type: 'image',
        extention: 'png',
    };

    it('captures name/uuid/type/extension from raw json', () => {
        const a = new ArtifactModel(json);
        assert.equal(a.name, 'logo.png');
        assert.equal(a.uuid, 'u-1');
        assert.equal(a.type, 'image');
        assert.equal(a.extension, 'png');
    });

    it('sets weight to a hashed string under propLvl=All', () => {
        const a = new ArtifactModel(json);
        a.update('file-data', propAll);
        assert.ok(typeof a.weight === 'string' && a.weight.length > 0);
    });

    it('sets weight to "" under propLvl != All', () => {
        const a = new ArtifactModel(json);
        a.update('file-data', propSimple);
        assert.equal(a.weight, '');
    });

    it('equal() compares the underlying hash, not the weight', () => {
        const a = new ArtifactModel(json);
        const b = new ArtifactModel(json);
        a.update('same-data', propSimple); // weight = ""
        b.update('same-data', propAll);    // weight = hash
        // Different propLvl, but same underlying _hash → still equal.
        assert.equal(a.equal(b), true);
    });

    it('equal() returns false for different file data', () => {
        const a = new ArtifactModel(json);
        const b = new ArtifactModel(json);
        a.update('one', propAll);
        b.update('two', propAll);
        assert.equal(a.equal(b), false);
    });

    it('toObject() returns the canonical shape including weight', () => {
        const a = new ArtifactModel(json);
        a.update('xyz', propAll);
        const obj = a.toObject();
        assert.equal(obj.uuid, 'u-1');
        assert.equal(obj.name, 'logo.png');
        assert.equal(obj.type, 'image');
        assert.equal(obj.extension, 'png');
        assert.equal(obj.weight, a.weight);
    });

    it('toWeight() exposes the hash regardless of propLvl', () => {
        const a = new ArtifactModel(json);
        a.update('xyz', propSimple);
        const w = a.toWeight(propSimple);
        assert.ok(typeof w.weight === 'string' && w.weight.length > 0);
    });

    it('key getter is null (artifacts have no key)', () => {
        const a = new ArtifactModel(json);
        assert.equal(a.key, null);
    });

    it('equalKey() compares the (null) keys', () => {
        const a = new ArtifactModel(json);
        const b = new ArtifactModel({ ...json, uuid: 'u-2' });
        assert.equal(a.equalKey(b), true);
    });
});

describe('TokenModel construction', () => {
    const raw = {
        id: 't-internal',
        tokenId: '0.0.1',
        tokenName: 'Demo',
        tokenSymbol: 'DM',
        tokenType: 'fungible',
        decimals: 2,
        initialSupply: 100,
        enableAdmin: true,
        enableFreeze: false,
        enableKYC: false,
        enableWipe: true,
    };

    it('captures every documented property from raw JSON', () => {
        const t = new TokenModel(raw, idAll);
        assert.equal(t.id, 't-internal');
        assert.equal(t.tokenId, '0.0.1');
        assert.equal(t.tokenName, 'Demo');
        assert.equal(t.tokenSymbol, 'DM');
        assert.equal(t.tokenType, 'fungible');
        assert.equal(t.decimals, 2);
        assert.equal(t.initialSupply, 100);
        assert.equal(t.enableAdmin, true);
        assert.equal(t.enableFreeze, false);
        assert.equal(t.enableKYC, false);
        assert.equal(t.enableWipe, true);
    });

    it('computes a hash on construction (already updated)', () => {
        const t = new TokenModel(raw, idAll);
        assert.ok(typeof t.hash() === 'string' && t.hash().length > 0);
    });
});

describe('TokenModel.equal / equalKey', () => {
    const raw = (overrides = {}) => ({
        id: 'a', tokenId: '0.0.1', tokenName: 'D', tokenSymbol: 'DM',
        tokenType: 'fungible', decimals: 2, initialSupply: 100,
        enableAdmin: false, enableFreeze: false, enableKYC: false, enableWipe: false,
        ...overrides,
    });

    it('returns true for two tokens with the same tokenId', () => {
        const a = new TokenModel(raw(), idAll);
        const b = new TokenModel(raw({ tokenName: 'Different' }), idAll);
        assert.equal(a.equal(b), true);
        assert.equal(a.equalKey(b), true);
    });

    it('returns false for tokens with different tokenIds', () => {
        const a = new TokenModel(raw({ tokenId: '0.0.1' }), idAll);
        const b = new TokenModel(raw({ tokenId: '0.0.2' }), idAll);
        assert.equal(a.equal(b), false);
        assert.equal(a.equalKey(b), false);
    });
});

describe('TokenModel.update + idLvl', () => {
    const baseRaw = {
        id: 'a', tokenId: '0.0.1', tokenName: 'D', tokenSymbol: 'DM',
        tokenType: 'fungible', decimals: 2, initialSupply: 100,
        enableAdmin: false, enableFreeze: false, enableKYC: false, enableWipe: false,
    };

    it('produces the same weight for tokens differing only in tokenId when idLvl=None', () => {
        const a = new TokenModel({ ...baseRaw, tokenId: '0.0.1' }, idNone);
        const b = new TokenModel({ ...baseRaw, tokenId: '0.0.2' }, idNone);
        a.update(idNone);
        b.update(idNone);
        assert.equal(a.hash(), b.hash());
    });

    it('produces different weights for tokens differing in tokenId when idLvl=All', () => {
        const a = new TokenModel({ ...baseRaw, tokenId: '0.0.1' }, idAll);
        const b = new TokenModel({ ...baseRaw, tokenId: '0.0.2' }, idAll);
        a.update(idAll);
        b.update(idAll);
        assert.notEqual(a.hash(), b.hash());
    });

    it('produces different weights when token props differ', () => {
        const a = new TokenModel({ ...baseRaw, tokenName: 'A' }, idAll);
        const b = new TokenModel({ ...baseRaw, tokenName: 'B' }, idAll);
        assert.notEqual(a.hash(), b.hash());
    });
});

describe('TokenModel.toObject / toWeight', () => {
    const raw = {
        id: 'a', tokenId: '0.0.1', tokenName: 'D', tokenSymbol: 'DM',
        tokenType: 'fungible', decimals: 2, initialSupply: 100,
        enableAdmin: false, enableFreeze: false, enableKYC: false, enableWipe: false,
    };

    it('toObject includes every documented field', () => {
        const t = new TokenModel(raw, idAll);
        const obj = t.toObject();
        for (const k of [
            'id', 'tokenId', 'tokenName', 'tokenSymbol', 'tokenType',
            'decimals', 'initialSupply', 'enableAdmin', 'enableFreeze',
            'enableKYC', 'enableWipe',
        ]) {
            assert.ok(k in obj, `toObject missing ${k}`);
        }
    });

    it('toWeight returns the hash when computed', () => {
        const t = new TokenModel(raw, idAll);
        assert.equal(t.toWeight(idAll).weight, t.hash());
    });
});

describe('TokenModel.fromEntity', () => {
    it('creates an updated TokenModel for valid raw input', () => {
        const t = TokenModel.fromEntity(
            { id: 'a', tokenId: '0.0.42', tokenName: 'Z', tokenSymbol: 'Z', tokenType: 'fungible', decimals: 0, initialSupply: 0, enableAdmin: false, enableFreeze: false, enableKYC: false, enableWipe: false },
            idAll,
        );
        assert.equal(t.tokenId, '0.0.42');
        assert.ok(t.hash().length > 0);
    });

    it('throws "Unknown token" when raw is missing', () => {
        assert.throws(() => TokenModel.fromEntity(null, idAll), /Unknown token/);
        assert.throws(() => TokenModel.fromEntity(undefined, idAll), /Unknown token/);
    });
});
