import { assert } from 'chai';
import { XlsxSchema, XlsxTool } from '../../../dist/xlsx/models/xlsx-schema.js';
import { XlsxExpressions } from '../../../dist/xlsx/models/xlsx-expressions.js';
import { Workbook } from '../../../dist/xlsx/models/workbook.js';
import { SchemaCategory, SchemaEntity } from '@guardian/interfaces';

function makeWorksheet(name) {
    const wb = new Workbook();
    return wb.createWorksheet(name);
}

describe('XlsxSchema construction', () => {
    it('initialises a POLICY schema named after the worksheet', () => {
        const ws = makeWorksheet('MySchema');
        const x = new XlsxSchema(ws);
        assert.equal(x.sheetName, 'MySchema');
        assert.equal(x.name, 'MySchema');
        assert.equal(x.category, undefined);
        assert.equal(x.schema.category, SchemaCategory.POLICY);
    });

    it('exposes the underlying worksheet', () => {
        const ws = makeWorksheet('S');
        const x = new XlsxSchema(ws);
        assert.strictEqual(x.worksheet, ws);
    });
});

describe('XlsxSchema getters/setters', () => {
    let x;
    beforeEach(() => {
        x = new XlsxSchema(makeWorksheet('S'));
    });

    it('name setter updates the schema name', () => {
        x.name = 'Renamed';
        assert.equal(x.name, 'Renamed');
        assert.equal(x.schema.name, 'Renamed');
    });

    it('description setter/getter', () => {
        x.description = 'desc';
        assert.equal(x.description, 'desc');
    });

    it('entity setter/getter', () => {
        x.entity = SchemaEntity.VC;
        assert.equal(x.entity, SchemaEntity.VC);
    });

    it('errors setter/getter', () => {
        x.errors = [{ code: 'E1' }];
        assert.deepEqual(x.errors, [{ code: 'E1' }]);
    });

    it('fields reflects the underlying schema fields', () => {
        assert.equal(x.fields, x.schema.fields);
    });

    it('iri reflects the underlying schema iri', () => {
        assert.equal(x.iri, x.schema.iri);
    });
});

describe('XlsxSchema.update', () => {
    it('sets fields/conditions, assigns expressions and seeds its schema', () => {
        const x = new XlsxSchema(makeWorksheet('S'));
        const expressions = new XlsxExpressions();
        x.update([], [], expressions);
        assert.strictEqual(x.expressions, expressions);
        assert.isString(x.iri);
    });

    it('getVariables delegates to expressions', () => {
        const x = new XlsxSchema(makeWorksheet('S'));
        const expressions = new XlsxExpressions();
        x.update([], [], expressions);
        const vars = x.getVariables();
        assert.instanceOf(vars, Map);
    });
});

describe('XlsxTool', () => {
    it('uses the supplied name and a TOOL category', () => {
        const ws = makeWorksheet('ToolSheet');
        const t = new XlsxTool(ws, 'MyTool', 'msg-1');
        assert.equal(t.name, 'MyTool');
        assert.equal(t.messageId, 'msg-1');
        assert.equal(t.sheetName, 'ToolSheet');
        assert.equal(t.category, SchemaCategory.TOOL);
    });

    it('falls back to the worksheet name when name is empty', () => {
        const ws = makeWorksheet('FallbackName');
        const t = new XlsxTool(ws, '', 'msg-2');
        assert.equal(t.name, 'FallbackName');
    });
});
