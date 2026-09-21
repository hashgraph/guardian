import { assert } from 'chai';
import { XlsxVariable, XlsxExpressions } from '../../../dist/xlsx/models/xlsx-expressions.js';

describe('XlsxVariable construction', () => {
    it('stores name/path/description and clamps negative lvl to 0', () => {
        const v = new XlsxVariable('n', 'p', 'd', -5);
        assert.equal(v.fieldName, 'n');
        assert.equal(v.fieldPath, 'p');
        assert.equal(v.fieldDescription, 'd');
        assert.equal(v.lvl, 0);
    });

    it('clamps undefined lvl to 0', () => {
        const v = new XlsxVariable('n', 'p', 'd', undefined);
        assert.equal(v.lvl, 0);
    });

    it('keeps positive lvl', () => {
        const v = new XlsxVariable('n', 'p', 'd', 3);
        assert.equal(v.lvl, 3);
    });
});

describe('XlsxVariable.fullPath', () => {
    it('returns null when no field set', () => {
        const v = new XlsxVariable('n', 'p', 'd', 0);
        assert.isNull(v.fullPath);
    });

    it('returns field name when no parent', () => {
        const v = new XlsxVariable('n', 'p', 'd', 0);
        v.setField({ name: 'fieldA' });
        assert.equal(v.fullPath, 'fieldA');
    });

    it('joins parent path with child field name', () => {
        const parent = new XlsxVariable('p', 'p', 'd', 0);
        parent.setField({ name: 'root' });
        const child = new XlsxVariable('c', 'c', 'd', 1);
        child.setField({ name: 'leaf' });
        parent.add(child);
        assert.equal(child.fullPath, 'root.leaf');
    });
});

describe('XlsxVariable.update', () => {
    it('throws when no schema is set', () => {
        const v = new XlsxVariable('n', 'p', 'd', 0);
        assert.throws(() => v.update([]), /Schema not found/);
    });

    it('matches field by title at lvl 0', () => {
        const v = new XlsxVariable('n', 'MyTitle', 'desc', 0);
        v.setSchema({ fields: [{ name: 'f1', title: 'MyTitle', type: 't' }] });
        v.update([]);
        assert.equal(v.fullPath, 'f1');
    });

    it('matches field by description at deeper lvl', () => {
        const v = new XlsxVariable('n', 'p', 'MyDesc', 1);
        v.setSchema({ fields: [{ name: 'f2', description: 'MyDesc', type: 't' }] });
        v.update([]);
        assert.equal(v.fullPath, 'f2');
    });

    it('throws when field not found', () => {
        const v = new XlsxVariable('n', 'NoSuch', 'd', 0);
        v.setSchema({ fields: [] });
        assert.throws(() => v.update([]), /Fields not found/);
    });

    it('throws when sub-schema type not found for children', () => {
        const parent = new XlsxVariable('p', 'Root', 'd', 0);
        parent.setSchema({ fields: [{ name: 'f', title: 'Root', type: 'subIri' }] });
        const child = new XlsxVariable('c', 'p', 'cd', 1);
        parent.add(child);
        assert.throws(() => parent.update([]), /Type not found/);
    });

    it('recurses into children when sub-schema is found', () => {
        const parent = new XlsxVariable('p', 'Root', 'd', 0);
        parent.setSchema({ fields: [{ name: 'f', title: 'Root', type: 'subIri' }] });
        const child = new XlsxVariable('c', 'p', 'ChildDesc', 1);
        parent.add(child);
        const subSchema = { iri: 'subIri', fields: [{ name: 'g', description: 'ChildDesc', type: 't' }] };
        parent.update([subSchema]);
        assert.equal(child.fullPath, 'f.g');
    });
});

describe('XlsxExpressions', () => {
    it('getVariables maps fieldPath to fullPath (null before update)', () => {
        const ex = new XlsxExpressions();
        ex.addVariable({ name: 'n', path: 'pathA' }, 'desc', 0);
        const vars = ex.getVariables();
        assert.isTrue(vars.has('pathA'));
        assert.isNull(vars.get('pathA'));
    });

    it('updateSchemas resolves root-level variables', () => {
        const ex = new XlsxExpressions();
        ex.setSchema({ fields: [{ name: 'f1', title: 'TitleA', type: 't' }] });
        ex.addVariable({ name: 'n', path: 'TitleA' }, 'descA', 0);
        ex.updateSchemas([]);
        assert.equal(ex.getVariables().get('TitleA'), 'f1');
    });

    it('updateSchemas throws on invalid group level jump', () => {
        const ex = new XlsxExpressions();
        ex.setSchema({ fields: [] });
        ex.addVariable({ name: 'n', path: 'p' }, 'd', 2);
        assert.throws(() => ex.updateSchemas([]), /Invalid group level/);
    });

    it('updateSchemas nests a child under its parent', () => {
        const ex = new XlsxExpressions();
        ex.setSchema({ fields: [{ name: 'root', title: 'Root', type: 'subIri' }] });
        ex.addVariable({ name: 'p', path: 'Root' }, 'descRoot', 0);
        ex.addVariable({ name: 'c', path: 'p' }, 'ChildDesc', 1);
        const subSchema = { iri: 'subIri', fields: [{ name: 'leaf', description: 'ChildDesc', type: 't' }] };
        ex.updateSchemas([subSchema]);
        const vars = ex.getVariables();
        assert.equal(vars.get('Root'), 'root');
        assert.equal(vars.get('p'), 'root.leaf');
    });
});
