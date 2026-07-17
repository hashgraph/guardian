import assert from 'node:assert/strict';
import {
    PropertyModel,
    UUIDPropertyModel,
    AnyPropertyModel,
    ArrayPropertyModel,
    ObjectPropertyModel,
    TokenPropertyModel,
    SchemaPropertyModel,
    DocumentPropertyModel,
} from '../../dist/analytics/compare/models/property.model.js';

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

const fakeToken = (overrides = {}) => ({
    tokenId: 't-1',
    tokenName: 'Carbon',
    tokenSymbol: 'CO2',
    tokenType: 'fungible',
    decimals: 2,
    initialSupply: 100,
    enableAdmin: true,
    enableFreeze: false,
    enableKYC: true,
    enableWipe: false,
    hash: () => 'TOKENHASH',
    ...overrides,
});

const fakeSchema = (overrides = {}) => ({
    id: 's-1',
    hash: () => 'SCHEMAHASH',
    toObject: () => ({ id: 's-1', kind: 'schema' }),
    ...overrides,
});

describe('PropertyModel weight + value coercion', () => {
    it('stringifies a numeric value as the weight', () => {
        const p = new PropertyModel('n', 'property', 42);
        assert.equal(p._weight, '42');
    });

    it('stringifies a boolean value as the weight', () => {
        const p = new PropertyModel('b', 'property', false);
        assert.equal(p._weight, 'false');
    });

    it('stringifies null value to "null"', () => {
        const p = new PropertyModel('z', 'property', null);
        assert.equal(p._weight, 'null');
    });

    it('lvl=0 is preserved (not replaced by default)', () => {
        const p = new PropertyModel('z', 'property', 'v', 0);
        assert.equal(p.lvl, 0);
    });

    it('ignore() is always false on the base model', () => {
        const p = new PropertyModel('z', 'property', 'v');
        assert.equal(p.ignore(opts()), false);
    });

    it('two numerically-equal but different-typed values are unequal', () => {
        const a = new PropertyModel('x', 'property', 1);
        const b = new PropertyModel('x', 'array', 1);
        assert.equal(a.equal(b, opts()), false);
    });

    it('number vs string with same textual weight are equal (string coercion)', () => {
        const a = new PropertyModel('x', 'property', 1);
        const b = new PropertyModel('x', 'property', '1');
        assert.equal(a.equal(b, opts()), true);
    });
});

describe('PropertyModel.update precedence', () => {
    it('description set but keyLvl=Title falls through to path', () => {
        const p = new PropertyModel('x', 'property', 'v', 1, 'a.x');
        p.setDescription('d');
        p.update(opts({ keyLvl: TITLE }));
        assert.equal(p.key, 'a.x');
    });

    it('empty-string description falls back to path', () => {
        const p = new PropertyModel('x', 'property', 'v', 1, 'a.x');
        p.setDescription('');
        p.update(opts({ keyLvl: DESCRIPTION }));
        assert.equal(p.key, 'a.x');
    });

    it('default keyLvl always uses path even when description is set', () => {
        const p = new PropertyModel('x', 'property', 'v', 1, 'a.x');
        p.setDescription('d');
        p.update(opts({ keyLvl: DEFAULT }));
        assert.equal(p.key, 'a.x');
    });

    it('update is idempotent across repeated calls', () => {
        const p = new PropertyModel('x', 'property', 'v', 1, 'a.x');
        p.setTitle('T');
        p.update(opts({ keyLvl: TITLE }));
        p.update(opts({ keyLvl: TITLE }));
        assert.equal(p.key, 'T');
    });
});

describe('UUIDPropertyModel hash branches', () => {
    it('hash delegates to super when idLvl=All (lvl 1)', () => {
        const p = new UUIDPropertyModel('id', 'A', 1, 'a.id');
        assert.equal(p.hash(opts({ idLvl: ALL })), 'a.id:A');
    });

    it('hash returns null at deep lvl with propLvl=Simple even when idLvl=All', () => {
        const p = new UUIDPropertyModel('id', 'A', 2, 'a.id');
        assert.equal(p.hash(opts({ idLvl: ALL, propLvl: SIMPLE })), null);
    });

    it('equal returns true regardless of value when idLvl=None', () => {
        const a = new UUIDPropertyModel('id', 'A');
        const b = new UUIDPropertyModel('id', 'Z');
        assert.equal(a.equal(b, opts({ idLvl: NONE })), true);
    });
});

