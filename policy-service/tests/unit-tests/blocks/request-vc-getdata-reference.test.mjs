import { assert } from 'chai';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/blocks/request-vc-document-block-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

// getData must ship only a lightweight schema reference, not the heavy
// document + context (the full schema, resolved client-side by id).

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origGetOpts = PolicyComponentsUtils.GetBlockUniqueOptionsObject;

const fullSchema = () => ({
    id: 'schema-db-id',
    iri: '#SchemaIri',
    uuid: 'schema-uuid',
    name: 'Project',
    version: '1.0.0',
    document: { $id: '#doc', properties: { big: 'x'.repeat(1000) } },
    context: { '@context': { big: 'y'.repeat(1000) } },
    fields: [{ name: 'f' }],
    conditions: [{ if: 1 }],
});

function assertReference(schema) {
    assert.equal(schema.id, 'schema-db-id');
    assert.equal(schema.iri, '#SchemaIri');
    assert.equal(schema.uuid, 'schema-uuid');
    assert.equal(schema.name, 'Project');
    assert.equal(schema.version, '1.0.0');
    assert.notProperty(schema, 'document');
    assert.notProperty(schema, 'context');
    assert.notProperty(schema, 'fields');
    assert.notProperty(schema, 'conditions');
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.GetBlockUniqueOptionsObject = origGetOpts;
});

describe('RequestVcDocumentBlock runtime — getData schema reference', () => {
    it('emits only light schema identifiers, not document/context', async () => {
        const block = Object.create(RequestVcDocumentBlock.prototype);
        block._schema = fullSchema();
        block._accessMap = new Map();
        block.state = {};
        const ref = {
            uuid: 'blk',
            blockType: 'requestVcDocumentBlock',
            actionType: 'local',
            async getSources() { return []; },
        };
        PolicyComponentsUtils.GetBlockRef = () => ref;
        PolicyComponentsUtils.GetBlockUniqueOptionsObject = () => ({});

        const data = await block.getData({ id: 'u1', location: 'local' });
        assertReference(data.schema);
    });
});

describe('RequestVcDocumentBlockAddon runtime — getData schema reference', () => {
    it('emits only light schema identifiers, not document/context', async () => {
        const block = Object.create(RequestVcDocumentBlockAddon.prototype);
        block._schema = fullSchema();
        block._accessMap = new Map();
        const ref = {
            uuid: 'blk',
            blockType: 'requestVcDocumentBlockAddon',
            actionType: 'local',
            async getOptions() { return {}; },
        };
        PolicyComponentsUtils.GetBlockRef = () => ref;

        const data = await block.getData({ id: 'u1', location: 'local' });
        assertReference(data.schema);
    });
});
