import assert from 'node:assert/strict';
import { collectConditionsFromRoot, validateLinkedArrayConditions } from '../../dist/vcjs/linked-array-condition-validator.js';

const trigger = { name: 'check' };
const target = (required = true) => ({
    field: { name: 'value', required },
    fieldPath: ['child2', 'field_1', 'value']
});
const condition = (extra = {}) => ({
    ifCondition: { field: trigger, fieldPath: ['child1', 'field_1', 'check'], fieldValue: 1 },
    thenFields: [],
    elseFields: [],
    thenTargets: [target()],
    ...extra
});
const link = { field: ['child2'], on: ['child1'], kind: 'array' };
const one = (check) => ({ field_1: { check } });
const two = (value) => ({ field_1: value === undefined ? {} : { value } });
const paths = (errors) => errors.map(error => error.instancePath);

describe('validateLinkedArrayConditions', () => {
    it('requires the target in the entries whose condition applies', () => {
        const errors = validateLinkedArrayConditions(
            { child1: [one(1), one(2)], child2: [two(), two()] }, [condition()], [link]);
        assert.deepEqual(paths(errors), ['/child2/0/field_1/value']);
        assert.equal(errors[0].keyword, 'arrayGroupCondition');
        assert.match(errors[0].message, /'child2\[0\]\.field_1\.value' is required/);
        assert.match(errors[0].message, /'child1\[0\]\.field_1\.check'/);
    });

    it('forbids the target in the entries whose condition does not apply', () => {
        const errors = validateLinkedArrayConditions(
            { child1: [one(1), one(2)], child2: [two('a'), two('b')] }, [condition()], [link]);
        assert.deepEqual(paths(errors), ['/child2/1/field_1/value']);
        assert.match(errors[0].message, /is not allowed/);
    });

    it('accepts entries that follow their own condition', () => {
        assert.deepEqual(validateLinkedArrayConditions(
            { child1: [one(1), one(2)], child2: [two('a'), two()] }, [condition()], [link]), []);
    });

    it('does not require an optional target', () => {
        const optional = condition({ thenTargets: [target(false)] });
        assert.deepEqual(validateLinkedArrayConditions(
            { child1: [one(1)], child2: [two()] }, [optional], [link]), []);
    });

    it('uses the else targets for entries whose condition does not apply', () => {
        const withElse = condition({ thenTargets: undefined, elseTargets: [target()] });
        const errors = validateLinkedArrayConditions(
            { child1: [one(1), one(2)], child2: [two('a'), two()] }, [withElse], [link]);
        assert.deepEqual(paths(errors), ['/child2/0/field_1/value', '/child2/1/field_1/value']);
    });

    it('treats a target revealed by both branches as allowed', () => {
        const both = condition({ elseTargets: [target()] });
        assert.deepEqual(validateLinkedArrayConditions(
            { child1: [one(1), one(2)], child2: [two('a'), two('b')] }, [both], [link]), []);
    });

    it('pairs entries through a chain of links', () => {
        const chain = [link, { field: ['child3'], on: ['child2'], kind: 'array' }];
        const onChild3 = condition({
            thenTargets: [{ field: { name: 'value', required: true }, fieldPath: ['child3', 'value'] }]
        });
        const errors = validateLinkedArrayConditions({
            child1: [one(1), one(2)], child2: [two(), two()], child3: [{}, { value: 'x' }]
        }, [onChild3], chain);
        assert.deepEqual(paths(errors), ['/child3/0/value', '/child3/1/value']);
    });

    it('skips arrays of different length and unlinked or missing links', () => {
        const subject = { child1: [one(1), one(2)], child2: [two()] };
        assert.deepEqual(validateLinkedArrayConditions(subject, [condition()], [link]), []);
        const same = { child1: [one(1), one(2)], child2: [two(), two('b')] };
        assert.deepEqual(validateLinkedArrayConditions(same, [condition()], []), []);
        assert.deepEqual(validateLinkedArrayConditions(same, [], [link]), []);
        assert.deepEqual(validateLinkedArrayConditions(undefined, [condition()], [link]), []);
    });

    it('ignores conditions that do not read a linked array', () => {
        const plain = condition({ ifCondition: { field: { name: 'x' }, fieldValue: 1 } });
        assert.deepEqual(validateLinkedArrayConditions(
            { x: 1, child1: [one(1)], child2: [two()] }, [plain], [link]), []);
    });
});

