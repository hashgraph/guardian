import { of, throwError } from 'rxjs';
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
