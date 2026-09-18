import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

/*
 * removeTemplateFieldIds used walkDocumentProperties, which only follows
 * `properties`. Embedded sub-schema definitions under `$defs` kept their
 * templateFieldId markers after a detach — inconsistent with the cleaned
 * sub-schema rows, and leaking into subsequently published documents.
 */

const documentWithDefs = () => ({
    $id: '#Root',
    properties: {
        plain: { type: 'string', templateFieldId: 'f-plain' },
        nested: {
            type: 'object',
            templateFieldId: 'f-nested',
            properties: {
                inner: { type: 'string', templateFieldId: 'f-inner' },
            },
        },
        list: {
            type: 'array',
            templateFieldId: 'f-list',
            items: {
                type: 'object',
                properties: {
                    item: { type: 'string', templateFieldId: 'f-item' },
                },
            },
        },
    },
    $defs: {
        '#Sub': {
            $id: '#Sub',
            properties: {
                subField: { type: 'string', templateFieldId: 'f-sub' },
                subNested: {
                    type: 'object',
                    properties: {
                        deep: { type: 'string', templateFieldId: 'f-deep' },
                    },
                },
            },
        },
    },
});

const collectMarkers = (node, found = []) => {
    if (!node || typeof node !== 'object') {
        return found;
    }
    if (Object.prototype.hasOwnProperty.call(node, 'templateFieldId')) {
        found.push(node.templateFieldId);
    }
    for (const value of Object.values(node)) {
        collectMarkers(value, found);
    }
    return found;
};

describe('SchemaHelper.removeTemplateFieldIds', () => {
    it('finds every marker in the fixture before removal', () => {
        // guards the test itself: if the fixture stops carrying markers the
        // assertions below would pass vacuously
        assert.deepEqual(
            collectMarkers(documentWithDefs()).sort(),
            ['f-deep', 'f-inner', 'f-item', 'f-list', 'f-nested', 'f-plain', 'f-sub']
        );
    });

    it('removes markers from $defs as well as properties', () => {
        const document = documentWithDefs();

        SchemaHelper.removeTemplateFieldIds(document);

        assert.deepEqual(collectMarkers(document), [],
            'no templateFieldId may survive anywhere in the document');
    });

    it('leaves the rest of the document intact', () => {
        const document = documentWithDefs();

        SchemaHelper.removeTemplateFieldIds(document);

        assert.equal(document.$defs['#Sub'].properties.subField.type, 'string');
        assert.equal(document.$defs['#Sub'].properties.subNested.properties.deep.type, 'string');
        assert.equal(document.properties.list.items.properties.item.type, 'string');
        assert.equal(document.$id, '#Root');
    });

    it('is safe on a document with no $defs and on empty input', () => {
        const plain = { properties: { a: { type: 'string', templateFieldId: 'x' } } };
        SchemaHelper.removeTemplateFieldIds(plain);
        assert.deepEqual(collectMarkers(plain), []);

        assert.doesNotThrow(() => SchemaHelper.removeTemplateFieldIds(undefined));
        assert.doesNotThrow(() => SchemaHelper.removeTemplateFieldIds({}));
    });
});
