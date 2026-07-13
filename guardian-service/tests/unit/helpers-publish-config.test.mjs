import assert from 'node:assert/strict';
import { publishRuleConfig } from '../../dist/api/helpers/schema-rules-helpers.js';
import { publishConfig, getSubject, uniqueDocuments } from '../../dist/api/helpers/policy-statistics-helpers.js';
import { publishLabelConfig } from '../../dist/api/helpers/policy-labels-helpers.js';

describe('publishRuleConfig', () => {
    it('returns the same falsy data untouched', () => {
        assert.equal(publishRuleConfig(null), null);
        assert.equal(publishRuleConfig(undefined), undefined);
    });

    it('collects unique schemaIds from fields into data.schemas', () => {
        const data = publishRuleConfig({ fields: [{ schemaId: 'a' }, { schemaId: 'b' }, { schemaId: 'a' }] });
        assert.deepEqual(data.schemas, ['a', 'b']);
    });

    it('sets schemas to empty array when there are no fields', () => {
        const data = publishRuleConfig({});
        assert.deepEqual(data.schemas, []);
    });

    it('returns the same object reference', () => {
        const input = { fields: [] };
        assert.equal(publishRuleConfig(input), input);
    });

    it('handles a single field', () => {
        const data = publishRuleConfig({ fields: [{ schemaId: 'only' }] });
        assert.deepEqual(data.schemas, ['only']);
    });
});

describe('publishConfig (statistics)', () => {
    it('keeps only rules whose schemaId is referenced by a variable', () => {
        const data = publishConfig({
            rules: [{ schemaId: 'a' }, { schemaId: 'b' }, { schemaId: 'c' }],
            variables: [{ schemaId: 'a' }, { schemaId: 'c' }]
        });
        assert.deepEqual(data.rules.map(r => r.schemaId), ['a', 'c']);
    });

    it('drops all rules when no variables are present', () => {
        const data = publishConfig({ rules: [{ schemaId: 'a' }], variables: [] });
        assert.deepEqual(data.rules, []);
    });

    it('produces empty rules for an empty object', () => {
        const data = publishConfig({});
        assert.deepEqual(data.rules, []);
    });

    it('keeps all rules when every schema is referenced', () => {
        const data = publishConfig({
            rules: [{ schemaId: 'x' }, { schemaId: 'y' }],
            variables: [{ schemaId: 'x' }, { schemaId: 'y' }]
        });
        assert.equal(data.rules.length, 2);
    });

    it('returns the same object reference', () => {
        const input = { rules: [], variables: [] };
        assert.equal(publishConfig(input), input);
    });
});

describe('getSubject', () => {
    it('returns the credentialSubject object when it has an id', () => {
        const subject = { id: 'did:s', field: 1 };
        assert.equal(getSubject({ document: { credentialSubject: subject } }), subject);
    });

    it('unwraps an array credentialSubject by taking the first entry', () => {
        const first = { id: 'did:first' };
        assert.equal(getSubject({ document: { credentialSubject: [first, { id: 'did:second' }] } }), first);
    });

    it('falls back to the document when credentialSubject has no id', () => {
        const doc = { document: { credentialSubject: { noId: true } } };
        assert.equal(getSubject(doc), doc);
    });

    it('falls back to the document when there is no credentialSubject', () => {
        const doc = { document: {} };
        assert.equal(getSubject(doc), doc);
    });

    it('falls back to the document when document is missing', () => {
        const doc = { messageId: 'm' };
        assert.equal(getSubject(doc), doc);
    });
});

describe('uniqueDocuments', () => {
    it('returns an empty array for no documents', () => {
        assert.deepEqual(uniqueDocuments([]), []);
    });

    it('keeps distinct documents of the same schema', () => {
        const docs = [
            { schema: 's1', messageId: 'm1' },
            { schema: 's1', messageId: 'm2' }
        ];
        const result = uniqueDocuments(docs);
        assert.equal(result.length, 2);
    });

    it('drops a document referenced as a relationship of another (same schema)', () => {
        const docs = [
            { schema: 's1', messageId: 'parent', relationships: ['child'] },
            { schema: 's1', messageId: 'child' }
        ];
        const result = uniqueDocuments(docs).map(d => d.messageId);
        assert.deepEqual(result, ['parent']);
    });

    it('does not drop relationships that belong to a different schema bucket', () => {
        const docs = [
            { schema: 's1', messageId: 'parent', relationships: ['child'] },
            { schema: 's2', messageId: 'child' }
        ];
        const result = uniqueDocuments(docs);
        assert.equal(result.length, 2);
    });

    it('groups documents by schema', () => {
        const docs = [
            { schema: 'a', messageId: 'm1' },
            { schema: 'b', messageId: 'm2' },
            { schema: 'a', messageId: 'm3' }
        ];
        assert.equal(uniqueDocuments(docs).length, 3);
    });
});

describe('publishLabelConfig', () => {
    it('returns the data unchanged', () => {
        const data = { any: 'value' };
        assert.equal(publishLabelConfig(data), data);
    });

    it('passes through null', () => {
        assert.equal(publishLabelConfig(null), null);
    });
});
