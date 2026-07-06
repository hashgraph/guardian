import assert from 'node:assert/strict';
import { extractTableFileIds } from '../../dist/helpers/table-file-ids.js';

describe('extractTableFileIds', () => {
    it('returns [] for null/undefined/primitive roots', () => {
        assert.deepEqual(extractTableFileIds(null), []);
        assert.deepEqual(extractTableFileIds(undefined), []);
        assert.deepEqual(extractTableFileIds('plain'), []);
        assert.deepEqual(extractTableFileIds(42), []);
    });

    it('finds a single { type: "table", fileId } object', () => {
        const ids = extractTableFileIds({ type: 'table', fileId: '507f1f77bcf86cd799439011' });
        assert.equal(ids.length, 1);
        assert.equal(ids[0].toString(), '507f1f77bcf86cd799439011');
    });

    it('matches type case-insensitively (TABLE / Table)', () => {
        const ids = extractTableFileIds({
            children: [
                { type: 'TABLE', fileId: '507f1f77bcf86cd799439011' },
                { type: 'Table', fileId: '507f1f77bcf86cd799439012' },
            ],
        });
        assert.equal(ids.length, 2);
    });

    it('walks nested arrays and objects', () => {
        const ids = extractTableFileIds({
            blocks: [
                { type: 'paragraph', text: 'x' },
                { children: { nested: { type: 'table', fileId: '507f1f77bcf86cd799439013' } } },
            ],
        });
        assert.equal(ids.length, 1);
        assert.equal(ids[0].toString(), '507f1f77bcf86cd799439013');
    });

    it('parses JSON-stringified subtrees and walks them', () => {
        const inner = JSON.stringify({ type: 'table', fileId: '507f1f77bcf86cd799439014' });
        const ids = extractTableFileIds({ raw: inner });
        assert.equal(ids.length, 1);
        assert.equal(ids[0].toString(), '507f1f77bcf86cd799439014');
    });

    it('deduplicates repeated fileIds', () => {
        const ids = extractTableFileIds([
            { type: 'table', fileId: '507f1f77bcf86cd799439011' },
            { type: 'table', fileId: '507f1f77bcf86cd799439011' },
        ]);
        assert.equal(ids.length, 1);
    });

    it('skips table nodes whose fileId is empty/whitespace', () => {
        const ids = extractTableFileIds({
            list: [
                { type: 'table', fileId: '   ' },
                { type: 'table', fileId: '' },
            ],
        });
        assert.equal(ids.length, 0);
    });
});
