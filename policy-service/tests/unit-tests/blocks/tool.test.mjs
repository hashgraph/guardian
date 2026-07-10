import { assert } from 'chai';
import { ToolBlock } from '../../../dist/policy-engine/block-validators/blocks/tool.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.knownSchemas = new Set();
        this.knownTokens = new Set();
        this.knownPermissions = new Set();
        this.knownGroups = new Set();
        this.knownTokenTemplates = new Set();
        this.knownTopicTemplates = new Set();
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchema(iri) {
        return this.knownSchemas.has(iri) ? null : `Schema with id "${iri}" does not exist`;
    }
    validateBaseSchema(base, schema) { return null; }
    async tokenNotExist(id) { return !this.knownTokens.has(id); }
    permissionNotExist(p) { return !this.knownPermissions.has(p); }
    groupNotExist(g) { return !this.knownGroups.has(g); }
    tokenTemplateNotExist(t) { return !this.knownTokenTemplates.has(t); }
    topicTemplateNotExist(t) { return !this.knownTopicTemplates.has(t); }
}

const ref = (options) => ({ options, children: [] });

describe('@unit ToolBlock.validate', () => {
    it('blockType is "tool"', () => {
        assert.equal(ToolBlock.blockType, 'tool');
    });

    it('does nothing when variables is not an array', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('flags variable when its value is missing in options', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({ variables: [{ name: 'mySchema', type: 'Schema' }] }));
        assert.equal(v.errors.some((e) => e === 'Option "mySchema" is not set'), true);
    });

    it('Schema: passes when schema iri is known', async () => {
        const v = new FakeValidator();
        v.knownSchemas.add('iri:ok');
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'mySchema', type: 'Schema' }],
            mySchema: 'iri:ok',
        }));
        assert.deepEqual(v.errors, []);
    });

    it('Schema: flags unknown iri', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'mySchema', type: 'Schema' }],
            mySchema: 'iri:missing',
        }));
        assert.equal(v.errors.some((e) => /Schema with id "iri:missing" does not exist/.test(e)), true);
    });

    it('Token: flags unknown token id', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'tok', type: 'Token' }],
            tok: '0.0.999',
        }));
        assert.equal(v.errors.some((e) => /Token with id 0\.0\.999 does not exist/.test(e)), true);
    });

    it('Role: flags missing permission', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'r', type: 'Role' }],
            r: 'PERM_X',
        }));
        assert.equal(v.errors.some((e) => /Permission PERM_X not exist/.test(e)), true);
    });

    it('Group: flags missing group', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'g', type: 'Group' }],
            g: 'devs',
        }));
        assert.equal(v.errors.some((e) => /Group devs not exist/.test(e)), true);
    });

    it('TokenTemplate: flags missing template', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'tt', type: 'TokenTemplate' }],
            tt: 'tplA',
        }));
        assert.equal(v.errors.some((e) => /Token "tplA" does not exist/.test(e)), true);
    });

    it('Topic: flags missing topic template', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'top', type: 'Topic' }],
            top: 'topicA',
        }));
        assert.equal(v.errors.some((e) => /Topic "topicA" does not exist/.test(e)), true);
    });

    it('String: never errors regardless of value', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 's', type: 'String' }],
            s: 'any value goes',
        }));
        assert.deepEqual(v.errors, []);
    });

    it('Unknown type: flags "Type \'X\' does not exist"', async () => {
        const v = new FakeValidator();
        await ToolBlock.validate(v, ref({
            variables: [{ name: 'q', type: 'Quaternion' }],
            q: 'whatever',
        }));
        assert.equal(v.errors.some((e) => /Type 'Quaternion' does not exist/.test(e)), true);
    });

    it('iterates multiple variables independently', async () => {
        const v = new FakeValidator();
        v.knownSchemas.add('iri:ok');
        await ToolBlock.validate(v, ref({
            variables: [
                { name: 's', type: 'Schema' },
                { name: 't', type: 'Token' },
            ],
            s: 'iri:ok',
            t: '0.0.999',
        }));
        // Schema is fine; Token is not — only one error expected.
        assert.equal(v.errors.length, 1);
        assert.equal(/Token with id 0\.0\.999 does not exist/.test(v.errors[0]), true);
    });
});
