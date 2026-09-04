import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

/*
 * walkDocumentProperties only followed `properties` and array `items`, never
 * `allOf[*].then`/`.else`. A field declared only inside a condition branch was
 * therefore invisible to every function built on it: ensureTemplateFieldIds
 * never assigned it a templateFieldId, collectTemplateFieldIds never saw it,
 * and removeTemplateFieldIds never cleaned it up on detach.
 */

const documentWithCondition = () => ({
    $id: '#Root',
    properties: {
        kind: { type: 'string', templateFieldId: 'f-kind' },
    },
    allOf: [
        {
            if: { properties: { kind: { const: 'a' } } },
            then: {
                properties: {
                    permitNumber: { type: 'string', templateFieldId: 'f-permit' },
                },
            },
            else: {
                properties: {
                    reason: { type: 'string', templateFieldId: 'f-reason' },
                },
            },
        },
    ],
});

describe('SchemaHelper.walkDocumentProperties - condition branches', () => {
    it('collectTemplateFieldIds sees fields declared only inside then/else', () => {
        const { ids, byPath } = SchemaHelper.collectTemplateFieldIds(documentWithCondition());

        assert.equal(ids.has('f-permit'), true);
        assert.equal(ids.has('f-reason'), true);
        assert.equal(byPath.get('permitNumber'), 'f-permit');
        assert.equal(byPath.get('reason'), 'f-reason');
    });

    it('ensureTemplateFieldIds assigns ids to conditional fields missing one', () => {
        const document = documentWithCondition();
        delete document.allOf[0].then.properties.permitNumber.templateFieldId;

        const changed = SchemaHelper.ensureTemplateFieldIds(document);

        assert.equal(changed, true);
        assert.equal(typeof document.allOf[0].then.properties.permitNumber.templateFieldId, 'string');
        assert.ok(document.allOf[0].then.properties.permitNumber.templateFieldId.length > 0);
    });

    it('removeTemplateFieldIds strips markers from then and else branches', () => {
        const document = documentWithCondition();

        SchemaHelper.removeTemplateFieldIds(document);

        assert.equal(document.allOf[0].then.properties.permitNumber.templateFieldId, undefined);
        assert.equal(document.allOf[0].else.properties.reason.templateFieldId, undefined);
        assert.equal(document.properties.kind.templateFieldId, undefined);
        assert.equal(document.allOf[0].then.properties.permitNumber.type, 'string',
            'removal must not touch the rest of the property');
    });
});

/*
 * An asymmetric condition - a field revealed on only one branch, the common case -
 * compiles a `properties: { name: false }` placeholder into the opposite branch
 * (buildDocument's buildForbid). That is a "this field does not exist here" marker,
 * not a field, and has no slot for a templateFieldId. Recursing into allOf[*].then/
 * else must not hand it to the visitor as if it were one.
 */
const documentWithAsymmetricCondition = () => ({
    $id: '#Root',
    properties: {
        kind: { type: 'string', templateFieldId: 'f-kind' },
    },
    allOf: [
        {
            if: { properties: { kind: { const: 'a' } } },
            then: {
                properties: {
                    permitNumber: { type: 'string', templateFieldId: 'f-permit' },
                },
            },
            else: {
                // buildForbid's compiled shape for a then-only field
                properties: { permitNumber: false },
            },
        },
    ],
});

describe('SchemaHelper.walkDocumentProperties - false branch markers', () => {
    it('ensureTemplateFieldIds does not crash on a forbidden-field marker and still tags the real field', () => {
        const document = documentWithAsymmetricCondition();
        delete document.allOf[0].then.properties.permitNumber.templateFieldId;

        assert.doesNotThrow(() => SchemaHelper.ensureTemplateFieldIds(document));
        assert.equal(typeof document.allOf[0].then.properties.permitNumber.templateFieldId, 'string');
        assert.equal(document.allOf[0].else.properties.permitNumber, false,
            'the forbidden marker itself must be left untouched');
    });

    it('prepareTemplateFieldIds does not crash on a forbidden-field marker', () => {
        const document = documentWithAsymmetricCondition();

        assert.doesNotThrow(() => SchemaHelper.prepareTemplateFieldIds(document));
        assert.equal(document.allOf[0].else.properties.permitNumber, false);
    });

    it('collectTemplateFieldIds and removeTemplateFieldIds ignore a forbidden-field marker', () => {
        const document = documentWithAsymmetricCondition();

        const { ids } = SchemaHelper.collectTemplateFieldIds(document);
        assert.equal(ids.has('f-permit'), true);

        assert.doesNotThrow(() => SchemaHelper.removeTemplateFieldIds(document));
        assert.equal(document.allOf[0].else.properties.permitNumber, false);
    });
});

