import assert from 'node:assert/strict';
import { hasTableOutputValue } from '../../../dist/policy-engine/helpers/schema-table-output.js';

describe('@unit table output candidate discovery', () => {
    it('finds rows inside nested arrays and objects', () => {
        assert.equal(hasTableOutputValue({ nested: [{ out: { type: 'table', rows: [] } }] }), true);
    });

    it('ignores references, serialized tables and malformed rows', () => {
        for (const value of [null, 3, '{"type":"table","rows":[]}', { type: 'table', rows: 'bad' }, { type: 'table', rows: [], fileId: 'existing' }]) {
            assert.equal(hasTableOutputValue(value), false);
        }
    });

    it('handles cycles and shared children without losing a candidate', () => {
        const root = { shared: {} };
        root.self = root;
        root.other = root.shared;
        assert.equal(hasTableOutputValue(root), false);
        root.shared.out = { type: 'table', rows: [] };
        assert.equal(hasTableOutputValue(root), true);
    });
});
