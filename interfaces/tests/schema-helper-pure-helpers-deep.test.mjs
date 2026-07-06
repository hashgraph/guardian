import assert from 'node:assert/strict';

import { SchemaHelper } from '../dist/helpers/schema-helper.js';
import { Schema } from '../dist/models/schema.js';

describe('SchemaHelper.buildType', () => {
    it('returns uuid alone when version is falsy', () => {
        assert.equal(SchemaHelper.buildType('uuid-1', null), 'uuid-1');
        assert.equal(SchemaHelper.buildType('uuid-1', undefined), 'uuid-1');
        assert.equal(SchemaHelper.buildType('uuid-1', ''), 'uuid-1');
        assert.equal(SchemaHelper.buildType('uuid-1', 0), 'uuid-1');
    });

    it('joins uuid and version with an ampersand', () => {
        assert.equal(SchemaHelper.buildType('uuid-1', '1.0.0'), 'uuid-1&1.0.0');
        assert.equal(SchemaHelper.buildType('abc', '2.3.4'), 'abc&2.3.4');
    });
});

describe('SchemaHelper.buildRef', () => {
    it('prefixes the type with a hash', () => {
        assert.equal(SchemaHelper.buildRef('uuid-1&1.0.0'), '#uuid-1&1.0.0');
        assert.equal(SchemaHelper.buildRef('x'), '#x');
        assert.equal(SchemaHelper.buildRef(''), '#');
    });
});

describe('SchemaHelper.buildUrl', () => {
    it('concatenates context url and ref', () => {
        assert.equal(SchemaHelper.buildUrl('http://c/', '#x'), 'http://c/#x');
    });

    it('treats falsy context url as empty', () => {
        assert.equal(SchemaHelper.buildUrl(null, '#x'), '#x');
        assert.equal(SchemaHelper.buildUrl(undefined, '#x'), '#x');
    });

    it('treats falsy ref as empty', () => {
        assert.equal(SchemaHelper.buildUrl('http://c', null), 'http://c');
        assert.equal(SchemaHelper.buildUrl('http://c', undefined), 'http://c');
    });

    it('returns empty when both are falsy', () => {
        assert.equal(SchemaHelper.buildUrl(null, null), '');
        assert.equal(SchemaHelper.buildUrl('', ''), '');
    });
});

describe('SchemaHelper.getSchemaName', () => {
    it('returns just the name when no version or status', () => {
        assert.equal(SchemaHelper.getSchemaName('My Schema'), 'My Schema');
    });

    it('returns empty string for falsy name', () => {
        assert.equal(SchemaHelper.getSchemaName(null), '');
        assert.equal(SchemaHelper.getSchemaName(undefined), '');
        assert.equal(SchemaHelper.getSchemaName(''), '');
    });

    it('appends version in parentheses', () => {
        assert.equal(SchemaHelper.getSchemaName('S', '1.0.0'), 'S (1.0.0)');
    });

    it('appends status in parentheses', () => {
        assert.equal(SchemaHelper.getSchemaName('S', null, 'DRAFT'), 'S (DRAFT)');
    });

    it('appends both version and status in order', () => {
        assert.equal(SchemaHelper.getSchemaName('S', '1.0.0', 'PUBLISHED'), 'S (1.0.0) (PUBLISHED)');
    });
});

describe('SchemaHelper.buildSchemaComment', () => {
    it('omits previousVersion when version is falsy', () => {
        const out = SchemaHelper.buildSchemaComment('t', 'u', null);
        assert.deepEqual(JSON.parse(out), { '@id': 'u', term: 't' });
    });

    it('includes previousVersion when provided', () => {
        const out = SchemaHelper.buildSchemaComment('t', 'u', '1.0.0');
        assert.deepEqual(JSON.parse(out), { '@id': 'u', term: 't', previousVersion: '1.0.0' });
    });
});

describe('SchemaHelper.parseSchemaComment', () => {
    it('parses a valid JSON comment', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment('{"a":1}'), { a: 1 });
    });

    it('returns {} for invalid JSON', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment('{bad'), {});
    });

    it('returns {} for null/undefined', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment(null), {});
        assert.deepEqual(SchemaHelper.parseSchemaComment(undefined), {});
    });

    it('round-trips a built comment', () => {
        const built = SchemaHelper.buildSchemaComment('term-1', 'http://u', '0.9.0');
        const parsed = SchemaHelper.parseSchemaComment(built);
        assert.equal(parsed.term, 'term-1');
        assert.equal(parsed['@id'], 'http://u');
        assert.equal(parsed.previousVersion, '0.9.0');
    });
});

