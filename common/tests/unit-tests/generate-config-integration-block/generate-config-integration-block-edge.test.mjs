import { assert } from 'chai';
import { generateConfigForIntegrationBlock } from '../../../dist/helpers/generate-config-for-integration-block-helper.js';

describe('generateConfigForIntegrationBlock — fallback quirks', () => {
    it('falls back to defaults when enum values are empty strings (|| is falsy-aware)', () => {
        const cfg = generateConfigForIntegrationBlock(
            { Input: '', Checkbox: '', Select: '' },
            { Special: '' },
            { UI: '' },
            undefined,
            { RunEvent: '', ReleaseEvent: '', RefreshEvent: '' },
        );
        assert.equal(cfg.children, 'Special');
        assert.equal(cfg.control, 'UI');
        assert.deepEqual(cfg.output, ['RunEvent', 'ReleaseEvent', 'RefreshEvent']);
        assert.equal(cfg.properties.find((p) => p.name === 'buttonName').type, 'Input');
    });

    it('falls back per-field when only some output events are provided', () => {
        const cfg = generateConfigForIntegrationBlock(
            undefined, undefined, undefined, undefined,
            { RunEvent: 'RUN_X' },
        );
        assert.deepEqual(cfg.output, ['RUN_X', 'ReleaseEvent', 'RefreshEvent']);
    });
});
