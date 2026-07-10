import { assert } from 'chai';
import { ModuleBlock } from '../../../dist/policy-engine/block-validators/blocks/module.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._tokenMissing = !!opts.tokenMissing;
        this._templateMissing = !!opts.templateMissing;
        this._topicMissing = !!opts.topicMissing;
        this._missingPermission = !!opts.missingPermission;
        this._missingGroup = !!opts.missingGroup;
        this._schemaError = opts.schemaError ?? null;
        this._baseSchemaError = opts.baseSchemaError ?? null;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async tokenNotExist() { return this._tokenMissing; }
    tokenTemplateNotExist() { return this._templateMissing; }
    topicTemplateNotExist() { return this._topicMissing; }
    permissionNotExist() { return this._missingPermission; }
    groupNotExist() { return this._missingGroup; }
    validateSchema() { return this._schemaError; }
    validateBaseSchema() { return this._baseSchemaError; }
}

const refWith = (variables, optionValues = {}) => ({
    options: {
        variables,
        ...optionValues,
    },
    children: [],
});

describe('ModuleBlock.validate — variable wiring', () => {
    it('passes when no variables are declared', async () => {
        const v = new FakeValidator();
        await ModuleBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('flags variables whose value is not bound to options', async () => {
        const v = new FakeValidator();
        await ModuleBlock.validate(v, refWith([{ name: 'mySchema', type: 'String' }]));
        assert.include(v.errors, 'Option "mySchema" is not set');
    });

    it('passes a String-typed variable when bound', async () => {
        const v = new FakeValidator();
        await ModuleBlock.validate(v, refWith([{ name: 'note', type: 'String' }], { note: 'hi' }));
        assert.deepEqual(v.errors, []);
    });

    it('reports schema validation errors for type=Schema', async () => {
        const v = new FakeValidator({ schemaError: 'schema invalid' });
        await ModuleBlock.validate(v, refWith([{ name: 's', type: 'Schema' }], { s: 'sid' }));
        assert.include(v.errors, 'schema invalid');
    });

    it('reports base-schema validation errors for type=Schema', async () => {
        const v = new FakeValidator({ baseSchemaError: 'wrong base' });
        await ModuleBlock.validate(v, refWith(
            [{ name: 's', type: 'Schema', baseSchema: 'base-1' }],
            { s: 'sid' },
        ));
        assert.include(v.errors, 'wrong base');
    });

    it('reports unknown token for type=Token', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await ModuleBlock.validate(v, refWith([{ name: 't', type: 'Token' }], { t: '0.0.99' }));
        assert.include(v.errors, 'Token with id 0.0.99 does not exist');
    });

    it('reports unknown role for type=Role', async () => {
        const v = new FakeValidator({ missingPermission: true });
        await ModuleBlock.validate(v, refWith([{ name: 'r', type: 'Role' }], { r: 'OWNER' }));
        assert.include(v.errors, 'Permission OWNER not exist');
    });

    it('reports unknown group for type=Group', async () => {
        const v = new FakeValidator({ missingGroup: true });
        await ModuleBlock.validate(v, refWith([{ name: 'g', type: 'Group' }], { g: 'crew' }));
        assert.include(v.errors, 'Group crew not exist');
    });

    it('reports unknown token template for type=TokenTemplate', async () => {
        const v = new FakeValidator({ templateMissing: true });
        await ModuleBlock.validate(v, refWith([{ name: 'tpl', type: 'TokenTemplate' }], { tpl: 't1' }));
        assert.include(v.errors, 'Token "t1" does not exist');
    });

    it('reports unknown topic for type=Topic', async () => {
        const v = new FakeValidator({ topicMissing: true });
        await ModuleBlock.validate(v, refWith([{ name: 'tp', type: 'Topic' }], { tp: 't1' }));
        assert.include(v.errors, 'Topic "t1" does not exist');
    });

    it("rejects a variable with an unknown type", async () => {
        const v = new FakeValidator();
        await ModuleBlock.validate(v, refWith([{ name: 'x', type: 'Mystery' }], { x: 'v' }));
        assert.include(v.errors, "Type 'Mystery' does not exist");
    });
});
