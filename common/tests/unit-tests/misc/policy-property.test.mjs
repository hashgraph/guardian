import { assert } from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GetPropertiesFromFile } from '../../../dist/helpers/policy-property.js';

let tmpDir;

before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-property-'));
});

after(() => {
    if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

function writeCsv(name, content) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, content);
    return p;
}

describe('GetPropertiesFromFile', () => {
    it('parses each comma-delimited row into {title, value}', async () => {
        const file = writeCsv(
            'basic.csv',
            'title-a,value-a\ntitle-b,value-b\ntitle-c,value-c'
        );
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [
            { title: 'title-a', value: 'value-a' },
            { title: 'title-b', value: 'value-b' },
            { title: 'title-c', value: 'value-c' },
        ]);
    });

    it('skips rows with missing title (empty first column)', async () => {
        const file = writeCsv(
            'missing-title.csv',
            ',orphan-value\ntitle-keep,value-keep'
        );
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'title-keep', value: 'value-keep' }]);
    });

    it('skips rows that do not have exactly two columns', async () => {
        const file = writeCsv(
            'wrong-columns.csv',
            'only-one\nthree,col,row\nvalid,value'
        );
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'valid', value: 'value' }]);
    });

    it('returns an empty array for an empty file', async () => {
        const file = writeCsv('empty.csv', '');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('handles a single-row file', async () => {
        const file = writeCsv('one.csv', 'lonely,value');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'lonely', value: 'value' }]);
    });

    it('rejects when the file does not exist', async () => {
        try {
            await GetPropertiesFromFile(path.join(tmpDir, 'no-such-file.csv'));
            assert.fail('expected to reject');
        } catch (err) {
            assert.match(err.message, /ENOENT/);
        }
    });
});
