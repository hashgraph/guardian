import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GetPropertiesFromFile } from '../../../dist/helpers/policy-property.js';

const writeTemp = async (contents) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gp-'));
    const file = path.join(dir, 'props.csv');
    await fs.writeFile(file, contents, 'utf8');
    return { file, dir };
};

describe('GetPropertiesFromFile', () => {
    it('parses two-column rows into title/value objects', async () => {
        const { file } = await writeTemp('a,1\nb,2\nc,3\n');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [
            { title: 'a', value: '1' },
            { title: 'b', value: '2' },
            { title: 'c', value: '3' },
        ]);
    });

    it('skips rows that do not have exactly two columns', async () => {
        const { file } = await writeTemp('a,1\nbad-row\nb,2,extra\nc,3\n');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [
            { title: 'a', value: '1' },
            { title: 'c', value: '3' },
        ]);
    });

    it('skips rows whose first column is empty', async () => {
        const { file } = await writeTemp(',value-without-title\nname,real\n');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'name', value: 'real' }]);
    });

    it('returns [] for an empty file', async () => {
        const { file } = await writeTemp('');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('rejects when the file does not exist', async () => {
        const missing = path.join(os.tmpdir(), 'definitely-missing-' + Date.now() + '.csv');
        // Suppress the helper's console.error inside the catch path to keep
        // test output clean — its content isn't being asserted here.
        const original = console.error;
        console.error = () => {};
        try {
            await assert.rejects(GetPropertiesFromFile(missing));
        } finally {
            console.error = original;
        }
    });
});
