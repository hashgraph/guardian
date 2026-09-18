import { assert } from 'chai';
import { ModuleValidator } from '../../../dist/policy-engine/block-validators/module-validator.js';
import { ToolValidator } from '../../../dist/policy-engine/block-validators/tool-validator.js';

const cases = [
    { name: 'ModuleValidator', Cls: ModuleValidator, kind: 'module' },
    { name: 'ToolValidator', Cls: ToolValidator, kind: 'tool' },
];

for (const { name, Cls, kind } of cases) {
    describe(`@unit ${name} constructor`, () => {
        it('stores uuid from config id', () => {
            const v = new Cls({ id: 'X1' });
            assert.equal(v.uuid, 'X1');
        });
        it('base permissions present', () => {
            assert.deepEqual(new Cls({ id: 'a' }).permissions, ['NO_ROLE', 'ANY_ROLE', 'OWNER']);
        });
        it('collections start empty', () => {
            const v = new Cls({ id: 'a' });
            assert.equal(v.blocks.size, 0);
            assert.equal(v.tools.size, 0);
            assert.equal(v.tags.size, 0);
            assert.equal(v.schemas.size, 0);
            assert.deepEqual(v.errors, []);
            assert.deepEqual(v.tokens, []);
            assert.deepEqual(v.topics, []);
            assert.deepEqual(v.tokenTemplates, []);
            assert.deepEqual(v.groups, []);
            assert.deepEqual(v.variables, []);
        });
    });

    describe(`@unit ${name}.registerVariables`, () => {
        it('Token variable goes to tokens', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'Token', name: 'tk' }] });
            assert.include(v.tokens, 'tk');
        });
        it('Role variable goes to permissions', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'Role', name: 'R' }] });
            assert.include(v.permissions, 'R');
        });
        it('Group variable goes to groups', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'Group', name: 'G' }] });
            assert.include(v.groups, 'G');
        });
        it('TokenTemplate variable goes to tokenTemplates', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'TokenTemplate', name: 'TT' }] });
            assert.include(v.tokenTemplates, 'TT');
        });
        it('Topic variable goes to topics', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'Topic', name: 'TP' }] });
            assert.include(v.topics, 'TP');
        });
        it('String variable is ignored without error', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'String', name: 'S' }] });
            assert.deepEqual(v.errors, []);
        });
        it('unknown type yields an error', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'Mystery', name: 'M' }] });
            assert.isTrue(v.errors.some(e => /Type 'Mystery' does not exist/.test(e)));
        });
        it('all variables pushed into variables list', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ variables: [{ type: 'Token', name: 'a' }, { type: 'Role', name: 'b' }] });
            assert.equal(v.variables.length, 2);
        });
        it('no variables array is a no-op', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({});
            assert.deepEqual(v.variables, []);
        });
        it('duplicate input event name reports error', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ inputEvents: [{ name: 'E' }, { name: 'E' }] });
            assert.isTrue(v.errors.some(e => /Event 'E' already exist/.test(e)));
        });
        it('unique events produce no error', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ inputEvents: [{ name: 'E1' }], outputEvents: [{ name: 'E2' }] });
            assert.deepEqual(v.errors, []);
        });
        it('input/output same name collides', () => {
            const v = new Cls({ id: 'a' });
            v.registerVariables({ inputEvents: [{ name: 'X' }], outputEvents: [{ name: 'X' }] });
            assert.isTrue(v.errors.some(e => /Event 'X' already exist/.test(e)));
        });
    });

    describe(`@unit ${name}.permissionsNotExist`, () => {
        it('null when undefined', () => {
            assert.isNull(new Cls({ id: 'a' }).permissionsNotExist(undefined));
        });
        it('null when known', () => {
            assert.isNull(new Cls({ id: 'a' }).permissionsNotExist(['OWNER']));
        });
        it('returns unknown permission', () => {
            assert.equal(new Cls({ id: 'a' }).permissionsNotExist(['ZZZ']), 'ZZZ');
        });
    });

    describe(`@unit ${name}.tagCount / getTag`, () => {
        it('0 for unknown', () => {
            assert.equal(new Cls({ id: 'a' }).tagCount('t'), 0);
        });
        it('reflects map value', () => {
            const v = new Cls({ id: 'a' });
            v.tags.set('t', 2);
            assert.equal(v.tagCount('t'), 2);
        });
        it('getTag true/false', () => {
            const v = new Cls({ id: 'a' });
            v.tags.set('t', 1);
            assert.isTrue(v.getTag('t'));
            assert.isFalse(v.getTag('x'));
        });
    });

    describe(`@unit ${name}.getPermission / getGroup`, () => {
        it('getPermission returns when present, null otherwise', () => {
            const v = new Cls({ id: 'a' });
            assert.equal(v.getPermission('OWNER'), 'OWNER');
            assert.isNull(v.getPermission('NOPE'));
        });
        it('getGroup returns {} when present, null when not', () => {
            const v = new Cls({ id: 'a' });
            v.groups.push('G');
            assert.deepEqual(v.getGroup('G'), {});
            assert.isNull(v.getGroup('H'));
        });
    });

    describe(`@unit ${name}.getTokenTemplate / getTopicTemplate / getToken`, () => {
        it('getTokenTemplate {} when present else null', () => {
            const v = new Cls({ id: 'a' });
            v.tokenTemplates.push('TT');
            assert.deepEqual(v.getTokenTemplate('TT'), {});
            assert.isNull(v.getTokenTemplate('XX'));
        });
        it('getTopicTemplate {} when present else null', () => {
            const v = new Cls({ id: 'a' });
            v.topics.push('TP');
            assert.deepEqual(v.getTopicTemplate('TP'), {});
            assert.isNull(v.getTopicTemplate('XX'));
        });
        it('getToken resolves {} when present else null', async () => {
            const v = new Cls({ id: 'a' });
            v.tokens.push('0.0.5');
            assert.deepEqual(await v.getToken('0.0.5'), {});
            assert.isNull(await v.getToken('0.0.9'));
        });
    });

    describe(`@unit ${name}.schema helpers`, () => {
        it('schemaExist reflects validity', () => {
            const v = new Cls({ id: 'a' });
            v.schemas.set('#s', { isValid: true });
            assert.isTrue(v.schemaExist('#s'));
            v.schemas.set('#s', { isValid: false });
            assert.isFalse(v.schemaExist('#s'));
        });
        it('schemaExist consults tools', () => {
            const v = new Cls({ id: 'a' });
            v.tools.set('t', { schemaExist: (iri) => iri === '#fromtool' });
            assert.isTrue(v.schemaExist('#fromtool'));
            assert.isFalse(v.schemaExist('#other'));
        });
        it('getSchema returns/blocks based on validity', () => {
            const v = new Cls({ id: 'a' });
            v.schemas.set('#s', { isValid: true, getSchema: () => ({ iri: '#s' }) });
            assert.deepEqual(v.getSchema('#s'), { iri: '#s' });
            v.schemas.set('#s', { isValid: false, getSchema: () => ({ iri: '#s' }) });
            assert.isNull(v.getSchema('#s'));
        });
        it('getSchema falls back to tools', () => {
            const v = new Cls({ id: 'a' });
            v.tools.set('t', { getSchema: (iri) => iri === '#x' ? { iri: '#x' } : null });
            assert.deepEqual(v.getSchema('#x'), { iri: '#x' });
            assert.isNull(v.getSchema('#missing'));
        });
        it('unsupportedSchema reflects invalidity / tool fallback', () => {
            const v = new Cls({ id: 'a' });
            v.schemas.set('#s', { isValid: false });
            assert.isTrue(v.unsupportedSchema('#s'));
            v.schemas.set('#s', { isValid: true });
            assert.isFalse(v.unsupportedSchema('#s'));
            v.tools.set('t', { unsupportedSchema: (iri) => iri === '#bad' });
            assert.isTrue(v.unsupportedSchema('#bad'));
        });
        it('getAllSchemas merges own + tool schemas', () => {
            const v = new Cls({ id: 'a' });
            v.schemas.set('#own', {});
            v.tools.set('t', { getAllSchemas: (m) => { m.set('#tool', {}); return m; } });
            const m = v.getAllSchemas(new Map());
            assert.isTrue(m.has('#own'));
            assert.isTrue(m.has('#tool'));
        });
    });

    describe(`@unit ${name}.getSerializedErrors`, () => {
        it('valid when no errors and empty', () => {
            const out = new Cls({ id: 'a' }).getSerializedErrors();
            assert.isTrue(out.isValid);
            assert.equal(out.id, 'a');
        });
        it('errors mark invalid and append a "is invalid" block entry', () => {
            const v = new Cls({ id: 'a' });
            v.addError('broke');
            const out = v.getSerializedErrors();
            assert.isFalse(out.isValid);
            assert.include(out.errors, 'broke');
            assert.isTrue(out.blocks.some(b => new RegExp(`${kind === 'module' ? 'Module' : 'Tool'} is invalid`).test(b.errors[0])));
        });
        it('schema errors fold into commonErrors', () => {
            const v = new Cls({ id: 'a' });
            v.schemas.set('#s', { getSerializedErrors: () => ({ errors: ['schema err'], isValid: false }) });
            const out = v.getSerializedErrors();
            assert.include(out.errors, 'schema err');
            assert.isFalse(out.isValid);
        });
    });

    describe(`@unit ${name}.build error path`, () => {
        it('returns false for null config', async () => {
            assert.isFalse(await new Cls({ id: 'a' }).build(null));
        });
        it('records error for null/invalid', async () => {
            const v = new Cls({ id: 'a' });
            await v.build(null);
            assert.isTrue(v.errors.length > 0);
        });
    });

    describe(`@unit ${name}.clear`, () => {
        it('clears block items without throwing', () => {
            const v = new Cls({ id: 'a' });
            let cleared = false;
            v.blocks.set('b', { clear: () => { cleared = true; } });
            v.clear();
            assert.isTrue(cleared);
        });
    });
}
