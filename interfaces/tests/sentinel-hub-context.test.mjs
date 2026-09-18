import assert from 'node:assert/strict';
import SentinelHubContext from '../dist/helpers/sentinel-hub/sentinel-hub-context.js';

describe('SentinelHUB JSON-LD @context', () => {
    it('declares JSON-LD version 1.1', () => {
        assert.equal(SentinelHubContext['@context']['@version'], 1.1);
    });

    it('falls back to the traceability undefinedTerm vocabulary', () => {
        assert.equal(
            SentinelHubContext['@context']['@vocab'],
            'https://w3id.org/traceability/#undefinedTerm',
        );
    });

    it('id and type map to JSON-LD reserved keywords', () => {
        assert.equal(SentinelHubContext['@context'].id, '@id');
        assert.equal(SentinelHubContext['@context'].type, '@type');
    });

    it('SentinelHUB term points at the #SentinelHUB schema fragment', () => {
        assert.equal(SentinelHubContext['@context'].SentinelHUB['@id'], '#SentinelHUB');
    });

    it('every nested SentinelHUB field is typed as schema.org/text', () => {
        const inner = SentinelHubContext['@context'].SentinelHUB['@context'];
        const expectedType = 'https://www.schema.org/text';
        for (const key of ['layers', 'format', 'maxcc', 'width', 'height', 'time', 'bbox']) {
            assert.equal(inner[key]['@type'], expectedType, `${key} should map to schema.org/text`);
        }
    });
});
