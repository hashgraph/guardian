import { assert } from 'chai';
import { AggregateBlock } from '../../../dist/policy-engine/block-validators/blocks/aggregate-block.js';
import { ExternalDataBlock } from '../../../dist/policy-engine/block-validators/blocks/external-data-block.js';
import { ExternalTopicBlock } from '../../../dist/policy-engine/block-validators/blocks/external-topic-block.js';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/block-validators/blocks/documents-source-addon.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block.js';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block-addon.js';
import { CalculateMathAddon } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-addon.js';
import { CalculateMathVariables } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-variables.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._schemaError = opts.schemaError ?? null;
        this._formulaVars = opts.formulaVars ?? [];
        this._validFormula = opts.validFormula ?? true;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    checkBlockError(err) { if (err) { this.errors.push(err); } }
    validateSchemaVariable(name, value, required) {
        if (this._schemaError) { return this._schemaError; }
        if (!value && required) { return `Option "${name}" is not set`; }
        return null;
    }
    parsFormulaVariables() { return this._formulaVars; }
    validateFormula() { return this._validFormula; }
}

const ref = (options = {}, children = []) => ({ options, children });
const has = (v, sub) => v.errors.some(e => typeof e === 'string' && e.includes(sub));

describe('AggregateBlock.validate branches', () => {
    it('blockType is aggregateDocumentBlock', () => {
        assert.equal(AggregateBlock.blockType, 'aggregateDocumentBlock');
    });
    it('cumulative missing condition adds error', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, ref({ aggregateType: 'cumulative' }));
        assert.isTrue(has(v, 'Option "condition" is not set'));
    });
    it('cumulative non-string condition adds error', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, ref({ aggregateType: 'cumulative', condition: 5 }));
        assert.isTrue(has(v, 'Option "condition" must be a string'));
    });
    it('cumulative undefined variable in condition adds error', async () => {
        const v = new FakeValidator({ formulaVars: ['x'] });
        await AggregateBlock.validate(v, ref({ aggregateType: 'cumulative', condition: 'x > 1' }));
        assert.isTrue(has(v, "Variable 'x' not defined"));
    });
    it('cumulative with defined variable passes condition', async () => {
        const v = new FakeValidator({ formulaVars: ['x'] });
        await AggregateBlock.validate(v, ref({ aggregateType: 'cumulative', condition: 'x > 1', expressions: [{ name: 'x' }] }));
        assert.isFalse(has(v, 'not defined'));
    });
    it('period type passes aggregateType check', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, ref({ aggregateType: 'period' }));
        assert.isFalse(has(v, 'aggregateType'));
    });
    it('unknown aggregateType adds error', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, ref({ aggregateType: 'weird' }));
        assert.isTrue(has(v, 'Option "aggregateType" must be one of period, cumulative'));
    });
    it('groupByFields with empty fieldPath adds error', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, ref({ aggregateType: 'period', groupByFields: [{ fieldPath: '' }] }));
        assert.isTrue(has(v, 'Field path in group fields can not be empty'));
    });
    it('groupByFields with fieldPath passes', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, ref({ aggregateType: 'period', groupByFields: [{ fieldPath: 'a' }] }));
        assert.deepEqual(v.errors, []);
    });
});

describe('ExternalDataBlock.validate branches', () => {
    it('blockType is externalDataBlock', () => {
        assert.equal(ExternalDataBlock.blockType, 'externalDataBlock');
    });
    it('schema error is propagated', async () => {
        const v = new FakeValidator({ schemaError: 'bad schema' });
        await ExternalDataBlock.validate(v, ref({ schema: 'iri' }));
        assert.isTrue(has(v, 'bad schema'));
    });
    it('valid optional schema yields no errors', async () => {
        const v = new FakeValidator();
        await ExternalDataBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });
});

describe('ExternalTopicBlock.validate branches', () => {
    it('blockType is externalTopicBlock', () => {
        assert.equal(ExternalTopicBlock.blockType, 'externalTopicBlock');
    });
    it('schema error is propagated', async () => {
        const v = new FakeValidator({ schemaError: 'bad schema' });
        await ExternalTopicBlock.validate(v, ref({ schema: 'iri' }));
        assert.isTrue(has(v, 'bad schema'));
    });
    it('valid optional schema yields no errors', async () => {
        const v = new FakeValidator();
        await ExternalTopicBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });
});

