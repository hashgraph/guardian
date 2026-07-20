import { assert } from 'chai';
import { BlockType, SchemaEntity } from '@guardian/interfaces';
import { GenerateBlocks } from '../../../dist/xlsx/generate-blocks.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const makeResult = ({ config, tools = [], xlsxSchemas = [] } = {}) => {
    const errors = [];
    return {
        policy: { config: config || { blockType: BlockType.Container, children: [] } },
        tools,
        xlsxSchemas,
        addError(error) {
            errors.push(error);
        },
        errors
    };
};

describe('GenerateBlocks.generate', () => {
    it('inserts a root container as the first child of the config', () => {
        const result = makeResult();
        GenerateBlocks.generate(result);
        const root = result.policy.config.children[0];
        assert.equal(root.blockType, BlockType.Container);
        assert.match(root.tag, /^Root_Holder_/);
    });

    it('creates the children array when missing', () => {
        const result = makeResult({ config: { blockType: BlockType.Container } });
        GenerateBlocks.generate(result);
        assert.isArray(result.policy.config.children);
        assert.lengthOf(result.policy.config.children, 1);
    });

    it('keeps existing children after the inserted container', () => {
        const existing = { blockType: 'informationBlock', tag: 'keep' };
        const result = makeResult({ config: { blockType: BlockType.Container, children: [existing] } });
        GenerateBlocks.generate(result);
        assert.lengthOf(result.policy.config.children, 2);
        assert.equal(result.policy.config.children[1].tag, 'keep');
    });

    it('gives generated blocks uuid ids and default arrays', () => {
        const result = makeResult();
        GenerateBlocks.generate(result);
        const root = result.policy.config.children[0];
        assert.match(root.id, UUID_RE);
        assert.isTrue(root.defaultActive);
        assert.deepEqual(root.permissions, []);
        assert.deepEqual(root.artifacts, []);
    });

    it('does not throw when the policy is missing', () => {
        const result = makeResult();
        delete result.policy;
        assert.doesNotThrow(() => GenerateBlocks.generate(result));
    });

    it('adds a block for each tool', () => {
        const tools = [
            { messageId: 'm1', hash: 'h1', config: {} },
            { messageId: 'm2', hash: 'h2', config: {} }
        ];
        const result = makeResult({ tools });
        GenerateBlocks.generate(result);
        const root = result.policy.config.children[0];
        const toolBlocks = root.children.filter((b) => b.blockType === BlockType.Tool);
        assert.lengthOf(toolBlocks, 2);
        assert.deepEqual(toolBlocks.map((b) => b.messageId), ['m1', 'm2']);
    });

    it('copies tool hash, events and variables onto the block', () => {
        const tools = [{
            messageId: 'm1',
            hash: 'h1',
            config: { inputEvents: ['in'], outputEvents: ['out'], variables: [{ name: 'v' }] }
        }];
        const result = makeResult({ tools });
        GenerateBlocks.generate(result);
        const block = result.policy.config.children[0].children[0];
        assert.equal(block.hash, 'h1');
        assert.deepEqual(block.inputEvents, ['in']);
        assert.deepEqual(block.outputEvents, ['out']);
        assert.deepEqual(block.variables, [{ name: 'v' }]);
        assert.isFalse(block.defaultActive);
        assert.match(block.tag, /^Tool_/);
    });

    it('skips tools already referenced in the config', () => {
        const config = {
            blockType: BlockType.Container,
            children: [{ blockType: BlockType.Tool, messageId: 'm1' }]
        };
        const result = makeResult({ config, tools: [{ messageId: 'm1', hash: 'h1', config: {} }] });
        GenerateBlocks.generate(result);
        const root = result.policy.config.children[0];
        assert.lengthOf(root.children.filter((b) => b.blockType === BlockType.Tool), 0);
    });

    it('generates a request container per VC schema', () => {
        const schema = { entity: SchemaEntity.VC, iri: '#vc1', name: 'My VC Schema' };
        const result = makeResult({ xlsxSchemas: [schema] });
        GenerateBlocks.generate(result);
        const root = result.policy.config.children[0];
        const holder = root.children[0];
        assert.equal(holder.blockType, BlockType.Container);
        assert.include(holder.tag, 'Schema_Holder_');
    });

    it('adds a request block bound to the schema iri', () => {
        const schema = { entity: SchemaEntity.VC, iri: '#vc1', name: 'My VC Schema' };
        const result = makeResult({ xlsxSchemas: [schema] });
        GenerateBlocks.generate(result);
        const request = result.policy.config.children[0].children[0].children[0];
        assert.equal(request.blockType, BlockType.Request);
        assert.equal(request.schema, '#vc1');
        assert.equal(request.idType, 'UUID');
        assert.deepEqual(request.presetFields, []);
    });

    it('skips schemas that are not VC entities', () => {
        const schema = { entity: SchemaEntity.NONE, iri: '#x', name: 'X' };
        const result = makeResult({ xlsxSchemas: [schema] });
        GenerateBlocks.generate(result);
        const root = result.policy.config.children[0];
        assert.lengthOf(root.children, 0);
    });

    it('adds no calculation block when fields have no formulae', () => {
        const schema = {
            entity: SchemaEntity.VC,
            iri: '#vc1',
            name: 'My VC Schema',
            fields: [{ name: 'f1' }, { name: 'f2', fields: [{ name: 'f3' }] }]
        };
        const result = makeResult({ xlsxSchemas: [schema] });
        GenerateBlocks.generate(result);
        const holder = result.policy.config.children[0].children[0];
        assert.lengthOf(holder.children, 1);
        assert.equal(holder.children[0].blockType, BlockType.Request);
        assert.lengthOf(result.errors, 0);
    });

    it('reports no errors for an empty workbook result', () => {
        const result = makeResult();
        GenerateBlocks.generate(result);
        assert.lengthOf(result.errors, 0);
    });
});
