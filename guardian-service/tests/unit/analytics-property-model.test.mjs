import assert from 'node:assert/strict';
import {
    PropertyModel,
    UUIDPropertyModel,
    AnyPropertyModel,
    ArrayPropertyModel,
    ObjectPropertyModel,
    DocumentPropertyModel,
} from '../../dist/analytics/compare/models/property.model.js';

// Match the string-valued IIdLvl/IPropertiesLvl/IKeyLvl enums.
const NONE = 'None';
const ALL = 'All';
const SIMPLE = 'Simple';
const DEFAULT = 'Default';
const DESCRIPTION = 'Description';
const TITLE = 'Title';
const PROPERTY = 'Property';

const opts = (overrides = {}) => ({
    propLvl: ALL,
    keyLvl: DEFAULT,
    idLvl: ALL,
    ...overrides,
});

describe('PropertyModel construction', () => {
    it('defaults lvl to 1 and path to name', () => {
        const p = new PropertyModel('foo', 'property', 'val');
        assert.equal(p.name, 'foo');
        assert.equal(p.lvl, 1);
        assert.equal(p.path, 'foo');
        assert.equal(p.value, 'val');
    });

    it('accepts explicit lvl and path', () => {
        const p = new PropertyModel('foo', 'property', 'val', 3, 'a.b.foo');
        assert.equal(p.lvl, 3);
        assert.equal(p.path, 'a.b.foo');
    });

    it('exposes path as the initial key', () => {
        const p = new PropertyModel('foo', 'property', 'val', 1, 'a.b.foo');
        assert.equal(p.key, 'a.b.foo');
    });

    it('starts with an empty sub-property list', () => {
        const p = new PropertyModel('foo', 'property', 'val');
        assert.deepEqual(p.getPropList(), []);
    });
});

describe('PropertyModel.equal', () => {
    it('compares by type and stringified value (the weight)', () => {
        const a = new PropertyModel('x', 'property', 'v');
        const b = new PropertyModel('x', 'property', 'v');
        assert.equal(a.equal(b, opts()), true);
    });

    it('returns false when types differ', () => {
        const a = new PropertyModel('x', 'property', 'v');
        const b = new PropertyModel('x', 'array', 'v');
        assert.equal(a.equal(b, opts()), false);
    });

    it('returns false when values differ', () => {
        const a = new PropertyModel('x', 'property', 'v1');
        const b = new PropertyModel('x', 'property', 'v2');
        assert.equal(a.equal(b, opts()), false);
    });
});

describe('PropertyModel.hash', () => {
    it('returns "path:value" at any level when propLvl is non-Simple', () => {
        const p = new PropertyModel('x', 'property', 'v', 3, 'a.b.x');
        assert.equal(p.hash(opts({ propLvl: ALL })), 'a.b.x:v');
    });

    it('returns null at lvl > 1 when propLvl=Simple', () => {
        const p = new PropertyModel('x', 'property', 'v', 2);
        assert.equal(p.hash(opts({ propLvl: SIMPLE })), null);
    });

    it('returns "path:value" at lvl=1 when propLvl=Simple', () => {
        const p = new PropertyModel('x', 'property', 'v', 1);
        assert.equal(p.hash(opts({ propLvl: SIMPLE })), 'x:v');
    });
});

describe('PropertyModel.update (key strategy)', () => {
    it('falls back to path when description/title/property keys are unset', () => {
        const p = new PropertyModel('x', 'property', 'v', 1, 'a.x');
        p.update(opts({ keyLvl: DESCRIPTION }));
        assert.equal(p.key, 'a.x');
        p.update(opts({ keyLvl: TITLE }));
        assert.equal(p.key, 'a.x');
        p.update(opts({ keyLvl: PROPERTY }));
        assert.equal(p.key, 'a.x');
    });

    it('uses the description when keyLvl=Description and description is set', () => {
        const p = new PropertyModel('x', 'property', 'v', 1, 'a.x');
        p.setDescription('desc');
        p.update(opts({ keyLvl: DESCRIPTION }));
        assert.equal(p.key, 'desc');
    });

    it('uses the title when keyLvl=Title and title is set', () => {
        const p = new PropertyModel('x', 'property', 'v');
        p.setTitle('A Title');
        p.update(opts({ keyLvl: TITLE }));
        assert.equal(p.key, 'A Title');
    });

    it('uses the property string when keyLvl=Property and property is set', () => {
        const p = new PropertyModel('x', 'property', 'v');
        p.setProperty('prop-name');
        p.update(opts({ keyLvl: PROPERTY }));
        assert.equal(p.key, 'prop-name');
    });
});

