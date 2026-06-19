import assert from 'node:assert/strict';
import { PropertiesModel } from '../../dist/analytics/compare/models/properties.model.js';
import { BlockPropertiesModel } from '../../dist/analytics/compare/models/block-properties.model.js';
import { DocumentFieldsModel } from '../../dist/analytics/compare/models/document-fields.model.js';

const opts = (overrides = {}) => ({ propLvl: 'All', keyLvl: 'Default', idLvl: 'All', ...overrides });

describe('PropertiesModel.createProp classification', () => {
    it('empty object yields empty list', () => {
        assert.deepEqual(new PropertiesModel({}).getPropList(), []);
    });

    it('non-object input yields empty list', () => {
        assert.deepEqual(new PropertiesModel('not-an-object').getPropList(), []);
        assert.deepEqual(new PropertiesModel(null).getPropList(), []);
    });

    it('scalar -> AnyPropertyModel (property)', () => {
        const list = new PropertiesModel({ a: 1 }).getPropList();
        assert.equal(list[0].type, 'property');
        assert.equal(list[0].value, 1);
    });

    it('name containing "schema" -> SchemaPropertyModel', () => {
        const list = new PropertiesModel({ schemaId: 's1' }).getPropList();
        assert.equal(list[0].type, 'schema');
    });

    it('name containing "token" -> TokenPropertyModel', () => {
        const list = new PropertiesModel({ tokenId: 't1' }).getPropList();
        assert.equal(list[0].type, 'token');
    });

    it('array value -> ArrayPropertyModel with element children', () => {
        const list = new PropertiesModel({ arr: ['a', 'b'] }).getPropList();
        const arr = list.find((p) => p.name === 'arr');
        assert.equal(arr.type, 'array');
        assert.equal(arr.value, 2);
        assert.ok(list.find((p) => p.path === 'arr.0'));
        assert.ok(list.find((p) => p.path === 'arr.1'));
    });

    it('object value -> ObjectPropertyModel + nested children', () => {
        const list = new PropertiesModel({ obj: { x: 1 } }).getPropList();
        const obj = list.find((p) => p.name === 'obj');
        assert.equal(obj.type, 'object');
        assert.equal(obj.value, true);
        assert.ok(list.find((p) => p.path === 'obj.x'));
    });

    it('empty object value -> ObjectPropertyModel with value=false', () => {
        const list = new PropertiesModel({ obj: {} }).getPropList();
        assert.equal(list.find((p) => p.name === 'obj').value, false);
    });

    it('undefined value skipped', () => {
        const list = new PropertiesModel({ a: undefined, b: 1 }).getPropList();
        assert.deepEqual(list.map((p) => p.name), ['b']);
    });
});

describe('PropertiesModel.getPropList(type) filter', () => {
    it('filters to only the requested type', () => {
        const m = new PropertiesModel({ a: 1, schemaX: 's', b: 2 });
        const schemas = m.getPropList('schema');
        assert.equal(schemas.length, 1);
        assert.equal(schemas[0].name, 'schemaX');
    });

    it('returns a defensive copy when no type given', () => {
        const m = new PropertiesModel({ a: 1 });
        const a = m.getPropList();
        const b = m.getPropList();
        assert.notEqual(a, b);
        assert.deepEqual(a, b);
    });
});

describe('PropertiesModel hash / toObject', () => {
    it('hash joins property hashes with commas', () => {
        const m = new PropertiesModel({ a: 1, b: 2 });
        const h = m.hash(opts());
        assert.ok(h.includes(','));
    });

    it('toObject serializes each property', () => {
        const m = new PropertiesModel({ a: 1 });
        const o = m.toObject();
        assert.equal(o.length, 1);
        assert.equal(o[0].name, 'a');
    });
});

describe('PropertiesModel.updateSchemas / updateTokens', () => {
    it('updateSchemas calls setSchema on schema props', () => {
        const m = new PropertiesModel({ mySchema: 's-1' });
        const fakeSchema = { hash: () => 'H', id: 's-1', toObject: () => ({}) };
        m.updateSchemas({ 's-1': fakeSchema }, opts());
        const prop = m.getPropList('schema')[0];
        assert.equal(prop.schema, fakeSchema);
    });

    it('updateTokens calls setToken on token props', () => {
        const m = new PropertiesModel({ myToken: 't-1' });
        const fakeToken = {
            tokenName: 'C', tokenSymbol: 'C', tokenType: 'f', decimals: 0,
            initialSupply: 0, enableAdmin: false, enableFreeze: false,
            enableKYC: false, enableWipe: false, tokenId: 't-1', hash: () => 'H',
        };
        m.updateTokens({ 't-1': fakeToken }, opts());
        const prop = m.getPropList('token')[0];
        assert.equal(prop.token, fakeToken);
    });

    it('updateSchemas leaves non-schema props untouched', () => {
        const m = new PropertiesModel({ a: 1 });
        m.updateSchemas({}, opts());
        assert.equal(m.getPropList()[0].value, 1);
    });
});

