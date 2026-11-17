import assert from 'node:assert/strict';
import { getTableTooLargeMessage, TABLE_MAX_BYTES } from '../dist/helpers/table-field-core.js';
import { getTableTooLargeMessage as exportedMessage, TABLE_MAX_BYTES as exportedLimit } from '../dist/index.js';

describe('Table size limit', () => {
    it('is 10 MB', () => {
        assert.equal(TABLE_MAX_BYTES, 10 * 1024 * 1024);
    });

    it('names the size in MB with one decimal and the limit', () => {
        assert.equal(getTableTooLargeMessage(TABLE_MAX_BYTES + 1), 'Tables are too large (10.0 MB). The limit is 10 MB.');
        assert.equal(getTableTooLargeMessage(12.34 * 1024 * 1024), 'Tables are too large (12.3 MB). The limit is 10 MB.');
    });

    it('is exported from the package root', () => {
        assert.equal(exportedLimit, TABLE_MAX_BYTES);
        assert.equal(exportedMessage, getTableTooLargeMessage);
    });
});
