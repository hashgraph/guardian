import { assert } from 'chai';
import { UIAddon } from '../../../../dist/policy-engine/helpers/decorators/ui-addon.js';
import { ValidatorBlock } from '../../../../dist/policy-engine/helpers/decorators/validator-block.js';
import { SourceAddon } from '../../../../dist/policy-engine/helpers/decorators/source-addon.js';
import { TokenAddon } from '../../../../dist/policy-engine/helpers/decorators/token-addon.js';
import { TokenBlock } from '../../../../dist/policy-engine/helpers/decorators/token-block.js';
import { CalculateAddon } from '../../../../dist/policy-engine/helpers/decorators/calculate-addon.js';
import { Report } from '../../../../dist/policy-engine/helpers/decorators/report-block.js';
import { ReportItem } from '../../../../dist/policy-engine/helpers/decorators/report-item-block.js';
import { SetRelationshipsBlock } from '../../../../dist/policy-engine/helpers/decorators/set-relationships-block.js';
import { CalculateBlock } from '../../../../dist/policy-engine/helpers/decorators/calculate-block.js';

const opts = (over = {}) => Object.assign({ blockType: 'testBlock', children: [] }, over);
function inst(Decorator, o = opts()) {
    const Cls = Decorator(o)(class { });
    return new Cls('uuid', false, 'tag', [], null, {}, { databaseServer: {} });
}
function setChildren(b, children) {
    b._children = children;
}

describe('@unit UIAddon decorator', () => {
    it('sets blockClassName to UIAddon', () => {
        assert.equal(inst(UIAddon).blockClassName, 'UIAddon');
    });
    it('carries blockType from options', () => {
        assert.equal(inst(UIAddon, opts({ blockType: 'uiX' })).blockType, 'uiX');
    });
});

describe('@unit ValidatorBlock decorator', () => {
    it('sets blockClassName to ValidatorBlock', () => {
        assert.equal(inst(ValidatorBlock).blockClassName, 'ValidatorBlock');
    });
    it('run resolves undefined when no super.run', async () => {
        assert.isUndefined(await inst(ValidatorBlock).run({}));
    });
});

describe('@unit SourceAddon decorator', () => {
    it('sets blockClassName to SourceAddon', () => {
        assert.equal(inst(SourceAddon).blockClassName, 'SourceAddon');
    });
    it('getFromSource returns [] when no super and countResult false', () => {
        assert.deepEqual(inst(SourceAddon).getFromSource(null, null, false), []);
    });
    it('getFromSource returns 0 when no super and countResult true', () => {
        assert.equal(inst(SourceAddon).getFromSource(null, null, true), 0);
    });
    it('getFromSourceFilters returns null when no super', () => {
        assert.isNull(inst(SourceAddon).getFromSourceFilters(null, null));
    });
    it('getAddons returns only filtersAddon children', () => {
        const b = inst(SourceAddon);
        setChildren(b, [
            { blockType: 'filtersAddon' },
            { blockType: 'other' },
            { blockType: 'filtersAddon' },
        ]);
        assert.equal(b.getAddons().length, 2);
    });
    it('getSelectiveAttributes filters selectiveAttributes children', () => {
        const b = inst(SourceAddon);
        setChildren(b, [{ blockType: 'selectiveAttributes' }, { blockType: 'x' }]);
        assert.equal(b.getSelectiveAttributes().length, 1);
    });
    it('getFilters merges filters from filter addons', async () => {
        const b = inst(SourceAddon);
        setChildren(b, [
            { blockType: 'filtersAddon', getFilters: async () => ({ a: 1 }) },
            { blockType: 'filtersAddon', getFilters: async () => ({ b: 2 }) },
        ]);
        assert.deepEqual(await b.getFilters(null), { a: 1, b: 2 });
    });
    it('getFilters empty when no filter addons', async () => {
        const b = inst(SourceAddon);
        setChildren(b, [{ blockType: 'other' }]);
        assert.deepEqual(await b.getFilters(null), {});
    });
});

describe('@unit TokenAddon decorator', () => {
    it('sets blockClassName to TokenAddon', () => {
        assert.equal(inst(TokenAddon).blockClassName, 'TokenAddon');
    });
    it('run returns scope when no super.run', async () => {
        const scope = { v: 1 };
        assert.strictEqual(await inst(TokenAddon).run(scope), scope);
    });
});

