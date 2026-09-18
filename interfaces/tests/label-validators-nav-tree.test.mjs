import assert from 'node:assert/strict';
import { LabelValidators } from '../dist/validators/label-validator/label-validator.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

FormulaEngine.setMathEngine({ evaluate: (e) => e });

const twoRules = () => ({
    name: 'Nav Label',
    config: {
        children: [
            { id: 'r1', type: 'rules', tag: 'R1', title: 'Rule 1', schemaId: 's#1', config: { variables: [{ id: 'v1', schemaId: 's#1', path: 'amount' }] } },
            { id: 'r2', type: 'rules', tag: 'R2', title: 'Rule 2', schemaId: 's#1', config: { variables: [{ id: 'v2', schemaId: 's#1', path: 'amount' }] } },
        ],
    },
});

const grouped = () => ({
    name: 'Group Label',
    config: {
        children: [
            {
                id: 'g1', type: 'group', tag: 'G1', title: 'Group 1',
                children: [
                    { id: 'r1', type: 'rules', tag: 'R1', title: 'Rule 1', schemaId: 's#1', config: { variables: [{ id: 'v1', schemaId: 's#1', path: 'amount' }] } },
                ],
            },
        ],
    },
});

const docs = () => [{ schema: 's#1', document: { credentialSubject: { amount: 5 } } }];

describe('LabelValidators.prev', () => {
    it('returns the previous non-auto step and runs its update', () => {
        const lv = new LabelValidators(twoRules());
        lv.setData(docs());
        const first = lv.start();
        const second = lv.next();
        assert.notEqual(first, second);
        const back = lv.prev();
        assert.equal(back, first);
        assert.equal(lv.current(), first);
    });

    it('skips auto steps while walking backwards', () => {
        const lv = new LabelValidators(twoRules());
        lv.setData(docs());
        lv.start();
        const second = lv.next();
        assert.equal(second.item.id, 'r2');
        const back = lv.prev();
        assert.equal(back.item.id, 'r1');
    });

    it('returns null when stepping back before the first step', () => {
        const lv = new LabelValidators(twoRules());
        lv.setData(docs());
        lv.start();
        assert.equal(lv.prev(), null);
    });

    it('isPrev is true after advancing past the first step', () => {
        const lv = new LabelValidators(twoRules());
        lv.setData(docs());
        lv.start();
        assert.equal(lv.isPrev(), false);
        lv.next();
        assert.equal(lv.isPrev(), true);
    });
});

describe('LabelValidators.getStatus', () => {
    it('is undefined before any validation ran', () => {
        const lv = new LabelValidators(twoRules());
        assert.equal(lv.getStatus(), undefined);
    });

    it('reflects the root result after walking through all steps', () => {
        const lv = new LabelValidators(twoRules());
        lv.setData(docs());
        let step = lv.start();
        while (step) {
            step.validate();
            step = lv.next();
        }
        const status = lv.getStatus();
        assert.equal(typeof status.valid, 'boolean');
        assert.equal(status.id, 'root');
    });
});

describe('LabelValidators tree with nested groups', () => {
    it('builds group children into the tree', () => {
        const tree = new LabelValidators(grouped()).getTree();
        assert.equal(tree.children.length, 1);
        assert.equal(tree.children[0].type, 'group');
        assert.equal(tree.children[0].children.length, 1);
    });

    it('prefixes nested nodes with hierarchical ordinals', () => {
        const tree = new LabelValidators(grouped()).getTree();
        assert.equal(tree.children[0].name, '1. Group 1');
        assert.equal(tree.children[0].children[0].name, '1.1. Rule 1');
    });

    it('groups are not selectable while nested rules are', () => {
        const tree = new LabelValidators(grouped()).getTree();
        assert.equal(tree.children[0].selectable, false);
        assert.equal(tree.children[0].children[0].selectable, true);
    });

    it('includes the nested rule in the flat validator list', () => {
        const lv = new LabelValidators(grouped());
        assert.ok(lv.getValidator('g1'));
        assert.ok(lv.getValidator('r1'));
    });
});
