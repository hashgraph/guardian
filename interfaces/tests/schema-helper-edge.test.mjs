import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('@unit SchemaHelper.parseRef — boundary/error', () => {
    it('returns all-null for an empty string ref', () => {
        assert.deepEqual(SchemaHelper.parseRef(''), { iri: null, type: null, uuid: null, version: null });
    });

    it('returns all-null for a null ref', () => {
        assert.deepEqual(SchemaHelper.parseRef(null), { iri: null, type: null, uuid: null, version: null });
    });

    it('parses a ref that has no leading hash', () => {
        const r = SchemaHelper.parseRef('uuid-1&1.0.0');
        assert.equal(r.iri, 'uuid-1&1.0.0');
        assert.equal(r.type, 'uuid-1&1.0.0');
        assert.equal(r.uuid, 'uuid-1');
        assert.equal(r.version, '1.0.0');
    });

    it('uses the trailing segment when multiple hashes are present', () => {
        const r = SchemaHelper.parseRef('a#b#uuid&2.0.0');
        assert.equal(r.type, 'uuid&2.0.0');
        assert.equal(r.uuid, 'uuid');
        assert.equal(r.version, '2.0.0');
    });

    it('treats a bare "#" as an empty type with null uuid/version', () => {
        const r = SchemaHelper.parseRef('#');
        assert.equal(r.type, '');
        assert.equal(r.uuid, null);
        assert.equal(r.version, null);
    });

    it('keeps only the first two ampersand keys as uuid/version', () => {
        const r = SchemaHelper.parseRef('#uuid&1.0.0&extra');
        assert.equal(r.uuid, 'uuid');
        assert.equal(r.version, '1.0.0');
    });

    it('parses a ref from a JSON-string document', () => {
        const r = SchemaHelper.parseRef({ document: JSON.stringify({ $id: '#u&3.0.0' }) });
        assert.equal(r.uuid, 'u');
        assert.equal(r.version, '3.0.0');
    });

    it('returns all-null when the document JSON is malformed', () => {
        assert.deepEqual(SchemaHelper.parseRef({ document: '{bad' }), { iri: null, type: null, uuid: null, version: null });
    });

    it('returns all-null when the document object has no $id', () => {
        assert.deepEqual(SchemaHelper.parseRef({ document: {} }), { iri: null, type: null, uuid: null, version: null });
    });

    it('parses a uuid-only ref (no version key) with null version', () => {
        const r = SchemaHelper.parseRef('#uuid-only');
        assert.equal(r.uuid, 'uuid-only');
        assert.equal(r.version, null);
    });
});

describe('@unit SchemaHelper.incrementVersion — boundary', () => {
    it('seeds 1.0.0 when previousVersion is empty and no versions exist', () => {
        assert.equal(SchemaHelper.incrementVersion('', []), '1.0.0');
    });

    it('seeds 1.0.0 when previousVersion is null', () => {
        assert.equal(SchemaHelper.incrementVersion(null, []), '1.0.0');
    });

    it('increments the patch from previousVersion when no other versions exist', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0.0', []), '1.0.1');
    });

    it('takes the max minor in the same major.minor group and adds one', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0.0', ['1.0.0', '1.0.5']), '1.0.6');
    });

    it('ignores empty/null/undefined entries in the versions list', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0.0', ['', null, undefined, '1.0.3']), '1.0.4');
    });

    it('treats a two-part previousVersion by its last dot segment', () => {
        assert.equal(SchemaHelper.incrementVersion('1.0', []), '1.1');
    });

    it('produces a leading-dot result for a dotless previousVersion (latent quirk)', () => {
        assert.equal(SchemaHelper.incrementVersion('2', []), '.3');
    });

    it('is deterministic across repeated calls with the same inputs', () => {
        const a = SchemaHelper.incrementVersion('3.2.0', ['3.2.1', '3.2.4']);
        const b = SchemaHelper.incrementVersion('3.2.0', ['3.2.1', '3.2.4']);
        assert.equal(a, b);
        assert.equal(a, '3.2.5');
    });
});

