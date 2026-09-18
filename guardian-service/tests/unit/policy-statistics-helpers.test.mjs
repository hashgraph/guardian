import { assert } from 'chai';
import {
    publishConfig,
    getSubject,
    uniqueDocuments,
} from '../../dist/api/helpers/policy-statistics-helpers.js';

describe('policy-statistics-helpers publishConfig', () => {
    it('keeps only rules whose schemaId appears in the variables', () => {
        const data = {
            variables: [{ schemaId: 'A' }, { schemaId: 'B' }],
            rules: [{ schemaId: 'A' }, { schemaId: 'C' }, { schemaId: 'B' }],
        };
        const out = publishConfig(data);
        assert.deepEqual(out.rules.map((r) => r.schemaId), ['A', 'B']);
    });

    it('drops all rules when there are no variables', () => {
        const data = { variables: [], rules: [{ schemaId: 'A' }] };
        assert.deepEqual(publishConfig(data).rules, []);
    });

    it('treats missing variables/rules as empty arrays', () => {
        const data = {};
        const out = publishConfig(data);
        assert.deepEqual(out.rules, []);
    });

    it('returns the same object reference it was given', () => {
        const data = { variables: [{ schemaId: 'A' }], rules: [{ schemaId: 'A' }] };
        assert.strictEqual(publishConfig(data), data);
    });

    it('keeps duplicate rules that match a variable schema', () => {
        const data = {
            variables: [{ schemaId: 'A' }],
            rules: [{ schemaId: 'A' }, { schemaId: 'A' }],
        };
        assert.equal(publishConfig(data).rules.length, 2);
    });
});

describe('policy-statistics-helpers getSubject', () => {
    it('returns the credentialSubject object when it has an id', () => {
        const doc = { document: { credentialSubject: { id: 'urn:1', value: 5 } } };
        assert.deepEqual(getSubject(doc), { id: 'urn:1', value: 5 });
    });

    it('unwraps the first element when credentialSubject is an array', () => {
        const doc = { document: { credentialSubject: [{ id: 'urn:first' }, { id: 'urn:second' }] } };
        assert.deepEqual(getSubject(doc), { id: 'urn:first' });
    });

    it('falls back to the whole document when credentialSubject has no id', () => {
        const doc = { document: { credentialSubject: { value: 5 } } };
        assert.strictEqual(getSubject(doc), doc);
    });

    it('falls back to the whole document when there is no credentialSubject', () => {
        const doc = { document: {} };
        assert.strictEqual(getSubject(doc), doc);
    });

    it('falls back to the document when document is undefined', () => {
        const doc = {};
        assert.strictEqual(getSubject(doc), doc);
    });
});

describe('policy-statistics-helpers uniqueDocuments', () => {
    it('returns a single document unchanged', () => {
        const docs = [{ messageId: 'm1', schema: 's', relationships: [] }];
        assert.deepEqual(uniqueDocuments(docs), docs);
    });

    it('drops a document that is referenced as a relationship of another (same schema)', () => {
        const child = { messageId: 'child', schema: 's', relationships: [] };
        const parent = { messageId: 'parent', schema: 's', relationships: ['child'] };
        const out = uniqueDocuments([child, parent]);
        const ids = out.map((d) => d.messageId);
        assert.include(ids, 'parent');
        assert.notInclude(ids, 'child');
    });

    it('does not drop a referenced document of a different schema (separate hash bucket)', () => {
        const child = { messageId: 'child', schema: 'other', relationships: [] };
        const parent = { messageId: 'parent', schema: 's', relationships: ['child'] };
        const out = uniqueDocuments([child, parent]);
        const ids = out.map((d) => d.messageId);
        assert.include(ids, 'parent');
        assert.include(ids, 'child');
    });

    it('keeps documents whose relationships point to unknown ids', () => {
        const docs = [{ messageId: 'a', schema: 's', relationships: ['missing'] }];
        assert.equal(uniqueDocuments(docs).length, 1);
    });

    it('handles documents without a relationships array', () => {
        const docs = [
            { messageId: 'a', schema: 's' },
            { messageId: 'b', schema: 's' },
        ];
        assert.equal(uniqueDocuments(docs).length, 2);
    });

    it('returns an empty array for empty input', () => {
        assert.deepEqual(uniqueDocuments([]), []);
    });
});
