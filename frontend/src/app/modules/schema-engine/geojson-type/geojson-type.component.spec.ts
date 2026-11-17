import type { MockedObject } from "vitest";
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, ReplaySubject, throwError } from 'rxjs';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GeoJsonType } from '@guardian/interfaces';
import { SettingsService } from 'src/app/services/settings.service';
import { ArtifactService } from 'src/app/services/artifact.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { GeoJsonService } from 'src/app/services/geo-json.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { gzipBlob } from '../geo-file/geo-file-compression';
import { KmlCoordinateScanner, KmzBrowserSupportError, KmzRootEntryError } from '@guardian/interfaces';
import { GeoForm, ORIGINAL_FILE_ERRORS_KEY } from '../schema-form-model/geo-form';
import { GeojsonTypeComponent } from './geojson-type.component';

describe('GeojsonTypeComponent original file link', () => {
    let value: any;
    let geoFiles: MockedObject<GeoFilePersistenceService>;
    let artifacts: MockedObject<ArtifactService>;
    let settings: MockedObject<SettingsService>;
    let dialog: MockedObject<DialogService>;
    let close: ReplaySubject<string | undefined>;
    let component: GeojsonTypeComponent;

    beforeEach(() => {
        value = {};
        geoFiles = {
            keepOriginal: vi.fn().mockName("GeoFilePersistenceService.keepOriginal"),
            discard: vi.fn().mockName("GeoFilePersistenceService.discard"),
            ensurePendingFile: vi.fn().mockName("GeoFilePersistenceService.ensurePendingFile"),
            fileHash: vi.fn().mockName("GeoFilePersistenceService.fileHash")
        } as unknown as MockedObject<GeoFilePersistenceService>;
        artifacts = {
            getFileBlob: vi.fn().mockName("ArtifactService.getFileBlob")
        } as unknown as MockedObject<ArtifactService>;
        settings = {
            getGeospatialLimits: vi.fn().mockName("SettingsService.getGeospatialLimits")
        } as unknown as MockedObject<SettingsService>;
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100,
            geospatialPreviewMaxFeatures: 5000
        }));
        close = new ReplaySubject<string | undefined>(1);
        dialog = {
            open: vi.fn().mockName("DialogService.open")
        } as unknown as MockedObject<DialogService>;
        dialog.open.mockReturnValue({ onClose: close } as unknown as DynamicDialogRef);
        const geoJsonService = {
            saveFile: vi.fn().mockName("GeoJsonService.saveFile"),
            getFileNames: vi.fn().mockName("GeoJsonService.getFileNames"),
            getFile: vi.fn().mockName("GeoJsonService.getFile")
        } as any;
        component = new GeojsonTypeComponent({ detectChanges: () => undefined } as any, geoJsonService, geoFiles, artifacts, settings, dialog);
        component.formModel = {
            getValue: () => value,
            setControlValue: (next: unknown) => value = next,
            getErrors: () => ({})
        } as any;
    });

    it('keeps geoFile while normalizing a FeatureCollection', () => {
        const link = {
            fileId: 'grid-1',
            name: 'site.kml',
            format: 'kml',
            sizeBytes: 10,
            previewSizeBytes: 10
        };
        const normalized = (component as any).normalizeGeoJSON({
            type: 'FeatureCollection',
            geoFile: link,
            features: [{
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'Point', coordinates: [1, 2] }
                }]
        });

        expect(normalized.geoFile).toBe(link);
        expect(normalized.features[0].geometry.coordinates).toEqual([1, 2]);
    });

    it('attaches the pending original when selected shapes update the value', () => {
        const link = {
            idbKey: 'geo-key',
            name: 'site.geojson',
            format: 'geojson',
            sizeBytes: 10,
            previewSizeBytes: 10
        };
        (component as any).pendingGeoFile = link;

        (component as any).setControlValue({
            type: 'FeatureCollection',
            features: []
        });

        expect(value.geoFile).toBe(link);
    });

    it('keeps the current link when a shape edit rebuilds the value', () => {
        const link = {
            idbKey: 'geo-key', name: 'site.geojson', format: 'geojson',
            sizeBytes: 10, previewSizeBytes: 10
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: link };

        (component as any).setControlValue({ type: 'Point', coordinates: [3, 4] });

        expect(value.geoFile).toBe(link);
        expect(value.coordinates).toEqual([3, 4]);
    });

    it('attaches a newly imported original instead of the previous link', () => {
        const previous = {
            idbKey: 'old-key', name: 'old.geojson', format: 'geojson',
            sizeBytes: 10, previewSizeBytes: 10
        };
        const imported = {
            idbKey: 'new-key', name: 'new.kml', format: 'kml',
            sizeBytes: 20, previewSizeBytes: 20
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: previous };
        (component as any).pendingGeoFile = imported;

        (component as any).setControlValue({ type: 'Point', coordinates: [3, 4] });

        expect(value.geoFile).toBe(imported);
    });

    it('checks the browser copy of the original file through the persistence service', async () => {
        const setOriginalFileCheck = vi.fn();
        component.formModel = {
            getValue: () => value,
            setAvailableTypes: () => undefined,
            setOriginalFileCheck
        } as any;
        geoFiles.ensurePendingFile.mockResolvedValue(true);

        component.ngOnInit();
        const check = vi.mocked(setOriginalFileCheck).mock.lastCall![0];

        expect(await check('geo-key')).toBe(true);
        expect(geoFiles.ensurePendingFile).toHaveBeenCalledWith('geo-key');
    });

    it('routes linked values to original-file download', async () => {
        value = {
            type: 'Point',
            coordinates: [1, 2],
            geoFile: {
                fileId: 'grid-1',
                name: 'site.kml',
                format: 'kml',
                sizeBytes: 10,
                previewSizeBytes: 10
            }
        };
        artifacts.getFileBlob.mockReturnValue(of(new Blob(['original'])));
        const click = vi.fn();
        const remove = vi.fn();
        const anchor = { href: '', download: '', click, remove } as any;
        vi.spyOn(document, 'createElement').mockReturnValue(anchor);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => undefined as never);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

        await component.downloadOriginal();

        expect(artifacts.getFileBlob).toHaveBeenCalledWith('grid-1');
        expect(anchor.download).toBe('site.kml');
        expect(click).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('downloads a gzip-stored original decompressed', async () => {
        value = {
            type: 'Point',
            coordinates: [1, 2],
            geoFile: {
                fileId: 'grid-1',
                name: 'site.geojson',
                format: 'geojson',
                sizeBytes: 8,
                previewSizeBytes: 8
            }
        };
        artifacts.getFileBlob.mockReturnValue(of(await gzipBlob(new Blob(['original']))));
        const anchor = {
            href: '', download: '', click: vi.fn(), remove: vi.fn()
        } as any;
        vi.spyOn(document, 'createElement').mockReturnValue(anchor);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => undefined as never);
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

        await component.downloadOriginal();

        const downloaded = vi.mocked(createObjectURL).mock.lastCall![0];
        expect(downloaded instanceof Blob ? await downloaded.text() : null).toBe('original');
        expect(anchor.download).toBe('site.geojson');
        expect(anchor.click).toHaveBeenCalled();
    });

    it('keeps legacy generated download available', () => {
        value = {
            type: 'FeatureCollection',
            features: [{ geometry: { type: 'Point', coordinates: [1, 2] } }]
        };

        expect(component.hasOriginalFile()).toBe(false);
        expect(component.canDownload()).toBe(true);
    });

    it('keeps the GeoJSON download next to the original file for a linked value', () => {
        value = {
            type: 'Point',
            coordinates: [1, 2],
            geoFile: { fileId: 'grid-1', name: 'site.kml', format: 'kml', sizeBytes: 10, previewSizeBytes: 10 }
        };

        expect(component.hasOriginalFile()).toBe(true);
        expect(component.canDownload()).toBe(true);
    });

    it('offers the GeoJSON download for a single geometry', () => {
        value = { type: 'Point', coordinates: [1, 2] };

        expect(component.canDownload()).toBe(true);
    });

    it('keeps a pending original when the selection is cleared', async () => {
        const link = {
            idbKey: 'geo-key', name: 'site.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        (component as any).pendingGeoFile = link;
        geoFiles.discard.mockResolvedValue(undefined);

        await component.clearSelectionFeatures();

        expect(geoFiles.discard).not.toHaveBeenCalled();
        expect((component as any).pendingGeoFile).toBe(link);
    });

    it('keeps a loaded browser link for the next pick when the selection is cleared', async () => {
        const loaded = {
            idbKey: 'old-key', name: 'old.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: loaded };
        geoFiles.discard.mockResolvedValue(undefined);

        await component.clearSelectionFeatures();

        expect(geoFiles.discard).not.toHaveBeenCalled();
        expect(value).toEqual({});
        expect((component as any).pendingGeoFile).toBe(loaded);
    });

    it('returns the picked shapes from the file to the candidates when the selection is cleared', async () => {
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } },
                { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [3, 4] } }
            ]
        } as any);
        component.selectAllImportedFeatures();
        component.addGeometry({ type: 'Point', coordinates: [5, 6] });

        await component.clearSelectionFeatures();

        expect(component.geometriesList.length).toBe(0);
        expect(value).toEqual({});
        expect(component.importedLocations.map(location => location.coordinates)).toEqual([[1, 2], [3, 4]]);
    });

    it('empties the value when the last shape is deleted', () => {
        const link = {
            idbKey: 'geo-key', name: 'site.geojson', format: 'geojson' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: link };
        const geometry = component.addGeometry(value);

        component.deleteGeometry(geometry.id);

        expect(component.geometriesList.length).toBe(0);
        expect(value).toEqual({});
        expect(geoFiles.discard).not.toHaveBeenCalled();
    });

    it('keeps the file link for a shape added after the last one was deleted', () => {
        const link = {
            fileId: 'grid-1', name: 'site.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: link };
        const geometry = component.addGeometry(value);

        component.deleteGeometry(geometry.id);
        component.addGeometry({ type: 'Point', coordinates: [3, 4] });
        (component as any).updateMap(true);

        expect(value.geoFile).toBe(link);
        expect(value.features[0].geometry.coordinates).toEqual([3, 4]);
    });

    it('keeps the value when a shape other than the last is deleted', () => {
        value = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } },
                { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [3, 4] } }
            ]
        };
        const first = component.addGeometry(value.features[0].geometry);
        component.addGeometry(value.features[1].geometry);

        component.deleteGeometry(first.id);

        expect(value.features.length).toBe(1);
        expect(value.features[0].geometry.coordinates).toEqual([3, 4]);
    });

    it('discards a loaded browser link and starts from an empty field when a file is imported', async () => {
        const loaded = {
            idbKey: 'old-key', name: 'old.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        const imported = {
            idbKey: 'new-key', name: 'new.kml', format: 'kml' as const,
            sizeBytes: 20, previewSizeBytes: 20
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: loaded };
        component.addGeometry(value);
        component.importedLocations = [{ id: 'candidate', type: GeoJsonType.POINT, coordinates: [5, 6] }];
        geoFiles.keepOriginal.mockResolvedValue(imported);
        geoFiles.discard.mockResolvedValue(undefined);

        await (component as any).replacePendingFile(new File(['x'], 'new.kml'), 'kml');

        expect(geoFiles.discard).toHaveBeenCalledTimes(1);

        expect(geoFiles.discard).toHaveBeenCalledWith(loaded);
        expect(value).toEqual({});
        expect(component.geometriesList.length).toBe(0);
        expect(component.importedLocations.length).toBe(0);
        expect((component as any).pendingGeoFile).toBe(imported);
    });

    it('does not discard a stored link when a file is imported', async () => {
        const stored = {
            fileId: 'grid-1', name: 'old.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        const imported = {
            idbKey: 'new-key', name: 'new.kml', format: 'kml' as const,
            sizeBytes: 20, previewSizeBytes: 20
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: stored };
        geoFiles.keepOriginal.mockResolvedValue(imported);

        await (component as any).replacePendingFile(new File(['x'], 'new.kml'), 'kml');

        expect(geoFiles.discard).not.toHaveBeenCalled();
        expect(value).toEqual({});
        expect((component as any).pendingGeoFile).toBe(imported);
    });

    it('drops the shapes picked from the previous file when a new file is imported with preview', async () => {
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        (component as any).geoJsonService.getFileNames.mockReturnValue([]);
        value = {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        };
        component.addGeometry(value.features[0].geometry);
        const point = JSON.stringify({ type: 'Point', coordinates: [3, 4] });

        await component.importFromFile(new File([point], 'next.geojson'));

        expect(geoFiles.keepOriginal).toHaveBeenCalled();
        expect(component.geometriesList.length).toBe(0);
        expect(value).toEqual({});
    });

    describe('when the original file is missing in this browser', () => {
        const content = JSON.stringify({ type: 'Point', coordinates: [3, 4] });
        const lost = {
            idbKey: 'lost-key', name: 'site.geojson', format: 'geojson' as const,
            sizeBytes: content.length, previewSizeBytes: content.length, noPreview: true,
            automaticPoint: [1, 2] as [
                number,
                number
            ], sha256: 'same-hash'
        };

        beforeEach(() => {
            value = { type: 'Point', coordinates: [1, 2], geoFile: lost };
            component.addGeometry(value);
            (component.formModel as any).getErrors = () => ({ file: ['missing'] });
        });

        it('attaches the same file again and keeps the selected shapes', async () => {
            const file = new File([content], 'site.geojson');
            geoFiles.fileHash.mockResolvedValue('same-hash');
            geoFiles.keepOriginal.mockResolvedValue({
                idbKey: 'new-key', name: 'site.geojson', format: 'geojson',
                sizeBytes: file.size, previewSizeBytes: file.size, sha256: 'same-hash'
            });

            await component.importFromFile(file);

            expect(geoFiles.keepOriginal).toHaveBeenCalledTimes(1);

            expect(geoFiles.keepOriginal).toHaveBeenCalledWith(file, 'geojson', 'same-hash');
            expect(settings.getGeospatialLimits).toHaveBeenCalled();
            expect(component.geometriesList.length).toBe(1);
            expect(value.coordinates).toEqual([1, 2]);
            expect(value.geoFile).toEqual({ ...lost, idbKey: 'new-key' });
            expect((component as any).pendingGeoFile).toEqual({ ...lost, idbKey: 'new-key' });
            expect(component.loading).toBe(false);
        });

        it('imports a different file as a new file and drops the shapes', async () => {
            vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
            (component as any).geoJsonService.getFileNames.mockReturnValue([]);
            const file = new File([content], 'other.geojson');
            geoFiles.fileHash.mockResolvedValue('other-hash');
            geoFiles.keepOriginal.mockResolvedValue({
                idbKey: 'new-key', name: 'other.geojson', format: 'geojson',
                sizeBytes: file.size, previewSizeBytes: file.size, sha256: 'other-hash'
            });
            geoFiles.discard.mockResolvedValue(undefined);

            await component.importFromFile(file);

            expect(geoFiles.keepOriginal).toHaveBeenCalledTimes(1);

            expect(geoFiles.keepOriginal).toHaveBeenCalledWith(file, 'geojson');
            expect(component.geometriesList.length).toBe(0);
            expect(value).toEqual({});
        });

        it('does not read a file of another size before the size limits are checked', async () => {
            settings.getGeospatialLimits.mockReturnValue(of({
                kmlPreviewMaxFileSizeMb: 0.00001,
                geojsonPreviewMaxFileSizeMb: 0.00001,
                geospatialMaxFileSizeMb: 0.00002,
                geospatialPreviewMaxFeatures: 5000
            }));

            const result = component.importFromFile(new File([new Uint8Array(101)], 'huge.geojson'));
            close.next('Ok');
            close.complete();
            await result;

            expect(geoFiles.fileHash).not.toHaveBeenCalled();
            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data)
                .toEqual(expect.objectContaining({ header: 'File exceeds size limit' }));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(value.geoFile).toEqual(lost);
        });

        it('keeps the restored file when the value is edited afterwards', async () => {
            const control = new UntypedFormControl(value);
            const model = new GeoForm(control);
            model.build();
            model.setOriginalFileCheck(async (key) => key === 'new-key');
            component.formModel = model;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(model.getErrors()[ORIGINAL_FILE_ERRORS_KEY]).toBeDefined();
            component.loadValue();
            geoFiles.fileHash.mockResolvedValue('same-hash');
            geoFiles.keepOriginal.mockResolvedValue({ ...lost, idbKey: 'new-key' });

            await component.importFromFile(new File([content], 'site.geojson'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(control.valid).toBe(true);

            (component as any).setControlValue({ ...control.value });
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(control.value.geoFile.idbKey).toBe('new-key');
            expect(control.valid).toBe(true);
            expect(model.getErrors()[ORIGINAL_FILE_ERRORS_KEY]).toBeUndefined();

            (component as any).setControlValue({ ...control.value, coordinates: [5, 6] });
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(control.value.coordinates).toEqual([5, 6]);
            expect(control.value.geoFile.idbKey).toBe('new-key');
            expect(control.valid).toBe(true);
        });

        it('does not hash the file when the original file is available', async () => {
            vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
            (component as any).geoJsonService.getFileNames.mockReturnValue([]);
            (component.formModel as any).getErrors = () => ({});
            geoFiles.keepOriginal.mockResolvedValue({
                idbKey: 'new-key', name: 'site.geojson', format: 'geojson',
                sizeBytes: 10, previewSizeBytes: 10, sha256: 'same-hash'
            });
            geoFiles.discard.mockResolvedValue(undefined);

            await component.importFromFile(new File([JSON.stringify({ type: 'Point', coordinates: [3, 4] })], 'site.geojson'));

            expect(geoFiles.fileHash).not.toHaveBeenCalled();
            expect(component.geometriesList.length).toBe(0);
        });
    });

    it('uses the default limits when limits cannot be loaded', async () => {
        settings.getGeospatialLimits.mockReturnValue(throwError(() => new Error('offline')));
        const result = component.importFromFile(new File([new Uint8Array(6 * 1024 * 1024)], 'site.geojson'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(component.importError).toBe('');
        expect(JSON.stringify(vi.mocked(dialog.open).mock.lastCall![1]?.data))
            .toContain('which exceeds the 5 MB limit for in-browser rendering');
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('uses the plain size wording in the KML preview warning', async () => {
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['<kml></kml>'], 'site.kml'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(JSON.stringify(vi.mocked(dialog.open).mock.lastCall![1]?.data))
            .toContain('"texts":["This file\'s size is ');
    });

    it('opens the shared confirm dialog and treats its close icon as Cancel', async () => {
        const result = component.importFromFile(new File([new Uint8Array(6 * 1024 * 1024)], 'site.geojson'));
        close.next(undefined);
        close.complete();
        await result;
        const [dialogComponent, config] = vi.mocked(dialog.open).mock.lastCall!;
        expect(dialogComponent).toBe(CustomConfirmDialogComponent);
        expect(config?.showHeader).toBe(false);
        expect(config?.data).toEqual(expect.objectContaining({
            header: 'File too large to preview',
            buttons: [
                { name: 'Cancel', class: 'secondary' },
                { name: 'Upload without preview', class: 'primary' }
            ]
        }));
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('offers only Ok in the shared dialog above the maximum', async () => {
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 0.00001,
            geospatialMaxFileSizeMb: 0.00002,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File([new Uint8Array(101)], 'site.geojson'));
        close.next('Ok');
        close.complete();
        await result;
        const config = vi.mocked(dialog.open).mock.lastCall![1];
        expect(config?.data).toEqual(expect.objectContaining({
            header: 'File exceeds size limit',
            buttons: [{ name: 'Ok', class: 'primary' }]
        }));
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    describe('in a field that allows only Polygon', () => {
        const line = JSON.stringify({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] } }]
        });
        const mixed = JSON.stringify({
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] } },
                { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[5, 6], [7, 8], [9, 10], [5, 6]]] } }
            ]
        });
        const message = 'No shapes of an allowed type were found in this file. Allowed shapes: Polygon.';
        const cannotImport = {
            header: 'File cannot be imported',
            texts: [message],
            buttons: [{ name: 'Ok', class: 'primary' }]
        };
        const noPreviewLimits = {
            kmlPreviewMaxFileSizeMb: 0.000001,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        };
        let oldValue: any;

        beforeEach(() => {
            component.availableOptions = ['Polygon'];
            (component as any).applyAvailableOptionsFilter();
            vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
            vi.spyOn(component as any, 'centerMap').mockImplementation(() => undefined);
            oldValue = { type: 'Point', coordinates: [1, 2] };
            value = oldValue;
        });

        it('still imports a previewable file with a shape the field does not allow', async () => {
            (component as any).geoJsonService.getFileNames.mockReturnValue([]);

            await component.importFromFile(new File([mixed], 'site.geojson'));

            expect(component.importError).toBe('');
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('refuses a previewable file that has no allowed shape', async () => {
            const result = component.importFromFile(new File([line], 'site.geojson'));
            close.next('Ok');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('refuses a previewable file whose allowed shape has empty coordinates', async () => {
            const emptyPolygon = JSON.stringify({
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } }]
            });
            const result = component.importFromFile(new File([emptyPolygon], 'site.geojson'));
            close.next('Ok');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });

        it('refuses a previewable KMZ that has no allowed shape', async () => {
            const entry = {
                name: 'doc.kml', flags: 0, compressionMethod: 0,
                compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
            };
            vi.spyOn((component as any).kmzReader, 'inspect').mockResolvedValue({ entry, previewSizeBytes: 20 });
            vi.spyOn((component as any).kmzReader, 'readText').mockResolvedValue('<kml><Placemark><LineString><coordinates>1,2 3,4</coordinates></LineString></Placemark></kml>');

            const result = component.importFromFile(new File(['zip'], 'site.kmz'));
            close.next('Ok');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('offers the first allowed shape of a mixed file without preview as its point', async () => {
            settings.getGeospatialLimits.mockReturnValue(of(noPreviewLimits));
            const file = new File([mixed], 'site.geojson');
            geoFiles.keepOriginal.mockResolvedValue({
                idbKey: 'new', name: file.name, format: 'geojson',
                sizeBytes: file.size, previewSizeBytes: file.size
            });
            const result = component.importFromFile(file);
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(component.importError).toBe('');
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
            expect((component as any).pendingGeoFile.automaticPoint).toEqual([5, 6]);
            expect(component.importedLocations.map(location => location.coordinates)).toEqual([[5, 6]]);
        });

        it('refuses a file without preview that has no allowed shape', async () => {
            settings.getGeospatialLimits.mockReturnValue(of(noPreviewLimits));
            const result = component.importFromFile(new File([line], 'site.geojson'));
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.calls.length).toBe(2);
            expect(vi.mocked(dialog.open).mock.calls[0][1]?.data)
                .toEqual(expect.objectContaining({ header: 'File too large to preview' }));
            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(cannotImport);
            expect(vi.mocked(dialog.open).mock.calls.every(([, config]) => config?.duplicate === true)).toBe(true);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('refuses a KMZ without preview that has no allowed shape', async () => {
            settings.getGeospatialLimits.mockReturnValue(of(noPreviewLimits));
            const entry = {
                name: 'doc.kml', flags: 0, compressionMethod: 0,
                compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
            };
            vi.spyOn((component as any).kmzReader, 'inspect').mockResolvedValue({ entry, previewSizeBytes: 20 });
            vi.spyOn((component as any).kmzReader, 'readCoordinate').mockImplementation(async (_file: unknown, _entry: unknown, scanner: any) => {
                scanner.write('<kml><Placemark><LineString><coordinates>1,2 3,4</coordinates></LineString></Placemark></kml>');
                scanner.finish();
                return scanner.coordinate;
            });
            const result = component.importFromFile(new File(['zip'], 'site.kmz'));
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.calls.length).toBe(2);
            expect(vi.mocked(dialog.open).mock.calls[0][1]?.data)
                .toEqual(expect.objectContaining({ header: 'File too large to preview' }));
            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
    });

    it('rejects above maximum without storing', async () => {
        const file = new File([new Uint8Array(101)], 'site.kml');
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 1,
            geospatialMaxFileSizeMb: 0.00002,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(file);
        close.next('Ok');
        close.complete();
        await result;
        expect(dialog.open).toHaveBeenCalled();
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('leaves old state unchanged on warning cancel', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        const oldLink = { idbKey: 'old', name: 'old.kml', format: 'kml', sizeBytes: 3, previewSizeBytes: 3 };
        value = oldValue;
        (component as any).pendingGeoFile = oldLink;
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 1,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['<kml></kml>'], 'new.kml'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(value).toBe(oldValue);
        expect((component as any).pendingGeoFile).toBe(oldLink);
        expect(geoFiles.discard).not.toHaveBeenCalled();
    });

    it('offers the file point as a candidate after accepting large GeoJSON and adds it on request', async () => {
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        const file = new File([JSON.stringify({ type: 'Point', coordinates: [12, 34] })], 'site.geojson');
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        geoFiles.keepOriginal.mockResolvedValue({
            idbKey: 'new', name: file.name, format: 'geojson',
            sizeBytes: file.size, previewSizeBytes: file.size
        });
        const result = component.importFromFile(file);
        close.next('Upload without preview');
        close.complete();
        await result;
        expect(value).toEqual({});
        expect(component.geometriesList.length).toBe(0);
        expect(component.importedLocations.map(location => location.coordinates)).toEqual([[12, 34]]);
        expect(component.isPreviewUnavailable()).toBe(true);

        component.selectAllImportedFeatures();

        expect(value.type).toBe('FeatureCollection');
        expect(value.features.map((feature: any) => feature.geometry)).toEqual([{ type: 'Point', coordinates: [12, 34] }]);
        expect(value.geoFile.noPreview).toBe(true);
        expect(value.geoFile.automaticPoint).toEqual([12, 34]);
        expect(component.importedLocations.length).toBe(0);
    });

    it('keeps the map path active for a no-preview value', () => {
        value = {
            type: 'Point',
            coordinates: [1, 2],
            geoFile: {
                fileId: 'grid-1', name: 'large.kml', format: 'kml',
                sizeBytes: 20, previewSizeBytes: 20, noPreview: true,
                automaticPoint: [1, 2]
            }
        };
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        vi.spyOn(component as any, 'centerMap').mockImplementation(() => undefined);

        component.ngAfterViewInit();

        expect((component as any).setupMap).toHaveBeenCalled();
        expect(component.geometriesList.length).toBe(1);
    });

    it('zooms the dialog map to the imported shapes', () => {
        const view = {
            fit: vi.fn().mockName("View.fit"),
            animate: vi.fn().mockName("View.animate")
        };
        (component as any).dialogMap = { getView: () => view, updateSize: () => undefined };
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [36, -1] } }]
        } as any);

        (component as any).fitDialogMap();

        expect(view.fit).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ maxZoom: 12 }));
        expect(view.animate).not.toHaveBeenCalled();
    });

    it('fits the map to the selected shapes after the value is reloaded, without the zoom 6 jump', () => {
        vi.useFakeTimers();
        const view = {
            fit: vi.fn().mockName("View.fit"),
            animate: vi.fn().mockName("View.animate")
        };
        vi.spyOn(component as any, 'initMap').mockImplementation(() => (component as any).map = { getView: () => view });
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{
                    type: 'Feature', properties: {}, geometry: {
                        type: 'Polygon', coordinates: [[[36, -1], [36.02, -1], [36.02, -0.98], [36, -1]]]
                    }
                }]
        } as any);
        component.selectAllImportedFeatures();
        vi.advanceTimersByTime(1000);
        view.fit.mockClear();
        view.animate.mockClear();

        component.loadValue();
        vi.advanceTimersByTime(1000);
        vi.useRealTimers();

        expect(component.importedLocations.length).toBe(0);
        expect(view.fit).toHaveBeenCalledTimes(1);
        expect(view.fit).toHaveBeenCalledWith((component as any).geoShapesSource.getExtent(), expect.objectContaining({ maxZoom: 12 }));
        expect(view.animate).not.toHaveBeenCalled();
    });

    it('shows the loader while Include all runs and hides it afterwards', () => {
        vi.useFakeTimers();
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        } as any);

        component.includeAllImportedFeatures();

        expect(component.loading).toBe(true);
        expect(component.geometriesList.length).toBe(0);

        vi.advanceTimersByTime(0);
        vi.useRealTimers();

        expect(component.geometriesList.length).toBe(1);
        expect(component.loading).toBe(false);
    });

    it('shows the loader while a clicked file shape is added and hides it afterwards', () => {
        vi.useFakeTimers();
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        } as any);
        const id = component.importedLocations[0].id;

        (component as any).selectFeature({ ol_uid: '1', getId: () => id });

        expect(component.loading).toBe(true);
        expect(component.geometriesList.length).toBe(0);

        vi.advanceTimersByTime(0);
        vi.useRealTimers();

        expect(component.geometriesList.length).toBe(1);
        expect(component.importedLocations.length).toBe(0);
        expect(component.loading).toBe(false);
    });

    it('returns a deleted shape from the file to the candidates', () => {
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        } as any);
        component.selectAllImportedFeatures();
        expect(component.importedLocations.length).toBe(0);

        component.deleteGeometry(component.geometriesList[0].id);

        expect(component.geometriesList.length).toBe(0);
        expect(component.importedLocations.map(location => location.coordinates)).toEqual([[1, 2]]);
    });

    it('deletes and clears a no-preview shape like any other shape, keeping the file', async () => {
        const link = {
            idbKey: 'new', name: 'large.kml', format: 'kml' as const,
            sizeBytes: 20, previewSizeBytes: 20, noPreview: true,
            automaticPoint: [1, 2] as [
                number,
                number
            ]
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: link };
        const geometry = component.addGeometry(value);

        component.deleteGeometry(geometry.id);

        expect(value).toEqual({});
        expect((component as any).pendingGeoFile).toBe(link);
        expect(geoFiles.discard).not.toHaveBeenCalled();

        await component.clearSelectionFeatures();

        expect(geoFiles.discard).not.toHaveBeenCalled();
        expect((component as any).pendingGeoFile).toBe(link);
    });

    it('keeps old value when no coordinate exists', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['{"type":"FeatureCollection","features":[]}'], 'site.geojson'));
        close.next('Upload without preview');
        close.complete();
        await result;
        expect(value).toBe(oldValue);
        expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual({
            header: 'File cannot be imported',
            texts: ['No coordinates were found in this file, so it cannot be imported. Please check the file and try again.'],
            buttons: [{ name: 'Ok', class: 'primary' }]
        });
        expect(component.importError).toBe('');
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
    });

    describe('above the shape limit', () => {
        const shapeLimits = {
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100,
            geospatialPreviewMaxFeatures: 2
        };
        const points = (count: number) => JSON.stringify({
            type: 'FeatureCollection',
            features: Array.from({ length: count }, (_, i) => ({
                type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [i + 1, 2] }
            }))
        });

        beforeEach(() => {
            settings.getGeospatialLimits.mockReturnValue(of(shapeLimits));
            vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        });

        it('warns with the shape count and keeps nothing on Cancel', async () => {
            const result = component.importFromFile(new File([points(3)], 'site.geojson'));
            close.next('Cancel');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({
                header: 'File too large to preview',
                texts: [expect.stringContaining('This file has 3 shapes, which exceeds the 2-shape limit for in-browser rendering.')]
            }));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('offers the first point as a candidate after Upload without preview', async () => {
            const file = new File([points(3)], 'site.geojson');
            geoFiles.keepOriginal.mockResolvedValue({
                idbKey: 'new', name: file.name, format: 'geojson',
                sizeBytes: file.size, previewSizeBytes: file.size
            });
            const result = component.importFromFile(file);
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(value).toEqual({});
            expect((component as any).pendingGeoFile.noPreview).toBe(true);
            expect(component.importedLocations.map(location => location.coordinates)).toEqual([[1, 2]]);
        });

        it('previews a file at the shape limit without a warning', async () => {
            (component as any).geoJsonService.getFileNames.mockReturnValue([]);

            await component.importFromFile(new File([points(2)], 'site.geojson'));

            expect(dialog.open).not.toHaveBeenCalled();
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
        });

        it('applies the shape limit to a KMZ with preview', async () => {
            const entry = {
                name: 'doc.kml', flags: 0, compressionMethod: 0,
                compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
            };
            vi.spyOn((component as any).kmzReader, 'inspect').mockResolvedValue({ entry, previewSizeBytes: 20 });
            vi.spyOn((component as any).kmzReader, 'readText').mockResolvedValue('<kml><Document>' +
                ['1,2', '3,4', '5,6'].map(c => `<Placemark><Point><coordinates>${c}</coordinates></Point></Placemark>`).join('') +
                '</Document></kml>');
            const result = component.importFromFile(new File(['zip'], 'site.kmz'));
            close.next('Cancel');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data)
                .toEqual(expect.objectContaining({ texts: [expect.stringContaining('This file has 3 shapes')] }));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
    });

    describe('above the point limit', () => {
        const polygon = (count: number) => JSON.stringify({
            type: 'FeatureCollection',
            features: [{
                    type: 'Feature', properties: {}, geometry: {
                        type: 'Polygon',
                        coordinates: [[
                                ...Array.from({ length: count - 1 }, (_, i) => [36 + Math.cos(i) / 100, -1 + Math.sin(i) / 100]),
                                [36.01, -1]
                            ]]
                    }
                }, {
                    type: 'Feature', properties: {}, geometry: {
                        type: 'GeometryCollection',
                        geometries: [{ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] }]
                    }
                }]
        });

        beforeEach(() => {
            settings.getGeospatialLimits.mockReturnValue(of({
                kmlPreviewMaxFileSizeMb: 10,
                geojsonPreviewMaxFileSizeMb: 5,
                geospatialMaxFileSizeMb: 100,
                geospatialPreviewMaxFeatures: 5000,
                geospatialPreviewMaxPoints: 5
            }));
            vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        });

        it('warns with the point count and keeps nothing on Cancel', async () => {
            const result = component.importFromFile(new File([polygon(6)], 'site.geojson'));
            close.next('Cancel');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({
                header: 'File too large to preview',
                texts: [expect.stringContaining('This file has 6 points, which exceeds the 5-point limit for in-browser rendering.')]
            }));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('previews a file at the point limit without a warning, not counting GeometryCollection', async () => {
            (component as any).geoJsonService.getFileNames.mockReturnValue([]);

            await component.importFromFile(new File([polygon(5)], 'site.geojson'));

            expect(dialog.open).not.toHaveBeenCalled();
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
        });

        it('uses the 20,000-point default when the server does not send the point limit', async () => {
            settings.getGeospatialLimits.mockReturnValue(of({
                kmlPreviewMaxFileSizeMb: 10,
                geojsonPreviewMaxFileSizeMb: 5,
                geospatialMaxFileSizeMb: 100,
                geospatialPreviewMaxFeatures: 5000
            }));
            const result = component.importFromFile(new File([polygon(20001)], 'site.geojson'));
            close.next('Cancel');
            close.complete();
            await result;

            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({
                texts: [expect.stringContaining('This file has 20,001 points, which exceeds the 20,000-point limit')]
            }));
        });
    });

    it('shows the size warning before reading a large file and does not read it on Cancel', async () => {
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['{}'], 'site.geojson'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(vi.mocked(dialog.open).mock.calls.length).toBe(1);
        expect(vi.mocked(dialog.open).mock.lastCall![1]?.data)
            .toEqual(expect.objectContaining({ header: 'File too large to preview' }));
        expect(component.loading).toBe(false);
    });

    it('refuses a small file whose only geometry has empty coordinates', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        const result = component.importFromFile(new File([JSON.stringify({ type: 'Point', coordinates: [] })], 'site.geojson'));
        close.next('Ok');
        close.complete();
        await result;
        expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({
            header: 'File cannot be imported',
            buttons: [{ name: 'Ok', class: 'primary' }]
        }));
        expect(value).toBe(oldValue);
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        expect(component.importError).toBe('');
    });

    it('refuses a small file without coordinates in the same dialog', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        const empty = JSON.stringify({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: null }]
        });
        const result = component.importFromFile(new File([empty], 'site.geojson'));
        close.next('Ok');
        close.complete();
        await result;
        expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({
            header: 'File cannot be imported',
            buttons: [{ name: 'Ok', class: 'primary' }]
        }));
        expect(value).toBe(oldValue);
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
    });

    it('checks the KMZ archive maximum before inspect', async () => {
        const inspect = vi.spyOn((component as any).kmzReader, 'inspect').mockImplementation(() => undefined);
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 0.00001,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File([new Uint8Array(100)], 'site.kmz'));
        close.next('Ok');
        close.complete();
        await result;
        expect(inspect).not.toHaveBeenCalled();
    });

    it('uses uncompressed KML size for the preview warning', async () => {
        const file = new File(['zip'], 'site.kmz');
        const entry = {
            name: 'doc.kml', flags: 0, compressionMethod: 0,
            compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
        };
        vi.spyOn((component as any).kmzReader, 'inspect').mockResolvedValue({
            entry, previewSizeBytes: 20
        });
        const coordinate = vi.spyOn(component['kmzReader'], 'readCoordinate').mockImplementation(async (_file, _entry, scanner) => {
            scanner.write('<kml><Placemark><Point><coordinates>12,34</coordinates></Point></Placemark></kml>');
            scanner.finish();
            return scanner.coordinate;
        });
        settings.getGeospatialLimits.mockReturnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        geoFiles.keepOriginal.mockResolvedValue({
            idbKey: 'new', name: file.name, format: 'kmz',
            sizeBytes: file.size, previewSizeBytes: file.size
        });
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
        const result = component.importFromFile(file);
        close.next('Upload without preview');
        close.complete();
        await result;
        const link = (component as any).pendingGeoFile;
        expect(coordinate).toHaveBeenCalled();
        expect(link.format).toBe('kmz');
        expect(link.previewSizeBytes).toBe(20);
        expect(link.noPreview).toBe(true);
        expect(link.automaticPoint).toEqual([12, 34]);
        expect(value).toEqual({});
        expect(component.importedLocations.map(location => location.coordinates)).toEqual([[12, 34]]);
    });

    it('keeps old value when the KMZ reader rejects the archive', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        vi.spyOn((component as any).kmzReader, 'inspect').mockRejectedValue(new Error('The KMZ central directory is missing.'));
        const result = component.importFromFile(new File(['bad'], 'site.kmz'));
        close.next('Go Back');
        close.complete();
        await result;
        expect(value).toBe(oldValue);
        expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({ header: 'Unsupported file format' }));
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('does not store a deflated KMZ when browser support is absent', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        const entry = {
            name: 'doc.kml', flags: 0, compressionMethod: 8,
            compressedSize: 3, uncompressedSize: 3, localHeaderOffset: 0
        };
        vi.spyOn((component as any).kmzReader, 'inspect').mockResolvedValue({ entry, previewSizeBytes: 3 });
        vi.spyOn((component as any).kmzReader, 'readText').mockRejectedValue(new KmzBrowserSupportError());
        await component.importFromFile(new File(['zip'], 'site.kmz'));
        expect(value).toBe(oldValue);
        expect(component.importError).toBe('This browser cannot open KMZ files.');
        expect(dialog.open).not.toHaveBeenCalled();
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });
    describe('complete file checks and ticket dialogs', () => {
        const invalidDialog = (reason: string) => ({
            header: 'Unsupported file format',
            texts: ["This file couldn't be read. Please upload a valid GeoJSON (RFC 7946) or KML file.", reason],
            buttons: [{ name: 'Go Back', class: 'primary' }]
        });
        const linksDialog = {
            header: "Linked content won't be imported",
            texts: ['This file contains NetworkLink features that reference external content and will not be imported. The rest of the file will be used as normal.'],
            buttons: [{ name: 'Cancel', class: 'secondary' }, { name: 'Continue without links', class: 'primary' }]
        };
        const linked = '<kml><Placemark><Point><coordinates>1,2</coordinates></Point></Placemark><NetworkLink><Region><LatLonAltBox><north>2</north><south>0</south><east>2</east><west>0</west></LatLonAltBox></Region></NetworkLink></kml>';
        let answers: string[];
        let oldValue: unknown;
        beforeEach(() => {
            answers = [];
            oldValue = { type: 'Point', coordinates: [9, 9] };
            value = oldValue;
            dialog.open.mockImplementation(() => {
                const reference = new DynamicDialogRef();
                queueMicrotask(() => reference.close(answers.shift()));
                return reference;
            });
            geoFiles.keepOriginal.mockImplementation(async (file, format) => ({
                idbKey: 'new-key', name: file.name, format, sizeBytes: file.size, previewSizeBytes: file.size
            }));
            geoFiles.discard.mockResolvedValue(undefined);
            vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
            vi.spyOn(component as any, 'centerMap').mockImplementation(() => undefined);
            component['geoJsonService'].getFileNames = () => new Map<string, string>();
        });
        for (const large of [false, true]) {
            it(`rejects an invalid ${large ? 'large' : 'small'} GeoJSON with the ticket copy`, async () => {
                if (large)
                    settings.getGeospatialLimits.mockReturnValue(of({
                        kmlPreviewMaxFileSizeMb: 0, geojsonPreviewMaxFileSizeMb: 0,
                        geospatialMaxFileSizeMb: 100, geospatialPreviewMaxFeatures: 1500
                    }));
                answers.push(...(large ? ['Upload without preview', 'Go Back'] : ['Go Back']));
                await component.importFromFile(new File(['{"type":"Point","coordinates":[200,2]}'], 'invalid.geojson'));
                expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(invalidDialog('Coordinates at $.coordinates must use WGS 84 longitude and latitude.'));
                expect(vi.mocked(dialog.open).mock.calls.length).toBe(large ? 2 : 1);
                expect(value).toBe(oldValue);
                expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            });
        }
        it('shows the shared missing-properties reason for a GeoJSON Feature', async () => {
            answers.push('Go Back');
            await component.importFromFile(new File(['{"type":"Feature","geometry":{"type":"Point","coordinates":[1,2]}}'], 'feature.geojson'));
            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(invalidDialog('Properties must be an object or null at $.properties.'));
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
        for (const reason of [
            'The KMZ central directory is missing.',
            'The KMZ central directory is invalid.',
            'Multi-disk KMZ files are not supported.',
            'The KMZ file does not contain a root KML file.',
            'Encrypted KMZ entries are not supported.',
            'The KMZ compression method is not supported.'
        ]) {
            it(`shows the archive inspection reason: ${reason}`, async () => {
                vi.spyOn(component['kmzReader'], 'inspect').mockRejectedValue(reason === 'The KMZ file does not contain a root KML file.' ? new KmzRootEntryError() : new Error(reason));
                answers.push('Go Back');
                await component.importFromFile(new File(['bad'], 'invalid.kmz'));
                expect(vi.mocked(dialog.open).mock.calls.length).toBe(1);
                expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(invalidDialog(reason));
                expect(value).toBe(oldValue);
                expect(component.importError).toBe('');
                expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            });
        }
        for (const reason of ['The uncompressed KML size is invalid.', 'The KMZ local header is truncated.',
            'The KMZ local header is invalid.', 'The KMZ local header does not match its directory entry.', 'The KMZ entry range is invalid.',
            'This browser cannot open KMZ files.'])
            for (const large of [false, true]) {
                it(`shows ${reason} with ${large ? 'no preview' : 'preview'}`, async () => {
                    if (large)
                        settings.getGeospatialLimits.mockReturnValue(of({
                            kmlPreviewMaxFileSizeMb: 0, geojsonPreviewMaxFileSizeMb: 5,
                            geospatialMaxFileSizeMb: 100, geospatialPreviewMaxFeatures: 1500
                        }));
                    vi.spyOn(component['kmzReader'], 'inspect').mockResolvedValue({
                        entry: { name: 'doc.kml', flags: 0, compressionMethod: 0, compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0 }, previewSizeBytes: 20
                    });
                    const error = reason === 'This browser cannot open KMZ files.' ? new KmzBrowserSupportError() : new Error(reason);
                    if (large)
                        vi.spyOn(component['kmzReader'], 'readCoordinate').mockRejectedValue(error);
                    else
                        vi.spyOn(component['kmzReader'], 'readText').mockRejectedValue(error);
                    answers.push(...(large ? ['Upload without preview', 'Go Back'] : ['Go Back']));
                    await component.importFromFile(new File(['zip'], 'invalid.kmz'));
                    if (reason === 'This browser cannot open KMZ files.') {
                        expect(component.importError).toBe(reason);
                        expect(vi.mocked(dialog.open).mock.calls.length).toBe(large ? 1 : 0);
                    }
                    else {
                        expect(vi.mocked(dialog.open).mock.calls.length).toBe(large ? 2 : 1);
                        expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(invalidDialog(reason));
                    }
                    expect(value).toBe(oldValue);
                    expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
                });
            }
        for (const archive of [false, true]) {
            for (const proceed of [false, true]) {
                it(`${proceed ? 'continues' : 'cancels'} the ${archive ? 'KMZ' : 'KML'} link warning`, async () => {
                    if (archive) {
                        vi.spyOn(component['kmzReader'], 'inspect').mockResolvedValue({
                            entry: { name: 'doc.kml', flags: 0, compressionMethod: 0, compressedSize: linked.length, uncompressedSize: linked.length, localHeaderOffset: 0 }, previewSizeBytes: linked.length
                        });
                        vi.spyOn(component['kmzReader'], 'readText').mockResolvedValue(linked);
                    }
                    answers.push(proceed ? 'Continue without links' : 'Cancel');
                    await component.importFromFile(new File([linked], archive ? 'linked.kmz' : 'linked.kml'));
                    expect(vi.mocked(dialog.open).mock.calls.length).toBe(1);
                    expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(linksDialog);
                    if (proceed) {
                        expect(geoFiles.keepOriginal).toHaveBeenCalled();
                        expect(component['pendingGeoFile']).toBeTruthy();
                        expect(component['geoJsonService'].saveFile).toHaveBeenCalledWith(archive ? 'linked.kmz' : 'linked.kml', expect.objectContaining({ features: expect.arrayContaining([
                                expect.objectContaining({ geometry: expect.objectContaining({ type: 'Polygon' }) })
                            ]) }));
                    }
                    else {
                        expect(value).toBe(oldValue);
                        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
                    }
                });
            }
            it(`rejects broken ${archive ? 'KMZ' : 'KML'} before warning about links`, async () => {
                const broken = '<kml><NetworkLink/><Point></kml>';
                if (archive) {
                    vi.spyOn(component['kmzReader'], 'inspect').mockResolvedValue({
                        entry: { name: 'doc.kml', flags: 0, compressionMethod: 0, compressedSize: broken.length, uncompressedSize: broken.length, localHeaderOffset: 0 }, previewSizeBytes: broken.length
                    });
                    vi.spyOn(component['kmzReader'], 'readText').mockResolvedValue(broken);
                }
                answers.push('Go Back');
                await component.importFromFile(new File([broken], archive ? 'broken.kmz' : 'broken.kml'));
                expect(vi.mocked(dialog.open).mock.calls.length).toBe(1);
                expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(invalidDialog('The KML markup is not well-formed.'));
                expect(value).toBe(oldValue);
            });
        }
        it('shows no-shapes before links when a KML holds only a link without a Region', async () => {
            answers.push('Ok');
            await component.importFromFile(new File(['<kml><NetworkLink/></kml>'], 'empty.kml'));
            expect(vi.mocked(dialog.open).mock.calls.length).toBe(1);
            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(expect.objectContaining({ header: 'File cannot be imported' }));
            expect(value).toBe(oldValue);
        });
        it('shows the shape-limit warning before links and reads links after the first coordinate', async () => {
            settings.getGeospatialLimits.mockReturnValue(of({
                kmlPreviewMaxFileSizeMb: 10, geojsonPreviewMaxFileSizeMb: 5,
                geospatialMaxFileSizeMb: 100, geospatialPreviewMaxFeatures: 1
            }));
            answers.push('Upload without preview', 'Continue without links');
            await component.importFromFile(new File([linked], 'linked.kml'));
            expect(vi.mocked(dialog.open).mock.calls.length).toBe(2);
            expect(vi.mocked(dialog.open).mock.calls[0][1]?.data).toEqual(expect.objectContaining({ header: 'File too large to preview' }));
            expect(vi.mocked(dialog.open).mock.calls[1][1]?.data).toEqual(linksDialog);
            expect(component['pendingGeoFile']?.noPreview).toBe(true);
            expect(component['pendingGeoFile']?.automaticPoint).toEqual([1, 2]);
        });
        it('checks invalid trailing content after the first no-preview coordinate', async () => {
            settings.getGeospatialLimits.mockReturnValue(of({
                kmlPreviewMaxFileSizeMb: 0, geojsonPreviewMaxFileSizeMb: 0, geospatialMaxFileSizeMb: 100, geospatialPreviewMaxFeatures: 1500
            }));
            answers.push('Upload without preview', 'Go Back');
            await component.importFromFile(new File(['{"type":"Point","coordinates":[1,2]}' + ' '.repeat(1024 * 1024) + 'bad'], 'tail.geojson'));
            expect(vi.mocked(dialog.open).mock.lastCall![1]?.data).toEqual(invalidDialog('The file is not valid JSON.'));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
    });
});

describe('GeojsonTypeComponent loading state', () => {
    let fixture: ComponentFixture<GeojsonTypeComponent>;
    let component: GeojsonTypeComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [GeojsonTypeComponent],
            imports: [FormsModule],
            providers: [
                { provide: GeoJsonService, useValue: {} },
                { provide: GeoFilePersistenceService, useValue: {} },
                { provide: ArtifactService, useValue: {} },
                { provide: SettingsService, useValue: { getGeospatialLimits: () => of({}) } },
                { provide: DialogService, useValue: {} }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(GeojsonTypeComponent);
        component = fixture.componentInstance;
        component.formModel = {
            getValue: () => ({}),
            getErrors: () => ({}),
            setAvailableTypes: () => undefined,
            setOriginalFileCheck: () => undefined
        } as any;
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
    });

    it('renders a status while a no-preview file is read', () => {
        component.loading = true;

        fixture.detectChanges();

        const status = fixture.nativeElement.querySelector('.geo-file-loading');
        expect(status).not.toBeNull();
        expect(status.querySelector('.preloader-image')).not.toBeNull();
    });

    it('tells the user the map does not show the full file', () => {
        component.formModel = {
            getValue: () => ({
                type: 'Point',
                coordinates: [1, 2],
                geoFile: {
                    fileId: 'grid-1', name: 'large.kml', format: 'kml',
                    sizeBytes: 20, previewSizeBytes: 20, noPreview: true, automaticPoint: [1, 2]
                }
            }),
            getErrors: () => ({}),
            setControlValue: () => undefined,
            setAvailableTypes: () => undefined,
            setOriginalFileCheck: () => undefined
        } as any;
        component.isDisabled = true;
        vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);

        fixture.detectChanges(false);

        const notice = fixture.nativeElement.querySelector('.geo-preview-unavailable');
        expect(notice.textContent).toContain('Preview unavailable: this file is too large to show on the map. Download it to view.');
    });

    it('labels the candidate button Add file point and offers no original file while the form is edited', () => {
        (component as any).pendingGeoFile = {
            idbKey: 'new', name: 'large.kml', format: 'kml',
            sizeBytes: 20, previewSizeBytes: 20, noPreview: true, automaticPoint: [1, 2]
        };
        component.importedLocations = [{ id: 'point', type: GeoJsonType.POINT, coordinates: [1, 2] }];
        component.dialogVisible = true;
        vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);

        fixture.detectChanges(false);

        const notice = fixture.nativeElement.querySelector('.geo-preview-unavailable');
        const controls = Array.from(fixture.nativeElement.querySelectorAll('.geo-file-head button'))
            .map((button: any) => button.textContent.trim());
        expect(notice.textContent).toContain('Preview unavailable: this file is too large to show on the map. The map shows the first point from the file and/or the shapes you added.');
        expect(notice.textContent).not.toContain('Download it to view.');
        expect(notice.querySelectorAll('button').length).toBe(0);
        expect(controls).toContain('Add file point');
        expect(controls).not.toContain('Select all');
    });

    it('keeps the same notice after the file point is added', () => {
        component.formModel = {
            getValue: () => ({
                type: 'Point',
                coordinates: [1, 2],
                geoFile: {
                    idbKey: 'new', name: 'large.kml', format: 'kml',
                    sizeBytes: 20, previewSizeBytes: 20, noPreview: true, automaticPoint: [1, 2]
                }
            }),
            getErrors: () => ({}),
            setControlValue: () => undefined,
            setAvailableTypes: () => undefined,
            setOriginalFileCheck: () => undefined
        } as any;
        component.importedLocations = [];
        vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);

        fixture.detectChanges(false);

        const notice = fixture.nativeElement.querySelector('.geo-preview-unavailable');
        expect(notice.textContent).toContain('Preview unavailable: this file is too large to show on the map. The map shows the first point from the file and/or the shapes you added.');
        expect(notice.textContent).not.toContain('marked point');
    });

    it('shows a missing original file once at the top of the field, not under a row', () => {
        const message = 'The original file is not available in this browser. Import it again.';
        component.formModel = {
            getValue: () => ({ type: 'Point', coordinates: [1, 2] }),
            getErrors: () => ({ file: [message] }),
            setControlValue: () => undefined,
            setAvailableTypes: () => undefined,
            setOriginalFileCheck: () => undefined
        } as any;
        vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);

        fixture.detectChanges(false);

        const errors = Array.from(fixture.nativeElement.querySelectorAll('.p-error'))
            .map((element: any) => element.textContent.trim());
        expect(errors).toEqual([message]);
        expect(fixture.nativeElement.firstElementChild.textContent.trim()).toBe(message);
        expect(component.getErrorsByIndex(0)).toEqual([]);
        expect(component.getAllErrors()).toEqual([]);
        expect(component.haveErrors()).toBe(true);
    });

    describe('with an empty value', () => {
        beforeEach(() => {
            component.formModel = {
                getValue: () => ({}),
                getErrors: () => ({ 0: ['A GeoJSON object is required'] }),
                setControlValue: () => undefined,
                setAvailableTypes: () => undefined,
                setOriginalFileCheck: () => undefined
            } as any;
            vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);
        });

        it('asks to pick a shape at the top of the field after a file is imported', () => {
            (component as any).pendingGeoFile = {
                idbKey: 'new', name: 'site.geojson', format: 'geojson', sizeBytes: 10, previewSizeBytes: 10
            };

            fixture.detectChanges(false);

            const errors = Array.from(fixture.nativeElement.querySelectorAll('.p-error'))
                .map((element: any) => element.textContent.trim());
            expect(errors).toEqual(['Select at least one shape from the file, or draw your own.']);
            expect(fixture.nativeElement.firstElementChild.textContent.trim())
                .toBe('Select at least one shape from the file, or draw your own.');
            expect(component.haveErrors()).toBe(true);
        });

        it('offers to add a geometry and no Edit or Clear for an empty value', () => {
            fixture.detectChanges(false);

            const labels = Array.from(fixture.nativeElement.querySelectorAll('button[label]'))
                .map((button: any) => button.getAttribute('label'));
            expect(labels).toEqual(['Add geometry']);
            expect(fixture.nativeElement.querySelector('.map')).toBeNull();
        });
    });

    it('shows only the summary, with no coordinates text and no Edit, for a large value', () => {
        const polygons = Array.from({ length: 25 }, (_, p) => [Array.from({ length: 1000 }, (_, i) => [p + i / 10000, i / 10000])]);
        component.formModel = {
            getValue: () => ({ type: 'MultiPolygon', coordinates: polygons }),
            getErrors: () => ({}),
            setControlValue: () => undefined,
            setAvailableTypes: () => undefined,
            setOriginalFileCheck: () => undefined
        } as any;
        vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);

        fixture.detectChanges(false);

        const labels = Array.from(fixture.nativeElement.querySelectorAll('button[label]'))
            .map((button: any) => button.getAttribute('label'));
        expect(fixture.nativeElement.querySelector('.geo-info-text').textContent).toContain('25 polygons · 25,000 points');
        expect(labels).toEqual(['Download GeoJSON', 'Clear']);
        expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    });

    describe('download buttons in the document view', () => {
        const render = (value: unknown): string[] => {
            component.formModel = {
                getValue: () => value,
                getErrors: () => ({}),
                setControlValue: () => undefined,
                setAvailableTypes: () => undefined,
                setOriginalFileCheck: () => undefined
            } as any;
            component.isDisabled = true;
            vi.spyOn(component, 'ngAfterViewInit').mockImplementation(() => undefined);
            fixture.detectChanges(false);
            return Array.from(fixture.nativeElement.querySelectorAll('button[label]'))
                .map((button: any) => button.getAttribute('label'));
        };
        const geoFile = { fileId: 'grid-1', name: 'site.kml', format: 'kml', sizeBytes: 10, previewSizeBytes: 10 };
        const collection = {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        };

        it('offers both downloads for a file with preview', () => {
            expect(render({ ...collection, geoFile })).toEqual(['Download GeoJSON', 'Download original file']);
        });

        it('offers both downloads above the map for a file without preview', () => {
            const labels = render({
                type: 'Point', coordinates: [1, 2],
                geoFile: { ...geoFile, noPreview: true, automaticPoint: [1, 2] }
            });

            expect(labels).toEqual(['Download GeoJSON', 'Download original file']);
            expect(fixture.nativeElement.querySelector('.geo-preview-unavailable button')).toBeNull();
        });

        it('offers only the GeoJSON download for a document without a file', () => {
            expect(render(collection)).toEqual(['Download GeoJSON']);
        });

        it('offers no downloads when the links are hidden, as in the document overview', () => {
            component.hideDownloads = true;

            expect(render({ ...collection, geoFile })).toEqual([]);
        });
    });
});