describe('@unit TokenBlock decorator', () => {
    it('sets blockClassName to TokenBlock', () => {
        assert.equal(inst(TokenBlock).blockClassName, 'TokenBlock');
    });
    it('getAddons returns only TokenAddon children', () => {
        const b = inst(TokenBlock);
        setChildren(b, [
            { blockClassName: 'TokenAddon' },
            { blockClassName: 'Other' },
            { blockClassName: 'TokenAddon' },
        ]);
        assert.equal(b.getAddons().length, 2);
    });
    it('getAddons empty when no token addons', () => {
        const b = inst(TokenBlock);
        setChildren(b, [{ blockClassName: 'X' }]);
        assert.deepEqual(b.getAddons(), []);
    });
});

describe('@unit CalculateAddon decorator', () => {
    it('sets blockClassName to CalculateAddon', () => {
        assert.equal(inst(CalculateAddon).blockClassName, 'CalculateAddon');
    });
    it('run returns scope when no super.run', async () => {
        const scope = { x: 1 };
        assert.strictEqual(await inst(CalculateAddon).run(scope), scope);
    });
    it('evaluate computes formula against scope', () => {
        assert.equal(inst(CalculateAddon).evaluate('a + b', { a: 2, b: 3 }), 5);
    });
    it('evaluate returns "Incorrect formula" on error', () => {
        assert.equal(inst(CalculateAddon).evaluate('a +', {}), 'Incorrect formula');
    });
    it('parse returns true for valid formula', () => {
        assert.isTrue(inst(CalculateAddon).parse('a + b'));
    });
    it('parse returns false for invalid formula', () => {
        assert.isFalse(inst(CalculateAddon).parse('a +'));
    });
    it('getVariables returns input when no super', () => {
        const vars = { a: 1 };
        assert.strictEqual(inst(CalculateAddon).getVariables(vars), vars);
    });
});

describe('@unit Report decorator', () => {
    it('sets blockClassName to ReportBlock', () => {
        assert.equal(inst(Report).blockClassName, 'ReportBlock');
    });
    it('getItems returns only ReportItemBlock children', () => {
        const b = inst(Report);
        setChildren(b, [
            { blockClassName: 'ReportItemBlock' },
            { blockClassName: 'Other' },
        ]);
        assert.equal(b.getItems().length, 1);
    });
});

describe('@unit ReportItem decorator', () => {
    it('sets blockClassName to ReportItemBlock', () => {
        assert.equal(inst(ReportItem).blockClassName, 'ReportItemBlock');
    });
    it('run returns fieldsResult when no super.run', async () => {
        const fr = { f: 1 };
        assert.strictEqual(await inst(ReportItem).run(fr), fr);
    });
    it('getItems collects nested ReportItemBlock children', () => {
        const b = inst(ReportItem);
        setChildren(b, [{ blockClassName: 'ReportItemBlock' }, { blockClassName: 'ReportItemBlock' }, { blockClassName: 'x' }]);
        assert.equal(b.getItems().length, 2);
    });
});

describe('@unit CalculateBlock decorator', () => {
    it('sets blockClassName to CalculateBlock', () => {
        assert.equal(inst(CalculateBlock).blockClassName, 'CalculateBlock');
    });
    it('getAddons returns only CalculateAddon children', () => {
        const b = inst(CalculateBlock);
        setChildren(b, [
            { blockClassName: 'CalculateAddon' },
            { blockClassName: 'Other' },
            { blockClassName: 'CalculateAddon' },
        ]);
        assert.equal(b.getAddons().length, 2);
    });
    it('getAddons empty when no calculate addons', () => {
        const b = inst(CalculateBlock);
        setChildren(b, [{ blockClassName: 'X' }]);
        assert.deepEqual(b.getAddons(), []);
    });
    it('carries blockType from options', () => {
        assert.equal(inst(CalculateBlock, opts({ blockType: 'calcX' })).blockType, 'calcX');
    });
});

describe('@unit SetRelationshipsBlock decorator', () => {
    it('sets blockClassName to SetRelationshipsBlock', () => {
        assert.equal(inst(SetRelationshipsBlock).blockClassName, 'SetRelationshipsBlock');
    });
    it('getSources concatenates data from SourceAddon children', async () => {
        const b = inst(SetRelationshipsBlock);
        setChildren(b, [
            { blockClassName: 'SourceAddon', getFromSource: async () => [1, 2] },
            { blockClassName: 'SourceAddon', getFromSource: async () => [3] },
            { blockClassName: 'Other', getFromSource: async () => [99] },
        ]);
        assert.deepEqual(await b.getSources(null, null), [1, 2, 3]);
    });
    it('getSources empty when no source addons', async () => {
        const b = inst(SetRelationshipsBlock);
        setChildren(b, [{ blockClassName: 'X' }]);
        assert.deepEqual(await b.getSources(null, null), []);
    });
});
