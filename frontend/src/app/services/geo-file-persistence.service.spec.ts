import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DB_NAME, STORES_NAME } from '../constants';
import { gunzipIfCompressed, isGzipBlob } from '../modules/schema-engine/geo-file/geo-file-compression';
import { ArtifactService } from './artifact.service';
import { GeoFilePersistenceService } from './geo-file-persistence.service';
import { IndexedDbRegistryService } from './indexed-db-registry.service';
import { IPFSService } from './ipfs.service';

describe('GeoFilePersistenceService', () => {
    let records: Map<string, unknown>;
    let put: jasmine.Spy;
    let remove: jasmine.Spy;
    let upsertFile: jasmine.Spy;
    let getFileBlob: jasmine.Spy;
    let deleteFile: jasmine.Spy;
    let addFileDirect: jasmine.Spy;
    let service: GeoFilePersistenceService;

    beforeEach(() => {
        records = new Map();
        put = jasmine.createSpy('put').and.callFake(
            async (_db: string, store: string, value: { id: string }) => {
                records.set(`${store}:${value.id}`, value);
                return value.id;
            }
        );
        remove = jasmine.createSpy('delete').and.callFake(
            async (_db: string, store: string, key: string) => {
                records.delete(`${store}:${key}`);
            }
        );
        upsertFile = jasmine.createSpy('upsertFile').and.returnValue(of({ fileId: 'grid-1' }));
        getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(of(new Blob(['original'])));
        deleteFile = jasmine.createSpy('deleteFile').and.returnValue(of(true));
        addFileDirect = jasmine.createSpy('addFileDirect').and.returnValue(of('cid-1'));
        TestBed.configureTestingModule({
            providers: [
                GeoFilePersistenceService,
                {
                    provide: IndexedDbRegistryService,
                    useValue: {
                        registerStores: async () => undefined,
                        put,
                        delete: remove,
                        get: async (_db: string, store: string, key: string) =>
                            records.get(`${store}:${key}`)
                    }
                },
                { provide: ArtifactService, useValue: { upsertFile, getFileBlob, deleteFile } },
                { provide: IPFSService, useValue: { addFileDirect } }
            ]
        });
        service = TestBed.inject(GeoFilePersistenceService);
        spyOn(crypto, 'randomUUID').and.returnValue(
            'geo-key' as ReturnType<typeof crypto.randomUUID>
        );
    });

    it('stores the original File unchanged and returns its browser link', async () => {
        const file = new File(['original'], 'site.kml', { type: 'application/vnd.google-earth.kml+xml' });
        const link = await service.keepOriginal(file, 'kml');
        const record = records.get(`${STORES_NAME.FILES_STORE}:geo-key`) as { blob: File };

        expect(record.blob).toBe(file);
        expect(link).toEqual({
            idbKey: 'geo-key',
            name: 'site.kml',
            format: 'kml',
            sizeBytes: file.size,
            previewSizeBytes: file.size
        });
    });

    it('uploads nested links to GridFS and IPFS and compacts the link', async () => {
        const file = new File(['original'], 'site.geojson', { type: 'application/geo+json' });
        const link = await service.keepOriginal(file, 'geojson');
        const document = { rows: [{ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }] };

        await service.persistGeoFilesInDocument(document, false);

        expect(upsertFile).toHaveBeenCalledWith(jasmine.any(File));
        expect(addFileDirect).toHaveBeenCalledWith(upsertFile.calls.mostRecent().args[0]);
        expect(link.fileId).toBe('grid-1');
        expect(link.cid).toBe('cid-1');
        expect(link.idbKey).toBeUndefined();
        expect(remove).toHaveBeenCalledWith(DB_NAME.TABLES, STORES_NAME.FILES_STORE, 'geo-key');
    });

    it('uploads GeoJSON and KML as gzip under the original name', async () => {
        for (const [name, format] of [['site.geojson', 'geojson'], ['site.kml', 'kml']] as const) {
            upsertFile.calls.reset();
            const file = new File(['original'], name);
            const link = await service.keepOriginal(file, format);

            await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, true);

            const uploaded: File = upsertFile.calls.mostRecent().args[0];
            expect(uploaded.name).toBe(name);
            expect(uploaded.type).toBe('application/gzip');
            expect(await isGzipBlob(uploaded)).toBeTrue();
            expect(await (await gunzipIfCompressed(uploaded)).text()).toBe('original');
            expect(link.sizeBytes).toBe(file.size);
        }
    });

    it('uploads KMZ unchanged', async () => {
        const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
        const file = new File([bytes], 'site.kmz', { type: 'application/vnd.google-earth.kmz' });
        const link = await service.keepOriginal(file, 'kmz');

        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false);

        const uploaded: File = upsertFile.calls.mostRecent().args[0];
        expect(uploaded.name).toBe('site.kmz');
        expect(uploaded.type).toBe('application/vnd.google-earth.kmz');
        expect(new Uint8Array(await uploaded.arrayBuffer())).toEqual(bytes);
        expect(addFileDirect).toHaveBeenCalledWith(uploaded);
    });

    it('keeps the uncompressed original in the browser after a failed submit', async () => {
        const file = new File(['original'], 'site.geojson');
        const link = await service.keepOriginal(file, 'geojson');
        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, true);

        await service.rollbackGridFsUploads();

        const record = records.get(`${STORES_NAME.FILES_STORE}:geo-key`) as { blob: Blob };
        expect(record.blob).toBe(file);
    });

    it('skips IPFS in Dry Run', async () => {
        const file = new File(['original'], 'site.kml');
        const link = await service.keepOriginal(file, 'kml');

        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, true);

        expect(addFileDirect).not.toHaveBeenCalled();
        expect(link.fileId).toBe('grid-1');
        expect(link.cid).toBeUndefined();
    });

    it('copies browser files to the draft store without uploading', async () => {
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');

        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false, true);

        expect(records.has(`${STORES_NAME.DRAFT_STORE}:geo-key`)).toBeTrue();
        expect(upsertFile).not.toHaveBeenCalled();
        expect(link.idbKey).toBe('geo-key');
    });

    it('restores a draft file to the active store', async () => {
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');
        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false, true);
        records.delete(`${STORES_NAME.FILES_STORE}:geo-key`);

        await service.restoreGeoFilesFromDraft({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } });

        expect(records.has(`${STORES_NAME.FILES_STORE}:geo-key`)).toBeTrue();
    });

    it('restores GridFS bytes after a failed submit and leaves IPFS pinned', async () => {
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');
        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false);

        await service.rollbackGridFsUploads();

        expect(getFileBlob).not.toHaveBeenCalled();
        expect(records.has(`${STORES_NAME.FILES_STORE}:geo-key`)).toBeTrue();
        expect(records.has(`${STORES_NAME.DRAFT_STORE}:geo-key`)).toBeTrue();
        expect(deleteFile).toHaveBeenCalledWith('grid-1');
        expect(addFileDirect).toHaveBeenCalledTimes(1);
        expect(link.idbKey).toBe('geo-key');
        expect(link.fileId).toBeUndefined();
        expect(link.cid).toBeUndefined();
    });

    it('does not mutate an already persisted link', async () => {
        const link = {
            fileId: 'grid-old',
            cid: 'cid-old',
            name: 'site.kml',
            format: 'kml' as const,
            sizeBytes: 1,
            previewSizeBytes: 1
        };

        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false);

        expect(upsertFile).not.toHaveBeenCalled();
        expect(link.fileId).toBe('grid-old');
        expect(link.cid).toBe('cid-old');
    });

    it('keeps the browser record when IPFS upload fails', async () => {
        addFileDirect.and.returnValue(throwError(() => new Error('ipfs failed')));
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');

        await expectAsync(
            service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false)
        ).toBeRejectedWithError('ipfs failed');

        expect(records.has(`${STORES_NAME.FILES_STORE}:geo-key`)).toBeTrue();
    });

    it('removes the GridFS upload when IPFS fails and the caller rolls back', async () => {
        addFileDirect.and.returnValue(throwError(() => new Error('ipfs failed')));
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');

        await expectAsync(
            service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false)
        ).toBeRejectedWithError('ipfs failed');
        await service.rollbackGridFsUploads();

        expect(deleteFile).toHaveBeenCalledWith('grid-1');
        expect(link.idbKey).toBe('geo-key');
        expect(link.fileId).toBeUndefined();
        expect(records.has(`${STORES_NAME.FILES_STORE}:geo-key`)).toBeTrue();
    });

    it('reports a browser file that is still available', async () => {
        await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');

        expect(await service.ensurePendingFile('geo-key')).toBeTrue();
    });

    it('restores a browser file from the draft store', async () => {
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');
        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false, true);
        records.delete(`${STORES_NAME.FILES_STORE}:geo-key`);

        expect(await service.ensurePendingFile('geo-key')).toBeTrue();
        expect(records.has(`${STORES_NAME.FILES_STORE}:geo-key`)).toBeTrue();
    });

    it('reports a browser file that is missing', async () => {
        expect(await service.ensurePendingFile('missing-key')).toBeFalse();
    });

    describe('when IndexedDB cannot be opened', () => {
        let registerStores: jasmine.Spy;

        beforeEach(() => {
            registerStores = jasmine.createSpy('registerStores').and.rejectWith(new Error('blocked'));
            TestBed.inject(IndexedDbRegistryService).registerStores = registerStores;
        });

        it('submits a document without a browser file link', async () => {
            const stored = {
                fileId: 'grid-old', name: 'site.kml', format: 'kml' as const,
                sizeBytes: 1, previewSizeBytes: 1
            };

            await service.persistGeoFilesInDocument({ note: 'text', place: { type: 'Point', coordinates: [1, 2], geoFile: stored } }, false);
            await service.restoreGeoFilesFromDraft({ note: 'text' });

            expect(registerStores).not.toHaveBeenCalled();
        });

        it('reports the storage failure for a browser file link', async () => {
            const link = {
                idbKey: 'geo-key', name: 'site.kml', format: 'kml' as const,
                sizeBytes: 1, previewSizeBytes: 1
            };

            await expectAsync(
                service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false)
            ).toBeRejectedWithError('blocked');
        });
    });

    it('does not persist an ordinary field named geoFile', async () => {
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');

        await service.persistGeoFilesInDocument({ type: '#schema-1', geoFile: link, details: { geoFile: link } }, false);

        expect(upsertFile).not.toHaveBeenCalled();
        expect(link.idbKey).toBe('geo-key');
    });

    it('discards both browser copies for a cancelled import', async () => {
        const link = await service.keepOriginal(new File(['x'], 'site.kml'), 'kml');
        await service.persistGeoFilesInDocument({ place: { type: 'Point', coordinates: [1, 2], geoFile: link } }, false, true);

        await service.discard(link);

        expect(records.has(`${STORES_NAME.FILES_STORE}:geo-key`)).toBeFalse();
        expect(records.has(`${STORES_NAME.DRAFT_STORE}:geo-key`)).toBeFalse();
    });
});
