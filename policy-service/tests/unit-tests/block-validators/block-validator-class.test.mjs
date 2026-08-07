import { assert } from 'chai';
import { BlockValidator } from '../../../dist/policy-engine/block-validators/block-validator.js';

function makeFakeValidator(overrides = {}) {
    return Object.assign({
        isDryRun: false,
        tagCount: () => 0,
        permissionsNotExist: () => null,
        getTag: () => null,
        getSchema: () => null,
        getPermission: () => null,
        schemaExistByEntity: () => false,
        schemaExist: () => false,
        unsupportedSchema: () => false,
        getTokenTemplate: () => null,
        getToken: async () => null,
        getTopicTemplate: () => null,
        getGroup: () => null,
        getArtifact: async () => null,
    }, overrides);
}

function makeConfig(over = {}) {
    return Object.assign({
        id: 'block-uuid-1',
        blockType: 'someBlockType',
        tag: 'TagA',
        permissions: ['OWNER'],
    }, over);
}

describe('@unit BlockValidator constructor', () => {
    it('stores id, blockType, tag, permissions', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.equal(v.getId(), 'block-uuid-1');
        assert.equal(v.getBlockType(), 'someBlockType');
        assert.equal(v.getTag(), 'TagA');
        assert.deepEqual(v.permissions, ['OWNER']);
    });

    it('initializes empty errors and children', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.deepEqual(v.errors, []);
        assert.deepEqual(v.children, []);
    });

    it('strips blockType and children from options', () => {
        const v = new BlockValidator(makeConfig({ foo: 'bar', children: [{ id: 'c' }] }), makeFakeValidator());
        const opts = v.getOptions();
        assert.equal(opts.foo, 'bar');
        assert.isUndefined(opts.blockType);
    });

    it('flattens nested options object into options', () => {
        const v = new BlockValidator(makeConfig({ options: { nested: 1, deep: 'x' } }), makeFakeValidator());
        const opts = v.getOptions();
        assert.equal(opts.nested, 1);
        assert.equal(opts.deep, 'x');
    });

    it('warningMessagesText and infoMessagesText start empty', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.deepEqual(v.warningMessagesText, []);
        assert.deepEqual(v.infoMessagesText, []);
    });
});

describe('@unit BlockValidator.isDryRun', () => {
    it('is false when validator is not a PolicyValidator instance', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ isDryRun: true }));
        assert.isFalse(v.isDryRun);
    });
});

describe('@unit BlockValidator children/refs', () => {
    it('addChild appends to children', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        const child = new BlockValidator(makeConfig({ id: 'c1', tag: 'c' }), makeFakeValidator());
        v.addChild(child);
        assert.equal(v.children.length, 1);
        assert.deepEqual(v.getChildrenIds(), ['c1']);
    });

    it('_getRef returns empty children array', () => {
        const v = new BlockValidator(makeConfig({ blockType: 'bt' }), makeFakeValidator());
        const ref = v._getRef();
        assert.equal(ref.blockType, 'bt');
        assert.deepEqual(ref.children, []);
    });

    it('getRef includes mapped child refs', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        const c1 = new BlockValidator(makeConfig({ id: 'c1', blockType: 'x' }), makeFakeValidator());
        v.addChild(c1);
        const ref = v.getRef();
        assert.equal(ref.children.length, 1);
        assert.equal(ref.children[0].blockType, 'x');
    });

    it('getRef options equals getOptions', () => {
        const v = new BlockValidator(makeConfig({ k: 'v' }), makeFakeValidator());
        assert.equal(v.getRef().options.k, 'v');
    });
});

describe('@unit BlockValidator errors', () => {
    it('addError pushes to errors', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addError('boom');
        assert.deepEqual(v.errors, ['boom']);
    });

    it('clear empties errors', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addError('a');
        v.addError('b');
        v.clear();
        assert.equal(v.errors.length, 0);
    });

    it('checkBlockError adds error only when truthy', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.checkBlockError(null);
        v.checkBlockError(undefined);
        v.checkBlockError('');
        assert.equal(v.errors.length, 0);
        v.checkBlockError('real error');
        assert.deepEqual(v.errors, ['real error']);
    });
});

describe('@unit BlockValidator parent id', () => {
    it('getParentId is undefined before set', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.isUndefined(v.getParentId());
    });

    it('setParentId then getParentId roundtrips', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.setParentId('parent-99');
        assert.equal(v.getParentId(), 'parent-99');
    });
});

