import assert from 'node:assert/strict';
import { DefaultDocumentLoader } from '../../../../../common/dist/document-loader/base/document-loader-default.js';
import { LocalDidLoader } from '../../../../../common/dist/document-loader/local-did-loader.js';
import { SchemaHelper } from '../../../../../interfaces/dist/helpers/schema-helper.js';
import { VCJS } from '../../../../dist/vcjs/vcjs.js';

void DefaultDocumentLoader;
void LocalDidLoader;

const text = (term, order) => ({
    title: term, description: term, readOnly: false, type: 'string',
    $comment: JSON.stringify({ term, '@id': 'https://www.schema.org/text', orderPosition: order })
});
const ref = (term, id, order) => ({
    title: term, description: term, readOnly: false, $ref: `#${id}`,
    $comment: JSON.stringify({ term, '@id': `#${id}`, customType: 'subSchema', availableOptions: [], orderPosition: order })
});
const list = (term, id, order) => ({
    title: term, description: term, readOnly: false, type: 'array', items: { $ref: `#${id}` },
    $comment: JSON.stringify({ term, '@id': `schema:root#${id}`, customType: 'subSchema', availableOptions: [], orderPosition: order })
});
const comment = (id) => JSON.stringify({ '@id': `#${id}`, term: id });

// `child1[i].field_1.check` decides whether `child2[i].field_1.field_1` is required or forbidden.
const schema = (links) => ({
    $id: '#root',
    $comment: JSON.stringify({ '@id': 'schema:root#root', term: 'root', arrayDependencies: links }),
    title: 'Root', description: '', type: 'object',
    properties: {
        child1: list('child1', 'child', 0),
        child2: list('child2', 'child', 1)
    },
    required: ['child1', 'child2'],
    additionalProperties: false,
    allOf: [{
        if: {
            properties: { child1: { properties: { field_1: { properties: { check: { const: 1 } }, required: ['check'] } }, required: ['field_1'] } },
            required: ['child1']
        },
        then: { properties: { child2: { properties: { field_1: { required: ['value'] } } } } },
        else: { properties: { child2: { properties: { field_1: { properties: { value: false } } } } } }
    }],
    $defs: {
        '#child': {
            $id: '#child', $comment: comment('child'), title: 'Child', description: '', type: 'object',
            properties: { field_1: ref('field_1', 'leaf', 0) },
            required: ['field_1'], additionalProperties: false
        },
        '#leaf': {
            $id: '#leaf', $comment: comment('leaf'), title: 'Leaf', description: '', type: 'object',
            properties: { check: { ...text('check', 0), type: 'integer' }, value: text('value', 1) },
            required: ['value'], additionalProperties: false
        }
    }
});

const link = [{ field: ['child2'], on: ['child1'], kind: 'array' }];
const one = (check) => ({ field_1: { check, value: 'x' } });
const two = (value) => ({ field_1: value === undefined ? {} : { value } });

describe('VCJS validates conditions across linked arrays entry by entry', () => {
    async function verify(subject, links = link) {
        const vcjs = new VCJS();
        vcjs.schemaLoader = async () => schema(links);
        return vcjs.verifySubject(subject);
    }
    const conditionErrors = (result) => (result.error?.details || [])
        .filter(error => error.keyword === 'arrayGroupCondition');

    it('accepts entries that follow their own condition', async () => {
        const result = await verify({ child1: [one(1), one(2)], child2: [two('a'), two()] });
        assert.deepEqual(conditionErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('rejects a forbidden field in the entry whose condition does not apply', async () => {
        const result = await verify({ child1: [one(1), one(2)], child2: [two('a'), two('b')] });
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result).map(error => error.instancePath), ['/child2/1/field_1/value']);
    });

    it('rejects a missing required field in the entry whose condition applies', async () => {
        const result = await verify({ child1: [one(1), one(1)], child2: [two(), two('b')] });
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result).map(error => error.instancePath), ['/child2/0/field_1/value']);
    });

    it('does not pair entries of arrays that are not linked', async () => {
        const result = await verify({ child1: [one(1), one(2)], child2: [two(), two('b')] }, []);
        assert.deepEqual(conditionErrors(result), []);
    });

    it('leaves a length mismatch to the length check', async () => {
        const result = await verify({ child1: [one(1), one(2)], child2: [two()] });
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), []);
        assert.ok(result.error.details.some(error => error.keyword === 'arrayGroupLength'));
    });
});

// The same rule declared on a sub-schema: link and condition both live in `section`.
const section = () => ({
    $id: '#root', $comment: comment('root'), title: 'Root', description: '', type: 'object',
    properties: { section: ref('section', 'section', 0) },
    required: ['section'], additionalProperties: false,
    $defs: {
        '#section': {
            $id: '#section',
            $comment: JSON.stringify({ '@id': '#section', term: 'section', arrayDependencies: [{ field: ['targets'], on: ['sources'], kind: 'array' }] }),
            title: 'Section', description: '', type: 'object',
            properties: { sources: list('sources', 'source', 0), targets: list('targets', 'target', 1) },
            required: ['sources', 'targets'], additionalProperties: false,
            allOf: [{
                if: { properties: { sources: { properties: { kind: { const: 'full' } }, required: ['kind'] } }, required: ['sources'] },
                then: { properties: { targets: { required: ['reference'] } } },
                else: { properties: { targets: { properties: { reference: false } } } }
            }]
        },
        '#source': {
            $id: '#source', $comment: comment('source'), title: 'Source', description: '', type: 'object',
            properties: { kind: text('kind', 0) }, required: ['kind'], additionalProperties: false
        },
        '#target': {
            $id: '#target', $comment: comment('target'), title: 'Target', description: '', type: 'object',
            properties: { reference: text('reference', 0) }, required: ['reference'], additionalProperties: false
        }
    }
});

