import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { SchemaRuleImportExport } from '../../../dist/import-export/schema-rule.js';

describe('SchemaRuleImportExport zip handling', () => {
    it('generateZipFile writes rules.json without identity fields', async () => {
        const rule = { id: '1', _id: 'x', owner: 'o', createDate: 'c', updateDate: 'u', name: 'R', config: { fields: [] } };
        const zip = await SchemaRuleImportExport.generateZipFile({ rule });
        const parsed = JSON.parse(await zip.files['rules.json'].async('string'));
        assert.equal(parsed.id, undefined);
        assert.equal(parsed._id, undefined);
        assert.equal(parsed.owner, undefined);
        assert.equal(parsed.name, 'R');
    });

    it('generate + parseZipFile round-trips a rule', async () => {
        const zip = await SchemaRuleImportExport.generate({ name: 'RT', config: { fields: [] } });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const { rule } = await SchemaRuleImportExport.parseZipFile(buffer);
        assert.equal(rule.name, 'RT');
        assert.deepEqual(rule.config, { fields: [] });
    });

    it('parseZipFile rejects a zip without rules.json', async () => {
        const zip = new JSZip();
        zip.file('nope.json', '{}');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(SchemaRuleImportExport.parseZipFile(buffer), /Zip file is not a rule/);
    });
});

describe('SchemaRuleImportExport.validateRuleConfig', () => {
    it('returns empty fields for undefined input', () => {
        assert.deepEqual(SchemaRuleImportExport.validateRuleConfig(undefined), { fields: [] });
    });

    it('returns empty fields when fields is not an array', () => {
        assert.deepEqual(SchemaRuleImportExport.validateRuleConfig({ fields: 'oops' }), { fields: [] });
    });

    it('normalises a field, coercing missing strings to empty', () => {
        const config = SchemaRuleImportExport.validateRuleConfig({
            fields: [{ id: 'f1', schemaId: '#s', path: 'a.b', fieldRef: 'true', fieldArray: false }]
        });
        const field = config.fields[0];
        assert.equal(field.id, 'f1');
        assert.equal(field.schemaId, '#s');
        assert.equal(field.path, 'a.b');
        assert.equal(field.schemaName, '');
        assert.equal(field.fieldType, '');
        assert.equal(field.fieldRef, true);
        assert.equal(field.fieldArray, false);
        assert.equal(field.rule, undefined);
    });

    it('coerces boolean-ish strings strictly', () => {
        const config = SchemaRuleImportExport.validateRuleConfig({
            fields: [{ id: 'x', fieldRef: 'TRUE', fieldArray: true }]
        });
        assert.equal(config.fields[0].fieldRef, false);
        assert.equal(config.fields[0].fieldArray, true);
    });
});

describe('SchemaRuleImportExport.validateRule', () => {
    it('returns undefined for missing rule', () => {
        assert.equal(SchemaRuleImportExport.validateRule(undefined), undefined);
    });

    it('returns undefined for unknown rule type', () => {
        assert.equal(SchemaRuleImportExport.validateRule({ type: 'mystery' }), undefined);
    });

    it('validates a formula rule', () => {
        assert.deepEqual(
            SchemaRuleImportExport.validateRule({ type: 'formula', formula: 'a + b', extra: 1 }),
            { type: 'formula', formula: 'a + b' }
        );
    });

    it('coerces a non-string formula to empty string', () => {
        assert.deepEqual(
            SchemaRuleImportExport.validateRule({ type: 'formula', formula: 42 }),
            { type: 'formula', formula: '' }
        );
    });

    it('validates a range rule keeping numbers and strings', () => {
        assert.deepEqual(
            SchemaRuleImportExport.validateRule({ type: 'range', min: 0, max: '10' }),
            { type: 'range', min: 0, max: '10' }
        );
    });

    it('coerces invalid range bounds to empty strings', () => {
        assert.deepEqual(
            SchemaRuleImportExport.validateRule({ type: 'range', min: null, max: {} }),
            { type: 'range', min: '', max: '' }
        );
    });

    it('validates a condition rule with if and else branches', () => {
        const rule = SchemaRuleImportExport.validateRule({
            type: 'condition',
            conditions: [
                { type: 'if', condition: { type: 'formula', formula: 'x > 1' }, formula: { type: 'formula', formula: 'y' } },
                { type: 'else', formula: { type: 'formula', formula: 'z' } }
            ]
        });
        assert.equal(rule.type, 'condition');
        assert.equal(rule.conditions.length, 2);
        assert.deepEqual(rule.conditions[0], {
            type: 'if',
            condition: { type: 'formula', formula: 'x > 1' },
            formula: { type: 'formula', formula: 'y' }
        });
        assert.deepEqual(rule.conditions[1], { type: 'else', formula: { type: 'formula', formula: 'z' } });
    });

    it('drops condition entries of unknown type', () => {
        const rule = SchemaRuleImportExport.validateRule({
            type: 'condition',
            conditions: [{ type: 'maybe' }]
        });
        assert.deepEqual(rule.conditions, []);
    });

    it('normalises non-array conditions to empty array', () => {
        const rule = SchemaRuleImportExport.validateRule({ type: 'condition', conditions: 'bad' });
        assert.deepEqual(rule.conditions, []);
    });

    it('validates range condition values inside if branches', () => {
        const rule = SchemaRuleImportExport.validateRule({
            type: 'condition',
            conditions: [{
                type: 'if',
                condition: { type: 'range', variable: 'v', min: 1, max: 2 },
                formula: { type: 'text', variable: 't', value: 'val' }
            }]
        });
        assert.deepEqual(rule.conditions[0].condition, { type: 'range', variable: 'v', min: 1, max: 2 });
        assert.deepEqual(rule.conditions[0].formula, { type: 'text', variable: 't', value: 'val' });
    });

    it('validates enum condition values filtering non-strings', () => {
        const rule = SchemaRuleImportExport.validateRule({
            type: 'condition',
            conditions: [{
                type: 'if',
                condition: { type: 'enum', variable: 'e', value: ['a', 5, 'b'] },
                formula: { type: 'formula', formula: 'f' }
            }]
        });
        assert.deepEqual(rule.conditions[0].condition, { type: 'enum', variable: 'e', value: ['a', '', 'b'] });
    });

    it('falls back to an empty formula for missing condition values', () => {
        const rule = SchemaRuleImportExport.validateRule({
            type: 'condition',
            conditions: [{ type: 'if', condition: null, formula: undefined }]
        });
        assert.deepEqual(rule.conditions[0].condition, { type: 'formula', formula: '' });
        assert.deepEqual(rule.conditions[0].formula, { type: 'formula', formula: '' });
    });
});
