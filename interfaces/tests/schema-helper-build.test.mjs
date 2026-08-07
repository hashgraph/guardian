import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.buildType / buildRef / buildUrl', () => {
    it('buildType joins uuid and version with &', () => {
        assert.equal(SchemaHelper.buildType('uuid-1', '1.0.0'), 'uuid-1&1.0.0');
    });

    it('buildType returns just uuid when no version', () => {
        assert.equal(SchemaHelper.buildType('uuid-1'), 'uuid-1');
    });

    it('buildRef prepends #', () => {
        assert.equal(SchemaHelper.buildRef('uuid-1&1.0.0'), '#uuid-1&1.0.0');
    });

    it('buildUrl concatenates contextURL and ref, accepting empty parts', () => {
        assert.equal(SchemaHelper.buildUrl('https://x', '#abc'), 'https://x#abc');
        assert.equal(SchemaHelper.buildUrl('', '#abc'), '#abc');
        assert.equal(SchemaHelper.buildUrl('https://x', ''), 'https://x');
        assert.equal(SchemaHelper.buildUrl(undefined, undefined), '');
    });
});

describe('SchemaHelper.parseRef', () => {
    it('parses iri / type / uuid / version from a string ref', () => {
        const result = SchemaHelper.parseRef('https://x#uuid-1&1.0.0');
        assert.equal(result.iri, 'https://x#uuid-1&1.0.0');
        assert.equal(result.type, 'uuid-1&1.0.0');
        assert.equal(result.uuid, 'uuid-1');
        assert.equal(result.version, '1.0.0');
    });

    it('treats missing version segment as null', () => {
        const result = SchemaHelper.parseRef('https://x#uuid-only');
        assert.equal(result.uuid, 'uuid-only');
        assert.equal(result.version, null);
    });

    it('returns all-null on empty string', () => {
        const result = SchemaHelper.parseRef('');
        assert.equal(result.iri, null);
        assert.equal(result.uuid, null);
        assert.equal(result.version, null);
    });

    it('parses an ISchema-like object via its document.$id', () => {
        const result = SchemaHelper.parseRef({
            document: { $id: 'https://x#uuid-1&2.0.0' },
        });
        assert.equal(result.uuid, 'uuid-1');
        assert.equal(result.version, '2.0.0');
    });

    it('parses a JSON-string document', () => {
        const result = SchemaHelper.parseRef({
            document: JSON.stringify({ $id: 'https://x#uuid-1&3.0.0' }),
        });
        assert.equal(result.version, '3.0.0');
    });

    it('returns all-null on malformed input rather than throwing', () => {
        const result = SchemaHelper.parseRef({ document: 'not-json' });
        assert.equal(result.iri, null);
    });
});

describe('SchemaHelper.incrementVersion', () => {
    it("returns '1.0.0' when there is no prior version and no others (the implementation defaults previousVersion to '1.0.0' but ALSO pushes the empty original onto versions, so map['1.0'] tracks the 0 from the default and the next bump still lands on 1.0.0)", () => {
        // versions=[''] is filtered out (continue on falsy), then the function
        // sets previousVersion='1.0.0' AFTER the loop. map['1.0'] is undefined
        // → next = '1.0.' + ((-1)+1) = '1.0.0'.
        assert.equal(SchemaHelper.incrementVersion('', []), '1.0.0');
    });

    it('increments past the largest known patch in the same major.minor', () => {
        const next = SchemaHelper.incrementVersion('1.0.0', ['1.0.1', '1.0.5', '2.0.0']);
        assert.equal(next, '1.0.6');
    });

    it('starts a fresh minor at .0 when no other versions share the prefix', () => {
        const next = SchemaHelper.incrementVersion('1.5.0', []);
        assert.equal(next, '1.5.1');
    });

    it('skips empty entries in versions list', () => {
        const next = SchemaHelper.incrementVersion('1.0.0', ['', null, undefined, '1.0.3']);
        assert.equal(next, '1.0.4');
    });
});