describe('@unit SchemaHelper.buildType / buildRef / buildUrl — boundary', () => {
    it('omits version when version is undefined', () => {
        assert.equal(SchemaHelper.buildType('uuid'), 'uuid');
    });

    it('omits version when version is an empty string (falsy)', () => {
        assert.equal(SchemaHelper.buildType('uuid', ''), 'uuid');
    });

    it('appends a 0.0.0 version (truthy non-empty string)', () => {
        assert.equal(SchemaHelper.buildType('uuid', '0.0.0'), 'uuid&0.0.0');
    });

    it('prefixes the type with a hash', () => {
        assert.equal(SchemaHelper.buildRef('uuid&1.0.0'), '#uuid&1.0.0');
    });

    it('returns "" when both contextURL and ref are null', () => {
        assert.equal(SchemaHelper.buildUrl(null, null), '');
    });

    it('returns the context alone when ref is null', () => {
        assert.equal(SchemaHelper.buildUrl('https://x', null), 'https://x');
    });

    it('returns the ref alone when context is null', () => {
        assert.equal(SchemaHelper.buildUrl(null, '#r'), '#r');
    });
});

describe('@unit SchemaHelper.buildSchemaComment / parseSchemaComment — boundary', () => {
    it('omits previousVersion when version is undefined', () => {
        assert.equal(SchemaHelper.buildSchemaComment('t', 'u'), '{ "@id": "u", "term": "t" }');
    });

    it('omits previousVersion when version is an empty string', () => {
        assert.equal(SchemaHelper.buildSchemaComment('t', 'u', ''), '{ "@id": "u", "term": "t" }');
    });

    it('includes previousVersion when supplied', () => {
        assert.ok(SchemaHelper.buildSchemaComment('t', 'u', '1.0.0').includes('"previousVersion": "1.0.0"'));
    });

    it('round-trips a built comment back through parseSchemaComment', () => {
        const c = SchemaHelper.buildSchemaComment('t', 'u', '1.0.0');
        assert.equal(SchemaHelper.parseSchemaComment(c).previousVersion, '1.0.0');
    });

    it('returns {} for malformed comment JSON', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment('{bad'), {});
    });

    it('returns {} for the literal "null" comment', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment('null'), {});
    });

    it('returns {} for an undefined comment', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment(undefined), {});
    });
});

describe('@unit SchemaHelper.parseFieldComment — boundary', () => {
    it('returns {} for the literal "null"', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('null'), {});
    });

    it('returns {} for an empty string', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment(''), {});
    });

    it('returns {} for malformed JSON', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('{not-json'), {});
    });

    it('parses a valid object comment', () => {
        assert.equal(SchemaHelper.parseFieldComment('{"unit":"kg"}').unit, 'kg');
    });
});

describe('@unit SchemaHelper.validate — error paths', () => {
    it('returns false when name is missing', () => {
        assert.equal(SchemaHelper.validate({ uuid: 'u', document: { $id: '#x' } }), false);
    });

    it('returns false when uuid is missing', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', document: { $id: '#x' } }), false);
    });

    it('returns false when document is missing', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u' }), false);
    });

    it('returns false when the string document is malformed JSON', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: '{bad' }), false);
    });

    it('returns false when $id is missing from the document', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: {} }), false);
    });

    it('returns true for a valid JSON-string document', () => {
        assert.equal(SchemaHelper.validate({ name: 'n', uuid: 'u', document: JSON.stringify({ $id: '#x' }) }), true);
    });
});