describe('SchemaHelper.parseFieldComment', () => {
    it('parses a valid JSON field comment', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('{"unit":"kg"}'), { unit: 'kg' });
    });

    it('returns {} for invalid JSON', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('not json'), {});
    });

    it('returns {} for falsy input', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment(null), {});
        assert.deepEqual(SchemaHelper.parseFieldComment(''), {});
    });

    it('returns {} when JSON parses to null literal', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('null'), {});
    });
});

describe('SchemaHelper.checkSchemaKey', () => {
    it('returns true when there are no properties', () => {
        assert.equal(SchemaHelper.checkSchemaKey({}), true);
        assert.equal(SchemaHelper.checkSchemaKey({ document: {} }), true);
        assert.equal(SchemaHelper.checkSchemaKey(null), true);
    });

    it('returns true for clean property keys', () => {
        const schema = { document: { properties: { field1: {}, field_2: {} } } };
        assert.equal(SchemaHelper.checkSchemaKey(schema), true);
    });

    it('throws when a property key contains a space', () => {
        const schema = { document: { properties: { 'bad key': {} } } };
        assert.throws(() => SchemaHelper.checkSchemaKey(schema), /must not contain spaces/);
    });

    it('throws when a property key contains a tab', () => {
        const schema = { document: { properties: { 'bad\tkey': {} } } };
        assert.throws(() => SchemaHelper.checkSchemaKey(schema), /must not contain spaces/);
    });
});

describe('SchemaHelper.parseRef', () => {
    it('parses a full iri string with version', () => {
        const r = SchemaHelper.parseRef('#uuidA&1.2.3');
        assert.equal(r.iri, '#uuidA&1.2.3');
        assert.equal(r.type, 'uuidA&1.2.3');
        assert.equal(r.uuid, 'uuidA');
        assert.equal(r.version, '1.2.3');
    });

    it('parses an iri string without a version', () => {
        const r = SchemaHelper.parseRef('#uuidA');
        assert.equal(r.uuid, 'uuidA');
        assert.equal(r.version, null);
    });

    it('returns nulls for null input', () => {
        assert.deepEqual(SchemaHelper.parseRef(null), { iri: null, type: null, uuid: null, version: null });
    });

    it('returns nulls for an empty string', () => {
        assert.deepEqual(SchemaHelper.parseRef(''), { iri: null, type: null, uuid: null, version: null });
    });

    it('parses an object with an object document', () => {
        const r = SchemaHelper.parseRef({ document: { $id: '#u2&2.0.0' } });
        assert.equal(r.uuid, 'u2');
        assert.equal(r.version, '2.0.0');
    });

    it('parses an object with a string document', () => {
        const r = SchemaHelper.parseRef({ document: JSON.stringify({ $id: '#u3&3.0.0' }) });
        assert.equal(r.uuid, 'u3');
        assert.equal(r.version, '3.0.0');
    });

    it('returns nulls when the object document has no $id', () => {
        const r = SchemaHelper.parseRef({ document: {} });
        assert.deepEqual(r, { iri: null, type: null, uuid: null, version: null });
    });

    it('returns nulls when document string is unparsable', () => {
        const r = SchemaHelper.parseRef({ document: '{not json' });
        assert.deepEqual(r, { iri: null, type: null, uuid: null, version: null });
    });
});

describe('SchemaHelper.getContext', () => {
    it('builds a context object from an item iri', () => {
        const ctx = SchemaHelper.getContext({ iri: '#abc&1.0.0', contextURL: 'http://x' });
        assert.equal(ctx.type, 'abc&1.0.0');
        assert.deepEqual(ctx['@context'], ['http://x']);
    });

    it('returns null when item is null', () => {
        assert.equal(SchemaHelper.getContext(null), null);
    });

    it('returns a context even when contextURL is undefined', () => {
        const ctx = SchemaHelper.getContext({ iri: '#abc&1.0.0' });
        assert.deepEqual(ctx['@context'], [undefined]);
    });
});

describe('SchemaHelper.incrementVersion', () => {
    it('returns 1.0.0 when there is no previous version and no versions', () => {
        assert.equal(SchemaHelper.incrementVersion(null, []), '1.0.0');
    });

    it('bumps the patch of the previous version when alone', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0.0', []), '1.0.1');
        assert.equal(SchemaHelper.incrementVersion('2.3.4', []), '2.3.5');
    });

    it('takes the max patch within the same major.minor group', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0.0', ['1.0.2', '1.0.9']), '1.0.10');
    });

    it('ignores falsy entries in the versions list', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0.0', [null, '', '1.0.5']), '1.0.6');
    });

    it('isolates groups by major.minor prefix', () => {
        assert.equal(SchemaHelper.incrementVersion('2.0.0', ['1.0.99']), '2.0.1');
    });
});

