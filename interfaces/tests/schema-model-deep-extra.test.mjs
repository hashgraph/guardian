import assert from 'node:assert/strict';

import { Schema } from '../dist/models/schema.js';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

function buildSchema() {
    const fields = [
        { name: 'a', title: 'A', description: 'A', type: 'string', required: true, isArray: false, isRef: false, readOnly: false, order: 0 },
        {
            name: 'b', title: 'B', description: 'B', type: 'number', required: false,
            isArray: true, isRef: false, readOnly: false, order: 1,
        },
    ];
    const schema = new Schema();
    schema.uuid = 'uuidModel';
    schema.version = '1.0.0';
    schema.contextURL = 'schema:uuidModel';
    schema.iri = '#uuidModel&1.0.0';
    schema.name = 'My Schema';
    schema.description = 'A schema';
    schema.entity = 'VC';
    schema.update(fields, []);
    return schema;
}

describe('Schema.clone fidelity', () => {
    it('copies every scalar identity field', () => {
        const s = buildSchema();
        s.owner = 'o';
        s.creator = 'c';
        s.topicId = '0.0.1';
        s.messageId = 'm';
        const c = s.clone();
        for (const key of ['uuid', 'name', 'description', 'entity', 'status', 'version', 'creator', 'owner', 'topicId', 'messageId', 'iri', 'contextURL']) {
            assert.equal(c[key], s[key], `mismatch on ${key}`);
        }
    });

    it('shares the fields and conditions references', () => {
        const s = buildSchema();
        const c = s.clone();
        assert.equal(c.fields, s.fields);
        assert.equal(c.conditions, s.conditions);
    });

    it('produces an independent Schema instance', () => {
        const s = buildSchema();
        const c = s.clone();
        assert.notEqual(c, s);
        assert.ok(c instanceof Schema);
    });
});

describe('Schema.getFields and getField', () => {
    it('flattens top-level fields', () => {
        const s = buildSchema();
        const names = s.getFields().map((f) => f.name);
        assert.ok(names.includes('a'));
        assert.ok(names.includes('b'));
    });

    it('resolves a top-level field by path', () => {
        const s = buildSchema();
        s.searchFields(() => true);
        assert.equal(s.getField('a').name, 'a');
    });

    it('returns null for an unknown path', () => {
        const s = buildSchema();
        s.searchFields(() => true);
        assert.equal(s.getField('nope'), null);
    });
});

describe('Schema.searchFields', () => {
    it('returns fields matching the predicate and assigns paths', () => {
        const s = buildSchema();
        const arrays = s.searchFields((f) => f.isArray);
        assert.equal(arrays.length, 1);
        assert.equal(arrays[0].name, 'b');
        assert.equal(arrays[0].path, 'b');
    });

    it('returns [] when nothing matches', () => {
        const s = buildSchema();
        assert.deepEqual(s.searchFields(() => false), []);
    });

    it('returns all when the predicate is always true', () => {
        const s = buildSchema();
        const all = s.searchFields(() => true);
        assert.equal(all.length, 2);
    });
});

describe('Schema.getDeepFields', () => {
    it('returns one node per top-level field', () => {
        const s = buildSchema();
        const nodes = s.getDeepFields();
        assert.equal(nodes.length, 2);
    });

    it('reports arrayLvl 0 for a scalar and 1 for an array', () => {
        const s = buildSchema();
        const nodes = s.getDeepFields();
        const a = nodes.find((n) => n.field.name === 'a');
        const b = nodes.find((n) => n.field.name === 'b');
        assert.equal(a.arrayLvl, 0);
        assert.equal(b.arrayLvl, 1);
    });

    it('suffixes fullType with [] per array level', () => {
        const s = buildSchema();
        const b = s.getDeepFields().find((n) => n.field.name === 'b');
        assert.ok(b.type.endsWith('[]'));
    });

    it('attaches the underlying field to each node', () => {
        const s = buildSchema();
        const nodes = s.getDeepFields();
        assert.equal(nodes[0].field, s.fields[0]);
    });

    it('returns [] when there are no fields', () => {
        const empty = new Schema();
        assert.deepEqual(empty.getDeepFields(), []);
    });
});

describe('Schema.setExample', () => {
    it('writes examples into matching document properties', () => {
        const s = buildSchema();
        s.setExample({ a: 'hello' });
        assert.deepEqual(s.document.properties.a.examples, ['hello']);
    });

    it('leaves properties without data untouched', () => {
        const s = buildSchema();
        s.setExample({ a: 'hello' });
        assert.equal(s.document.properties.b.examples, undefined);
    });

    it('is a no-op for falsy data', () => {
        const s = buildSchema();
        const before = JSON.stringify(s.document);
        s.setExample(null);
        assert.equal(JSON.stringify(s.document), before);
    });
});