describe('@unit SchemaHelper.checkSchemaKey — error paths & unicode', () => {
    it('returns true for a unicode key without whitespace', () => {
        assert.equal(SchemaHelper.checkSchemaKey({ document: { properties: { 'naïve_café': {} } } }), true);
    });

    it('throws for a key containing a space', () => {
        assert.throws(
            () => SchemaHelper.checkSchemaKey({ document: { properties: { 'with space': {} } } }),
            /Field key 'with space' must not contain spaces/,
        );
    });

    it('throws for a key containing a tab', () => {
        assert.throws(
            () => SchemaHelper.checkSchemaKey({ document: { properties: { 'a\tb': {} } } }),
            /must not contain spaces/,
        );
    });

    it('returns true when there are no properties', () => {
        assert.equal(SchemaHelper.checkSchemaKey({ document: {} }), true);
    });

    it('returns true for a null schema', () => {
        assert.equal(SchemaHelper.checkSchemaKey(null), true);
    });
});

describe('@unit SchemaHelper.parseProperty — edge', () => {
    it('prefers the outer title over the oneOf branch title', () => {
        assert.equal(SchemaHelper.parseProperty('f', { oneOf: [{ type: 'string', title: 'OT' }], title: 'PT' }).title, 'PT');
    });

    it('is a ref when $ref present and type absent', () => {
        assert.equal(SchemaHelper.parseProperty('f', { $ref: '#X' }).isRef, true);
    });

    it('is not a ref when both $ref and type are present', () => {
        assert.equal(SchemaHelper.parseProperty('f', { $ref: '#X', type: 'string' }).isRef, false);
    });

    it('descends into items for array properties', () => {
        const r = SchemaHelper.parseProperty('f', { type: 'array', items: { type: 'string', enum: ['a'] } });
        assert.equal(r.isArray, true);
        assert.equal(r.type, 'string');
        assert.deepEqual(r.enum, ['a']);
    });

    it('nulls examples when examples is not an array', () => {
        assert.equal(SchemaHelper.parseProperty('f', { type: 'string', examples: 'x' }).examples, null);
    });

    it('preserves a unicode field name', () => {
        assert.equal(SchemaHelper.parseProperty('café_naïve', { type: 'string' }).name, 'café_naïve');
    });

    it('falls back to the name for title and description', () => {
        const r = SchemaHelper.parseProperty('fld', { type: 'string' });
        assert.equal(r.title, 'fld');
        assert.equal(r.description, 'fld');
    });
});

describe('@unit SchemaHelper.parseField — edge', () => {
    it('defaults order to -1 when no orderPosition comment is present', () => {
        assert.equal(SchemaHelper.parseField('f', { type: 'string' }, false, 'u').order, -1);
    });

    it('records the required flag passed in', () => {
        assert.equal(SchemaHelper.parseField('f', { type: 'string' }, true, 'u').required, true);
    });

    it('round-trips unit/isPrivate/order through buildField then parseField', () => {
        const built = SchemaHelper.buildField(
            { title: 'T', description: 'D', type: 'string', isArray: false, isRef: false, unit: 'kg', isPrivate: true },
            'name', 'ctx', 2,
        );
        const parsed = SchemaHelper.parseField('name', built, true, 'ctx');
        assert.equal(parsed.unit, 'kg');
        assert.equal(parsed.isPrivate, true);
        assert.equal(parsed.order, 2);
    });
});

describe('@unit SchemaHelper.setVersion — boundary', () => {
    it('builds a versionless $id and comment when version is undefined', () => {
        const r = SchemaHelper.setVersion({ uuid: 'u', contextURL: 'c', document: { $id: 'old' } }, undefined, undefined);
        assert.equal(r.document.$id, '#u');
        assert.ok(!r.document.$comment.includes('previousVersion'));
    });

    it('is idempotent when applied twice with the same arguments', () => {
        const s = { uuid: 'u', contextURL: 'c', document: { $id: 'old', $comment: '{}' } };
        const a = SchemaHelper.setVersion(s, '2.0.0', '1.0.0');
        const aId = a.document.$id;
        const aComment = a.document.$comment;
        const b = SchemaHelper.setVersion(a, '2.0.0', '1.0.0');
        assert.equal(b.document.$id, aId);
        assert.equal(b.document.$comment, aComment);
    });

    it('parses a JSON-string document and reassigns it as an object', () => {
        const r = SchemaHelper.setVersion({ uuid: 'u', contextURL: '', document: JSON.stringify({ $id: 'x' }) }, '1.1.0', '1.0.0');
        assert.equal(typeof r.document, 'object');
        assert.equal(r.document.$id, '#u&1.1.0');
    });
});