describe('SchemaHelper.validate', () => {
    it('returns true for a complete schema with object document', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: { $id: '#x' } }), true);
    });

    it('returns true for a complete schema with string document', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: JSON.stringify({ $id: '#x' }) }), true);
    });

    it('returns false when name is missing', () => {
        assert.equal(SchemaHelper.validate({ uuid: 'u', document: { $id: '#x' } }), false);
    });

    it('returns false when uuid is missing', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', document: { $id: '#x' } }), false);
    });

    it('returns false when document is missing', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u' }), false);
    });

    it('returns false when document has no $id', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: {} }), false);
    });

    it('returns false when document string is unparsable', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: '{bad' }), false);
    });
});

describe('SchemaHelper.map', () => {
    it('returns [] for falsy input', () => {
        assert.deepEqual(SchemaHelper.map(null), []);
        assert.deepEqual(SchemaHelper.map(undefined), []);
    });

    it('returns [] for an empty array', () => {
        assert.deepEqual(SchemaHelper.map([]), []);
    });

    it('wraps each element into a Schema instance', () => {
        const result = SchemaHelper.map([{ name: 'a' }, { name: 'b' }]);
        assert.equal(result.length, 2);
        assert.ok(result[0] instanceof Schema);
        assert.ok(result[1] instanceof Schema);
    });
});

describe('SchemaHelper.uniqueRefs', () => {
    it('copies entries and strips $defs at the top level', () => {
        const map = { '#A': { title: 'A', $defs: { '#B': { title: 'B' } } } };
        const out = SchemaHelper.uniqueRefs(map, {});
        assert.equal(out['#A'].title, 'A');
        assert.equal(out['#A'].$defs, undefined);
    });

    it('recursively flattens nested $defs into the result', () => {
        const map = { '#A': { title: 'A', $defs: { '#B': { title: 'B' } } } };
        const out = SchemaHelper.uniqueRefs(map, {});
        assert.equal(out['#B'].title, 'B');
    });

    it('does not overwrite existing keys in newMap', () => {
        const newMap = { '#A': { title: 'existing' } };
        const out = SchemaHelper.uniqueRefs({ '#A': { title: 'new' } }, newMap);
        assert.equal(out['#A'].title, 'existing');
    });

    it('handles entries without $defs', () => {
        const out = SchemaHelper.uniqueRefs({ '#A': { title: 'A' } }, {});
        assert.deepEqual(out, { '#A': { title: 'A' } });
    });
});

describe('SchemaHelper.findRefs', () => {
    it('returns built-in GeoJSON when a field references it', () => {
        const target = { fields: [{ isRef: true, type: '#GeoJSON' }] };
        const out = SchemaHelper.findRefs(target, []);
        assert.ok(out['#GeoJSON']);
    });

    it('returns built-in SentinelHUB when referenced', () => {
        const target = { fields: [{ isRef: true, type: '#SentinelHUB' }] };
        const out = SchemaHelper.findRefs(target, []);
        assert.ok(out['#SentinelHUB']);
    });

    it('resolves a ref to a schema in the provided list', () => {
        const target = { fields: [{ isRef: true, type: '#mySchema' }] };
        const out = SchemaHelper.findRefs(target, [{ iri: '#mySchema', document: { title: 'mine' } }]);
        assert.equal(out['#mySchema'].title, 'mine');
    });

    it('ignores non-ref fields', () => {
        const target = { fields: [{ isRef: false, type: 'string' }] };
        const out = SchemaHelper.findRefs(target, []);
        assert.deepEqual(out, {});
    });

    it('ignores ref fields whose type is unknown', () => {
        const target = { fields: [{ isRef: true, type: '#unknown' }] };
        const out = SchemaHelper.findRefs(target, []);
        assert.deepEqual(out, {});
    });
});

describe('SchemaHelper.getVersion', () => {
    const doc = { $id: '#uuidA&1.0.0', $comment: '{ "previousVersion": "0.9.0" }' };

    it('extracts version and previousVersion from an object document', () => {
        const v = SchemaHelper.getVersion({ document: doc });
        assert.equal(v.version, '1.0.0');
        assert.equal(v.previousVersion, '0.9.0');
    });

    it('extracts from a string document', () => {
        const v = SchemaHelper.getVersion({ document: JSON.stringify(doc) });
        assert.equal(v.version, '1.0.0');
        assert.equal(v.previousVersion, '0.9.0');
    });

    it('returns nulls for an unparsable document', () => {
        assert.deepEqual(SchemaHelper.getVersion({ document: '{bad' }), { version: null, previousVersion: null });
    });

    it('returns null previousVersion when comment lacks it', () => {
        const v = SchemaHelper.getVersion({ document: { $id: '#u&2.0.0' } });
        assert.equal(v.version, '2.0.0');
        assert.equal(v.previousVersion, undefined);
    });
});
