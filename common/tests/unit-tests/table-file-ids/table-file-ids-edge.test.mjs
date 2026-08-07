import assert from 'node:assert/strict';
import { ObjectId } from '@mikro-orm/mongodb';
import { extractTableFileIds } from '../../../dist/helpers/table-file-ids.js';

const oid = () => new ObjectId().toHexString();

describe('extractTableFileIds — edges', () => {
    it('parses a top-level JSON array string', () => {
        const id = oid();
        const out = extractTableFileIds(JSON.stringify([{ type: 'table', fileId: id }]));
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('trims whitespace before detecting a JSON string', () => {
        const id = oid();
        const out = extractTableFileIds({ p: '   ' + JSON.stringify({ type: 'table', fileId: id }) });
        assert.equal(out.length, 1);
        assert.equal(out[0].toHexString(), id);
    });

    it('still traverses a table node\'s own children for more tables', () => {
        const a = oid();
        const b = oid();
        const out = extractTableFileIds({ type: 'table', fileId: a, child: { type: 'table', fileId: b } });
        assert.deepEqual(out.map((o) => o.toHexString()).sort(), [a, b].sort());
    });

    it('throws when a table fileId is not a valid ObjectId (no pre-validation)', () => {
        assert.throws(() => extractTableFileIds({ type: 'table', fileId: 'not-an-oid' }));
    });
});
