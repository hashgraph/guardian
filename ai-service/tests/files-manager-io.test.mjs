import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FilesManager } from '../dist/helpers/files-manager-helper.js';

function makeLogger() {
    const calls = [];
    return {
        calls,
        info: async (msg) => calls.push(['info', msg]),
        warn: async (msg) => calls.push(['warn', msg]),
        error: async (msg) => calls.push(['error', msg]),
    };
}

function tmpDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const policy = (id, name, extra = {}) => ({
    _id: { toString: () => id },
    name,
    description: extra.description,
    typicalProjects: extra.typicalProjects,
    categories: extra.categories ?? [],
    topicDescription: extra.topicDescription,
    importantParameters: extra.importantParameters,
    applicabilityConditions: extra.applicabilityConditions,
});

describe('FilesManager.checkDir', () => {
    it('creates the directory when it does not exist', () => {
        const base = tmpDir('fm-check-');
        const target = path.join(base, 'sub');
        assert.equal(fs.existsSync(target), false);
        FilesManager.checkDir(target);
        assert.equal(fs.existsSync(target), true);
    });

    it('is a no-op when the directory already exists', () => {
        const base = tmpDir('fm-check2-');
        FilesManager.checkDir(base);
        assert.equal(fs.existsSync(base), true);
    });
});

describe('FilesManager.deleteAllFilesInDirectory', () => {
    it('removes every file in the directory', () => {
        const base = tmpDir('fm-del-');
        fs.writeFileSync(path.join(base, 'a.txt'), '1');
        fs.writeFileSync(path.join(base, 'b.txt'), '2');
        FilesManager.deleteAllFilesInDirectory(base);
        assert.deepEqual(fs.readdirSync(base), []);
    });
});

describe('FilesManager.generateFile', () => {
    it('writes the file content and logs an info message', async () => {
        const base = tmpDir('fm-gen-');
        const file = path.join(base, 'out.txt');
        const logger = makeLogger();
        await FilesManager.generateFile(file, 'hello', logger);
        assert.equal(fs.readFileSync(file, 'utf8'), 'hello');
        assert.ok(logger.calls.some(([lvl, msg]) => lvl === 'info' && /was created/.test(msg)));
    });

    it('rejects when the write fails (invalid path)', async () => {
        const logger = makeLogger();
        const badPath = path.join(tmpDir('fm-bad-'), 'no-such-dir', 'x.txt');
        await assert.rejects(() => FilesManager.generateFile(badPath, 'x', logger));
    });
});

describe('FilesManager.generateMethodologyFiles', () => {
    it('returns false when policies is falsy', async () => {
        const logger = makeLogger();
        const result = await FilesManager.generateMethodologyFiles(tmpDir('fm-mf-'), null, [], [], logger);
        assert.equal(result, false);
    });

    it('writes a file only for policies that produce content', async () => {
        const base = tmpDir('fm-mf2-');
        const logger = makeLogger();
        const policies = [
            policy('p1', 'WithContent', { description: 'A real description here.' }),
            policy('p2', 'Empty'),
        ];
        await FilesManager.generateMethodologyFiles(base, policies, [], [], logger);
        const files = fs.readdirSync(base);
        assert.ok(files.includes('WithContent.txt'));
        assert.ok(!files.includes('Empty.txt'));
    });

    it('appends descriptions exceeding the word minimum', async () => {
        const base = tmpDir('fm-mf3-');
        const logger = makeLogger();
        const policies = [policy('p1', 'M', { description: 'd' })];
        const policyDescriptions = [
            {
                policyId: 'p1',
                descriptions: [
                    'this description has more than five words total',
                    'too short',
                    '',
                ],
            },
        ];
        await FilesManager.generateMethodologyFiles(base, policies, [], policyDescriptions, logger);
        const content = fs.readFileSync(path.join(base, 'M.txt'), 'utf8');
        assert.match(content, /more than five words total/);
        assert.doesNotMatch(content, /too short/);
    });
});

describe('FilesManager.generateMetadataFile', () => {
    it('writes metadata.txt when there is metadata content', async () => {
        const base = tmpDir('fm-meta-');
        const logger = makeLogger();
        const categories = [{ id: 'c1', type: 'PROJECT_SCALE', name: 'Small' }];
        const policies = [policy('p1', 'PA', { categories: ['c1'] })];
        await FilesManager.generateMetadataFile(base, policies, categories, logger);
        const content = fs.readFileSync(path.join(base, 'metadata.txt'), 'utf8');
        assert.match(content, /Small: PA/);
    });

    it('writes nothing when there is no metadata content', async () => {
        const base = tmpDir('fm-meta2-');
        const logger = makeLogger();
        await FilesManager.generateMetadataFile(base, [], [], logger);
        assert.equal(fs.existsSync(path.join(base, 'metadata.txt')), false);
    });
});

describe('FilesManager.generateData', () => {
    it('clears the directory and returns true on success', async () => {
        const base = tmpDir('fm-data-');
        fs.writeFileSync(path.join(base, 'stale.txt'), 'old');
        const logger = makeLogger();
        const categories = [{ id: 'c1', type: 'PROJECT_SCALE', name: 'Small' }];
        const policies = [policy('p1', 'PA', { categories: ['c1'], description: 'desc here today' })];
        const result = await FilesManager.generateData(base, policies, categories, [], logger);
        assert.equal(result, true);
        const files = fs.readdirSync(base);
        assert.ok(!files.includes('stale.txt'));
        assert.ok(files.includes('PA.txt'));
        assert.ok(files.includes('metadata.txt'));
    });

    it('creates the directory first when it is missing', async () => {
        const base = path.join(tmpDir('fm-data2-'), 'fresh');
        const logger = makeLogger();
        const result = await FilesManager.generateData(base, [], [], [], logger);
        assert.equal(result, true);
        assert.equal(fs.existsSync(base), true);
    });

    it('returns false when generation throws', async () => {
        const base = tmpDir('fm-data3-');
        const logger = makeLogger();
        const notIterable = { length: 1 };
        const result = await FilesManager.generateData(base, notIterable, [], [], logger);
        assert.equal(result, false);
    });
});
