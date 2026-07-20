import { assert } from 'chai';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

const schema = (overrides = {}) => ({
    iri: '#MyType',
    contextURL: 'https://context.example/schema',
    ...overrides,
});

const vcDocument = (credentialSubject) => ({ document: { credentialSubject } });

describe('PolicyUtils.getSchemaContext', () => {
    it('returns the context url for a normal policy', () => {
        assert.equal(PolicyUtils.getSchemaContext({ dryRun: false }, schema()), 'https://context.example/schema');
    });

    it('returns a synthetic context in dry run mode', () => {
        assert.equal(PolicyUtils.getSchemaContext({ dryRun: 'dry' }, schema()), 'schema#MyType');
    });
});

describe('PolicyUtils.checkDocumentSchema', () => {
    const ref = { dryRun: false };

    it('accepts a matching object credential subject', () => {
        const doc = vcDocument({ '@context': ['https://context.example/schema'], type: 'MyType' });
        assert.isTrue(PolicyUtils.checkDocumentSchema(ref, doc, schema()));
    });

    it('accepts a matching array credential subject', () => {
        const doc = vcDocument([{ '@context': ['https://context.example/schema'], type: 'MyType' }]);
        assert.isTrue(PolicyUtils.checkDocumentSchema(ref, doc, schema()));
    });

    it('rejects a wrong subject type', () => {
        const doc = vcDocument({ '@context': ['https://context.example/schema'], type: 'OtherType' });
        assert.isFalse(PolicyUtils.checkDocumentSchema(ref, doc, schema()));
    });

    it('rejects a missing context', () => {
        const doc = vcDocument({ '@context': ['https://other.example'], type: 'MyType' });
        assert.isFalse(PolicyUtils.checkDocumentSchema(ref, doc, schema()));
    });

    it('only checks the first subject of an array', () => {
        const doc = vcDocument([
            { '@context': ['https://context.example/schema'], type: 'MyType' },
            { '@context': ['https://other.example'], type: 'OtherType' },
        ]);
        assert.isTrue(PolicyUtils.checkDocumentSchema(ref, doc, schema()));
    });

    it('matches a string context by substring', () => {
        const doc = vcDocument({ '@context': 'https://context.example/schema#x', type: 'MyType' });
        assert.isTrue(PolicyUtils.checkDocumentSchema(ref, doc, schema()));
    });

    it('passes documents without an inner document', () => {
        assert.isTrue(PolicyUtils.checkDocumentSchema(ref, {}, schema()));
        assert.isTrue(PolicyUtils.checkDocumentSchema(ref, null, schema()));
    });

    it('uses the dry run context when in dry run mode', () => {
        const doc = vcDocument({ '@context': ['schema#MyType'], type: 'MyType' });
        assert.isTrue(PolicyUtils.checkDocumentSchema({ dryRun: 'dry' }, doc, schema()));
    });
});

describe('PolicyUtils.setGuardianVersion', () => {
    it('sets the version for code versions above 1.1.0', () => {
        const subject = {};
        PolicyUtils.setGuardianVersion(subject, { codeVersion: '1.2.0' });
        assert.isString(subject.guardianVersion);
        assert.isNotEmpty(subject.guardianVersion);
    });

    it('does nothing for code version 1.1.0', () => {
        const subject = {};
        PolicyUtils.setGuardianVersion(subject, { codeVersion: '1.1.0' });
        assert.notProperty(subject, 'guardianVersion');
    });

    it('does nothing for older code versions', () => {
        const subject = {};
        PolicyUtils.setGuardianVersion(subject, { codeVersion: '1.0.0' });
        assert.notProperty(subject, 'guardianVersion');
    });
});

describe('PolicyUtils.setDocumentTags', () => {
    const tag = (overrides = {}) => ({
        name: 'tag-name',
        description: 'desc',
        owner: 'did:owner',
        target: 'target-1',
        topicId: 'topic-1',
        messageId: 'msg-1',
        inheritTags: true,
        localTarget: 'ignored',
        ...overrides,
    });

    it('appends an inheritable tag as a short tag', () => {
        const document = { document: {} };
        PolicyUtils.setDocumentTags(document, [tag()]);
        assert.deepEqual(document.document.tags, [{
            name: 'tag-name',
            description: 'desc',
            owner: 'did:owner',
            target: 'target-1',
            topicId: 'topic-1',
            messageId: 'msg-1',
            inheritTags: true,
        }]);
    });

    it('skips tags that are not inheritable', () => {
        const document = { document: {} };
        PolicyUtils.setDocumentTags(document, [tag({ inheritTags: false })]);
        assert.deepEqual(document.document.tags, []);
    });

    it('deduplicates by message id', () => {
        const document = { document: {} };
        PolicyUtils.setDocumentTags(document, [tag(), tag({ name: 'other' })]);
        assert.lengthOf(document.document.tags, 1);
    });

    it('keeps existing tags', () => {
        const document = { document: { tags: [{ messageId: 'old' }] } };
        PolicyUtils.setDocumentTags(document, [tag()]);
        assert.lengthOf(document.document.tags, 2);
        assert.equal(document.document.tags[0].messageId, 'old');
    });

    it('does nothing without an inner document', () => {
        const document = {};
        PolicyUtils.setDocumentTags(document, [tag()]);
        assert.notProperty(document, 'document');
    });

    it('does nothing for an empty tag list', () => {
        const document = { document: {} };
        PolicyUtils.setDocumentTags(document, []);
        assert.notProperty(document.document, 'tags');
    });

    it('does nothing for a null tag list', () => {
        const document = { document: {} };
        PolicyUtils.setDocumentTags(document, null);
        assert.notProperty(document.document, 'tags');
    });
});

describe('PolicyUtils.getGroupTemplates', () => {
    it('delegates to the components service', () => {
        const templates = [{ name: 'group' }];
        const ref = { components: { getGroupTemplates: () => templates } };
        assert.strictEqual(PolicyUtils.getGroupTemplates(ref), templates);
    });
});
