import assert from 'node:assert/strict';
import { ToolModel } from '../../dist/analytics/compare/models/tool.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const minimalConfig = (overrides = {}) => ({
    blockType: 'tool',
    tag: 'tool-root',
    children: [],
    inputEvents: [],
    outputEvents: [],
    variables: [],
    ...overrides,
});

const rawTool = (overrides = {}) => ({
    id: 't-1',
    name: 'Tool',
    description: 'desc',
    hash: 'h-1',
    messageId: 'm-1',
    config: minimalConfig(),
    ...overrides,
});

describe('ToolModel construction', () => {
    it('captures id/name/description/hash/messageId', () => {
        const t = new ToolModel(rawTool(), opts);
        assert.equal(t.id, 't-1');
        assert.equal(t.name, 'Tool');
        assert.equal(t.description, 'desc');
        assert.equal(t.hash, 'h-1');
        assert.equal(t.messageId, 'm-1');
    });

    it('throws "Empty tool model" when config is missing', () => {
        const raw = { id: 't', name: 'n', description: 'd', hash: '', messageId: '' };
        assert.throws(() => new ToolModel(raw, opts), /Empty tool model/);
    });

    it('builds the tree from config and exposes its root', () => {
        const t = new ToolModel(rawTool(), opts);
        assert.ok(t.tree);
        assert.equal(t.tree.tag, 'tool-root');
    });

    it('parses inputEvents / outputEvents / variables', () => {
        const t = new ToolModel(rawTool({
            config: minimalConfig({
                inputEvents: [{ name: 'in1' }],
                outputEvents: [{ name: 'out1' }],
                variables: [{ name: 'v1' }],
            }),
        }), opts);
        assert.equal(t.inputEvents.length, 1);
        assert.equal(t.outputEvents.length, 1);
        assert.equal(t.variables.length, 1);
        assert.equal(t.inputEvents[0].name, 'in1');
        assert.equal(t.outputEvents[0].name, 'out1');
        assert.equal(t.variables[0].name, 'v1');
    });

    it('handles missing inputEvents / outputEvents / variables as []', () => {
        const t = new ToolModel(rawTool({
            config: minimalConfig({
                inputEvents: undefined,
                outputEvents: undefined,
                variables: undefined,
            }),
        }), opts);
        assert.deepEqual(t.inputEvents, []);
        assert.deepEqual(t.outputEvents, []);
        assert.deepEqual(t.variables, []);
    });
});

describe('ToolModel.info', () => {
    it('returns {id, name, description, hash, messageId}', () => {
        const t = new ToolModel(rawTool(), opts);
        assert.deepEqual(t.info(), {
            id: 't-1',
            name: 'Tool',
            description: 'desc',
            hash: 'h-1',
            messageId: 'm-1',
        });
    });
});

describe('ToolModel.setSchemas / setArtifacts', () => {
    it('returns the model for chaining', () => {
        const t = new ToolModel(rawTool(), opts);
        assert.equal(t.setSchemas([]), t);
        assert.equal(t.setArtifacts([]), t);
    });
});

describe('ToolModel.update', () => {
    it('returns the model for chaining (no schemas/artifacts → empty maps)', () => {
        const t = new ToolModel(rawTool(), opts).setSchemas([]).setArtifacts([]);
        assert.equal(t.update(), t);
    });
});
