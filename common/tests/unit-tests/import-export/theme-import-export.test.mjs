import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { ThemeImportExport } from '../../../dist/import-export/theme.js';

describe('ThemeImportExport.loadThemeComponents', () => {
    it('wraps the theme into a components object', async () => {
        const theme = { name: 'Dark', rules: [] };
        const components = await ThemeImportExport.loadThemeComponents(theme);
        assert.deepEqual(components, { theme });
    });
});

describe('ThemeImportExport.generateZipFile', () => {
    it('writes theme.json into the zip', async () => {
        const zip = await ThemeImportExport.generateZipFile({ theme: { name: 'T', rules: [] } });
        assert.ok(zip.files['theme.json']);
    });

    it('strips id, _id, owner and dates from the packed theme', async () => {
        const theme = {
            id: '1',
            _id: 'x',
            owner: 'did:hedera:1',
            createDate: 'a',
            updateDate: 'b',
            name: 'T',
            rules: [{ text: 'r1' }]
        };
        const zip = await ThemeImportExport.generateZipFile({ theme });
        const parsed = JSON.parse(await zip.files['theme.json'].async('string'));
        assert.equal(parsed.id, undefined);
        assert.equal(parsed._id, undefined);
        assert.equal(parsed.owner, undefined);
        assert.equal(parsed.createDate, undefined);
        assert.equal(parsed.updateDate, undefined);
        assert.equal(parsed.name, 'T');
        assert.deepEqual(parsed.rules, [{ text: 'r1' }]);
    });

    it('normalises non-array rules to an empty array', async () => {
        const zip = await ThemeImportExport.generateZipFile({ theme: { name: 'T', rules: 'broken' } });
        const parsed = JSON.parse(await zip.files['theme.json'].async('string'));
        assert.deepEqual(parsed.rules, []);
    });

    it('does not mutate the original theme object', async () => {
        const theme = { id: 'keep', name: 'T', rules: [] };
        await ThemeImportExport.generateZipFile({ theme });
        assert.equal(theme.id, 'keep');
    });
});

describe('ThemeImportExport.generate', () => {
    it('produces a zip directly from a theme', async () => {
        const zip = await ThemeImportExport.generate({ name: 'G', rules: [] });
        const parsed = JSON.parse(await zip.files['theme.json'].async('string'));
        assert.equal(parsed.name, 'G');
    });
});

describe('ThemeImportExport.parseZipFile', () => {
    it('round-trips a generated theme zip', async () => {
        const zip = await ThemeImportExport.generate({ name: 'Round', description: 'trip', rules: [{ text: 'r' }] });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const { theme } = await ThemeImportExport.parseZipFile(buffer);
        assert.equal(theme.name, 'Round');
        assert.equal(theme.description, 'trip');
        assert.deepEqual(theme.rules, [{ text: 'r' }]);
    });

    it('throws when theme.json is missing', async () => {
        const zip = new JSZip();
        zip.file('other.json', '{}');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(ThemeImportExport.parseZipFile(buffer), /Zip file is not a theme/);
    });

    it('throws when theme.json is a directory', async () => {
        const zip = new JSZip();
        zip.folder('theme.json');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(ThemeImportExport.parseZipFile(buffer), /Zip file is not a theme/);
    });

    it('exposes the documented filename constant', () => {
        assert.equal(ThemeImportExport.themeFileName, 'theme.json');
    });
});
