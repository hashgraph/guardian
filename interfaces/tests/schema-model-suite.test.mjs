import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';
import { SchemaStatus } from '../dist/type/schema-status.type.js';

describe('Schema model — defaults', () => {
    it('a no-arg schema gets sensible defaults', () => {
        const s = new Schema();
        assert.equal(s.entity, SchemaEntity.NONE);
        assert.equal(s.status, SchemaStatus.DRAFT);
        assert.equal(s.document, null);
        assert.equal(s.version, '');
        assert.equal(s.readonly, false);
        assert.equal(s.system, false);
    });

    it('generates a uuid and a schema: context URL', () => {
        const s = new Schema();
        assert.match(s.uuid, /^[0-9a-f-]{36}$/i);
        assert.equal(s.contextURL, `schema:${s.uuid}`);
    });
});

describe('Schema model — mapping from ISchema', () => {
    const raw = (over = {}) => ({
        id: 'sid', uuid: 'u-1', name: 'My Schema', description: 'desc',
        entity: SchemaEntity.VC, version: '1.2.3', creator: 'did:c', owner: 'did:o',
        topicId: '0.0.1', messageId: 'm-1', iri: '#sid', ...over
    });

    it('copies the descriptive fields', () => {
        const s = new Schema(raw());
        assert.equal(s.name, 'My Schema');
        assert.equal(s.description, 'desc');
        assert.equal(s.entity, SchemaEntity.VC);
        assert.equal(s.version, '1.2.3');
        assert.equal(s.creator, 'did:c');
        assert.equal(s.owner, 'did:o');
        assert.equal(s.topicId, '0.0.1');
        assert.equal(s.iri, '#sid');
    });

    it('sets userDID to owner when isOwner is flagged', () => {
        const s = new Schema(raw({ isOwner: true }));
        assert.equal(s.isOwner, true);
        assert.equal(s.isCreator, false);
    });

    it('sets userDID to creator when isCreator is flagged', () => {
        const s = new Schema(raw({ isCreator: true }));
        assert.equal(s.isCreator, true);
    });

    it('isOwner is falsy with no user set', () => {
        const s = new Schema(raw());
        assert.ok(!s.isOwner);
    });
});

describe('Schema model — setUser / setVersion', () => {
    it('setUser drives the isOwner getter', () => {
        const s = new Schema({ owner: 'did:o' });
        assert.ok(!s.isOwner);
        s.setUser('did:o');
        assert.equal(s.isOwner, true);
    });

    it('setVersion throws on an invalid format', () => {
        const s = new Schema();
        assert.throws(() => s.setVersion('not-a-version'), /Invalid version format/);
    });

    it('setVersion bumps the version and records the previous one', () => {
        const s = new Schema({ version: '1.0.0' });
        s.setVersion('1.1.0');
        assert.equal(s.version, '1.1.0');
        assert.equal(s.previousVersion, '1.0.0');
    });

    it('setVersion rejects a non-greater version', () => {
        const s = new Schema({ version: '2.0.0' });
        assert.throws(() => s.setVersion('1.0.0'), /Version must be greater/);
    });
});

describe('Schema model — fields access', () => {
    const withFields = () => {
        const s = new Schema();
        s.setFields([
            { name: 'a', path: 'a', fields: [{ name: 'b', path: 'a.b' }] },
            { name: 'c', path: 'c' }
        ], [], true);
        return s;
    };

    it('setFields(force) replaces fields and conditions', () => {
        const s = withFields();
        assert.equal(s.fields.length, 2);
        assert.deepEqual(s.conditions, []);
    });

    it('getFields flattens nested fields depth-first', () => {
        const names = withFields().getFields().map((f) => f.name);
        assert.deepEqual(names, ['a', 'b', 'c']);
    });

    it('getField resolves a nested path', () => {
        assert.equal(withFields().getField('a.b').name, 'b');
    });

    it('getField returns null for an unknown path', () => {
        assert.equal(withFields().getField('zzz'), null);
    });

    it('searchFields returns fields matching the predicate', () => {
        const result = withFields().searchFields((f) => f.name === 'b');
        assert.equal(result.length, 1);
        assert.equal(result[0].name, 'b');
    });
});

describe('Schema model — clone / from', () => {
    it('clone copies identity and fields', () => {
        const s = new Schema({ name: 'Original', version: '1.0.0', owner: 'did:o' });
        s.setFields([{ name: 'a', path: 'a' }], [], true);
        const c = s.clone();
        assert.equal(c.name, 'Original');
        assert.equal(c.uuid, s.uuid);
        assert.equal(c.fields, s.fields);
    });

    it('static from builds a Schema instance', () => {
        const s = Schema.from({ name: 'X', uuid: 'u' });
        assert.ok(s instanceof Schema);
        assert.equal(s.name, 'X');
    });
});