describe('@unit BlockValidator.addPrecomputedMessagesAsText', () => {
    it('warning severity routes to warningMessagesText', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addPrecomputedMessagesAsText(['w1', 'w2'], 'warning');
        assert.deepEqual(v.warningMessagesText, ['w1', 'w2']);
        assert.deepEqual(v.infoMessagesText, []);
    });

    it('non-warning severity routes to infoMessagesText', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addPrecomputedMessagesAsText(['i1'], 'info');
        assert.deepEqual(v.infoMessagesText, ['i1']);
        assert.deepEqual(v.warningMessagesText, []);
    });

    it('accumulates across calls', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addPrecomputedMessagesAsText(['a'], 'warning');
        v.addPrecomputedMessagesAsText(['b'], 'warning');
        assert.deepEqual(v.warningMessagesText, ['a', 'b']);
    });
});

describe('@unit BlockValidator.getSerializedErrors', () => {
    it('isValid true with no errors', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        const s = v.getSerializedErrors();
        assert.isTrue(s.isValid);
        assert.deepEqual(s.errors, []);
        assert.equal(s.id, 'block-uuid-1');
        assert.equal(s.name, 'someBlockType');
    });

    it('isValid false when there are errors', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addError('x');
        const s = v.getSerializedErrors();
        assert.isFalse(s.isValid);
        assert.deepEqual(s.errors, ['x']);
    });

    it('includes warnings and infos copies', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addPrecomputedMessagesAsText(['w'], 'warning');
        v.addPrecomputedMessagesAsText(['i'], 'info');
        const s = v.getSerializedErrors();
        assert.deepEqual(s.warnings, ['w']);
        assert.deepEqual(s.infos, ['i']);
    });

    it('errors array is a copy (slice), not the same ref', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        v.addError('e1');
        const s = v.getSerializedErrors();
        s.errors.push('mutated');
        assert.equal(v.errors.length, 1);
    });
});

describe('@unit BlockValidator validator delegation', () => {
    it('tagNotExist returns true when validator.getTag falsy', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getTag: () => null }));
        assert.isTrue(v.tagNotExist('t'));
    });

    it('tagNotExist returns false when validator.getTag truthy', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getTag: () => ({}) }));
        assert.isFalse(v.tagNotExist('t'));
    });

    it('getSchema delegates', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getSchema: (i) => ({ iri: i }) }));
        assert.deepEqual(v.getSchema('#abc'), { iri: '#abc' });
    });

    it('permissionNotExist negates getPermission', () => {
        assert.isTrue(new BlockValidator(makeConfig(), makeFakeValidator({ getPermission: () => null })).permissionNotExist('p'));
        assert.isFalse(new BlockValidator(makeConfig(), makeFakeValidator({ getPermission: () => 'p' })).permissionNotExist('p'));
    });

    it('schemaNotExistByEntity negates schemaExistByEntity', () => {
        assert.isTrue(new BlockValidator(makeConfig(), makeFakeValidator({ schemaExistByEntity: () => false })).schemaNotExistByEntity('e'));
        assert.isFalse(new BlockValidator(makeConfig(), makeFakeValidator({ schemaExistByEntity: () => true })).schemaNotExistByEntity('e'));
    });

    it('schemaNotExistByEntity returns true when method absent (optional chaining)', () => {
        const fv = makeFakeValidator();
        delete fv.schemaExistByEntity;
        assert.isTrue(new BlockValidator(makeConfig(), fv).schemaNotExistByEntity('e'));
    });

    it('schemaNotExist / schemaExist mirror each other', () => {
        const t = new BlockValidator(makeConfig(), makeFakeValidator({ schemaExist: () => true }));
        assert.isFalse(t.schemaNotExist('#x'));
        assert.isTrue(t.schemaExist('#x'));
    });

    it('tokenTemplateNotExist negates getTokenTemplate', () => {
        assert.isTrue(new BlockValidator(makeConfig(), makeFakeValidator({ getTokenTemplate: () => null })).tokenTemplateNotExist('n'));
        assert.isFalse(new BlockValidator(makeConfig(), makeFakeValidator({ getTokenTemplate: () => ({}) })).tokenTemplateNotExist('n'));
    });

    it('getTokenTemplate delegates', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getTokenTemplate: (n) => ({ n }) }));
        assert.deepEqual(v.getTokenTemplate('T'), { n: 'T' });
    });

    it('topicTemplateNotExist negates getTopicTemplate', () => {
        assert.isTrue(new BlockValidator(makeConfig(), makeFakeValidator({ getTopicTemplate: () => null })).topicTemplateNotExist('t'));
        assert.isFalse(new BlockValidator(makeConfig(), makeFakeValidator({ getTopicTemplate: () => ({}) })).topicTemplateNotExist('t'));
    });

    it('groupNotExist negates getGroup', () => {
        assert.isTrue(new BlockValidator(makeConfig(), makeFakeValidator({ getGroup: () => null })).groupNotExist('g'));
        assert.isFalse(new BlockValidator(makeConfig(), makeFakeValidator({ getGroup: () => ({}) })).groupNotExist('g'));
    });

    it('tokenNotExist resolves true when getToken null', async () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getToken: async () => null }));
        assert.isTrue(await v.tokenNotExist('0.0.1'));
    });

    it('tokenNotExist resolves false when getToken returns token', async () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getToken: async () => ({ id: '0.0.1' }) }));
        assert.isFalse(await v.tokenNotExist('0.0.1'));
    });

    it('getArtifact delegates and awaits', async () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getArtifact: async (u) => ({ u }) }));
        assert.deepEqual(await v.getArtifact('a1'), { u: 'a1' });
    });
});

