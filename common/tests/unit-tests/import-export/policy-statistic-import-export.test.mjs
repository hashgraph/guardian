import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { PolicyStatisticImportExport } from '../../../dist/import-export/policy-statistic.js';

describe('PolicyStatisticImportExport zip handling', () => {
    it('generateZipFile writes statistic.json without identity fields', async () => {
        const zip = await PolicyStatisticImportExport.generateZipFile({
            definition: { id: '1', _id: 'x', owner: 'o', createDate: 'c', updateDate: 'u', name: 'S' }
        });
        const parsed = JSON.parse(await zip.files['statistic.json'].async('string'));
        assert.equal(parsed.id, undefined);
        assert.equal(parsed._id, undefined);
        assert.equal(parsed.owner, undefined);
        assert.equal(parsed.name, 'S');
    });

    it('generate + parseZipFile round-trips a definition', async () => {
        const zip = await PolicyStatisticImportExport.generate({ name: 'RT', config: { variables: [] } });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const { definition } = await PolicyStatisticImportExport.parseZipFile(buffer);
        assert.equal(definition.name, 'RT');
        assert.deepEqual(definition.config, { variables: [] });
    });

    it('parseZipFile rejects a zip without statistic.json', async () => {
        const zip = new JSZip();
        zip.file('whatever.json', '{}');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(PolicyStatisticImportExport.parseZipFile(buffer), /Zip file is not a policy statistic/);
    });
});

describe('PolicyStatisticImportExport.validateConfig', () => {
    it('returns empty collections for undefined input', () => {
        assert.deepEqual(PolicyStatisticImportExport.validateConfig(undefined), {
            variables: [],
            scores: [],
            formulas: [],
            rules: []
        });
    });

    it('normalises a full config', () => {
        const config = PolicyStatisticImportExport.validateConfig({
            variables: [{ id: 'v1', schemaId: '#s', path: 'p', fieldRef: 'true', fieldArray: 1 }],
            scores: [{ id: 's1', type: 'score', description: 'd', relationships: ['v1'], options: [{ description: 'o', value: 3 }] }],
            formulas: [{ id: 'f1', type: 'string', description: 'd', formula: 'a' }],
            rules: [{ schemaId: '#s', type: 'main', unique: true }]
        });
        assert.equal(config.variables[0].id, 'v1');
        assert.equal(config.variables[0].fieldRef, true);
        assert.equal(config.variables[0].fieldArray, false);
        assert.deepEqual(config.scores[0].relationships, ['v1']);
        assert.deepEqual(config.scores[0].options, [{ description: 'o', value: 3 }]);
        assert.deepEqual(config.formulas[0], { id: 'f1', type: 'string', description: 'd', formula: 'a' });
        assert.deepEqual(config.rules[0], { schemaId: '#s', type: 'main', unique: true });
    });
});

describe('PolicyStatisticImportExport.validateVariables', () => {
    it('returns empty array for non-array input', () => {
        assert.deepEqual(PolicyStatisticImportExport.validateVariables('bad'), []);
        assert.deepEqual(PolicyStatisticImportExport.validateVariables(undefined), []);
    });

    it('coerces missing string fields to empty strings', () => {
        const variables = PolicyStatisticImportExport.validateVariables([{ id: 5 }]);
        assert.deepEqual(variables[0], {
            id: '',
            schemaId: '',
            path: '',
            schemaName: '',
            schemaPath: '',
            fieldType: '',
            fieldRef: false,
            fieldArray: false,
            fieldDescription: '',
            fieldProperty: '',
            fieldPropertyName: ''
        });
    });
});

describe('PolicyStatisticImportExport.validateScores', () => {
    it('filters non-string relationships values to empty strings', () => {
        const scores = PolicyStatisticImportExport.validateScores([
            { id: 's', type: 't', description: 'd', relationships: ['ok', 7], options: 'bad' }
        ]);
        assert.deepEqual(scores[0].relationships, ['ok', '']);
        assert.deepEqual(scores[0].options, []);
    });

    it('keeps numeric and string option values', () => {
        const scores = PolicyStatisticImportExport.validateScores([
            { options: [{ description: 'a', value: 1 }, { description: 'b', value: 'x' }, { description: 'c', value: null }] }
        ]);
        assert.deepEqual(scores[0].options.map((o) => o.value), [1, 'x', '']);
    });
});

describe('PolicyStatisticImportExport.validateFormulas', () => {
    it('returns empty array for non-array input', () => {
        assert.deepEqual(PolicyStatisticImportExport.validateFormulas(null), []);
    });

    it('drops unknown keys and keeps known ones', () => {
        const formulas = PolicyStatisticImportExport.validateFormulas([
            { id: 'f', type: 't', description: 'd', formula: 'x', stray: true }
        ]);
        assert.deepEqual(formulas[0], { id: 'f', type: 't', description: 'd', formula: 'x' });
    });
});

describe('PolicyStatisticImportExport.validateFormulasWithRule', () => {
    it('includes a validated rule', () => {
        const formulas = PolicyStatisticImportExport.validateFormulasWithRule([
            { id: 'f', type: 't', description: 'd', formula: 'x', rule: { type: 'formula', formula: 'y' } }
        ]);
        assert.deepEqual(formulas[0].rule, { type: 'formula', formula: 'y' });
    });

    it('sets rule to undefined when missing', () => {
        const formulas = PolicyStatisticImportExport.validateFormulasWithRule([{ id: 'f' }]);
        assert.equal(formulas[0].rule, undefined);
    });
});

describe('PolicyStatisticImportExport.validateRules', () => {
    it('returns empty array for non-array input', () => {
        assert.deepEqual(PolicyStatisticImportExport.validateRules({}), []);
    });

    it('coerces unique with strict true matching', () => {
        const rules = PolicyStatisticImportExport.validateRules([
            { schemaId: '#a', type: 'main', unique: 'true' },
            { schemaId: '#b', type: 'related', unique: 'yes' }
        ]);
        assert.equal(rules[0].unique, true);
        assert.equal(rules[1].unique, false);
    });
});

describe('PolicyStatisticImportExport.updateSchemas', () => {
    it('returns undefined when data is missing', () => {
        assert.equal(PolicyStatisticImportExport.updateSchemas([], undefined), undefined);
    });

    it('maps unknown schema ids to undefined with empty schema list', () => {
        const data = {
            variables: [{ schemaId: 'old', schemaName: 'S', path: 'p', fieldDescription: 'd', fieldType: 't', fieldArray: false, fieldRef: false }],
            rules: [{ schemaId: 'old' }]
        };
        const result = PolicyStatisticImportExport.updateSchemas([], data);
        assert.equal(result.variables[0].schemaId, undefined);
        assert.equal(result.rules[0].schemaId, undefined);
    });
});
