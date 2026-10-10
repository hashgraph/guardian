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

    function geoValue(geoFileOverrides: any = {}): any {
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'Point', coordinates: [36.015, -1.005] }
                }
            ],
            geoFile: {
                fileId: 'grid-fs-id',
                cid,
                name: 'farms.kml',
                format: 'kml',
                sizeBytes: 2097152,
                previewSizeBytes: 2097152,
                ...geoFileOverrides
            }
        };
    }

    it('should rewrite a geo file link to a gateway link and drop the storage ids', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field2: geoValue() };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field2.type).toBe('FeatureCollection');
        expect(document.field2.features).toEqual(geoValue().features);
        expect(document.field2.geoFile).toEqual({
            name: 'farms.kml',
            format: 'kml',
            sizeBytes: 2097152,
            previewSizeBytes: 2097152,
            compression: 'gzip',
            resourceUrl: jasmine.stringMatching(/^https:\/\/host\/api\/v1\/ipfs\/file\//)
        });
    });

    it('should rewrite a geo file link to base64 and mark it as gzip', async () => {
        const addon = createAddon({ transformationType: 'base64' });
        const document: any = { field2: geoValue({ name: 'farms.geojson', format: 'geojson' }) };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field2.geoFile.compression).toBe('gzip');
        expect(document.field2.geoFile.base64String).toContain('data:application/gzip;base64,');
        expect(document.field2.geoFile.fileId).toBeUndefined();
        expect(document.field2.geoFile.cid).toBeUndefined();
    });

    it('should not mark a kmz geo file as gzip', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = { field2: geoValue({ name: 'farms.kmz', format: 'kmz' }) };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field2.geoFile.format).toBe('kmz');
        expect(document.field2.geoFile.compression).toBeUndefined();
        expect(document.field2.geoFile.resourceUrl).toContain('/api/v1/ipfs/file/');
    });

    it('should keep the no-preview flag and the automatic point of a geo file', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = {
            field2: {
                type: 'Point',
                coordinates: [36.0012, -1.0021],
                geoFile: {
                    fileId: 'grid-fs-id',
                    cid,
                    name: 'farms.kml',
                    format: 'kml',
                    sizeBytes: 58720256,
                    previewSizeBytes: 58720256,
                    noPreview: true,
                    automaticPoint: [36.0012, -1.0021]
                }
            }
        };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field2.coordinates).toEqual([36.0012, -1.0021]);
        expect(document.field2.geoFile.noPreview).toBeTrue();
        expect(document.field2.geoFile.automaticPoint).toEqual([36.0012, -1.0021]);
        expect(document.field2.geoFile.resourceUrl).toContain('/api/v1/ipfs/file/');
        expect(document.field2.geoFile.fileId).toBeUndefined();
    });

    it('should leave a geo file link untouched when it carries no cid', async () => {
        const addon = createAddon(gatewayConfig());
        const value = geoValue({ cid: undefined });
        const geoFile = value.geoFile;
        const document: any = { field2: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field2.geoFile).toBe(geoFile);
        expect(document.field2.geoFile.fileId).toBe('grid-fs-id');
        expect(document.field2.geoFile.resourceUrl).toBeUndefined();
    });

    it('should leave a geo file link untouched when the download fails', async () => {
        const failingService: any = {
            getFile: () => throwError(() => new Error('gone')),
            getFileFromDryRunStorage: () => throwError(() => new Error('gone'))
        };
        const addon = createAddon({ transformationType: 'base64' }, failingService);
        const value = geoValue();
        const geoFile = value.geoFile;
        const document: any = { field2: value };

        await addon.run({ document, params: {}, history: [] });

        expect(document.field2.geoFile).toBe(geoFile);
        expect(document.field2.geoFile.cid).toBe(cid);
        expect(document.field2.geoFile.base64String).toBeUndefined();
    });

    it('should not touch an ordinary object named geoFile', async () => {
        const addon = createAddon(gatewayConfig());
        const ordinary = { geoFile: { name: 'contract', cid, fileId: 'grid-fs-id' } };
        const malformed = geoValue({ format: 'pdf' });
        const document: any = { contract: ordinary, field2: malformed };

        await addon.run({ document, params: {}, history: [] });

        expect(document.contract.geoFile).toEqual({ name: 'contract', cid, fileId: 'grid-fs-id' });
        expect(document.field2.geoFile.cid).toBe(cid);
        expect(document.field2.geoFile.resourceUrl).toBeUndefined();
    });

    it('should rewrite a geo file link nested inside the credential subject', async () => {
        const addon = createAddon(gatewayConfig());
        const document: any = {
            credentialSubject: [
                { field0: 'plain text', group: { field2: geoValue() } }
            ]
        };

        await addon.run({ document, params: {}, history: [] });

        expect(document.credentialSubject[0].field0).toBe('plain text');
        expect(document.credentialSubject[0].group.field2.geoFile.resourceUrl).toContain('/api/v1/ipfs/file/');
        expect(document.credentialSubject[0].group.field2.geoFile.cid).toBeUndefined();
    });
});