describe('VCJS validates conditions across linked arrays declared in a sub-schema', () => {
    async function verify(sources, targets) {
        const vcjs = new VCJS();
        vcjs.schemaLoader = async () => section();
        return vcjs.verifySubject({ section: { sources, targets } });
    }
    const kinds = (...values) => values.map(kind => ({ kind }));
    const refs = (...values) => values.map(reference => reference === undefined ? {} : { reference });
    const conditionErrors = (result) => (result.error?.details || [])
        .filter(error => error.keyword === 'arrayGroupCondition').map(error => error.instancePath);

    it('accepts entries that follow their own condition', async () => {
        const result = await verify(kinds('full', 'partial'), refs('R-1', undefined));
        assert.equal(result.ok, true);
    });

    it('rejects a missing required field and a forbidden field with their entry paths', async () => {
        const result = await verify(kinds('full', 'partial'), refs(undefined, 'R-2'));
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/section/targets/0/reference', '/section/targets/1/reference']);
    });

    it('leaves a length mismatch to the length check', async () => {
        const result = await verify(kinds('full', 'partial'), refs('R-1'));
        assert.deepEqual(conditionErrors(result), []);
        assert.ok(result.error.details.some(error => error.keyword === 'arrayGroupLength'));
    });
});

// A condition that reads two separate linked groups.
const twoGroups = () => ({
    $id: '#root',
    $comment: JSON.stringify({ '@id': 'schema:root#root', term: 'root', arrayDependencies: [
        { field: ['field_2'], on: ['field_1'], kind: 'array' }, { field: ['field_4'], on: ['field_3'], kind: 'array' }] }),
    title: 'Root', description: '', type: 'object',
    properties: { field_1: list('field_1', 'c1', 0), field_2: list('field_2', 'c2', 1), field_3: list('field_3', 'o1', 2), field_4: list('field_4', 'o2', 3) },
    required: ['field_1', 'field_2', 'field_3', 'field_4'], additionalProperties: false,
    allOf: [{
        if: { allOf: [
            { properties: { field_1: { properties: { check: { const: 1 } }, required: ['check'] } }, required: ['field_1'] },
            { properties: { field_3: { properties: { kind: { const: 'y' } }, required: ['kind'] } }, required: ['field_3'] }] },
        then: { properties: { field_2: { required: ['value'] } } },
        else: { properties: { field_2: { properties: { value: false } } } }
    }],
    $defs: {
        '#c1': { $id: '#c1', $comment: comment('c1'), title: 'c1', description: '', type: 'object',
            properties: { check: { ...text('check', 0), type: 'integer' } }, required: ['check'], additionalProperties: false },
        '#c2': { $id: '#c2', $comment: comment('c2'), title: 'c2', description: '', type: 'object',
            properties: { value: text('value', 0) }, required: ['value'], additionalProperties: false },
        '#o1': { $id: '#o1', $comment: comment('o1'), title: 'o1', description: '', type: 'object',
            properties: { kind: text('kind', 0) }, required: ['kind'], additionalProperties: false },
        '#o2': { $id: '#o2', $comment: comment('o2'), title: 'o2', description: '', type: 'object',
            properties: { note: text('note', 0) }, required: [], additionalProperties: false }
    }
});

