import assert from 'node:assert/strict';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';
import {
    getContinentOfCountry,
    getCountriesOfContinent,
    getStatesOfCountry,
} from '../dist/helpers/geo-data/index.js';

const field = (overrides) => ({
    name: 'f',
    type: 'string',
    format: null,
    pattern: null,
    isRef: false,
    isArray: false,
    examples: null,
    default: null,
    customType: null,
    ...overrides,
});

const schema = (fields, conditions = []) => ({
    iri: '#Root&1.0.0',
    type: 'Root',
    fields,
    conditions,
});

const generate = (fields, conditions) =>
    DocumentGenerator.generateDocument(schema(fields, conditions));

describe('DocumentGenerator sub-schema fields with a stale example', () => {
    it('still generates the sub-document when the ref field carries an example', () => {
        const doc = generate([
            field({
                name: 'tool',
                type: '#Tool&1.0.0',
                isRef: true,
                examples: ['example'],
                fields: [field({ name: 'amount', type: 'number' })],
            }),
        ]);
        assert.equal(typeof doc.tool, 'object');
        assert.equal(doc.tool.amount, 1);
    });
});

describe('DocumentGenerator examples and defaults must fit the field', () => {
    it('ignores a string example on a number field', () => {
        const doc = generate([field({ type: 'number', examples: ['example'] })]);
        assert.equal(doc.f, 1);
    });

    it('ignores a numeric example on a date field', () => {
        const doc = generate([field({ format: 'date', examples: [45291] })]);
        assert.equal(doc.f, '2000-01-01');
    });

    it('ignores a non-integer example on an integer field', () => {
        const doc = generate([field({ type: 'integer', examples: [1.5] })]);
        assert.equal(doc.f, 1);
    });

    it('ignores a string example and default on a boolean field', () => {
        const doc = generate([field({ type: 'boolean', examples: ['text'], default: ' ' })]);
        assert.equal(doc.f, true);
    });

    it('keeps a fitting falsy example or default', () => {
        const doc = generate([
            field({ name: 'a', type: 'number', examples: [0] }),
            field({ name: 'b', type: 'boolean', default: false }),
            field({ name: 'c', type: 'integer', default: 0 }),
        ]);
        assert.equal(doc.a, 0);
        assert.equal(doc.b, false);
        assert.equal(doc.c, 0);
    });

    it('ignores a default of the wrong type', () => {
        const doc = generate([field({ type: 'number', default: 'abc' })]);
        assert.equal(doc.f, 1);
    });
});

describe('DocumentGenerator enum fields', () => {
    const enumField = (overrides) =>
        field({ customType: 'enum', enum: ['yes', 'no'], ...overrides });

    it('resolves an example that differs only by case to the enum entry', () => {
        const doc = generate([enumField({ examples: ['Yes'] })]);
        assert.equal(doc.f, 'yes');
    });

    it('falls back to the first enum entry when the example is not allowed', () => {
        const doc = generate([enumField({ examples: ['VCS Standard version'] })]);
        assert.equal(doc.f, 'yes');
    });

    it('keeps an example that is an exact enum entry', () => {
        const doc = generate([enumField({ examples: ['no'] })]);
        assert.equal(doc.f, 'no');
    });

    it('falls back to the first enum entry when the default is not allowed', () => {
        const doc = generate([enumField({ default: 'maybe' })]);
        assert.equal(doc.f, 'yes');
    });
});