describe('Schema.updateRefs', () => {
    it('writes $defs from referenced schemas', () => {
        const s = buildSchema();
        s.fields[0].isRef = true;
        s.fields[0].type = '#Sub';
        s.updateRefs([{ iri: '#Sub', document: { title: 'sub' } }]);
        assert.ok(s.document.$defs['#Sub']);
        assert.equal(s.document.$defs['#Sub'].title, 'sub');
    });

    it('produces an empty $defs when there are no refs', () => {
        const s = buildSchema();
        s.updateRefs([]);
        assert.deepEqual(s.document.$defs, {});
    });
});

describe('Schema.update and updateDocument', () => {
    it('update returns null when there are no fields', () => {
        const s = new Schema();
        assert.equal(s.update(undefined, undefined), null);
    });

    it('updateDocument rebuilds a JSON-schema document', () => {
        const s = buildSchema();
        s.updateDocument();
        assert.equal(s.document.$id, '#uuidModel&1.0.0');
        assert.ok(s.document.properties.a);
    });

    it('a rebuilt document re-parses to the same field names', () => {
        const s = buildSchema();
        s.updateDocument();
        const reparsed = new Schema({ uuid: s.uuid, version: s.version, contextURL: s.contextURL, iri: s.iri, document: s.document });
        const names = reparsed.fields.map((f) => f.name);
        assert.ok(names.includes('a'));
        assert.ok(names.includes('b'));
    });
});

describe('Schema.setDocument', () => {
    it('re-derives name and description from the document', () => {
        const s = buildSchema();
        s.updateDocument();
        const doc = { ...s.document, title: 'New Title', description: 'New Desc' };
        const s2 = new Schema({ uuid: s.uuid, version: s.version, contextURL: s.contextURL, iri: s.iri });
        s2.setDocument(doc);
        assert.equal(s2.name, 'New Title');
        assert.equal(s2.description, 'New Desc');
    });
});

describe('Schema.setFields force semantics', () => {
    it('without force, only accepts arrays', () => {
        const s = buildSchema();
        const originalFields = s.fields;
        s.setFields(undefined, undefined, false);
        assert.equal(s.fields, originalFields);
    });

    it('with force, coerces missing values to empty arrays', () => {
        const s = buildSchema();
        s.setFields(undefined, undefined, true);
        assert.deepEqual(s.fields, []);
        assert.deepEqual(s.conditions, []);
    });

    it('without force, replaces arrays when provided', () => {
        const s = buildSchema();
        const newFields = [{ name: 'z', type: 'string' }];
        s.setFields(newFields, [], false);
        assert.equal(s.fields, newFields);
    });
});

describe('Schema.isOwner / isCreator getters', () => {
    it('isOwner reflects owner === userDID', () => {
        const s = buildSchema();
        s.owner = 'alice';
        assert.ok(!s.isOwner);
        s.setUser('alice');
        assert.equal(s.isOwner, true);
    });

    it('isCreator reflects creator === userDID', () => {
        const s = buildSchema();
        s.creator = 'bob';
        s.setUser('bob');
        assert.equal(s.isCreator, true);
    });

    it('isOwner is falsy without a user', () => {
        const s = buildSchema();
        s.owner = 'alice';
        assert.ok(!s.isOwner);
    });
});

describe('Schema.setVersion', () => {
    it('accepts a greater version and records the previous one', () => {
        const s = buildSchema();
        s.setVersion('2.0.0');
        assert.equal(s.version, '2.0.0');
        assert.equal(s.previousVersion, '1.0.0');
    });

    it('throws on an invalid version format', () => {
        const s = buildSchema();
        assert.throws(() => s.setVersion('xx'), /Invalid version format/);
    });

    it('throws when the new version is not greater', () => {
        const s = buildSchema();
        assert.throws(() => s.setVersion('0.5.0'), /Version must be greater than/);
    });
});

describe('Schema.from / fromDocument', () => {
    it('from wraps a response into a Schema', () => {
        const s = Schema.from({ name: 'x', uuid: 'u' });
        assert.ok(s instanceof Schema);
        assert.equal(s.name, 'x');
    });

    it('SchemaHelper.map and Schema.from agree on instance type', () => {
        const list = SchemaHelper.map([{ name: 'a' }]);
        assert.ok(list[0] instanceof Schema);
    });
});
