import { assert } from 'chai';

import { DefaultDocumentLoader } from '../../../../dist/hedera-modules/document-loader/document-loader-default.js';
import { LocalDidLoader } from '../../../../dist/document-loader/local-did-loader.js';
import { VCJS } from '../../../../dist/hedera-modules/vcjs/vcjs.js';

void DefaultDocumentLoader;
void LocalDidLoader;

describe('VCJS — enhanceConditionErrors', function () {
    function makeVcjs() {
        return new VCJS();
    }

    it('enhances a root-level condition violation with a readable message', async function () {
        const vcjs = makeVcjs();
        vcjs.schemaLoader = async () => ({
            type: 'object',
            properties: {
                trigger: { type: 'string' },
                optField: { type: 'string' },
            },
            allOf: [
                {
                    if: { properties: { trigger: { const: 'go' } }, required: ['trigger'] },
                    then: { properties: {}, required: [] },
                    else: { properties: { optField: false } },
                },
            ],
        });

        const result = await vcjs.verifySubject({ trigger: 'stop', optField: 'should not be here' });

        assert.isFalse(result.ok);
        const enhanced = result.error.details.find(e => e.keyword === 'false schema');
        assert.exists(enhanced, 'the false-schema error should be present');
        assert.match(enhanced.message, /not allowed unless/);
        assert.match(enhanced.message, /trigger = 'go'/);
    });

    it('resolves the condition owner via schemaPath for a condition inside a $defs entry', async function () {
        // Regression guard: schemaPath for a condition nested inside a $defs entry never
        // contains a literal "/$defs/" segment — AJV uses the sub-schema's own $id as the
        // fragment base (e.g. "#Sub/allOf/0/else/..."), not a path through the parent's $defs.
        const vcjs = makeVcjs();
        vcjs.schemaLoader = async () => ({
            type: 'object',
            properties: { sub: { $ref: '#Sub' } },
            required: ['sub'],
            $defs: {
                '#Sub': {
                    $id: '#Sub',
                    type: 'object',
                    properties: {
                        innerTrigger: { type: 'string' },
                        innerOptField: { type: 'string' },
                    },
                    allOf: [
                        {
                            if: { properties: { innerTrigger: { const: 'go' } }, required: ['innerTrigger'] },
                            then: { properties: {}, required: [] },
                            else: { properties: { innerOptField: false } },
                        },
                    ],
                },
            },
        });

        const result = await vcjs.verifySubject({
            sub: { innerTrigger: 'stop', innerOptField: 'should not be here' },
        });

        assert.isFalse(result.ok);
        const enhanced = result.error.details.find(e => e.keyword === 'false schema');
        assert.exists(enhanced, 'the false-schema error inside the $defs entry should be present');
        assert.match(enhanced.message, /not allowed unless/);
        assert.match(enhanced.message, /innerTrigger = 'go'/);
    });

    it('does not conflate two sibling conditions defined in different $defs entries', async function () {
        const vcjs = makeVcjs();
        vcjs.schemaLoader = async () => ({
            type: 'object',
            properties: { subA: { $ref: '#SubA' }, subB: { $ref: '#SubB' } },
            required: ['subA', 'subB'],
            $defs: {
                '#SubA': {
                    $id: '#SubA',
                    type: 'object',
                    properties: { triggerA: { type: 'string' }, fieldA: { type: 'string' } },
                    allOf: [{
                        if: { properties: { triggerA: { const: 'yesA' } }, required: ['triggerA'] },
                        then: { properties: {}, required: [] },
                        else: { properties: { fieldA: false } },
                    }],
                },
                '#SubB': {
                    $id: '#SubB',
                    type: 'object',
                    properties: { triggerB: { type: 'string' }, fieldB: { type: 'string' } },
                    allOf: [{
                        if: { properties: { triggerB: { const: 'yesB' } }, required: ['triggerB'] },
                        then: { properties: {}, required: [] },
                        else: { properties: { fieldB: false } },
                    }],
                },
            },
        });

        const result = await vcjs.verifySubject({
            subA: { triggerA: 'no', fieldA: 'leaked' },
            subB: { triggerB: 'yesB' },
        });

        assert.isFalse(result.ok);
        const enhanced = result.error.details.find(e => e.keyword === 'false schema');
        assert.exists(enhanced);
        assert.match(enhanced.message, /triggerA = 'yesA'/, 'must resolve SubA\'s own condition, not SubB\'s');
    });
});

