import assert from 'node:assert/strict';
import { FormulaImportExport } from '../../../dist/import-export/formula.js';

const config = () => ({
    formulas: [
        { uuid: 'a', type: 'variable', name: 'A', value: '' },
        { uuid: 'b', type: 'variable', name: 'B', value: '' },
        { uuid: 'm', type: 'formula', name: 'Main', value: 'a+b', relationships: ['a', 'gone', 'b'] },
        { uuid: 't', type: 'text', name: 'Note', value: '', relationships: ['gone'] },
    ],
    files: []
});

describe('FormulaImportExport.validateConfig', () => {
    it('drops relationships that match no item and keeps the order of the rest', () => {
        const result = FormulaImportExport.validateConfig(config());
        assert.deepEqual(result.formulas.find((e) => e.uuid === 'm').relationships, ['a', 'b']);
        assert.deepEqual(result.formulas.find((e) => e.uuid === 't').relationships, []);
    });

    it('does not add relationships to items that have none', () => {
        const result = FormulaImportExport.validateConfig(config());
        assert.equal('relationships' in result.formulas.find((e) => e.uuid === 'a'), false);
    });

    it('tolerates a missing config', () => {
        assert.equal(FormulaImportExport.validateConfig(undefined), undefined);
        assert.deepEqual(FormulaImportExport.validateConfig({}), {});
    });
});

describe('FormulaImportExport.generateZipFile', () => {
    it('does not write dangling relationships to formula.json', async () => {
        const zip = await FormulaImportExport.generateZipFile({ formula: { name: 'F', config: config() }, schemas: [] });
        const parsed = JSON.parse(await zip.files['formula.json'].async('string'));
        assert.deepEqual(parsed.config.formulas.find((e) => e.uuid === 'm').relationships, ['a', 'b']);
    });
});
