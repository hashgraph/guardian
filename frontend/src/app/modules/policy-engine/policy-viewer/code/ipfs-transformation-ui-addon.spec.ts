import { of, Subject, throwError } from 'rxjs';
import { IpfsTransformationUIAddonCode } from './ipfs-transformation-ui-addon';

describe('IpfsTransformationUIAddonCode', () => {
    const cid = 'QmTestCidValueForTheAddonSpecQmTestCidValueForTheAd';
    const gzipHeader = new Uint8Array([31, 139, 8, 0, 0, 0, 0, 0, 0, 3]);

    function tableValue(overrides: any = {}): string {
        return JSON.stringify({
            type: 'table',
            fileId: 'grid-fs-id',
            cid,
            columnNames: ['Date', 'Amount'],
            columnKeys: ['date', 'amount'],
            ...overrides
        });
    }

    function createAddon(config: any, ipfsService?: any): IpfsTransformationUIAddonCode {
        const defaultService: any = {
            getFile: () => of(gzipHeader.buffer),
            getFileFromDryRunStorage: () => of(gzipHeader.buffer)
        };
        return new IpfsTransformationUIAddonCode(
            config,
            {} as any,
            ipfsService || defaultService,
            false
        );
    }

    function gatewayConfig(): any {
        return {
            transformationType: 'ipfsGateway',
            ipfsGatewayTemplate: 'https://host/api/v1/ipfs/file/{cid}'
        };
    }

    it('should rewrite a table value to a gateway link and keep the column metadata', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field0: 'plain text', field1: tableValue() };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field0).toBe('plain text');
        expect(document.field1.type).toBe('table');
        expect(document.field1.columnNames).toEqual(['Date', 'Amount']);
        expect(document.field1.columnKeys).toEqual(['date', 'amount']);
        expect(document.field1.resourceUrl).toContain('/api/v1/ipfs/file/');
        expect(document.field1.fileId).toBeUndefined();
        expect(document.field1.cid).toBeUndefined();
    });

    it('should rewrite a table value to base64 and report the gzip media type', async () => {
        const addon = createAddon({ transformationType: 'base64' });
        const document: any = { field1: tableValue() };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1.type).toBe('table');
        expect(document.field1.base64String).toContain('data:application/gzip;base64,');
    });

    it('should omit the column keys when the stored value carries none', async () => {
        const addon = createAddon(gatewayConfig());
        const value = JSON.stringify({ type: 'table', cid });
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1.type).toBe('table');
        expect(document.field1.columnNames).toBeUndefined();
        expect(document.field1.columnKeys).toBeUndefined();
        expect(document.field1.resourceUrl).toContain('/api/v1/ipfs/file/');
    });

    it('should leave a table value untouched when it carries no cid', async () => {
        const addon = createAddon(gatewayConfig());
        const value = JSON.stringify({ type: 'table', fileId: 'grid-fs-id', columnKeys: ['a'] });
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toBe(value);
    });

    it('should leave a table value untouched when the download fails', async () => {
        const failingService: any = {
            getFile: () => throwError(() => new Error('gone')),
            getFileFromDryRunStorage: () => throwError(() => new Error('gone'))
        };
        const addon = createAddon({ transformationType: 'base64' }, failingService);
        const value = tableValue();
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toBe(value);
    });

    it('should leave a json string that is not a table untouched', async () => {
        const addon = createAddon(gatewayConfig());
        const value = JSON.stringify({ type: 'geo', coordinates: [1, 2] });
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toBe(value);
    });

    it('should leave a malformed json string untouched', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field1: '{not json' };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toBe('{not json');
    });

    it('should still replace a whole ipfs link with a gateway object', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field1: `ipfs://${cid}` };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1.resourceUrl).toContain('/api/v1/ipfs/file/');
        expect(document.field1.type).toBeUndefined();
    });

    it('should rewrite every image reference inside a markdown value and keep it a string', async () => {
        const addon = createAddon(gatewayConfig());
        const second = 'QmSecondCidValueForTheAddonSpecQmSecondCidValueFor';
        const value = `# Report\n\n![One](ipfs://${cid})\n\nText\n\n![Two](ipfs://${second})`;
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(typeof document.field1).toBe('string');
        expect(document.field1).toContain('# Report');
        expect(document.field1).toContain('![One](https://host/api/v1/ipfs/file/');
        expect(document.field1).toContain('![Two](https://host/api/v1/ipfs/file/');
        expect(document.field1).not.toContain('ipfs://');
    });

    it('should rewrite a markdown image to base64 and stay a string', async () => {
        const addon = createAddon({ transformationType: 'base64' });
        const document: any = { field1: `text ![One](ipfs://${cid}) more` };

        await addon.run({ document, params: {}, history: [] });

        expect(typeof document.field1).toBe('string');
        expect(document.field1).toContain('![One](data:application/gzip;base64,');
    });

    it('should leave an unresolvable reference in place and rewrite the rest', async () => {
        const second = 'QmSecondCidValueForTheAddonSpecQmSecondCidValueFor';
        const partialService: any = {
            getFile: (requested: string) => requested === second
                ? throwError(() => new Error('gone'))
                : of(gzipHeader.buffer),
            getFileFromDryRunStorage: () => of(gzipHeader.buffer)
        };
        const addon = createAddon({ transformationType: 'base64' }, partialService);
        const document: any = { field1: `![One](ipfs://${cid}) and ![Two](ipfs://${second})` };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toContain('![One](data:application/gzip;base64,');
        expect(document.field1).toContain(`![Two](ipfs://${second})`);
    });

    it('should start every image download of one markdown value before the first one finishes', async () => {
        const second = 'QmSecondCidValueForTheAddonSpecQmSecondCidValueFor';
        const downloads = new Map<string, Subject<ArrayBuffer>>();
        const deferredService: any = {
            getFile: (requested: string) => {
                const download = new Subject<ArrayBuffer>();
                downloads.set(requested, download);
                return download;
            },
            getFileFromDryRunStorage: () => of(gzipHeader.buffer)
        };
        const addon = createAddon({ transformationType: 'base64' }, deferredService);
        const document: any = { field1: `![One](ipfs://${cid}) and ![Two](ipfs://${second})` };

        const running = addon.run({ document, params: {}, history: [] });
        await new Promise(resolve => setTimeout(resolve));

        expect(downloads.size).toBe(2);

        for (const download of downloads.values()) {
            download.next(gzipHeader.buffer);
            download.complete();
        }
        await running;

        expect(document.field1).toContain('![One](data:application/gzip;base64,');
        expect(document.field1).toContain('![Two](data:application/gzip;base64,');
    });

    it('should leave a markdown value with no reference untouched', async () => {
        const addon = createAddon(gatewayConfig());
        const value = '# Report\n\nPlain text that mentions ipfs but links nothing.';
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toBe(value);
    });

    it('should rewrite a markdown link target as well as an image target', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field1: `see [the file](ipfs://${cid})` };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field1).toContain('[the file](https://host/api/v1/ipfs/file/');
    });

    it('should keep markdown that starts with a bare reference a string and rewrite the image', async () => {
        const addon = createAddon(gatewayConfig());
        const second = 'QmSecondCidValueForTheAddonSpecQmSecondCidValueFor';
        const value = `ipfs://${cid}\n\nText\n\n![One](ipfs://${second})`;
        const document: any = { field1: value };

        await addon.run({ document, params: {}, history: [] });

        expect(typeof document.field1).toBe('string');
        expect(document.field1).toContain('Text');
        expect(document.field1).toContain('![One](https://host/api/v1/ipfs/file/');
    });

    it('should still rewrite a value that is one bare reference', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field1: `ipfs://${cid}` };

        await addon.run({ document, params: {}, history: [] });

        expect(typeof document.field1).toBe('object');
        expect(document.field1.resourceUrl).toContain('/api/v1/ipfs/file/');
    });

    it('should walk nested objects and arrays', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = {
            credentialSubject: [
                { nested: { field1: tableValue() } }
            ]
        };

        await addon.run({ document, params: {}, history: [] });

        expect(document.credentialSubject[0].nested.field1.resourceUrl).toBeDefined();
    });
});
