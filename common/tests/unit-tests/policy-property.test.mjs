import assert from 'node:assert/strict';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GetPropertiesFromFile } from '../../dist/helpers/policy-property.js';

describe('GetPropertiesFromFile (CSV title,value reader)', () => {
    let tmp;

    before(async () => {
        tmp = await mkdtemp(path.join(os.tmpdir(), 'policy-prop-'));
    });

    it('parses well-formed two-column rows into title/value pairs', async () => {
        const file = path.join(tmp, 'a.csv');
        await writeFile(file, 'Cap,100\nUnit,kg\n', 'utf8');
        const props = await GetPropertiesFromFile(file);
        assert.deepEqual(props, [
            { title: 'Cap', value: '100' },
            { title: 'Unit', value: 'kg' },
        ]);
    });

    it('skips blank rows and rows with wrong column count', async () => {
        const file = path.join(tmp, 'b.csv');
        await writeFile(file, 'Cap,100\n\nonecolumn\nthree,col,umns\nUnit,kg', 'utf8');
        const props = await GetPropertiesFromFile(file);
        assert.deepEqual(props.map(p => p.title), ['Cap', 'Unit']);
    });

    it('skips rows whose first column is empty', async () => {
        const file = path.join(tmp, 'c.csv');
        await writeFile(file, ',value-without-title\nReal,1\n', 'utf8');
        const props = await GetPropertiesFromFile(file);
        assert.equal(props.length, 1);
        assert.equal(props[0].title, 'Real');
    });

    it('rejects when file is missing (re-throws filesystem error)', async () => {
        await assert.rejects(GetPropertiesFromFile(path.join(tmp, 'no-such.csv')));
    });

    after(async () => {
        // best-effort cleanup; ignore errors
        try { await unlink(path.join(tmp, 'a.csv')); } catch {}
        try { await unlink(path.join(tmp, 'b.csv')); } catch {}
        try { await unlink(path.join(tmp, 'c.csv')); } catch {}
    });
});