describe('DocumentGenerator geo fields', () => {
    const geo = (name, customType, dependency) =>
        field({ name, customType, dependency });

    it('fills a continent, a country inside it and a state inside the country', () => {
        const doc = generate([
            geo('continent', 'continent'),
            geo('country', 'country', { on: 'continent', kind: 'geo' }),
            geo('state', 'state', { on: 'country', kind: 'geo' }),
        ]);
        assert.ok(doc.continent);
        assert.ok(getCountriesOfContinent(doc.continent).includes(doc.country));
        assert.ok(getStatesOfCountry(doc.country).some((s) => s.value === doc.state));
    });

    it('fills a state before its country field in schema order', () => {
        const doc = generate([
            geo('state', 'state', { on: 'country', kind: 'geo' }),
            geo('country', 'country', { on: 'continent', kind: 'geo' }),
            geo('continent', 'continent'),
        ]);
        assert.equal(getContinentOfCountry(doc.country), doc.continent);
        assert.ok(getStatesOfCountry(doc.country).some((s) => s.value === doc.state));
    });

    it('fills standalone country and state fields', () => {
        const doc = generate([geo('country', 'country'), geo('state', 'state')]);
        assert.ok(doc.country);
        assert.ok(doc.state);
    });

    it('keeps a state revealed by a condition consistent with its top-level country', () => {
        const state = geo('state', 'state', { on: 'country', kind: 'geo' });
        const doc = generate(
            [
                geo('continent', 'continent'),
                geo('country', 'country', { on: 'continent', kind: 'geo' }),
                field({ name: 'trigger', customType: 'enum', enum: ['yes', 'no'] }),
            ],
            [{
                ifCondition: { field: { name: 'trigger' }, fieldValue: 'yes' },
                thenFields: [state],
                elseFields: [],
            }],
        );
        assert.equal(getContinentOfCountry(doc.country), doc.continent);
        assert.ok(getStatesOfCountry(doc.country).some((s) => s.value === doc.state));
    });

    it('fills a state that depends on a country field with no continent', () => {
        const doc = generate([
            geo('country', 'country'),
            geo('state', 'state', { on: 'country', kind: 'geo' }),
        ]);
        assert.ok(getStatesOfCountry(doc.country).some((s) => s.value === doc.state));
    });
});

describe('DocumentGenerator conditional fields', () => {
    const predicate = (name, value) => ({ field: { name }, fieldValue: value });
    const condition = (ifCondition, thenFields, elseFields = []) => ({
        ifCondition,
        thenFields,
        elseFields,
    });
    const trigger = field({
        name: 'trigger',
        customType: 'enum',
        enum: ['yes', 'no'],
    });

    it('adds the then fields when the condition holds', () => {
        const doc = generate(
            [trigger],
            [condition(predicate('trigger', 'yes'), [field({ name: 'extra' })])],
        );
        assert.equal(doc.extra, 'example');
    });

    it('adds the else fields when the condition does not hold', () => {
        const doc = generate(
            [trigger],
            [condition(predicate('trigger', 'no'), [field({ name: 'a' })], [field({ name: 'b' })])],
        );
        assert.equal('a' in doc, false);
        assert.equal(doc.b, 'example');
    });

    it('leaves out a conditionUserOrdered field of the inactive branch', () => {
        const ordered = field({ name: 'extra', conditionUserOrdered: true });
        const doc = generate(
            [trigger, ordered],
            [condition(predicate('trigger', 'no'), [ordered])],
        );
        assert.equal('extra' in doc, false);
    });

    it('follows chained conditions', () => {
        const second = field({ name: 'second', customType: 'enum', enum: ['yes', 'no'] });
        const doc = generate(
            [trigger],
            [
                condition(predicate('trigger', 'yes'), [second]),
                condition(predicate('second', 'yes'), [field({ name: 'deep' })]),
            ],
        );
        assert.equal(doc.second, 'yes');
        assert.equal(doc.deep, 'example');
    });

    it('does not add fields of a condition whose source field was never asked', () => {
        const hidden = field({ name: 'hidden', customType: 'enum', enum: ['yes', 'no'] });
        const doc = generate(
            [trigger],
            [
                condition(predicate('trigger', 'no'), [hidden]),
                condition(predicate('hidden', 'no'), [], [field({ name: 'orphan' })]),
            ],
        );
        assert.equal('hidden' in doc, false);
        assert.equal('orphan' in doc, false);
    });

    it('evaluates AND and OR conditions', () => {
        const doc = generate(
            [trigger],
            [
                condition(
                    { AND: [predicate('trigger', 'yes'), predicate('trigger', 'no')] },
                    [field({ name: 'andField' })],
                ),
                condition(
                    { OR: [predicate('trigger', 'no'), predicate('trigger', 'yes')] },
                    [field({ name: 'orField' })],
                ),
            ],
        );
        assert.equal('andField' in doc, false);
        assert.equal(doc.orField, 'example');
    });

    it('applies conditions declared on a sub-schema field', () => {
        const doc = generate([
            field({
                name: 'child',
                type: '#Child&1.0.0',
                isRef: true,
                fields: [trigger],
                conditions: [condition(predicate('trigger', 'yes'), [field({ name: 'extra' })])],
            }),
        ]);
        assert.equal(doc.child.extra, 'example');
    });
});