describe('VCJS — coerceConditionConsts', function () {
    function makeVcjs() {
        return new VCJS();
    }

    it('coerces a string const to match a numeric field so the condition actually fires', async function () {
        // A schema authored/imported with the const stored as a string (e.g. "5" instead of 5)
        // must still match a real numeric document value — otherwise the condition silently
        // never triggers and its then/else constraints never apply.
        const vcjs = makeVcjs();
        vcjs.schemaLoader = async () => ({
            type: 'object',
            properties: { score: { type: 'number' }, optField: { type: 'string' } },
            allOf: [{
                if: { properties: { score: { const: '5' } }, required: ['score'] },
                then: { properties: {}, required: [] },
                else: { properties: { optField: false } },
            }],
        });

        const matching = await vcjs.verifySubject({ score: 5, optField: 'allowed because condition is true' });
        assert.isTrue(matching.ok, 'condition should fire for score=5, allowing optField');

        const nonMatching = await vcjs.verifySubject({ score: 7, optField: 'should be forbidden' });
        assert.isFalse(nonMatching.ok, 'condition should not fire for score=7, forbidding optField');
    });

    it('coerces string consts inside a per-field anyOf to match a numeric field', async function () {
        const vcjs = makeVcjs();
        vcjs.schemaLoader = async () => ({
            type: 'object',
            properties: { score: { type: 'number' }, optField: { type: 'string' } },
            allOf: [{
                if: {
                    properties: { score: { anyOf: [{ const: '1' }, { const: '2' }] } },
                    required: ['score'],
                },
                then: { properties: {}, required: [] },
                else: { properties: { optField: false } },
            }],
        });

        const matching = await vcjs.verifySubject({ score: 2, optField: 'allowed' });
        assert.isTrue(matching.ok, 'condition should fire for score=2 (matches the second anyOf branch)');

        const nonMatching = await vcjs.verifySubject({ score: 3, optField: 'should be forbidden' });
        assert.isFalse(nonMatching.ok, 'condition should not fire for score=3');
    });

    it('coerces a "True"/"1"-style string const to a real boolean', function () {
        const vcjs = makeVcjs();
        const schema = {
            type: 'object',
            properties: { flag: { type: 'boolean' } },
            allOf: [{ if: { properties: { flag: { const: 'True' } }, required: ['flag'] }, then: {} }],
        };
        vcjs.coerceConditionConsts(schema);
        assert.strictEqual(schema.allOf[0].if.properties.flag.const, true);
    });

    it('coerces a const against an array-typed field using the array\'s item type', function () {
        // contextProp.type === 'array': the coercion target type must come from items.type,
        // not from the (non-primitive) "array" type itself.
        const vcjs = makeVcjs();
        const schema = {
            type: 'object',
            properties: { tags: { type: 'array', items: { type: 'number' } } },
            allOf: [{ if: { properties: { tags: { const: '5' } }, required: ['tags'] }, then: {} }],
        };
        vcjs.coerceConditionConsts(schema);
        assert.strictEqual(schema.allOf[0].if.properties.tags.const, 5);
    });
});

describe('VCJS — enhanceConditionErrors passthrough', function () {
    function makeVcjs() {
        return new VCJS();
    }

    it('leaves an unrelated AJV error untouched', async function () {
        const vcjs = makeVcjs();
        vcjs.schemaLoader = async () => ({
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
        });

        const result = await vcjs.verifySubject({});

        assert.isFalse(result.ok);
        const error = result.error.details[0];
        assert.equal(error.keyword, 'required');
        assert.notMatch(error.message, /not allowed unless/);
    });
});