describe('@unit BlockValidator.validateSchema', () => {
    it('returns non-existing-schema error when unsupportedSchema true', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ unsupportedSchema: () => true }));
        assert.match(v.validateSchema('#x'), /refers to non-existing schema/);
    });

    it('returns null when schema exists and supported', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ unsupportedSchema: () => false, schemaExist: () => true }));
        assert.isNull(v.validateSchema('#x'));
    });

    it('returns does-not-exist error when schema missing', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ unsupportedSchema: () => false, schemaExist: () => false }));
        assert.match(v.validateSchema('#x'), /does not exist/);
    });
});

describe('@unit BlockValidator.validateSchemaVariable', () => {
    it('returns null for empty optional value', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.isNull(v.validateSchemaVariable('s', '', false));
    });

    it('returns "is not set" for empty required value', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.equal(v.validateSchemaVariable('s', '', true), 'Option "s" is not set');
    });

    it('returns "must be a string" when value not a string', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.equal(v.validateSchemaVariable('s', 123, true), 'Option "s" must be a string');
    });

    it('delegates to validateSchema for valid string value', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ schemaExist: () => true }));
        assert.isNull(v.validateSchemaVariable('s', '#abc', true));
    });

    it('returns error from validateSchema when schema missing', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ schemaExist: () => false }));
        assert.match(v.validateSchemaVariable('s', '#abc', true), /does not exist/);
    });
});

describe('@unit BlockValidator.getErrorMessage', () => {
    const v = () => new BlockValidator(makeConfig(), makeFakeValidator());
    it('returns string as-is', () => {
        assert.equal(v().getErrorMessage('plain'), 'plain');
    });
    it('returns .message', () => {
        assert.equal(v().getErrorMessage({ message: 'm' }), 'm');
    });
    it('returns .error when no message', () => {
        assert.equal(v().getErrorMessage({ error: 'e' }), 'e');
    });
    it('returns .name when no message/error', () => {
        assert.equal(v().getErrorMessage({ name: 'n' }), 'n');
    });
    it('returns Unidentified error otherwise', () => {
        assert.equal(v().getErrorMessage({}), 'Unidentified error');
    });
    it('prefers message over error and name', () => {
        assert.equal(v().getErrorMessage({ message: 'm', error: 'e', name: 'n' }), 'm');
    });
});

describe('@unit BlockValidator.validateFormula', () => {
    const v = () => new BlockValidator(makeConfig(), makeFakeValidator());
    it('true for valid formula', () => {
        assert.isTrue(v().validateFormula('a + b * 2'));
    });
    it('false for invalid formula', () => {
        assert.isFalse(v().validateFormula('a +'));
    });
    it('true for numeric literal', () => {
        assert.isTrue(v().validateFormula('42'));
    });
});

describe('@unit BlockValidator.parsFormulaVariables', () => {
    const v = () => new BlockValidator(makeConfig(), makeFakeValidator());
    it('extracts variable symbols', () => {
        const vars = v().parsFormulaVariables('a + b');
        assert.include(vars, 'a');
        assert.include(vars, 'b');
    });
    it('excludes known mathjs symbols like pi', () => {
        const vars = v().parsFormulaVariables('pi + x');
        assert.notInclude(vars, 'pi');
        assert.include(vars, 'x');
    });
    it('returns empty array on parse error', () => {
        assert.deepEqual(v().parsFormulaVariables('a +'), []);
    });
    it('returns empty for pure numeric', () => {
        assert.deepEqual(v().parsFormulaVariables('1 + 2'), []);
    });
});