describe('@unit SchemaHelper.updateVersion — comparison boundaries', () => {
    const mk = (prev) => ({
        uuid: 'u',
        contextURL: 'c',
        creator: 'cr',
        document: { $id: '#u&' + prev, $comment: JSON.stringify({ previousVersion: prev }) },
    });

    it('rejects a four-part version as invalid format', () => {
        assert.throws(() => SchemaHelper.updateVersion(mk('1.0.0'), '1.0.0.0'), /Invalid version format/);
    });

    it('rejects an empty version string', () => {
        assert.throws(() => SchemaHelper.updateVersion(mk('1.0.0'), ''), /Invalid version format/);
    });

    it('rejects a non-numeric version', () => {
        assert.throws(() => SchemaHelper.updateVersion(mk('1.0.0'), 'v2'), /Invalid version format/);
    });

    it('accepts 1.0.1 over a two-part 1.0 previousVersion', () => {
        assert.equal(SchemaHelper.updateVersion(mk('1.0'), '1.0.1').version, '1.0.1');
    });

    it('accepts a very large version', () => {
        assert.equal(SchemaHelper.updateVersion(mk('1.0.0'), '999.999.999').version, '999.999.999');
    });

    it('accepts any version when previousVersion is absent (empty comment)', () => {
        const data = { uuid: 'u', contextURL: 'c', creator: 'cr', document: { $id: '#u&1.0.0', $comment: '{}' } };
        assert.equal(SchemaHelper.updateVersion(data, '0.0.1').version, '0.0.1');
    });

    it('rejects a version equal to previousVersion', () => {
        assert.throws(() => SchemaHelper.updateVersion(mk('1.0.0'), '1.0.0'), /Version must be greater than 1\.0\.0/);
    });

    it('falls back to uuid parsed from $id when data.uuid is absent', () => {
        const data = { contextURL: 'c', creator: 'cr', document: { $id: '#parsed-uuid&1.0.0', $comment: JSON.stringify({ previousVersion: '1.0.0' }) } };
        const r = SchemaHelper.updateVersion(data, '1.1.0');
        assert.equal(r.uuid, 'parsed-uuid');
        assert.equal(r.document.$id, '#parsed-uuid&1.1.0');
    });
});

describe('@unit SchemaHelper.updateOwner — edge', () => {
    it('uses newOwner.username as the fallback for owner and creator', () => {
        const data = { uuid: 'u', version: '1.0.0', contextURL: 'c', document: { $id: '#u&1.0.0', $comment: '{}' } };
        const r = SchemaHelper.updateOwner(data, { username: 'alice' });
        assert.equal(r.owner, 'alice');
        assert.equal(r.creator, 'alice');
    });

    it('prefers explicit owner/creator over username', () => {
        const data = { uuid: 'u', version: '1.0.0', contextURL: 'c', document: { $id: '#u&1.0.0', $comment: '{}' } };
        const r = SchemaHelper.updateOwner(data, { owner: 'o', creator: 'c2', username: 'alice' });
        assert.equal(r.owner, 'o');
        assert.equal(r.creator, 'c2');
    });

    it('recovers version and uuid from $id when data fields are absent', () => {
        const data = { contextURL: 'c', document: { $id: '#fromid&7.0.0', $comment: '{}' } };
        const r = SchemaHelper.updateOwner(data, { username: 'x' });
        assert.equal(r.uuid, 'fromid');
        assert.equal(r.version, '7.0.0');
    });
});

