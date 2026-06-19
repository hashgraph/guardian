import assert from 'node:assert/strict';
import {
    PropertyModel,
    UUIDPropertyModel,
    AnyPropertyModel,
    ArrayPropertyModel,
    ObjectPropertyModel,
    DocumentPropertyModel,
} from '../../dist/analytics/compare/models/property.model.js';
import { PropertyType } from '../../dist/analytics/compare/types/property.type.js';
import { IIdLvl, IKeyLvl, IPropertiesLvl } from '../../dist/analytics/compare/interfaces/compare-options.interface.js';

describe('PropertyModel base behaviour', () => {
    it('defaults lvl to 1 and path to name', () => {
        const p = new AnyPropertyModel('foo', 'bar');
        assert.equal(p.lvl, 1);
        assert.equal(p.path, 'foo');
        assert.equal(p.key, 'foo');
    });
    it('uses provided lvl and path', () => {
        const p = new AnyPropertyModel('foo', 'bar', 3, 'a.b.foo');
        assert.equal(p.lvl, 3);
        assert.equal(p.path, 'a.b.foo');
    });
    it('equal compares type and weight', () => {
        const a = new AnyPropertyModel('x', 'v1');
        const b = new AnyPropertyModel('x', 'v1');
        const c = new AnyPropertyModel('x', 'v2');
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });
    it('toObject includes optional description/title/property only when set', () => {
        const p = new AnyPropertyModel('x', 'v');
        let obj = p.toObject();
        assert.equal(obj.description, undefined);
        p.setDescription('desc');
        p.setTitle('ttl');
        p.setProperty('prop');
        obj = p.toObject();
        assert.equal(obj.description, 'desc');
        assert.equal(obj.title, 'ttl');
        assert.equal(obj.property, 'prop');
    });
    it('getPropList returns sub-properties array', () => {
        const p = new ObjectPropertyModel('o', {}, 1);
        assert.ok(Array.isArray(p.getPropList()));
    });
    it('ignore returns false by default', () => {
        const p = new AnyPropertyModel('x', 'v');
        assert.equal(p.ignore({ idLvl: IIdLvl.None }), false);
    });
});

describe('PropertyModel.hash', () => {
    it('Simple level returns path:value for lvl 1', () => {
        const p = new AnyPropertyModel('x', 'v', 1, 'x');
        assert.equal(p.hash({ propLvl: IPropertiesLvl.Simple }), 'x:v');
    });
    it('Simple level returns null for nested lvl', () => {
        const p = new AnyPropertyModel('x', 'v', 2, 'a.x');
        assert.equal(p.hash({ propLvl: IPropertiesLvl.Simple }), null);
    });
    it('non-Simple level always returns path:value', () => {
        const p = new AnyPropertyModel('x', 'v', 5, 'a.b.x');
        assert.equal(p.hash({ propLvl: IPropertiesLvl.All }), 'a.b.x:v');
    });
});

describe('PropertyModel.update key levels', () => {
    const mk = () => {
        const p = new AnyPropertyModel('x', 'v', 1, 'the.path');
        p.setDescription('d');
        p.setTitle('t');
        p.setProperty('pr');
        return p;
    };
    it('Description level sets key to description', () => {
        const p = mk();
        p.update({ keyLvl: IKeyLvl.Description });
        assert.equal(p.key, 'd');
    });
    it('Title level sets key to title', () => {
        const p = mk();
        p.update({ keyLvl: IKeyLvl.Title });
        assert.equal(p.key, 't');
    });
    it('Property level sets key to property', () => {
        const p = mk();
        p.update({ keyLvl: IKeyLvl.Property });
        assert.equal(p.key, 'pr');
    });
    it('Default level sets key to path', () => {
        const p = mk();
        p.update({ keyLvl: IKeyLvl.Default });
        assert.equal(p.key, 'the.path');
    });
    it('falls back to path when chosen key is empty', () => {
        const p = new AnyPropertyModel('x', 'v', 1, 'fallback');
        p.update({ keyLvl: IKeyLvl.Description });
        assert.equal(p.key, 'fallback');
    });
});