describe('@unit BlockValidator.compareFields', () => {
    const v = () => new BlockValidator(makeConfig(), makeFakeValidator());
    const base = { name: 'a', title: 't', description: 'd', required: true, isArray: false, isRef: false, type: 'string', format: '', pattern: '', unit: '', unitSystem: '', customType: '' };
    it('equal non-ref fields compare true', () => {
        assert.isTrue(v().compareFields({ ...base }, { ...base }));
    });
    it('different name compares false', () => {
        assert.isFalse(v().compareFields({ ...base }, { ...base, name: 'b' }));
    });
    it('different type compares false (non-ref)', () => {
        assert.isFalse(v().compareFields({ ...base }, { ...base, type: 'number' }));
    });
    it('isRef true short-circuits to true when core props match', () => {
        const ref = { ...base, isRef: true };
        assert.isTrue(v().compareFields({ ...ref }, { ...ref, type: 'whatever-different' }));
    });
    it('different required compares false', () => {
        assert.isFalse(v().compareFields({ ...base }, { ...base, required: false }));
    });
    it('different isArray compares false', () => {
        assert.isFalse(v().compareFields({ ...base }, { ...base, isArray: true }));
    });
});

describe('@unit BlockValidator.ifExtendFields', () => {
    const v = () => new BlockValidator(makeConfig(), makeFakeValidator());
    const f = (name) => ({ name, title: name, description: '', required: false, isArray: false, isRef: false, type: 'string', format: '', pattern: '', unit: '', unitSystem: '', customType: '' });
    it('returns false when extension or base falsy', () => {
        assert.isFalse(v().ifExtendFields(null, [f('a')]));
        assert.isFalse(v().ifExtendFields([f('a')], null));
    });
    it('returns true when extension contains all base fields equally', () => {
        assert.isTrue(v().ifExtendFields([f('a'), f('b')], [f('a')]));
    });
    it('returns false when base field missing in extension', () => {
        assert.isFalse(v().ifExtendFields([f('a')], [f('z')]));
    });
    it('returns false when matched field differs', () => {
        assert.isFalse(v().ifExtendFields([{ ...f('a'), type: 'number' }], [f('a')]));
    });
});

describe('@unit BlockValidator.getSchemaFields', () => {
    const v = () => new BlockValidator(makeConfig(), makeFakeValidator());
    it('returns null for malformed JSON string', () => {
        assert.isNull(v().getSchemaFields('{not json'));
    });
    it('returns an array for a minimal valid schema document', () => {
        const doc = { $id: '#a', type: 'object', properties: {}, required: [] };
        const res = v().getSchemaFields(doc);
        assert.isArray(res);
    });
});

describe('@unit BlockValidator.validateBaseSchema', () => {
    it('returns null when baseSchema falsy', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator());
        assert.isNull(v.validateBaseSchema(null, {}));
    });
    it('returns does-not-exist when base string resolves to nothing', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ getSchema: () => null }));
        assert.match(v.validateBaseSchema('#base', '#schema'), /does not exist/);
    });
    it('returns schema-does-not-exist when only schema missing', () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({
            getSchema: (i) => i === '#base' ? { document: {} } : null,
        }));
        assert.match(v.validateBaseSchema('#base', '#schema'), /"#schema" does not exist/);
    });
});

describe('@unit BlockValidator.validate (integration of pure branches)', () => {
    it('adds error when tag count > 1', async () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ tagCount: () => 2 }));
        await v.validate();
        assert.isTrue(v.errors.some(e => /already exist/.test(e)));
    });

    it('adds error when permission not exist', async () => {
        const v = new BlockValidator(makeConfig(), makeFakeValidator({ permissionsNotExist: () => 'BADPERM' }));
        await v.validate();
        assert.isTrue(v.errors.some(e => /Permission BADPERM not exist/.test(e)));
    });

    it('no errors for unknown blockType with clean validator', async () => {
        const v = new BlockValidator(makeConfig({ blockType: 'no-such-block-type' }), makeFakeValidator());
        await v.validate();
        assert.equal(v.errors.length, 0);
    });

    it('captures thrown error message', async () => {
        const fv = makeFakeValidator({ tagCount: () => { throw new Error('explode'); } });
        const v = new BlockValidator(makeConfig(), fv);
        await v.validate();
        assert.deepEqual(v.errors, ['explode']);
    });

    it('captures thrown string error', async () => {
        const fv = makeFakeValidator({ tagCount: () => { throw 'strErr'; } });
        const v = new BlockValidator(makeConfig(), fv);
        await v.validate();
        assert.deepEqual(v.errors, ['strErr']);
    });
});