describe('PropertyModel.toObject', () => {
    it('returns the canonical IProperties shape', () => {
        const p = new PropertyModel('x', 'property', 'v', 2, 'a.x');
        const o = p.toObject();
        assert.deepEqual(o, { name: 'x', lvl: 2, path: 'a.x', type: 'property', value: 'v' });
    });

    it('includes description/title/property when set', () => {
        const p = new PropertyModel('x', 'property', 'v');
        p.setDescription('d');
        p.setTitle('t');
        p.setProperty('p');
        const o = p.toObject();
        assert.equal(o.description, 'd');
        assert.equal(o.title, 't');
        assert.equal(o.property, 'p');
    });

    it('omits description/title/property when unset', () => {
        const p = new PropertyModel('x', 'property', 'v');
        const o = p.toObject();
        assert.equal('description' in o, false);
        assert.equal('title' in o, false);
        assert.equal('property' in o, false);
    });
});

describe('UUIDPropertyModel', () => {
    it('treats every pair as equal when idLvl=None', () => {
        const a = new UUIDPropertyModel('id', 'A');
        const b = new UUIDPropertyModel('id', 'B');
        assert.equal(a.equal(b, opts({ idLvl: NONE })), true);
    });

    it('compares by raw value when idLvl != None', () => {
        const a = new UUIDPropertyModel('id', 'A');
        const b = new UUIDPropertyModel('id', 'A');
        const c = new UUIDPropertyModel('id', 'B');
        assert.equal(a.equal(b, opts({ idLvl: ALL })), true);
        assert.equal(a.equal(c, opts({ idLvl: ALL })), false);
    });

    it('hash() returns null when idLvl=None', () => {
        const p = new UUIDPropertyModel('id', 'A');
        assert.equal(p.hash(opts({ idLvl: NONE })), null);
    });
});

describe('AnyPropertyModel / ArrayPropertyModel / ObjectPropertyModel', () => {
    it('AnyPropertyModel sets type=Property', () => {
        const p = new AnyPropertyModel('x', 'val');
        assert.equal(p.type, 'property');
    });

    it('ArrayPropertyModel sets type=array and stores numeric value', () => {
        const p = new ArrayPropertyModel('list', 5);
        assert.equal(p.type, 'array');
        assert.equal(p.value, 5);
    });

    it('ObjectPropertyModel sets type=object and stores boolean value', () => {
        const p = new ObjectPropertyModel('obj', true);
        assert.equal(p.type, 'object');
        assert.equal(p.value, true);
    });
});

describe('DocumentPropertyModel.ignore', () => {
    it('flags @context/type/policyId/id as system fields', () => {
        for (const name of ['@context', 'type', 'policyId', 'id', 'ref', 'tokenId', 'issuanceDate', 'issuer', 'guardianVersion']) {
            const p = new DocumentPropertyModel(name, 'v');
            assert.equal(p.ignore(opts({ idLvl: NONE })), true, `${name} should be ignored when idLvl=None`);
        }
    });

    it('does NOT ignore non-system fields under any idLvl', () => {
        const p = new DocumentPropertyModel('amount', 5);
        assert.equal(p.ignore(opts({ idLvl: NONE })), false);
        assert.equal(p.ignore(opts({ idLvl: ALL })), false);
    });

    it('returns false for system fields when idLvl != None', () => {
        const p = new DocumentPropertyModel('id', 'v');
        assert.equal(p.ignore(opts({ idLvl: ALL })), false);
    });

    it('flags proof.* paths as system fields', () => {
        const p = new DocumentPropertyModel('jws', 'sig', 1, 'a.proof.jws');
        assert.equal(p.ignore(opts({ idLvl: NONE })), true);
    });

    it('flags did:hedera: string values as system', () => {
        const p = new DocumentPropertyModel('owner', 'did:hedera:testnet:abcd', 1, 'a.owner');
        assert.equal(p.ignore(opts({ idLvl: NONE })), true);
    });

    it('flags MintToken type "date" as system', () => {
        const p = new DocumentPropertyModel('date', '2024-01-01', 1, 'a.date', 'MintToken');
        assert.equal(p.ignore(opts({ idLvl: NONE })), true);
    });
});