/*
 * A cross-schema condition target compiles to a constraint wrapper
 * (buildCrossRequired/buildCrossForbidden) keyed by the name of the real ref
 * field it reaches into, e.g. `parentRef: { required: ['childField'] }` - not a
 * field, and sharing the exact top-level path of the real `parentRef` field.
 * Visiting it as if it were a field would overwrite `parentRef`'s own tracked
 * templateFieldId with a bogus one minted for the wrapper.
 */
const documentWithCrossSchemaTarget = () => ({
    $id: '#Root',
    properties: {
        kind: { type: 'string', templateFieldId: 'f-kind' },
        parentRef: { $ref: '#Sub', templateFieldId: 'f-parentRef' },
    },
    allOf: [
        {
            if: { properties: { kind: { const: 'a' } } },
            then: {
                // buildCrossRequired's compiled shape: no `type`/`$ref` of its own
                properties: { parentRef: { required: ['childField'] } },
            },
        },
    ],
});

describe('SchemaHelper.walkDocumentProperties - cross-schema constraint wrappers', () => {
    it('does not visit the wrapper as a field, and leaves the real field\'s id untouched', () => {
        const document = documentWithCrossSchemaTarget();

        const changed = SchemaHelper.ensureTemplateFieldIds(document);

        assert.equal(changed, false, 'the wrapper must not be minted a templateFieldId');
        assert.equal(document.allOf[0].then.properties.parentRef.templateFieldId, undefined);
        assert.deepEqual(document.allOf[0].then.properties.parentRef, { required: ['childField'] },
            'the wrapper must be left exactly as compiled');
    });

    it('does not let the wrapper overwrite the real field\'s entry in byPath', () => {
        const { byPath } = SchemaHelper.collectTemplateFieldIds(documentWithCrossSchemaTarget());

        assert.equal(byPath.get('parentRef'), 'f-parentRef');
    });

    it('end to end: minting ids first must not corrupt the real field\'s id afterward', () => {
        // Exactly the reported failure mode: ensureTemplateFieldIds runs on a
        // document with no guard, mints a bogus id onto the wrapper, and a
        // later collectTemplateFieldIds picks it up at the real field's path.
        const document = documentWithCrossSchemaTarget();

        SchemaHelper.ensureTemplateFieldIds(document);
        const { byPath } = SchemaHelper.collectTemplateFieldIds(document);

        assert.equal(byPath.get('parentRef'), 'f-parentRef',
            'the real field\'s stable id must survive minting ids on the rest of the document');
    });
});

/*
 * The type/$ref check that excludes cross-schema wrapper nodes must only apply
 * inside a condition branch. `buildDocument`'s own top-level `@context`/`type`
 * properties are a legitimate `oneOf`-only shape with no `type`/`$ref` of their
 * own - applying the same guard unscoped would silently stop them (and any other
 * bare-oneOf top-level property) from ever being visited or tagged, which is a
 * behavior change nobody asked for.
 */
describe('SchemaHelper.walkDocumentProperties - oneOf-only properties outside a condition', () => {
    const documentWithOneOfProperty = () => ({
        $id: '#Root',
        properties: {
            '@context': {
                oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                readOnly: true,
            },
            kind: { type: 'string', templateFieldId: 'f-kind' },
        },
    });

    it('still visits a bare oneOf property at the top level', () => {
        const document = documentWithOneOfProperty();

        const changed = SchemaHelper.ensureTemplateFieldIds(document);

        assert.equal(changed, true);
        assert.equal(typeof document.properties['@context'].templateFieldId, 'string');
    });

    it('still collects an existing id on a bare oneOf property at the top level', () => {
        const document = documentWithOneOfProperty();
        document.properties['@context'].templateFieldId = 'f-context';

        const { byPath } = SchemaHelper.collectTemplateFieldIds(document);

        assert.equal(byPath.get('@context'), 'f-context');
    });
});