describe('TokenPropertyModel', () => {
    it('type is token', () => {
        const p = new TokenPropertyModel('tok', 't-1');
        assert.equal(p.type, 'token');
    });

    it('setToken populates 9 sub-properties at lvl+1', () => {
        const p = new TokenPropertyModel('tok', 't-1', 1, 'a.tok');
        p.setToken(fakeToken());
        const sub = p.getPropList();
        assert.equal(sub.length, 9);
        for (const s of sub) {
            assert.equal(s.lvl, 2);
            assert.equal(s.type, 'property');
        }
    });

    it('setToken stores token hash as weight', () => {
        const p = new TokenPropertyModel('tok', 't-1');
        p.setToken(fakeToken());
        assert.equal(p._weight, 'TOKENHASH');
    });

    it('setToken with falsy token leaves sub-list empty', () => {
        const p = new TokenPropertyModel('tok', 't-1');
        p.setToken(null);
        assert.deepEqual(p.getPropList(), []);
    });

    it('setToken twice resets the sub-list to 9 items', () => {
        const p = new TokenPropertyModel('tok', 't-1');
        p.setToken(fakeToken());
        p.setToken(fakeToken({ tokenName: 'Other' }));
        assert.equal(p.getPropList().length, 9);
        assert.equal(p.getPropList()[0].value, 'Other');
    });

    it('toObject includes token fields when token set', () => {
        const p = new TokenPropertyModel('tok', 't-1');
        p.setToken(fakeToken());
        const o = p.toObject();
        assert.equal(o.tokenId, 't-1');
        assert.equal(o.tokenName, 'Carbon');
        assert.equal(o.decimals, 2);
        assert.equal(o.enableKYC, true);
    });

    it('toObject omits token fields when token unset', () => {
        const p = new TokenPropertyModel('tok', 't-1');
        const o = p.toObject();
        assert.equal('tokenId' in o, false);
    });

    it('hash uses token hash with path prefix when idLvl=None and token set', () => {
        const p = new TokenPropertyModel('tok', 't-1', 1, 'a.tok');
        p.setToken(fakeToken({ hash: () => 'H2' }));
        assert.equal(p.hash(opts({ idLvl: NONE })), 'a.tok:H2');
    });

    it('hash falls to super when idLvl=All', () => {
        const p = new TokenPropertyModel('tok', 't-1', 1, 'a.tok');
        p.setToken(fakeToken());
        assert.equal(p.hash(opts({ idLvl: ALL })), 'a.tok:t-1');
    });

    it('equal uses super (true) when idLvl=None', () => {
        const a = new TokenPropertyModel('tok', 't-1');
        const b = new TokenPropertyModel('tok', 't-2');
        a.setToken(fakeToken());
        b.setToken(fakeToken());
        assert.equal(a.equal(b, opts({ idLvl: NONE })), true);
    });

    it('equal compares raw value when idLvl=All', () => {
        const a = new TokenPropertyModel('tok', 't-1');
        const b = new TokenPropertyModel('tok', 't-2');
        assert.equal(a.equal(b, opts({ idLvl: ALL })), false);
    });
});

