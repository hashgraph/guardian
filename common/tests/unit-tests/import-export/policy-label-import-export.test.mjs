import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { PolicyLabelImportExport } from '../../../dist/import-export/policy-label.js';

describe('PolicyLabelImportExport zip handling', () => {
    it('generateZipFile writes labels.json without identity fields', async () => {
        const zip = await PolicyLabelImportExport.generateZipFile({
            label: { id: '1', _id: 'x', owner: 'o', createDate: 'c', updateDate: 'u', name: 'L' }
        });
        const parsed = JSON.parse(await zip.files['labels.json'].async('string'));
        assert.equal(parsed.id, undefined);
        assert.equal(parsed._id, undefined);
        assert.equal(parsed.owner, undefined);
        assert.equal(parsed.name, 'L');
    });

    it('generate + parseZipFile round-trips a label', async () => {
        const zip = await PolicyLabelImportExport.generate({ name: 'RT', config: { children: [] } });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const { label } = await PolicyLabelImportExport.parseZipFile(buffer);
        assert.equal(label.name, 'RT');
        assert.deepEqual(label.config, { children: [] });
    });

    it('parseZipFile rejects a zip without labels.json', async () => {
        const zip = new JSZip();
        zip.file('other.json', '{}');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(PolicyLabelImportExport.parseZipFile(buffer), /Zip file is not a rule/);
    });

    it('exposes the documented filename constant', () => {
        assert.equal(PolicyLabelImportExport.fileName, 'labels.json');
    });
});

describe('PolicyLabelImportExport.validateConfig', () => {
    it('returns empty structures for undefined input', () => {
        assert.deepEqual(PolicyLabelImportExport.validateConfig(undefined), {
            imports: [],
            children: [],
            schemaId: ''
        });
    });

    it('drops children of unknown type', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{ type: 'mystery', name: 'x' }, null]
        });
        assert.deepEqual(config.children, []);
    });

    it('validates a group child recursively', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{
                type: 'group',
                id: 'g1',
                name: 'Group',
                title: 'T',
                tag: 'my tag',
                rule: 'r',
                schemaId: '#g',
                children: [{ type: 'label', id: 'l1', name: 'Inner', config: {} }]
            }]
        });
        const group = config.children[0];
        assert.equal(group.type, 'group');
        assert.equal(group.id, 'g1');
        assert.equal(group.tag, 'my_tag');
        assert.equal(group.children.length, 1);
        assert.equal(group.children[0].type, 'label');
        assert.equal(group.children[0].name, 'Inner');
    });

    it('validates a label child with nested config', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{
                type: 'label',
                id: 'l1',
                name: 'L',
                description: 'd',
                owner: 'o',
                messageId: 'm',
                config: { children: [{ type: 'rules', id: 'r1', name: 'R', config: {} }] }
            }]
        });
        const label = config.children[0];
        assert.equal(label.type, 'label');
        assert.equal(label.config.children[0].type, 'rules');
        assert.deepEqual(label.config.imports, []);
    });

    it('validates a rules child via validateRulesConfig', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{
                type: 'rules',
                id: 'r1',
                name: 'Rules',
                config: { variables: [{ id: 'v' }], scores: [], formulas: [{ id: 'f', rule: { type: 'formula', formula: 'x' } }] }
            }]
        });
        const rules = config.children[0];
        assert.equal(rules.config.variables[0].id, 'v');
        assert.deepEqual(rules.config.formulas[0].rule, { type: 'formula', formula: 'x' });
        assert.equal(rules.config.rules, undefined);
    });

    it('validates a statistic child via statistic validateConfig', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{
                type: 'statistic',
                id: 's1',
                name: 'Stat',
                config: { rules: [{ schemaId: '#x', type: 'main', unique: 'true' }] }
            }]
        });
        const stat = config.children[0];
        assert.deepEqual(stat.config.rules, [{ schemaId: '#x', type: 'main', unique: true }]);
        assert.deepEqual(stat.config.variables, []);
    });

    it('keeps label and statistic imports and drops others', () => {
        const config = PolicyLabelImportExport.validateConfig({
            imports: [
                { type: 'label', id: 'i1', name: 'IL', config: {} },
                { type: 'statistic', id: 'i2', name: 'IS', config: {} },
                { type: 'group', id: 'i3' }
            ]
        });
        assert.equal(config.imports.length, 2);
        assert.equal(config.imports[0].type, 'label');
        assert.equal(config.imports[1].type, 'statistic');
    });

    it('normalises tags by trimming and replacing whitespace', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{ type: 'group', id: 'g', tag: '  a b\tc ', children: [] }]
        });
        assert.equal(config.children[0].tag, 'a_b_c');
    });

    it('coerces non-string tag to empty string', () => {
        const config = PolicyLabelImportExport.validateConfig({
            children: [{ type: 'group', id: 'g', tag: 9, children: [] }]
        });
        assert.equal(config.children[0].tag, '');
    });
});

describe('PolicyLabelImportExport.validateRulesConfig', () => {
    it('returns empty collections for undefined input', () => {
        assert.deepEqual(PolicyLabelImportExport.validateRulesConfig(undefined), {
            variables: [],
            scores: [],
            formulas: []
        });
    });
});

describe('PolicyLabelImportExport.updateSchemas', () => {
    it('returns undefined when data is missing', () => {
        assert.equal(PolicyLabelImportExport.updateSchemas([], undefined), undefined);
    });

    it('maps unmatched variable schema ids to undefined', () => {
        const data = {
            children: [{
                type: 'rules',
                config: {
                    variables: [{ schemaId: 'old', schemaName: 'S', path: 'p', fieldDescription: 'd', fieldType: 't', fieldArray: false, fieldRef: false }],
                    rules: [{ schemaId: 'old' }]
                }
            }]
        };
        const result = PolicyLabelImportExport.updateSchemas([], data);
        assert.equal(result.children[0].config.variables[0].schemaId, undefined);
        assert.equal(result.children[0].config.rules[0].schemaId, undefined);
    });

    it('recurses through group and label children without throwing', () => {
        const data = {
            children: [{
                type: 'group',
                children: [{
                    type: 'label',
                    config: { children: [{ type: 'statistic', config: { variables: [], rules: [] } }] }
                }]
            }]
        };
        const result = PolicyLabelImportExport.updateSchemas([], data);
        assert.equal(result, data);
    });
});
