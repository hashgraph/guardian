import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { FormulaImportExport } from '../../../dist/import-export/formula.js';

describe('FormulaImportExport zip handling', () => {
    it('generateZipFile writes formula.json and schemas.json', async () => {
        const zip = await FormulaImportExport.generateZipFile({
            formula: { name: 'F', config: { formulas: [] } },
            schemas: [{ iri: '#s1' }]
        });
        assert.ok(zip.files['formula.json']);
        assert.ok(zip.files['schemas.json']);
    });

    it('strips identity fields from the packed formula', async () => {
        const zip = await FormulaImportExport.generateZipFile({
            formula: { id: '1', _id: 'x', owner: 'o', createDate: 'c', updateDate: 'u', name: 'F' },
            schemas: []
        });
        const parsed = JSON.parse(await zip.files['formula.json'].async('string'));
        assert.equal(parsed.id, undefined);
        assert.equal(parsed._id, undefined);
        assert.equal(parsed.owner, undefined);
        assert.equal(parsed.name, 'F');
    });

    it('parseZipFile round-trips formula and schemas', async () => {
        const zip = await FormulaImportExport.generateZipFile({
            formula: { name: 'RT', config: { formulas: [] } },
            schemas: [{ iri: '#a', name: 'A' }]
        });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const components = await FormulaImportExport.parseZipFile(buffer);
        assert.equal(components.formula.name, 'RT');
        assert.deepEqual(components.schemas, [{ iri: '#a', name: 'A' }]);
    });

    it('parseZipFile defaults schemas to empty array when schemas.json is missing', async () => {
        const zip = new JSZip();
        zip.file('formula.json', JSON.stringify({ name: 'NoSchemas' }));
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const components = await FormulaImportExport.parseZipFile(buffer);
        assert.deepEqual(components.schemas, []);
    });

    it('parseZipFile rejects a zip without formula.json', async () => {
        const zip = new JSZip();
        zip.file('schemas.json', '[]');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(FormulaImportExport.parseZipFile(buffer), /Zip file is not a formula/);
    });
});

describe('FormulaImportExport.validateConfig', () => {
    it('returns the input untouched', () => {
        const data = { formulas: [{ uuid: '1' }] };
        assert.equal(FormulaImportExport.validateConfig(data), data);
        assert.equal(FormulaImportExport.validateConfig(undefined), undefined);
    });
});

describe('FormulaImportExport.getSchemaIds', () => {
    it('collects entity ids of schema links', () => {
        const ids = FormulaImportExport.getSchemaIds({
            formulas: [
                { link: { type: 'schema', entityId: '#s1' } },
                { link: { type: 'schema', entityId: '#s2' } },
                { link: { type: 'formula', entityId: '#f' } },
                { link: null },
                {}
            ]
        });
        assert.deepEqual(Array.from(ids).sort(), ['#s1', '#s2']);
    });

    it('returns an empty set for missing config or formulas', () => {
        assert.equal(FormulaImportExport.getSchemaIds(undefined).size, 0);
        assert.equal(FormulaImportExport.getSchemaIds({ formulas: 'bad' }).size, 0);
    });
});

describe('FormulaImportExport.replaceIds', () => {
    it('replaces matching link entity ids', () => {
        const data = {
            formulas: [
                { link: { type: 'schema', entityId: 'old' } },
                { link: { type: 'schema', entityId: 'other' } }
            ]
        };
        const result = FormulaImportExport.replaceIds(data, 'old', 'new');
        assert.equal(result.formulas[0].link.entityId, 'new');
        assert.equal(result.formulas[1].link.entityId, 'other');
    });

    it('passes through null data and non-array formulas', () => {
        assert.equal(FormulaImportExport.replaceIds(null, 'a', 'b'), null);
        const data = { formulas: 'bad' };
        assert.equal(FormulaImportExport.replaceIds(data, 'a', 'b'), data);
    });
});

describe('FormulaImportExport.generateByPolicy', () => {
    it('returns null when the policy has no mathBlocks', () => {
        const policy = { name: 'P', config: { blockType: 'root', children: [{ blockType: 'other' }] } };
        assert.equal(FormulaImportExport.generateByPolicy(policy), null);
    });

    it('builds a draft formula from a mathBlock', () => {
        const policy = {
            id: 'pid',
            name: 'P',
            description: 'D',
            owner: 'did:owner',
            topicId: '0.0.1',
            instanceTopicId: '0.0.2',
            config: {
                blockType: 'root',
                children: [{
                    blockType: 'mathBlock',
                    tag: 'calc',
                    inputSchema: '#in',
                    outputSchema: '#out',
                    expression: {
                        variables: [{ name: 'a', description: 'var a', field: 'field0' }],
                        formulas: [{ name: 'f1', description: 'formula 1', body: 'a + 1', relationships: ['a'] }],
                        outputs: [{ name: 'f1', field: 'field1' }]
                    }
                }]
            }
        };
        const formula = FormulaImportExport.generateByPolicy(policy);
        assert.ok(formula);
        assert.equal(formula.name, 'P');
        assert.equal(formula.policyId, 'pid');
        assert.equal(formula.autoGenerated, true);
        const items = formula.config.formulas;
        assert.equal(items.length, 2);
        const variable = items.find((i) => i.type === 'variable');
        const f1 = items.find((i) => i.type === 'formula');
        assert.deepEqual(variable.link, { entityId: '#in', item: 'field0', type: 'schema' });
        assert.equal(f1.value, 'a + 1');
        assert.deepEqual(f1.relationships, [variable.uuid]);
        assert.deepEqual(f1.link, { entityId: '#out', item: 'field1', type: 'schema' });
    });

    it('falls back to inputSchema when outputSchema is missing', () => {
        const policy = {
            id: 'p',
            name: 'N',
            config: {
                blockType: 'root',
                children: [{
                    blockType: 'mathBlock',
                    tag: 't',
                    inputSchema: '#only',
                    expression: {
                        variables: [{ name: 'v', description: 'v', field: 'f' }],
                        formulas: [],
                        outputs: [{ name: 'v', field: 'fOut' }]
                    }
                }]
            }
        };
        const formula = FormulaImportExport.generateByPolicy(policy);
        const items = formula.config.formulas;
        const generated = items.find((i) => i.type === 'formula');
        assert.ok(generated);
        assert.deepEqual(generated.link, { entityId: '#only', item: 'fOut', type: 'schema' });
        assert.equal(generated.value, 'v');
    });

    it('flattens grouped expression items', () => {
        const policy = {
            id: 'p',
            name: 'N',
            config: {
                blockType: 'root',
                children: [{
                    blockType: 'mathBlock',
                    tag: 't',
                    inputSchema: '#in',
                    expression: {
                        variables: [{ type: 'group', items: [{ name: 'g1', description: 'grouped', field: 'fg' }] }],
                        formulas: [],
                        outputs: []
                    }
                }]
            }
        };
        const formula = FormulaImportExport.generateByPolicy(policy);
        assert.equal(formula.config.formulas.length, 1);
        assert.equal(formula.config.formulas[0].name, 'g1');
    });
});