describe('UUIDPropertyModel', () => {
    it('equal returns true when idLvl is None', () => {
        const a = new UUIDPropertyModel('id', 'aaa');
        const b = new UUIDPropertyModel('id', 'bbb');
        assert.equal(a.equal(b, { idLvl: IIdLvl.None }), true);
    });
    it('equal compares value when idLvl is All', () => {
        const a = new UUIDPropertyModel('id', 'aaa');
        const b = new UUIDPropertyModel('id', 'aaa');
        const c = new UUIDPropertyModel('id', 'ccc');
        assert.equal(a.equal(b, { idLvl: IIdLvl.All }), true);
        assert.equal(a.equal(c, { idLvl: IIdLvl.All }), false);
    });
    it('hash returns null when idLvl is None', () => {
        const a = new UUIDPropertyModel('id', 'aaa', 1, 'id');
        assert.equal(a.hash({ idLvl: IIdLvl.None }), null);
    });
    it('hash delegates to super when idLvl is All', () => {
        const a = new UUIDPropertyModel('id', 'aaa', 1, 'id');
        assert.equal(a.hash({ idLvl: IIdLvl.All, propLvl: IPropertiesLvl.All }), 'id:aaa');
    });
    it('type is uuid', () => {
        assert.equal(new UUIDPropertyModel('id', 'x').type, PropertyType.UUID);
    });
});

describe('ArrayPropertyModel / ObjectPropertyModel types', () => {
    it('array type', () => {
        assert.equal(new ArrayPropertyModel('a', []).type, PropertyType.Array);
    });
    it('object type', () => {
        assert.equal(new ObjectPropertyModel('o', {}).type, PropertyType.Object);
    });
});

describe('DocumentPropertyModel.checkSystemField', () => {
    const isSys = (name, value, path, type) =>
        new DocumentPropertyModel(name, value, 1, path, type).isSystem;

    it('flags reserved field names', () => {
        for (const n of ['@context', 'type', 'policyId', 'id', 'ref', 'tokenId', 'issuanceDate', 'issuer', 'guardianVersion']) {
            assert.equal(isSys(n, 'v', n, undefined), true, n);
        }
    });
    it('flags date when type is MintToken', () => {
        assert.equal(isSys('date', 'v', 'date', 'MintToken'), true);
    });
    it('flags date when type prefix is MintToken&...', () => {
        assert.equal(isSys('date', 'v', 'date', 'MintToken&1'), true);
    });
    it('does not flag date for non-mint type', () => {
        assert.equal(isSys('date', 'v', 'date', 'OtherType'), false);
    });
    it('flags proof-related paths', () => {
        assert.equal(isSys('x', 'v', 'proof'), true);
        assert.equal(isSys('x', 'v', 'proof.created'), true);
        assert.equal(isSys('x', 'v', 'proof.jws'), true);
        assert.equal(isSys('x', 'v', 'a.proof.type'), true);
        assert.equal(isSys('x', 'v', 'type.foo'), true);
        assert.equal(isSys('x', 'v', 'a.@context.b'), true);
    });
    it('flags did:hedera value', () => {
        assert.equal(isSys('field', 'did:hedera:testnet_0.0.1', 'field'), true);
    });
    it('does not flag a plain field', () => {
        assert.equal(isSys('amount', 100, 'amount', undefined), false);
    });
    it('ignore returns true only for system field with idLvl None', () => {
        const sys = new DocumentPropertyModel('id', 'v', 1, 'id');
        const plain = new DocumentPropertyModel('amount', 1, 1, 'amount');
        assert.equal(sys.ignore({ idLvl: IIdLvl.None }), true);
        assert.equal(sys.ignore({ idLvl: IIdLvl.All }), false);
        assert.equal(plain.ignore({ idLvl: IIdLvl.None }), false);
    });
});
