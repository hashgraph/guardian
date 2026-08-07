import { assert } from 'chai';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block.js';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block-addon.js';
import { ButtonBlock } from '../../../dist/policy-engine/block-validators/blocks/button-block.js';
import { ButtonBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/button-block-addon.js';
import { MultiSignBlock } from '../../../dist/policy-engine/block-validators/blocks/multi-sign-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this.schemas = opts.schemas || new Set();
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    validateSchemaVariable(name, value, required) {
        if (required && !value) { return `Option "${name}" is not set`; }
        if (value && !this.schemas.has(value)) { return `Schema "${value}" not exist`; }
        return null;
    }
    checkBlockError(err) { if (err) { this.errors.push(err); } }
}

describe('@unit P0 RequestVcDocumentBlock.validate', () => {
    it('blockType is requestVcDocumentBlock', () => {
        assert.equal(RequestVcDocumentBlock.blockType, 'requestVcDocumentBlock');
    });

    it('flags missing required schema', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Option "schema" is not set');
    });

    it('flags an unknown schema id', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#B' }, children: [] });
        assert.include(v.errors, 'Schema "#B" not exist');
    });

    it('flags an unknown presetSchema id', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A', presetSchema: '#Z' }, children: [] });
        assert.include(v.errors, 'Schema "#Z" not exist');
    });

    it('passes for a valid schema with no preset', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A' }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('passes for a valid schema and valid presetSchema', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A', '#P']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A', presetSchema: '#P' }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('presetSchema is optional (not required) so absence is OK', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A', presetSchema: undefined }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']), throwGetArtifact: true });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A', artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 RequestVcDocumentBlockAddon extra', () => {
    it('preset=false does not require presetSchema', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlockAddon.validate(v, {
            options: { schema: '#A', preset: false, buttonName: 'b', dialogTitle: 'd' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('preset=true with valid presetSchema passes', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A', '#P']) });
        await RequestVcDocumentBlockAddon.validate(v, {
            options: { schema: '#A', preset: true, presetSchema: '#P', buttonName: 'b', dialogTitle: 'd' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('flags missing required schema', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, {
            options: { buttonName: 'b', dialogTitle: 'd' },
            children: [],
        });
        assert.include(v.errors, 'Option "schema" is not set');
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']), throwGetArtifact: true });
        await RequestVcDocumentBlockAddon.validate(v, {
            options: { schema: '#A', buttonName: 'b', dialogTitle: 'd', artifacts: [{ uuid: 'a' }] },
            children: [],
        });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 ButtonBlock.validate', () => {
    const ui = (buttons) => ({ options: { uiMetaData: { buttons } }, children: [] });

    it('blockType is buttonBlock', () => {
        assert.equal(ButtonBlock.blockType, 'buttonBlock');
    });

    it('rejects missing uiMetaData', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('rejects non-object uiMetaData', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, { options: { uiMetaData: 'x' }, children: [] });
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('rejects when buttons is not an array', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, { options: { uiMetaData: { buttons: 'oops' } }, children: [] });
        assert.include(v.errors, 'Option "uiMetaData.buttons" must be an array');
    });

    it('passes an empty buttons array', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([]));
        assert.deepEqual(v.errors, []);
    });

    it('rejects a button missing its tag', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ type: 'selector', filters: [] }]));
        assert.include(v.errors, 'Option "tag" is not set');
    });

    it('rejects when button.filters is not an array', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ tag: 't', type: 'selector', filters: 'nope' }]));
        assert.include(v.errors, 'Option "button.filters" must be an array');
    });

    it('rejects a filter missing type and field', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ tag: 't', type: 'selector', filters: [{}] }]));
        assert.include(v.errors, 'Option "type" is not set');
        assert.include(v.errors, 'Option "field" is not set');
    });

    it('passes a valid selector button', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ tag: 't', type: 'selector', filters: [{ type: 'equal', field: 'f' }] }]));
        assert.deepEqual(v.errors, []);
    });

    it('selector-dialog requires title and description', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ tag: 't', type: 'selector-dialog', filters: [] }]));
        assert.include(v.errors, 'Option "title" is not set');
        assert.include(v.errors, 'Option "description" is not set');
    });

    it('passes a valid selector-dialog button', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ tag: 't', type: 'selector-dialog', title: 'T', description: 'D', filters: [] }]));
        assert.deepEqual(v.errors, []);
    });

    it('rejects an unknown button type', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ui([{ tag: 't', type: 'mystery', filters: [] }]));
        assert.include(v.errors, 'Option "type" must be a "selector|selector-dialog"');
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await ButtonBlock.validate(v, { options: { uiMetaData: { buttons: [] }, artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 ButtonBlockAddon.validate', () => {
    it('blockType is buttonBlockAddon', () => {
        assert.equal(ButtonBlockAddon.blockType, 'buttonBlockAddon');
    });

    it('rejects empty button name', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Button name is empty');
    });

    it('passes a simple named button without dialog', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: { name: 'Go' }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('dialog without dialogOptions flags both title and result path', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: { name: 'Go', dialog: true }, children: [] });
        assert.include(v.errors, 'Dialog title is empty');
        assert.include(v.errors, 'Dialog result field path is empty');
    });

    it('dialog with title but no result path flags only the result path', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, {
            options: { name: 'Go', dialog: true, dialogOptions: { dialogTitle: 'T' } },
            children: [],
        });
        assert.notInclude(v.errors, 'Dialog title is empty');
        assert.include(v.errors, 'Dialog result field path is empty');
    });

    it('passes a complete dialog config', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, {
            options: { name: 'Go', dialog: true, dialogOptions: { dialogTitle: 'T', dialogResultFieldPath: 'a.b' } },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await ButtonBlockAddon.validate(v, { options: { name: 'Go', artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 MultiSignBlock.validate', () => {
    const ref = (o = {}) => ({ options: o, children: [] });

    it('blockType is multiSignBlock', () => {
        assert.equal(MultiSignBlock.blockType, 'multiSignBlock');
    });

    it('rejects missing threshold', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({}));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('rejects threshold of 0 (falsy) as not set', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: 0 }));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('accepts threshold of 50', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: 50 }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts threshold string "100" (boundary)', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: '100' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects threshold above 100', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: 150 }));
        assert.include(v.errors, '"threshold" value must be between 0 and 100');
    });

    it('accepts a numeric string threshold within range', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: '75' }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await MultiSignBlock.validate(v, ref({ threshold: 50, artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});
