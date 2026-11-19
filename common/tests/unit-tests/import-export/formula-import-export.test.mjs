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

    it('collects the schemas of all links of an item', () => {
        const ids = FormulaImportExport.getSchemaIds({
            formulas: [{
                link: { type: 'schema', entityId: '#s1' },
                links: [
                    { type: 'schema', entityId: '#s1' },
                    { type: 'schema', entityId: '#s3' },
                    { type: 'formula', entityId: '#f' }
                ]
            }]
        });
        assert.deepEqual(Array.from(ids).sort(), ['#s1', '#s3']);
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

    it('replaces the entity id in every link of an item', () => {
        const data = {
            formulas: [{
                link: { type: 'schema', entityId: 'old' },
                links: [
                    { type: 'schema', entityId: 'old' },
                    { type: 'schema', entityId: 'other' },
                    { type: 'schema', entityId: 'old' }
                ]
            }]
        };
        const result = FormulaImportExport.replaceIds(data, 'old', 'new');
        assert.equal(result.formulas[0].link.entityId, 'new');
        assert.deepEqual(result.formulas[0].links.map((e) => e.entityId), ['new', 'other', 'new']);
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

describe('FormulaImportExport links array', () => {
    it('replaces ids in link and links', () => {
        const data = {
            formulas: [{
                link: { type: 'schema', entityId: 'old' },
                links: [{ type: 'schema', entityId: 'old' }, { type: 'schema', entityId: 'other' }]
            }]
        };
        FormulaImportExport.replaceIds(data, 'old', 'new');
        assert.equal(data.formulas[0].link.entityId, 'new');
        assert.deepEqual(data.formulas[0].links.map((l) => l.entityId), ['new', 'other']);
    });

    it('collects schema ids from links', () => {
        const ids = FormulaImportExport.getSchemaIds({
            formulas: [{ links: [{ type: 'schema', entityId: '#a' }, { type: 'formula', entityId: '#f' }] }]
        });
        assert.deepEqual(Array.from(ids), ['#a']);
    });
});
const config = () => ({
    formulas: [
        { uuid: 'a', type: 'variable', name: 'A', value: '' },
        { uuid: 'b', type: 'variable', name: 'B', value: '' },
        { uuid: 'm', type: 'formula', name: 'Main', value: 'a+b', relationships: ['a', 'gone', 'b'] },
        { uuid: 't', type: 'text', name: 'Note', value: '', relationships: ['gone'] },
    ],
    files: []
});

describe('FormulaImportExport.validateConfig relationships', () => {
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

describe('FormulaImportExport table column outputs', () => {
    const generate = (outputs, extra = {}) => FormulaImportExport.generateByPolicy({
        name: 'Column outputs',
        config: {
            blockType: 'mathBlock', inputSchema: '#input', outputSchema: '#output', tag: 'Calculate',
            expression: {
                variables: [{ name: 'fuel', field: 'source.fuel' }],
                formulas: [{ type: 'group', items: [{ name: 'co2', body: 'fuel * 2', relationships: ['fuel'] }] }],
                outputs,
                ...extra
            }
        }
    }).config.formulas;

    it('links one equation to every mapped column and mirrors its first link', () => {
        const items = generate([{ type: 'group', items: [
            { field: 'results', name: '', columns: { first: 'co2', second: 'co2', notes: '', bad: 'unknown' } },
            { field: 'moreResults', name: '', columns: { total: 'co2' }, tableList: true }
        ] }]);
        const equation = items.find(item => item.name === 'co2');
        assert.deepEqual(equation.links, [
            { type: 'schema', entityId: '#output', item: 'results', columnKey: 'first' },
            { type: 'schema', entityId: '#output', item: 'results', columnKey: 'second' },
            { type: 'schema', entityId: '#output', item: 'moreResults', columnKey: 'total' }
        ]);
        assert.deepEqual(equation.link, equation.links[0]);
        assert.deepEqual(equation.relationships, [items.find(item => item.name === 'fuel').uuid]);
    });

    it('wraps pass-through variables once and keeps their input link', () => {
        const items = generate([{ field: 'results', columns: { a: 'fuel', b: 'fuel' } }]);
        const input = items.find(item => item.type === 'variable');
        const output = items.find(item => item.type === 'formula' && item.name === 'fuel');
        assert.deepEqual(input.link, { type: 'schema', entityId: '#input', item: 'source.fuel' });
        assert.equal(output.value, 'fuel');
        assert.deepEqual(output.relationships, [input.uuid]);
        assert.deepEqual(output.links.map(link => link.columnKey), ['a', 'b']);
        assert.equal(items.filter(item => item.type === 'formula' && item.name === 'fuel').length, 1);
    });

    it('normalizes mapped names using the Math output naming rules', () => {
        const items = generate([{ field: 'results', columns: { a: ' co2,i ', b: 'fuel + 1', c: ' ' } }], {
            formulas: [{ name: 'co2_i', body: 'fuel * 2', relationships: ['fuel'] }]
        });
        assert.deepEqual(items.find(item => item.name === 'co2_i').links, [
            { type: 'schema', entityId: '#output', item: 'results', columnKey: 'a' }
        ]);
    });

    it('links equations saved with the editor notation of their name', () => {
        const items = generate([{ field: 'results', columns: { a: 'co2,i', b: 'co2_i', c: 'net' } }], {
            formulas: [{ name: 'co2,i', body: 'fuel * 2' }, { name: ' net ', body: 'fuel' }]
        });
        assert.deepEqual(items.find(item => item.name === 'co2,i').links, [
            { type: 'schema', entityId: '#output', item: 'results', columnKey: 'a' },
            { type: 'schema', entityId: '#output', item: 'results', columnKey: 'b' }
        ]);
        assert.deepEqual(items.find(item => item.name === ' net ').links, [
            { type: 'schema', entityId: '#output', item: 'results', columnKey: 'c' }
        ]);
    });

    it('wraps pass-through variables saved with the editor notation of their name', () => {
        const items = generate([{ field: 'results', columns: { a: 'fuel_j', b: ' fuel,j ' } }], {
            variables: [{ name: ' fuel,j ', field: 'source.fuel' }]
        });
        const input = items.find(item => item.type === 'variable');
        const outputs = items.filter(item => item.type === 'formula' && item.relationships.includes(input.uuid) && item.links);
        assert.deepEqual(input.link, { type: 'schema', entityId: '#input', item: 'source.fuel' });
        assert.equal(outputs.length, 1);
        assert.equal(outputs[0].name, 'fuel,j');
        assert.deepEqual(outputs[0].links.map(link => link.columnKey), ['a', 'b']);
    });

    it('keeps the scalar target when an equation also supplies a table', () => {
        const items = generate([
            { name: 'co2', field: 'scalar' },
            { field: 'results', columns: { total: 'co2' } }
        ]);
        const links = items.find(item => item.name === 'co2').links;
        assert.deepEqual(links.map(link => [link.item, link.columnKey]), [['scalar', undefined], ['results', 'total']]);
    });

    it('round-trips column identity and replaces its schema id', async () => {
        const items = generate([{ field: 'results', columns: { total: 'co2' } }]);
        const zip = await FormulaImportExport.generateZipFile({ formula: { config: { formulas: items } }, schemas: [] });
        const parsed = await FormulaImportExport.parseZipFile(await zip.generateAsync({ type: 'nodebuffer' }));
        FormulaImportExport.replaceIds(parsed.formula.config, '#output', '#imported');
        const item = parsed.formula.config.formulas.find(item => item.name === 'co2');
        assert.equal(item.links[0].columnKey, 'total');
        assert.equal(item.links[0].entityId, '#imported');
        assert.deepEqual(item.link, item.links[0]);
    });
});

describe('FormulaImportExport table grid outputs', () => {
    const generate = outputs => FormulaImportExport.generateByPolicy({ name: 'Grid outputs', config: {
        blockType: 'mathBlock', inputSchema: '#input', outputSchema: '#output', expression: {
            variables: [{ name: 'year', field: 'year' }],
            formulas: [{ name: 'first', body: '1' }, { name: 'sum', body: '2' }], outputs
        }
    } }).config.formulas;

    it('links grid formulas to their cells, without inventing column or whole-table links', () => {
        const items = generate([{ field: 'grid', rows: [{ year: 'year', co2: 'first' }, { year: '', co2: 'sum' }, {}] }]);
        assert.deepEqual(items.find(item => item.name === 'first').links, [
            { type: 'schema', entityId: '#output', item: 'grid', columnKey: 'co2', rowIndex: 0 }
        ]);
        assert.deepEqual(items.find(item => item.name === 'sum').links, [
            { type: 'schema', entityId: '#output', item: 'grid', columnKey: 'co2', rowIndex: 1 }
        ]);
        assert.equal(items.find(item => item.type === 'formula' && item.name === 'year').links[0].rowIndex, 0);
        assert.equal(items.find(item => item.type === 'variable').link.item, 'year');
    });

    it('links grid cells to equations and inputs saved with the editor notation of their name', () => {
        const items = FormulaImportExport.generateByPolicy({ name: 'Grid outputs', config: {
            blockType: 'mathBlock', inputSchema: '#input', outputSchema: '#output', expression: {
                variables: [{ name: 'year,k', field: 'year' }],
                formulas: [{ name: ' sum,t ', body: '2' }],
                outputs: [{ field: 'grid', rows: [{ year: 'year,k', co2: 'sum_t' }] }]
            }
        } }).config.formulas;
        assert.deepEqual(items.find(item => item.name === ' sum,t ').links, [
            { type: 'schema', entityId: '#output', item: 'grid', columnKey: 'co2', rowIndex: 0 }
        ]);
        assert.deepEqual(items.find(item => item.type === 'formula' && item.name === 'year,k').links, [
            { type: 'schema', entityId: '#output', item: 'grid', columnKey: 'year', rowIndex: 0 }
        ]);
    });

    it('retains distinct table positions and every reused cell link through export/import', async () => {
        const items = generate([{ field: 'grids', tables: [[{ co2: 'first' }], [{ co2: 'sum' }, { co2: 'first' }]] }]);
        const zip = await FormulaImportExport.generateZipFile({ formula: { config: { formulas: items } }, schemas: [] });
        const parsed = await FormulaImportExport.parseZipFile(await zip.generateAsync({ type: 'nodebuffer' }));
        const first = parsed.formula.config.formulas.find(item => item.name === 'first');
        assert.deepEqual(first.links.map(link => [link.tableIndex, link.rowIndex, link.columnKey]), [[0, 0, 'co2'], [1, 1, 'co2']]);
        assert.deepEqual(first.link, first.links[0]);
        assert.deepEqual(parsed.formula.config.formulas.find(item => item.name === 'sum').links.map(link => [link.tableIndex, link.rowIndex]), [[1, 0]]);
    });
});