describe('VCJS validates a condition over two linked groups entry by entry', () => {
    async function verify(field1, field2, field3) {
        const vcjs = new VCJS();
        vcjs.schemaLoader = async () => twoGroups();
        return vcjs.verifySubject({
            field_1: field1, field_2: field2, field_3: field3, field_4: field3.map(() => ({}))
        });
    }
    const conditionErrors = (result) => (result.error?.details || [])
        .filter(error => error.keyword === 'arrayGroupCondition').map(error => error.instancePath);

    it('accepts both parts true with the value filled', async () => {
        const result = await verify([{ check: 1 }], [{ value: 'a' }], [{ kind: 'y' }]);
        assert.deepEqual(conditionErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('rejects both parts true with the value missing', async () => {
        const result = await verify([{ check: 1 }], [{}], [{ kind: 'y' }]);
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/field_2/0/value']);
    });

    it('rejects a filled value when the second part is false', async () => {
        const result = await verify([{ check: 1 }], [{ value: 'a' }], [{ kind: 'test' }]);
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/field_2/0/value']);
    });

    it('accepts two entries that follow the condition', async () => {
        const result = await verify([{ check: 1 }, { check: 2 }], [{ value: 'a' }, {}], [{ kind: 'y' }, { kind: 'y' }]);
        assert.deepEqual(conditionErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('rejects only the entry whose condition does not apply', async () => {
        const result = await verify([{ check: 1 }, { check: 2 }], [{ value: 'a' }, { value: 'b' }], [{ kind: 'y' }, { kind: 'y' }]);
        assert.deepEqual(conditionErrors(result), ['/field_2/1/value']);
    });

    it('still reports a length mismatch of either group', async () => {
        const result = await verify([{ check: 1 }, { check: 2 }], [{ value: 'a' }], [{ kind: 'y' }]);
        assert.ok(result.error.details.some(error => error.keyword === 'arrayGroupLength'));
    });
});

// Documents built by SchemaHelper: `Source.kind` is shown only when `mode` is `advanced`, and a condition on
// `Section` requires `Target.reference` unless `sources.kind` is `full`.
const plain = (name, over = {}) => ({
    name, title: name, description: name, type: 'string', required: false, isArray: false,
    isRef: false, readOnly: false, ...over
});
const meta = (uuid, name, extra = {}) => ({ uuid, version: '1.0.0', name, description: name, contextURL: 'schema:', ...extra });

function hiddenTriggerSchema() {
    const mode = plain('mode', { required: true });
    const kind = plain('kind', { required: true });
    const reference = plain('reference', { required: true });
    const sourceDoc = SchemaHelper.buildDocument(meta('src-uuid', 'Source'), [mode, kind],
        [{ ifCondition: { field: mode, fieldValue: 'advanced' }, thenFields: [kind], elseFields: [] }]);
    const targetDoc = SchemaHelper.buildDocument(meta('tgt-uuid', 'Target'), [reference], []);
    const sources = plain('sources', { isArray: true, isRef: true, type: '#src-uuid&1.0.0', fields: [mode, kind], required: true });
    const targets = plain('targets', { isArray: true, isRef: true, type: '#tgt-uuid&1.0.0', fields: [reference], required: true });
    const sectionDoc = SchemaHelper.buildDocument(
        meta('sec-uuid', 'Section', { arrayDependencies: [{ field: ['targets'], on: ['sources'], kind: 'array' }] }),
        [sources, targets],
        [{
            ifCondition: { field: kind, fieldPath: ['sources', 'kind'], fieldValue: 'full' },
            thenFields: [],
            elseFields: [],
            elseTargets: [{ field: reference, fieldPath: ['targets', 'reference'] }]
        }]
    );
    const section = plain('section', { isRef: true, type: '#sec-uuid&1.0.0', fields: [sources, targets], required: true });
    const rootDoc = SchemaHelper.buildDocument(meta('root-uuid', 'Root'), [section], []);
    rootDoc.$defs = { '#sec-uuid&1.0.0': sectionDoc, '#src-uuid&1.0.0': sourceDoc, '#tgt-uuid&1.0.0': targetDoc };
    return rootDoc;
}

describe('VCJS treats a trigger field hidden by its own entry condition as empty', () => {
    const ctx = (type) => ({ '@context': ['schema:x'], type });
    async function verify(sources, targets) {
        const vcjs = new VCJS();
        vcjs.schemaLoader = async () => hiddenTriggerSchema();
        return vcjs.verifySubject({
            ...ctx('Root'),
            section: {
                ...ctx('Section'),
                sources: sources.map(item => ({ ...ctx('Source'), ...item })),
                targets: targets.map(item => ({ ...ctx('Target'), ...item }))
            }
        });
    }
    const conditionErrors = (result) => (result.error?.details || [])
        .filter(error => error.keyword === 'arrayGroupCondition').map(error => error.instancePath);

    it('requires the target when the trigger is hidden', async () => {
        const result = await verify([{ mode: 'simple' }], [{}]);
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/section/targets/0/reference']);
    });

    it('judges each entry on its own when only one trigger is hidden', async () => {
        const result = await verify(
            [{ mode: 'simple' }, { mode: 'advanced', kind: 'full' }],
            [{}, {}]
        );
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/section/targets/0/reference']);
    });

    it('accepts a hidden trigger when the target is filled', async () => {
        const result = await verify([{ mode: 'simple' }], [{ reference: 'R' }]);
        assert.deepEqual(conditionErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('accepts a shown trigger that matches, without a target', async () => {
        const result = await verify([{ mode: 'advanced', kind: 'full' }], [{}]);
        assert.deepEqual(conditionErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('requires the target when the shown trigger does not match', async () => {
        const result = await verify([{ mode: 'advanced', kind: 'other' }], [{}]);
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/section/targets/0/reference']);
    });

    it('accepts a shown trigger that does not match when the target is filled', async () => {
        const result = await verify([{ mode: 'advanced', kind: 'other' }], [{ reference: 'R' }]);
        assert.deepEqual(conditionErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('rejects a target filled although the shown trigger matches', async () => {
        const result = await verify([{ mode: 'advanced', kind: 'full' }], [{ reference: 'R' }]);
        assert.equal(result.ok, false);
        assert.deepEqual(conditionErrors(result), ['/section/targets/0/reference']);
    });
});
