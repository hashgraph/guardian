import assert from 'node:assert/strict';
import { LabelValidators } from '../dist/validators/label-validator/label-validator.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

FormulaEngine.setMathEngine({ evaluate: (e) => e });

function makeLabel() {
    return {
        name: 'My Label',
        config: {
            children: [
                { id: 'r1', type: 'rules', tag: 'R1', name: 'Rule1', title: 'Rule 1', schemaId: 's#1', config: { variables: [{ id: 'v1', schemaId: 's#1', path: 'amount' }] } },
                { id: 's1', type: 'statistic', tag: 'S1', name: 'Stat1', title: 'Stat 1', config: {} }
            ]
        }
    };
}

const docs = () => [{ schema: 's#1', document: { credentialSubject: { amount: 5 } } }];

describe('LabelValidators — structure', () => {
    it('exposes an undefined status before validation', () => {
        const lv = new LabelValidators(makeLabel());
        assert.equal(lv.status, undefined);
    });

    it('builds a tree rooted at the label name', () => {
        const lv = new LabelValidators(makeLabel());
        const tree = lv.getTree();
        assert.equal(tree.name, 'My Label');
        assert.equal(tree.children.length, 2);
    });

    it('prefixes child tree node names with their ordinal', () => {
        const tree = new LabelValidators(makeLabel()).getTree();
        assert.equal(tree.children[0].name, '1. Rule 1');
        assert.equal(tree.children[1].name, '2. Stat 1');
    });

    it('marks rules and statistic nodes as selectable', () => {
        const tree = new LabelValidators(makeLabel()).getTree();
        assert.equal(tree.children[0].selectable, true);
        assert.equal(tree.children[1].selectable, true);
        assert.equal(tree.selectable, false);
    });

    it('getValidator resolves nodes by id and returns undefined for unknown', () => {
        const lv = new LabelValidators(makeLabel());
        assert.equal(lv.getValidator('r1').id, 'r1');
        assert.equal(lv.getValidator('s1').id, 's1');
        assert.equal(lv.getValidator('nope'), undefined);
    });

    it('flattens a step list covering each item plus the root', () => {
        const steps = new LabelValidators(makeLabel()).getSteps();
        assert.equal(steps.length, 5);
        assert.ok(steps.some((s) => s.type === 'variables'));
    });

    it('builds a document step list excluding root items', () => {
        const docSteps = new LabelValidators(makeLabel()).getDocument();
        assert.equal(docSteps.length >= 2, true);
    });
});

describe('LabelValidators — results and VCs', () => {
    it('getResult returns one document per list node', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        const result = lv.getResult();
        assert.equal(result.length, 4);
    });

    it('setResult / getResult round-trips through the node list', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        const result = lv.getResult();
        lv.setResult(result);
        assert.equal(lv.getResult().length, 4);
    });

    it('getVCs collects a VC per node', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        const vcs = lv.getVCs();
        assert.equal(vcs.length, 4);
        assert.ok(vcs.every((vc) => typeof vc.id === 'string'));
    });

    it('setVp distributes verifiable credentials across nodes', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        lv.setVp({ document: { verifiableCredential: [
            { credentialSubject: [{ status: true }] },
            { credentialSubject: { status: true } },
            { credentialSubject: { status: true } },
            { credentialSubject: { status: true } }
        ] } });
        assert.equal(typeof lv.status, 'boolean');
    });
});

describe('LabelValidators — navigation', () => {
    it('start returns the first non-auto step', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        const step = lv.start();
        assert.ok(step);
        assert.equal(step.type, 'variables');
        assert.equal(step.auto, false);
    });

    it('current reflects the active step after start', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        lv.start();
        assert.equal(lv.current().type, 'variables');
    });

    it('isPrev is false at the first step and isNext is true', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        lv.start();
        assert.equal(lv.isPrev(), false);
        assert.equal(lv.isNext(), true);
    });

    it('advancing past all steps returns null', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        lv.start();
        assert.equal(lv.next(), null);
    });
});

describe('LabelValidators — validate and clear', () => {
    it('validate runs every step and reports the root status', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        const status = lv.validate();
        assert.equal(typeof status.valid, 'boolean');
    });

    it('clear resets the status to undefined', () => {
        const lv = new LabelValidators(makeLabel());
        lv.setData(docs());
        lv.validate();
        lv.clear();
        assert.equal(lv.status, undefined);
    });
});
