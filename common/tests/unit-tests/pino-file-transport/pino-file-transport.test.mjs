import assert from 'node:assert/strict';
import { promises as fs, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PinoFileTransport } from '../../../dist/helpers/pino-file-transport.js';

const tempPath = (suffix) => path.join(os.tmpdir(), `gp-pft-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);

describe('PinoFileTransport.constructor', () => {
    it('creates the parent directory when missing', async () => {
        const dir = tempPath('-dir');
        const file = path.join(dir, 'log.txt');
        assert.equal(existsSync(dir), false);
        const t = new PinoFileTransport({ filePath: file });
        assert.equal(existsSync(dir), true);
        assert.equal(existsSync(file), true);
        assert.ok(t);
        // Cleanup is best-effort — pino keeps the file handle open asynchronously
        // and rmdir may fail on Windows. Leave the temp file behind in that case.
        await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('reuses an existing file (does not throw)', async () => {
        const file = tempPath('.log');
        await fs.writeFile(file, 'pre-existing\n');
        assert.doesNotThrow(() => new PinoFileTransport({ filePath: file }));
        await fs.rm(file, { force: true }).catch(() => {});
    });
});

describe('PinoFileTransport.write', () => {
    it('appends a newline-terminated JSON entry to the destination', async () => {
        const file = tempPath('.log');
        const t = new PinoFileTransport({ filePath: file });
        t.write(JSON.stringify({ level: 'info', message: 'hello' }));
        // Allow pino's async destination to flush.
        await new Promise((r) => setTimeout(r, 100));
        const contents = await fs.readFile(file, 'utf8');
        assert.ok(contents.includes('"message":"hello"'));
        assert.ok(contents.endsWith('\n'));
        await fs.rm(file, { force: true }).catch(() => {});
    });

    it('appends multiple entries on separate lines', async () => {
        const file = tempPath('.log');
        const t = new PinoFileTransport({ filePath: file });
        t.write(JSON.stringify({ message: 'one' }));
        t.write(JSON.stringify({ message: 'two' }));
        await new Promise((r) => setTimeout(r, 100));
        const contents = await fs.readFile(file, 'utf8');
        const lines = contents.trim().split('\n');
        assert.equal(lines.length, 2);
        assert.ok(lines[0].includes('"one"'));
        assert.ok(lines[1].includes('"two"'));
        await fs.rm(file, { force: true }).catch(() => {});
    });

    it('throws synchronously when the input is not valid JSON', () => {
        const file = tempPath('.log');
        const t = new PinoFileTransport({ filePath: file });
        assert.throws(() => t.write('not-json'));
    });
});