describe('@unit SchemaHelper.updatePermission — edge', () => {
    it('flags isOwner/isCreator only on exact matches', () => {
        const arr = [{ owner: 'a', creator: 'a' }, { owner: 'b', creator: 'c' }];
        SchemaHelper.updatePermission(arr, { owner: 'a', creator: 'a' });
        assert.equal(arr[0].isOwner, true);
        assert.equal(arr[0].isCreator, true);
        assert.equal(arr[1].isOwner, false);
        assert.equal(arr[1].isCreator, false);
    });

    it('leaves isOwner/isCreator falsy when owner/creator are absent', () => {
        const arr = [{}];
        SchemaHelper.updatePermission(arr, { owner: 'a', creator: 'a' });
        assert.ok(!arr[0].isOwner);
        assert.ok(!arr[0].isCreator);
    });
});

describe('@unit SchemaHelper.getContext — edge', () => {
    it('returns the parsed type and the contextURL wrapped in an array', () => {
        assert.deepEqual(SchemaHelper.getContext({ iri: '#u&1.0.0', contextURL: 'c' }), { type: 'u&1.0.0', '@context': ['c'] });
    });

    it('returns a null type when iri is absent', () => {
        assert.deepEqual(SchemaHelper.getContext({ contextURL: 'c' }), { type: null, '@context': ['c'] });
    });
});

describe('@unit SchemaHelper.updateFields — idempotency & null safety', () => {
    it('returns null unchanged for a null document', () => {
        assert.equal(SchemaHelper.updateFields(null, () => ({})), null);
    });

    it('returns the same object when there are no properties', () => {
        const noProps = { foo: 'bar' };
        assert.equal(SchemaHelper.updateFields(noProps, () => ({})), noProps);
    });

    it('is idempotent for an identity transform applied twice', () => {
        const doc = { properties: { a: { type: 'string' } } };
        const snapshot = JSON.stringify(doc);
        const once = SchemaHelper.updateFields(doc, (n, prop) => prop);
        const twice = SchemaHelper.updateFields(once, (n, prop) => prop);
        assert.equal(JSON.stringify(twice), snapshot);
    });
});

describe('@unit SchemaHelper.updateIRI — error paths', () => {
    it('reads iri from an existing document.$id', () => {
        assert.equal(SchemaHelper.updateIRI({ document: { $id: '#existing' } }).iri, '#existing');
    });

    it('sets iri to null when document is present but $id is missing', () => {
        assert.equal(SchemaHelper.updateIRI({ document: {} }).iri, null);
    });

    it('builds iri from uuid+version when no document is present', () => {
        assert.equal(SchemaHelper.updateIRI({ uuid: 'u', version: '1.0.0' }).iri, '#u&1.0.0');
    });

    it('builds a versionless iri when version is absent and no document is present', () => {
        assert.equal(SchemaHelper.updateIRI({ uuid: 'u' }).iri, '#u');
    });

    it('returns iri=null on a malformed JSON document', () => {
        assert.equal(SchemaHelper.updateIRI({ document: 'not-json' }).iri, null);
    });
});