describe('BlockPropertiesModel', () => {
    it('excludes block metadata keys from properties', () => {
        const m = new BlockPropertiesModel({
            id: 'b1', blockType: 'x', tag: 't', permissions: ['OWNER'],
            artifacts: [], events: [], children: [], custom: 'keep',
        });
        const names = m.getPropList().map((p) => p.name);
        assert.ok(names.includes('custom'));
        assert.equal(names.includes('blockType'), false);
        assert.equal(names.includes('tag'), false);
    });

    it('captures and sorts permissions', () => {
        const m = new BlockPropertiesModel({ permissions: ['b', 'a', 'c'] });
        assert.deepEqual(m.getPermissionsList(), ['a', 'b', 'c']);
    });

    it('defaults permissions to empty array when not an array', () => {
        const m = new BlockPropertiesModel({ permissions: 'OWNER' });
        assert.deepEqual(m.getPermissionsList(), []);
    });

    it('getPermissionsList returns a copy', () => {
        const m = new BlockPropertiesModel({ permissions: ['a'] });
        assert.notEqual(m.getPermissionsList(), m.getPermissionsList());
    });
});

describe('DocumentFieldsModel.checkContext', () => {
    it('adds string contexts from an array', () => {
        const set = DocumentFieldsModel.checkContext(['c1', 'c2'], new Set());
        assert.deepEqual([...set], ['c1', 'c2']);
    });

    it('ignores non-string array items', () => {
        const set = DocumentFieldsModel.checkContext(['c1', { x: 1 }], new Set());
        assert.deepEqual([...set], ['c1']);
    });

    it('adds a lone string context', () => {
        const set = DocumentFieldsModel.checkContext('c1', new Set());
        assert.deepEqual([...set], ['c1']);
    });

    it('returns the set unchanged for falsy context', () => {
        const set = DocumentFieldsModel.checkContext(null, new Set(['x']));
        assert.deepEqual([...set], ['x']);
    });
});

describe('DocumentFieldsModel.createTypesList', () => {
    it('collects credentialSubject.type from a single VC', () => {
        const types = DocumentFieldsModel.createTypesList({ credentialSubject: { type: 'T1' } });
        assert.deepEqual(types, ['T1']);
    });

    it('walks an array credentialSubject', () => {
        const types = DocumentFieldsModel.createTypesList({
            credentialSubject: [{ type: 'A' }, { type: 'B' }],
        });
        assert.deepEqual(types.sort(), ['A', 'B']);
    });

    it('walks verifiableCredential array', () => {
        const types = DocumentFieldsModel.createTypesList({
            verifiableCredential: [{ credentialSubject: { type: 'X' } }],
        });
        assert.deepEqual(types, ['X']);
    });

    it('returns [] for falsy document', () => {
        assert.deepEqual(DocumentFieldsModel.createTypesList(null), []);
    });
});

describe('DocumentFieldsModel.getRelativePath', () => {
    it('strips credentialSubject prefix for VC documents', () => {
        const model = new DocumentFieldsModel({ type: 'VerifiableCredential', credentialSubject: { co2: 1 } });
        const path = model.getRelativePath({ path: 'credentialSubject.co2' });
        assert.equal(path, 'co2');
    });

    it('returns null for "type" relative path', () => {
        const model = new DocumentFieldsModel({ type: 'VerifiableCredential', credentialSubject: { type: 'X' } });
        assert.equal(model.getRelativePath({ path: 'credentialSubject.type' }), null);
    });

    it('returns null for @context-containing path', () => {
        const model = new DocumentFieldsModel({ type: 'VerifiableCredential', credentialSubject: {} });
        assert.equal(model.getRelativePath({ path: 'credentialSubject.@context' }), null);
    });

    it('strips verifiableCredential.credentialSubject prefix for VP', () => {
        const model = new DocumentFieldsModel({ type: ['VerifiablePresentation'] });
        const path = model.getRelativePath({ path: 'verifiableCredential.0.credentialSubject.co2' });
        assert.equal(path, 'co2');
    });

    it('returns the raw path for unknown document types', () => {
        const model = new DocumentFieldsModel({ type: 'SomeType', amount: 1 });
        assert.equal(model.getRelativePath({ path: 'amount' }), 'amount');
    });
});

describe('DocumentFieldsModel.merge + update', () => {
    it('merge concatenates another model\'s fields', () => {
        const a = new DocumentFieldsModel({ type: 'X', a: 1 });
        const b = new DocumentFieldsModel({ type: 'X', b: 2 });
        const before = a.getFieldsList().length;
        a.merge(b);
        assert.equal(a.getFieldsList().length, before + b.getFieldsList().length);
    });

    it('update computes weights without throwing and hash becomes non-empty', () => {
        const a = new DocumentFieldsModel({ type: 'X', amount: 5 });
        a.update(opts());
        assert.ok(a.hash(opts()).length > 0);
    });
});