describe('validateLinkedArrayConditions - condition that reads another repeatable field', () => {
    const second = { field: { name: 'kind' }, fieldPath: ['other', 'kind'], fieldValue: 'y' };
    const first = { field: trigger, fieldPath: ['child1', 'field_1', 'check'], fieldValue: 1 };
    const otherLink = { field: ['other2'], on: ['other'], kind: 'array' };
    const links = [link, otherLink];
    const subject = (value, kind) => ({
        child1: [one(1)], child2: [two(value)], other: [{ kind }], other2: [{}]
    });

    it('applies an AND over two groups when both parts are true', () => {
        const and = condition({ ifCondition: { AND: [first, second] } });
        assert.deepEqual(validateLinkedArrayConditions(subject('a', 'y'), [and], links), []);
        assert.deepEqual(paths(validateLinkedArrayConditions(subject(undefined, 'y'), [and], links)),
            ['/child2/0/field_1/value']);
    });

    it('does not apply an AND over two groups when one part is false', () => {
        const and = condition({ ifCondition: { AND: [first, second] } });
        assert.deepEqual(paths(validateLinkedArrayConditions(subject('a', 'test'), [and], links)),
            ['/child2/0/field_1/value']);
        assert.deepEqual(validateLinkedArrayConditions(subject(undefined, 'test'), [and], links), []);
    });

    it('applies an OR over two groups when one part is true', () => {
        const or = condition({ ifCondition: { OR: [first, second] } });
        assert.deepEqual(paths(validateLinkedArrayConditions(
            { child1: [one(2)], child2: [two()], other: [{ kind: 'y' }], other2: [{}] }, [or], links)),
        ['/child2/0/field_1/value']);
        assert.deepEqual(validateLinkedArrayConditions(subject('a', 'n'), [or], links).length, 0);
    });

    it('reads every repeatable field at the same entry number', () => {
        const and = condition({ ifCondition: { AND: [first, second] } });
        const data = {
            child1: [one(1), one(1)], child2: [two('a'), two('b')],
            other: [{ kind: 'y' }, { kind: 'n' }], other2: [{}, {}]
        };
        assert.deepEqual(paths(validateLinkedArrayConditions(data, [and], links)), ['/child2/1/field_1/value']);
    });

    it('reads a repeatable field that is not linked at the same entry number', () => {
        const and = condition({ ifCondition: { AND: [first, second] } });
        assert.deepEqual(paths(validateLinkedArrayConditions(subject('a', 'test'), [and], [link])),
            ['/child2/0/field_1/value']);
    });

    it('treats a missing entry of the other repeatable field as a false part', () => {
        const and = condition({ ifCondition: { AND: [first, second] } });
        const data = { child1: [one(1)], child2: [two('a')], other: [], other2: [] };
        assert.deepEqual(paths(validateLinkedArrayConditions(data, [and], links)), ['/child2/0/field_1/value']);
    });

    it('checks an AND whose other part is a plain root field', () => {
        const plain = { field: { name: 'mode' }, fieldValue: 'on' };
        const and = condition({ ifCondition: { AND: [first, plain] } });
        assert.deepEqual(paths(validateLinkedArrayConditions(
            { mode: 'on', child1: [one(1)], child2: [two()] }, [and], [link])), ['/child2/0/field_1/value']);
        assert.equal(validateLinkedArrayConditions(
            { mode: 'off', child1: [one(1)], child2: [two('a')] }, [and], [link]).length, 1);
    });
});

describe('collectConditionsFromRoot', () => {
    const inner = {
        ifCondition: { field: { name: 'kind' }, fieldPath: ['sources', 'kind'], fieldValue: 'full' },
        thenFields: [],
        elseFields: [],
        thenTargets: [{ field: { name: 'reference', required: true }, fieldPath: ['targets', 'reference'] }]
    };
    const section = { name: 'section', isRef: true, isArray: false, conditions: [inner], fields: [] };

    it('keeps root conditions as they are', () => {
        const root = { ifCondition: { field: { name: 'x' }, fieldValue: 1 }, thenFields: [], elseFields: [] };
        assert.deepEqual(collectConditionsFromRoot([root], []), [root]);
    });

    it('puts the sub-schema path in front of its condition and targets', () => {
        const [shifted] = collectConditionsFromRoot([], [section]);
        assert.deepEqual(shifted.ifCondition.fieldPath, ['section', 'sources', 'kind']);
        assert.deepEqual(shifted.thenTargets[0].fieldPath, ['section', 'targets', 'reference']);
        assert.deepEqual(inner.ifCondition.fieldPath, ['sources', 'kind'], 'the original must stay untouched');
    });

    it('prefixes a single-name trigger and every predicate of AND / OR', () => {
        const single = { ...inner, ifCondition: { field: { name: 'kind' }, fieldValue: 'a' } };
        const both = { ...inner, ifCondition: { AND: [inner.ifCondition, single.ifCondition] } };
        const nested = { name: 'section', isRef: true, isArray: false, conditions: [single, both], fields: [] };
        const [one, many] = collectConditionsFromRoot([], [nested]);
        assert.deepEqual(one.ifCondition.fieldPath, ['section', 'kind']);
        assert.deepEqual(many.ifCondition.AND.map(item => item.fieldPath), [['section', 'sources', 'kind'], ['section', 'kind']]);
    });

    it('leaves a target without a path as it is', () => {
        const bare = { ...inner, thenTargets: [{ field: { name: 'reference' } }] };
        const nested = { name: 'section', isRef: true, isArray: false, conditions: [bare], fields: [] };
        const [shifted] = collectConditionsFromRoot([], [nested]);
        assert.deepEqual(shifted.thenTargets, [{ field: { name: 'reference' } }]);
    });

    it('walks nested sub-schemas and skips repeatable ones', () => {
        const outer = { name: 'outer', isRef: true, isArray: false, conditions: [], fields: [section] };
        const repeatable = { ...section, name: 'rows', isArray: true };
        assert.deepEqual(collectConditionsFromRoot([], [outer])[0].thenTargets[0].fieldPath,
            ['outer', 'section', 'targets', 'reference']);
        assert.deepEqual(collectConditionsFromRoot([], [repeatable]), []);
    });
});
