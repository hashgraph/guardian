import { assert } from 'chai';
import { publishLabelConfig } from '../../dist/api/helpers/policy-labels-helpers.js';

describe('policy-labels-helpers publishLabelConfig', () => {
    it('returns the same object reference it was given', () => {
        const data = { id: 'cfg', children: [] };
        assert.strictEqual(publishLabelConfig(data), data);
    });

    it('does not mutate the provided config', () => {
        const data = { id: 'cfg', children: [{ id: 'n1' }] };
        const snapshot = JSON.stringify(data);
        publishLabelConfig(data);
        assert.equal(JSON.stringify(data), snapshot);
    });

    it('returns undefined when called without data', () => {
        assert.isUndefined(publishLabelConfig());
    });

    it('returns null untouched', () => {
        assert.isNull(publishLabelConfig(null));
    });
});
