import { assert } from 'chai';
import { XlsxResult } from '../../../dist/xlsx/models/xlsx-result.js';
import { Workbook } from '../../../dist/xlsx/models/workbook.js';

function ws(name) {
    return new Workbook().createWorksheet(name);
}

/*
 * A schema stand-in that satisfies everything updateSchemas() touches, so any throw is
 * the bug under test rather than an artefact of the fixture. A real throw lands in the
 * outer catch and collapses every collected error into one generic
 * "Failed to update schemas." - which is exactly the regression being pinned.
 */
function fakeSchema(name, iri, fields) {
    const schema = {
        name,
        iri,
        fields,
        updateDocument() { },
        updateRefs() { },
    };
    return {
        schema,
        worksheet: { name },
        updateExpressions() { },
    };
}

describe('@unit XlsxResult.updateSchemas unknown ref types', () => {
    it('reports the unknown type without collapsing the other errors', () => {
        const r = new XlsxResult();
        const sheet = ws('S1');
        const field = { isRef: true, type: 'link_missing', order: 4 };
        r.addSchema(sheet, fakeSchema('S1', '#S1', [field]));
        r.updateSchemas();

        const errors = r.toJson().errors;
        assert.isTrue(
            errors.some((e) => /Unknown field type/.test(e.text)),
            'the precise per-field error must survive'
        );
        assert.isFalse(
            errors.some((e) => /Failed to update schemas/.test(e.text)),
            'the null deref used to abandon the run and replace every error'
        );
        assert.deepEqual(field.errors?.map((e) => e.text), ['Unknown field type.']);
    });

    it('keeps collecting errors from schemas after the bad one', () => {
        const r = new XlsxResult();
        r.addSchema(ws('Bad'), fakeSchema('Bad', '#Bad', [{ isRef: true, type: 'link_missing', order: 1 }]));

        // a resolvable link whose target is absent from the cache - a different,
        // later error that the crash used to swallow
        const linkId = r.addLink('Nowhere');
        r.addSchema(ws('Next'), fakeSchema('Next', '#Next', [{ isRef: true, type: linkId, order: 2 }]));

        const texts = r.updateSchemas() ?? r.toJson().errors.map((e) => e.text);
        assert.include(texts.join('|'), 'Unknown field type.');
        assert.include(texts.join('|'), 'Sub-schema named "Nowhere" not found.');
    });

    it('treats #SentinelHUB as a known ref type, like #GeoJSON', () => {
        const r = new XlsxResult();
        r.addSchema(ws('Geo'), fakeSchema('Geo', '#Geo', [
            { isRef: true, type: '#GeoJSON', order: 1 },
            { isRef: true, type: '#SentinelHUB', order: 2 },
        ]));
        r.updateSchemas();
        assert.deepEqual(r.toJson().errors, []);
    });
});
