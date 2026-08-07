import assert from 'node:assert/strict';
import { ModuleModel } from '../../dist/analytics/compare/models/module.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const minimalConfig = (overrides = {}) => ({
    blockType: 'root',
    tag: 'root',
    children: [],
    inputEvents: [],
    outputEvents: [],
    variables: [],
    ...overrides,
});

const rawModule = (overrides = {}) => ({
    id: 'mod-1',
    name: 'My Module',
    description: 'desc',
    config: minimalConfig(),
    ...overrides,
});

describe('ModuleModel construction', () => {
    it('captures id/name/description', () => {
        const m = new ModuleModel(rawModule(), opts);
        assert.equal(m.id, 'mod-1');
        assert.equal(m.name, 'My Module');
        assert.equal(m.description, 'desc');
    });

    it('throws "Empty policy model" when config is missing', () => {
        const raw = { id: 'm', name: 'n', description: 'd' };
        assert.throws(() => new ModuleModel(raw, opts), /Empty policy model/);
    });

    it('builds the tree from config and exposes its root', () => {
        const m = new ModuleModel(rawModule({ config: minimalConfig({ blockType: 'group', tag: 'g' }) }), opts);
        assert.ok(m.tree);
        assert.equal(m.tree.blockType, 'group');
    });

    it('parses inputEvents/outputEvents into VariableModels', () => {
        const m = new ModuleModel(rawModule({
            config: minimalConfig({
                inputEvents: [{ name: 'IE1' }],
                outputEvents: [{ name: 'OE1' }],
            }),
        }), opts);
        assert.equal(m.inputEvents.length, 1);
        assert.equal(m.inputEvents[0].name, 'IE1');
        assert.equal(m.outputEvents.length, 1);
        assert.equal(m.outputEvents[0].name, 'OE1');
    });

    it('parses variables into VariableModels', () => {
        const m = new ModuleModel(rawModule({
            config: minimalConfig({ variables: [{ name: 'V1', type: 'Number' }] }),
        }), opts);
        assert.equal(m.variables.length, 1);
        assert.equal(m.variables[0].name, 'V1');
    });

    it('handles missing inputEvents/outputEvents/variables arrays as []', () => {
        const m = new ModuleModel(rawModule({
            config: minimalConfig({
                inputEvents: undefined,
                outputEvents: undefined,
                variables: undefined,
            }),
        }), opts);
        assert.deepEqual(m.inputEvents, []);
        assert.deepEqual(m.outputEvents, []);
        assert.deepEqual(m.variables, []);
    });
});

describe('ModuleModel.info', () => {
    it('returns {id, name, description}', () => {
        const m = new ModuleModel(rawModule(), opts);
        assert.deepEqual(m.info(), { id: 'mod-1', name: 'My Module', description: 'desc' });
    });
});

describe('ModuleModel.update', () => {
    it('returns the model for chaining', () => {
        const m = new ModuleModel(rawModule(), opts);
        assert.equal(m.update(), m);
    });
});

describe('ModuleModel.getAllProp', () => {
    it('returns [] when there are no blocks with matching prop type', () => {
        const m = new ModuleModel(rawModule(), opts);
        assert.deepEqual(m.getAllProp('property'), []);
    });
});