describe('@unit SchemaHelper.buildDocument — condition serialization edges', () => {
    const schema = () => ({ uuid: 'u', version: '1.0.0', contextURL: 'c', name: 'N', description: 'DD' });

    it('omits allOf entirely when there are no conditions', () => {
        const doc = SchemaHelper.buildDocument(schema(), [], []);
        assert.equal('allOf' in doc, false);
        assert.equal(doc.$id, '#u&1.0.0');
        assert.deepEqual(doc.required, ['@context', 'type']);
    });

    it('drops a condition whose ifCondition is null', () => {
        const doc = SchemaHelper.buildDocument(schema(), [], [{ ifCondition: null, thenFields: [], elseFields: [] }]);
        assert.equal('allOf' in doc, false);
    });

    it('serializes a single-predicate ifCondition into a const property', () => {
        const cond = {
            ifCondition: { field: { name: 'sel' }, fieldValue: 'yes' },
            thenFields: [{ name: 'extra', type: 'string', title: 'E', description: 'E', required: true }],
            elseFields: [],
        };
        const doc = SchemaHelper.buildDocument(schema(), [], [cond]);
        assert.equal(doc.allOf.length, 1);
        assert.deepEqual(doc.allOf[0].if.properties.sel, { const: 'yes' });
        assert.ok(doc.allOf[0].then.properties.extra);
    });

    it('drops an AND ifCondition with an empty predicate array', () => {
        const doc = SchemaHelper.buildDocument(schema(), [], [{ ifCondition: { AND: [] }, thenFields: [], elseFields: [] }]);
        assert.equal('allOf' in doc, false);
    });

    it('collapses a single-element AND into a single const property', () => {
        const cond = {
            ifCondition: { AND: [{ field: { name: 'sel' }, fieldValue: 'v' }] },
            thenFields: [{ name: 'x', type: 'string', title: 'X', description: 'X', required: false }],
            elseFields: [],
        };
        const doc = SchemaHelper.buildDocument(schema(), [], [cond]);
        assert.deepEqual(doc.allOf[0].if.properties.sel, { const: 'v' });
        assert.equal(doc.allOf[0].if.allOf, undefined);
    });

    it('emits anyOf for a multi-element OR ifCondition', () => {
        const cond = {
            ifCondition: { OR: [{ field: { name: 'a' }, fieldValue: '1' }, { field: { name: 'b' }, fieldValue: '2' }] },
            thenFields: [{ name: 'x', type: 'string', title: 'X', description: 'X', required: false }],
            elseFields: [],
        };
        const doc = SchemaHelper.buildDocument(schema(), [], [cond]);
        assert.equal(doc.allOf[0].if.anyOf.length, 2);
    });
});

describe('@unit SchemaHelper.checkErrors — condition normalization edges', () => {
    it('returns [] for an empty schema object', () => {
        assert.deepEqual(SchemaHelper.checkErrors({}), []);
    });

    it('normalizes an IF-mode condition error target', () => {
        const schema = {
            conditions: [{ ifCondition: { field: { name: 'sel' }, fieldValue: 'yes' }, errors: [{ message: 'bad' }] }],
        };
        const r = SchemaHelper.checkErrors(schema);
        assert.equal(r.length, 1);
        assert.equal(r[0].target.type, 'condition');
        assert.equal(r[0].target.mode, 'IF');
        assert.equal(r[0].target.field, 'sel');
        assert.equal(r[0].target.fieldValue, 'yes');
    });

    it('normalizes an AND-mode condition error into predicates', () => {
        const schema = {
            conditions: [{
                ifCondition: { AND: [{ field: { name: 'a' }, fieldValue: '1' }, { field: { name: 'b' }, fieldValue: '2' }] },
                errors: [{ message: 'bad' }],
            }],
        };
        const r = SchemaHelper.checkErrors(schema);
        assert.equal(r[0].target.mode, 'AND');
        assert.equal(r[0].target.predicates.length, 2);
    });

    it('keeps the condition index in the target', () => {
        const schema = {
            conditions: [
                { ifCondition: null, errors: [] },
                { ifCondition: { field: { name: 'x' }, fieldValue: 'y' }, errors: [{ message: 'e' }] },
            ],
        };
        const r = SchemaHelper.checkErrors(schema);
        assert.equal(r[0].target.index, 1);
    });

    it('tags field-level errors with the field name', () => {
        const r = SchemaHelper.checkErrors({ fields: [{ name: 'fld', errors: [{ message: 'm' }] }] });
        assert.equal(r[0].target.type, 'field');
        assert.equal(r[0].target.field, 'fld');
    });
});

describe('@unit SchemaHelper.getSchemaName — boundary', () => {
    it('returns "" when nothing is supplied', () => {
        assert.equal(SchemaHelper.getSchemaName(), '');
    });

    it('coerces a missing name to an empty prefix but keeps version', () => {
        assert.equal(SchemaHelper.getSchemaName(undefined, '1.0.0'), ' (1.0.0)');
    });

    it('omits empty-string version and status', () => {
        assert.equal(SchemaHelper.getSchemaName('N', '', ''), 'N');
    });
});
