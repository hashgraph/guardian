import assert from 'node:assert/strict';
import { SchemaModel } from '../../dist/analytics/compare/models/schema.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const stringField = (overrides = {}) => ({
    type: 'string',
    title: 'A',
    description: 'A',
    ...overrides,
});

const rawSchema = (overrides = {}) => ({
    id: 'sid',
    name: 'My Schema',
    uuid: 'sid-uuid',
    description: 'desc',
    topicId: '0.0.1',
    version: '1.0.0',
    iri: '#sid',
    document: { properties: { amount: stringField() } },
    ...overrides,
});

describe('SchemaModel construction', () => {
    it('captures the basic identifiers', () => {
        const m = new SchemaModel(rawSchema(), opts);
        assert.equal(m.id, 'sid');
        assert.equal(m.name, 'My Schema');
        assert.equal(m.uuid, 'sid-uuid');
        assert.equal(m.description, 'desc');
        assert.equal(m.topicId, '0.0.1');
        assert.equal(m.version, '1.0.0');
        assert.equal(m.iri, '#sid');
        assert.equal(m.empty, false);
    });

    it('falls back to sourceVersion when version is missing', () => {
        const m = new SchemaModel(rawSchema({ version: undefined, sourceVersion: '0.5.0' }), opts);
        assert.equal(m.version, '0.5.0');
    });

    it('marks empty schema (no raw input) and uses default empty fields', () => {
        const m = new SchemaModel(null, opts);
        assert.equal(m.empty, true);
        assert.equal(m.id, '');
        assert.deepEqual(m.fields, []);
    });

    it('parses a JSON-string document', () => {
        const json = JSON.stringify({ properties: { x: stringField() } });
        const m = new SchemaModel(rawSchema({ document: json }), opts);
        assert.ok(m.fields.length > 0);
    });
});

describe('SchemaModel.info / toObject / fields getter', () => {
    it('info() exposes identifiers + policy/tool placeholders', () => {
        const m = new SchemaModel(rawSchema(), opts);
        const info = m.info();
        assert.equal(info.id, 'sid');
        assert.equal(info.policy, undefined);
        assert.equal(info.tool, undefined);
    });

    it('toObject returns a stable shape', () => {
        const m = new SchemaModel(rawSchema(), opts);
        assert.deepEqual(m.toObject(), {
            id: 'sid',
            name: 'My Schema',
            uuid: 'sid-uuid',
            description: 'desc',
            topicId: '0.0.1',
            version: '1.0.0',
            iri: '#sid',
        });
    });

    it('fields getter returns [] when no document is parsed', () => {
        const m = new SchemaModel(null, opts);
        assert.deepEqual(m.fields, []);
    });
});

describe('SchemaModel.setPolicy / setTool', () => {
    it('attaches policy + tool names to info()', () => {
        const m = new SchemaModel(rawSchema(), opts);
        m.setPolicy({ name: 'P1' });
        m.setTool({ name: 'T1' });
        const info = m.info();
        assert.equal(info.policy, 'P1');
        assert.equal(info.tool, 'T1');
    });

    it('returns the model for chaining', () => {
        const m = new SchemaModel(rawSchema(), opts);
        assert.equal(m.setPolicy({ name: 'p' }), m);
        assert.equal(m.setTool({ name: 't' }), m);
    });
});

describe('SchemaModel.update + hash', () => {
    it('hash() is empty before update()', () => {
        const m = new SchemaModel(rawSchema(), opts);
        assert.equal(m.hash(opts), '');
    });

    it('two identical schemas produce the same hash', () => {
        const m1 = new SchemaModel(rawSchema(), opts);
        const m2 = new SchemaModel(rawSchema(), opts);
        m1.update(opts);
        m2.update(opts);
        assert.equal(m1.hash(opts), m2.hash(opts));
    });

    it('schemas differing in version produce different hashes when idLvl=All', () => {
        const a = new SchemaModel(rawSchema({ version: '1.0.0' }), opts);
        const b = new SchemaModel(rawSchema({ version: '2.0.0' }), opts);
        a.update(opts);
        b.update(opts);
        assert.notEqual(a.hash(opts), b.hash(opts));
    });

    it('schemas differing in version produce the same hash when idLvl=None', () => {
        const optsNoneId = { ...opts, idLvl: 'None' };
        const a = new SchemaModel(rawSchema({ version: '1.0.0' }), optsNoneId);
        const b = new SchemaModel(rawSchema({ version: '2.0.0' }), optsNoneId);
        a.update(optsNoneId);
        b.update(optsNoneId);
        assert.equal(a.hash(optsNoneId), b.hash(optsNoneId));
    });
});

describe('SchemaModel.compare (cached)', () => {
    it('returns -1 when full hashes match', () => {
        const a = new SchemaModel(rawSchema(), opts);
        const b = new SchemaModel(rawSchema(), opts);
        a.update(opts);
        b.update(opts);
        assert.equal(a.compare(b), -1);
    });
});

describe('SchemaModel.empty + .from', () => {
    it('.empty(iri, options) creates an empty schema with the given iri', () => {
        const m = SchemaModel.empty('#new', opts);
        assert.equal(m.empty, true);
        assert.equal(m.iri, '#new');
    });

    it('.from(jsonSchema, options) maps $id to id+iri and title to name', () => {
        const m = SchemaModel.from({
            $id: '#sid',
            title: 'Title',
            description: 'desc',
            properties: { a: stringField() },
        }, opts);
        assert.equal(m.id, '#sid');
        assert.equal(m.iri, '#sid');
        assert.equal(m.name, 'Title');
        assert.equal(m.description, 'desc');
    });
});

describe('SchemaModel.fromEntity', () => {
    it('throws "Unknown schema" when raw is missing', () => {
        assert.throws(() => SchemaModel.fromEntity(null, { name: 'p' }, opts), /Unknown schema/);
    });

    it('attaches the policy and computes a non-empty hash', () => {
        const m = SchemaModel.fromEntity(rawSchema(), { name: 'P1' }, opts);
        assert.equal(m.info().policy, 'P1');
        assert.ok(m.hash(opts).length > 0);
    });
});
