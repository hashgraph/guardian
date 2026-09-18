import { assert } from 'chai';
import { generateConfigForIntegrationBlock } from '../../../dist/helpers/generate-config-for-integration-block-helper.js';

describe('generateConfigForIntegrationBlock', () => {
    it('returns the documented top-level shape', () => {
        const cfg = generateConfigForIntegrationBlock();
        assert.equal(cfg.label, 'Integration button');
        assert.equal(cfg.title, "Add 'Integration button' Block");
        assert.isTrue(cfg.post);
        assert.isTrue(cfg.get);
        assert.equal(cfg.children, 'Special');
        assert.equal(cfg.control, 'UI');
        assert.deepEqual(cfg.input, []);
        assert.isFalse(cfg.defaultEvent);
        assert.isArray(cfg.output);
        assert.isArray(cfg.properties);
    });

    it('uses provided enum-shaped overrides when supplied', () => {
        const cfg = generateConfigForIntegrationBlock(
            { Input: 'CUSTOM_INPUT', Checkbox: 'CUSTOM_CB', Select: 'CUSTOM_SELECT', Group: 'CUSTOM_GROUP' },
            { Special: 'CUSTOM_SPECIAL' },
            { UI: 'CUSTOM_UI' },
            null,
            { RunEvent: 'RUN', ReleaseEvent: 'REL', RefreshEvent: 'REF' },
        );
        assert.equal(cfg.children, 'CUSTOM_SPECIAL');
        assert.equal(cfg.control, 'CUSTOM_UI');
        assert.deepEqual(cfg.output, ['RUN', 'REL', 'REF']);
        const button = cfg.properties.find((p) => p.name === 'buttonName');
        assert.ok(button);
        assert.equal(button.type, 'CUSTOM_INPUT');
        const cache = cfg.properties.find((p) => p.name === 'getFromCache');
        assert.equal(cache.type, 'CUSTOM_CB');
        const integrationType = cfg.properties.find((p) => p.name === 'integrationType');
        assert.equal(integrationType.type, 'CUSTOM_SELECT');
    });

    it('falls back to default RunEvent/ReleaseEvent/RefreshEvent strings', () => {
        const cfg = generateConfigForIntegrationBlock();
        assert.deepEqual(cfg.output, ['RunEvent', 'ReleaseEvent', 'RefreshEvent']);
    });

    it('declares the buttonName, getFromCache, and integrationType core properties', () => {
        const cfg = generateConfigForIntegrationBlock();
        const names = cfg.properties.map((p) => p.name);
        assert.include(names, 'buttonName');
        assert.include(names, 'getFromCache');
        assert.include(names, 'integrationType');
    });

    it('the integrationType property is required and non-empty in items', () => {
        const cfg = generateConfigForIntegrationBlock();
        const integrationType = cfg.properties.find((p) => p.name === 'integrationType');
        assert.isTrue(integrationType.required === true);
        assert.isArray(integrationType.items);
    });
});
