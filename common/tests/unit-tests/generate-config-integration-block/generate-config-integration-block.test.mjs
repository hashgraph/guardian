import { assert } from 'chai';
import { generateConfigForIntegrationBlock } from '../../../dist/helpers/generate-config-for-integration-block-helper.js';

describe('generateConfigForIntegrationBlock', () => {
    it('produces the Integration button block shell', () => {
        const cfg = generateConfigForIntegrationBlock();
        assert.equal(cfg.label, 'Integration button');
        assert.equal(cfg.title, "Add 'Integration button' Block");
        assert.isTrue(cfg.post);
        assert.isTrue(cfg.get);
        assert.isFalse(cfg.defaultEvent);
        assert.deepEqual(cfg.input, []);
    });

    it('falls back to string defaults when no enum maps are passed', () => {
        const cfg = generateConfigForIntegrationBlock();
        assert.equal(cfg.children, 'Special');
        assert.equal(cfg.control, 'UI');
        assert.deepEqual(cfg.output, ['RunEvent', 'ReleaseEvent', 'RefreshEvent']);
    });

    it('threads provided enum maps through children/control/output', () => {
        const cfg = generateConfigForIntegrationBlock(
            undefined,
            { Special: 'SPECIAL_X' },
            { UI: 'UI_X' },
            undefined,
            { RunEvent: 'RUN_X', ReleaseEvent: 'REL_X', RefreshEvent: 'REF_X' },
        );
        assert.equal(cfg.children, 'SPECIAL_X');
        assert.equal(cfg.control, 'UI_X');
        assert.deepEqual(cfg.output, ['RUN_X', 'REL_X', 'REF_X']);
    });

    it('uses the propertyType map for property field types', () => {
        const cfg = generateConfigForIntegrationBlock({ Input: 'IN', Checkbox: 'CHK', Select: 'SEL' });
        const byName = (name) => cfg.properties.find((p) => p.name === name);
        assert.equal(byName('buttonName').type, 'IN');
        assert.equal(byName('getFromCache').type, 'CHK');
        assert.equal(byName('integrationType').type, 'SEL');
    });

    it('builds a required integrationType select backed by the integration registry', () => {
        const cfg = generateConfigForIntegrationBlock();
        const integrationType = cfg.properties.find((p) => p.name === 'integrationType');
        assert.equal(integrationType.type, 'Select');
        assert.isTrue(integrationType.required);
        assert.isArray(integrationType.items);
        assert.isAbove(integrationType.items.length, 0);
    });
});