describe('DocumentsSourceAddon.validate branches', () => {
    it('blockType is documentsSourceAddon', () => {
        assert.equal(DocumentsSourceAddon.blockType, 'documentsSourceAddon');
    });
    it('invalid dataType adds error', async () => {
        const v = new FakeValidator();
        await DocumentsSourceAddon.validate(v, ref({ dataType: 'weird' }));
        assert.isTrue(has(v, 'Option "dataType" must be one of'));
    });
    for (const t of ['vc-documents', 'did-documents', 'vp-documents', 'root-authorities', 'standard-registries', 'approve', 'source']) {
        it(`dataType ${t} passes type check`, async () => {
            const v = new FakeValidator();
            await DocumentsSourceAddon.validate(v, ref({ dataType: t }));
            assert.isFalse(has(v, 'Option "dataType" must be one of'));
        });
    }
    it('schema error propagated', async () => {
        const v = new FakeValidator({ schemaError: 'bad schema' });
        await DocumentsSourceAddon.validate(v, ref({ dataType: 'vc-documents', schema: 'iri' }));
        assert.isTrue(has(v, 'bad schema'));
    });
});

describe('RequestVcDocumentBlock.validate branches', () => {
    it('blockType is requestVcDocumentBlock', () => {
        assert.equal(RequestVcDocumentBlock.blockType, 'requestVcDocumentBlock');
    });
    it('missing required schema adds error', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "schema" is not set'));
    });
    it('valid schema yields no errors', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, ref({ schema: 'iri' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('RequestVcDocumentBlockAddon.validate branches', () => {
    it('blockType is requestVcDocumentBlockAddon', () => {
        assert.equal(RequestVcDocumentBlockAddon.blockType, 'requestVcDocumentBlockAddon');
    });
    it('missing required schema adds error', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ buttonName: 'b', dialogTitle: 'd' }));
        assert.isTrue(has(v, 'Option "schema" is not set'));
    });
    it('missing buttonName adds error', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 'iri', dialogTitle: 'd' }));
        assert.isTrue(has(v, 'Button name is empty'));
    });
    it('missing dialogTitle adds error', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 'iri', buttonName: 'b' }));
        assert.isTrue(has(v, 'Dialog title is empty'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 'iri', buttonName: 'b', dialogTitle: 'd' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('CalculateMathAddon.validate branches', () => {
    it('blockType is calculateMathAddon', () => {
        assert.equal(CalculateMathAddon.blockType, 'calculateMathAddon');
    });
    it('incorrect formula adds error', async () => {
        const v = new FakeValidator({ validFormula: false });
        await CalculateMathAddon.validate(v, ref({ equations: [{ formula: 'x +' }] }));
        assert.isTrue(has(v, 'Incorrect formula'));
    });
    it('correct formula passes', async () => {
        const v = new FakeValidator({ validFormula: true });
        await CalculateMathAddon.validate(v, ref({ equations: [{ formula: 'x + 1' }] }));
        assert.deepEqual(v.errors, []);
    });
    it('no equations passes', async () => {
        const v = new FakeValidator();
        await CalculateMathAddon.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });
    it('getVariables returns equation names', () => {
        const out = CalculateMathAddon.getVariables({ options: { equations: [{ variable: 'a' }, { variable: 'b' }] } }, {});
        assert.property(out, 'a');
        assert.property(out, 'b');
    });
});

describe('CalculateMathVariables.validate branches', () => {
    it('blockType is calculateMathVariables', () => {
        assert.equal(CalculateMathVariables.blockType, 'calculateMathVariables');
    });
    it('selector missing sourceField adds error', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({ selectors: [{ comparisonValue: 'x' }] }));
        assert.isTrue(has(v, 'Incorrect Source Field'));
    });
    it('selector missing comparisonValue adds error', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({ selectors: [{ sourceField: 'f' }] }));
        assert.isTrue(has(v, 'Incorrect filter'));
    });
    it('variable missing variablePath adds error', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({ variables: [{}] }));
        assert.isTrue(has(v, 'Incorrect Variable Path'));
    });
    it('schema error propagated', async () => {
        const v = new FakeValidator({ schemaError: 'bad schema' });
        await CalculateMathVariables.validate(v, ref({ sourceSchema: 'iri' }));
        assert.isTrue(has(v, 'bad schema'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({
            selectors: [{ sourceField: 'f', comparisonValue: 'x' }],
            variables: [{ variablePath: 'p' }]
        }));
        assert.deepEqual(v.errors, []);
    });
});