describe('SchemaPropertyModel', () => {
    it('type is schema', () => {
        const p = new SchemaPropertyModel('sch', 's-1');
        assert.equal(p.type, 'schema');
    });

    it('setSchema stores schema hash as weight', () => {
        const p = new SchemaPropertyModel('sch', 's-1');
        p.setSchema(fakeSchema());
        assert.equal(p._weight, 'SCHEMAHASH');
    });

    it('setSchema with falsy schema does not throw and keeps default weight', () => {
        const p = new SchemaPropertyModel('sch', 's-1');
        p.setSchema(null);
        assert.equal(p._weight, 's-1');
    });

    it('toObject embeds schemaId and nested schema object', () => {
        const p = new SchemaPropertyModel('sch', 's-1');
        p.setSchema(fakeSchema());
        const o = p.toObject();
        assert.equal(o.schemaId, 's-1');
        assert.deepEqual(o.schema, { id: 's-1', kind: 'schema' });
    });

    it('toObject omits schema fields when unset', () => {
        const p = new SchemaPropertyModel('sch', 's-1');
        assert.equal('schemaId' in p.toObject(), false);
    });

    it('hash prefixes schema hash when idLvl=None', () => {
        const p = new SchemaPropertyModel('sch', 's-1', 1, 'a.sch');
        p.setSchema(fakeSchema({ hash: () => 'HS' }));
        assert.equal(p.hash(opts({ idLvl: NONE })), 'a.sch:HS');
    });

    it('equal true when idLvl=None via super (matching schema hash weights)', () => {
        const a = new SchemaPropertyModel('sch', 's-1');
        const b = new SchemaPropertyModel('sch', 's-9');
        a.setSchema(fakeSchema());
        b.setSchema(fakeSchema());
        assert.equal(a.equal(b, opts({ idLvl: NONE })), true);
    });

    it('equal false when idLvl=None and schema hashes differ', () => {
        const a = new SchemaPropertyModel('sch', 's-1');
        const b = new SchemaPropertyModel('sch', 's-9');
        a.setSchema(fakeSchema({ hash: () => 'HA' }));
        b.setSchema(fakeSchema({ hash: () => 'HB' }));
        assert.equal(a.equal(b, opts({ idLvl: NONE })), false);
    });
});

describe('DocumentPropertyModel.checkSystemField branches', () => {
    it('flags @context-containing paths', () => {
        const p = new DocumentPropertyModel('x', 'v', 1, 'a.@context.b');
        assert.equal(p.isSystem, true);
    });

    it('flags type.* prefixed paths', () => {
        const p = new DocumentPropertyModel('x', 'v', 1, 'type.0');
        assert.equal(p.isSystem, true);
    });

    it('flags proof.created suffix', () => {
        const p = new DocumentPropertyModel('created', 'v', 1, 'x.proof.created');
        assert.equal(p.isSystem, true);
    });

    it('flags proof.verificationMethod suffix', () => {
        const p = new DocumentPropertyModel('vm', 'v', 1, 'x.proof.verificationMethod');
        assert.equal(p.isSystem, true);
    });

    it('flags MintToken composite type with & separator for date field', () => {
        const p = new DocumentPropertyModel('date', 'v', 1, 'a.date', 'MintToken&extra');
        assert.equal(p.isSystem, true);
    });

    it('does NOT flag MintToken date when name is not "date"', () => {
        const p = new DocumentPropertyModel('amount', 'v', 1, 'a.amount', 'MintToken');
        assert.equal(p.isSystem, false);
    });

    it('does NOT flag a normal user field', () => {
        const p = new DocumentPropertyModel('co2', 10, 1, 'a.co2', 'StringType');
        assert.equal(p.isSystem, false);
    });

    it('does NOT flag a non-did string value', () => {
        const p = new DocumentPropertyModel('owner', 'just-a-name', 1, 'a.owner');
        assert.equal(p.isSystem, false);
    });

    it('ignore is true only when system AND idLvl=None', () => {
        const sys = new DocumentPropertyModel('id', 'v');
        assert.equal(sys.ignore(opts({ idLvl: NONE })), true);
        assert.equal(sys.ignore(opts({ idLvl: ALL })), false);
    });

    it('ignore false for non-system regardless of idLvl', () => {
        const p = new DocumentPropertyModel('co2', 10);
        assert.equal(p.ignore(opts({ idLvl: NONE })), false);
    });

    it('type is always Property for document properties', () => {
        const p = new DocumentPropertyModel('co2', 10);
        assert.equal(p.type, 'property');
    });
});

describe('ArrayPropertyModel / ObjectPropertyModel edge values', () => {
    it('ArrayPropertyModel preserves zero-length value', () => {
        const p = new ArrayPropertyModel('list', 0);
        assert.equal(p.value, 0);
        assert.equal(p._weight, '0');
    });

    it('ObjectPropertyModel custom path/lvl honoured', () => {
        const p = new ObjectPropertyModel('obj', 'v', 4, 'deep.obj');
        assert.equal(p.lvl, 4);
        assert.equal(p.path, 'deep.obj');
        assert.equal(p.key, 'deep.obj');
    });

    it('AnyPropertyModel hash mirrors PropertyModel hash', () => {
        const p = new AnyPropertyModel('x', 'v', 1, 'a.x');
        assert.equal(p.hash(opts()), 'a.x:v');
    });
});
