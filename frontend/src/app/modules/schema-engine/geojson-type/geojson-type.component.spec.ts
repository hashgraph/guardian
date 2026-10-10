import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, ReplaySubject, throwError } from 'rxjs';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GeoJsonType } from '@guardian/interfaces';
import { SettingsService } from 'src/app/services/settings.service';
import { ArtifactService } from 'src/app/services/artifact.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { GeoJsonService } from 'src/app/services/geo-json.service';
import { SwitchButton } from '../../common/switch-button/switch-button.component';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { gzipBlob } from '../geo-file/geo-file-compression';
import { KmlCoordinateScanner } from '../geo-file/kml-coordinate-scanner';
import { GeojsonTypeComponent } from './geojson-type.component';

describe('GeojsonTypeComponent original file link', () => {
    let value: any;
    let geoFiles: jasmine.SpyObj<GeoFilePersistenceService>;
    let artifacts: jasmine.SpyObj<ArtifactService>;
    let settings: jasmine.SpyObj<SettingsService>;
    let dialog: jasmine.SpyObj<DialogService>;
    let close: ReplaySubject<string | undefined>;
    let component: GeojsonTypeComponent;

    beforeEach(() => {
        value = {};
        geoFiles = jasmine.createSpyObj('GeoFilePersistenceService', [
            'keepOriginal',
            'discard',
            'ensurePendingFile'
        ]);
        artifacts = jasmine.createSpyObj('ArtifactService', ['getFileBlob']);
        settings = jasmine.createSpyObj('SettingsService', ['getGeospatialLimits']);
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100,
            geospatialPreviewMaxFeatures: 5000
        }));
        close = new ReplaySubject<string | undefined>(1);
        dialog = jasmine.createSpyObj('DialogService', ['open']);
        dialog.open.and.returnValue({ onClose: close } as unknown as DynamicDialogRef);
        const geoJsonService = jasmine.createSpyObj<GeoJsonService>('GeoJsonService', [
            'saveFile',
            'getFileNames',
            'getFile'
        ]);
        component = new GeojsonTypeComponent(
            { detectChanges: () => undefined } as any,
            geoJsonService,
            geoFiles,
            artifacts,
            settings,
            dialog
        );
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
        const setOriginalFileCheck = jasmine.createSpy('setOriginalFileCheck');
        component.formModel = {
            getValue: () => value,
            setAvailableTypes: () => undefined,
            setOriginalFileCheck
        } as any;
        geoFiles.ensurePendingFile.and.resolveTo(true);

        component.ngOnInit();
        const check = setOriginalFileCheck.calls.mostRecent().args[0];

        expect(await check('geo-key')).toBeTrue();
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
        artifacts.getFileBlob.and.returnValue(of(new Blob(['original'])));
        const click = jasmine.createSpy('click');
        const remove = jasmine.createSpy('remove');
        const anchor = { href: '', download: '', click, remove } as any;
        spyOn(document, 'createElement').and.returnValue(anchor);
        spyOn(document.body, 'appendChild');
        spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
        spyOn(URL, 'revokeObjectURL');

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
        artifacts.getFileBlob.and.returnValue(of(await gzipBlob(new Blob(['original']))));
        const anchor = {
            href: '', download: '', click: jasmine.createSpy('click'), remove: jasmine.createSpy('remove')
        } as any;
        spyOn(document, 'createElement').and.returnValue(anchor);
        spyOn(document.body, 'appendChild');
        const createObjectURL = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
        spyOn(URL, 'revokeObjectURL');

        await component.downloadOriginal();

        const downloaded = createObjectURL.calls.mostRecent().args[0];
        expect(downloaded instanceof Blob ? await downloaded.text() : null).toBe('original');
        expect(anchor.download).toBe('site.geojson');
        expect(anchor.click).toHaveBeenCalled();
    });

    it('keeps legacy generated download available', () => {
        value = {
            type: 'FeatureCollection',
            features: [{ geometry: { type: 'Point', coordinates: [1, 2] } }]
        };

        expect(component.hasOriginalFile()).toBeFalse();
        expect(component.canDownload()).toBeTrue();
    });

    it('keeps the GeoJSON download next to the original file for a linked value', () => {
        value = {
            type: 'Point',
            coordinates: [1, 2],
            geoFile: { fileId: 'grid-1', name: 'site.kml', format: 'kml', sizeBytes: 10, previewSizeBytes: 10 }
        };

        expect(component.hasOriginalFile()).toBeTrue();
        expect(component.canDownload()).toBeTrue();
    });

    it('keeps a legacy single geometry without a GeoJSON download', () => {
        value = { type: 'Point', coordinates: [1, 2] };

        expect(component.canDownload()).toBeFalse();
    });

    it('keeps a pending original when the selection is cleared', async () => {
        const link = {
            idbKey: 'geo-key', name: 'site.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        (component as any).pendingGeoFile = link;
        geoFiles.discard.and.resolveTo();

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
        geoFiles.discard.and.resolveTo();

        await component.clearSelectionFeatures();

        expect(geoFiles.discard).not.toHaveBeenCalled();
        expect(value).toEqual({});
        expect((component as any).pendingGeoFile).toBe(loaded);
    });

    it('returns the picked shapes from the file to the candidates when the selection is cleared', async () => {
        spyOn<any>(component, 'setupMap');
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

    it('empties the JSON text when the selection is cleared', async () => {
        const loaded = {
            idbKey: 'old-key', name: 'old.geojson', format: 'geojson' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: loaded };
        component.jsonInput = JSON.stringify(value, null, 4);
        geoFiles.discard.and.resolveTo();

        await component.clearSelectionFeatures();
        component.isJSON = true;
        component.onViewTypeChange();

        expect(value).toEqual({});
        expect(component.jsonInput).toBe('');
    });

    it('empties the value when the last shape is deleted', () => {
        const link = {
            idbKey: 'geo-key', name: 'site.geojson', format: 'geojson' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: link };
        component.jsonInput = JSON.stringify(value, null, 4);
        const geometry = component.addGeometry(value);

        component.deleteGeometry(geometry.id);

        expect(component.geometriesList.length).toBe(0);
        expect(value).toEqual({});
        expect(component.jsonInput).toBe('');
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
        component.jsonInput = JSON.stringify(value, null, 4);
        geoFiles.keepOriginal.and.resolveTo(imported);
        geoFiles.discard.and.resolveTo();

        await (component as any).replacePendingFile(new File(['x'], 'new.kml'), 'kml');

        expect(geoFiles.discard).toHaveBeenCalledOnceWith(loaded);
        expect(value).toEqual({});
        expect(component.geometriesList.length).toBe(0);
        expect(component.importedLocations.length).toBe(0);
        expect(component.jsonInput).toBe('');
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
        geoFiles.keepOriginal.and.resolveTo(imported);

        await (component as any).replacePendingFile(new File(['x'], 'new.kml'), 'kml');

        expect(geoFiles.discard).not.toHaveBeenCalled();
        expect(value).toEqual({});
        expect((component as any).pendingGeoFile).toBe(imported);
    });

    it('drops the shapes picked from the previous file when a new file is imported with preview', async () => {
        spyOn<any>(component, 'setupMap');
        (component as any).geoJsonService.getFileNames.and.returnValue([]);
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

    it('uses the default limits when limits cannot be loaded', async () => {
        settings.getGeospatialLimits.and.returnValue(throwError(() => new Error('offline')));
        const result = component.importFromFile(new File([new Uint8Array(6 * 1024 * 1024)], 'site.geojson'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(component.importError).toBe('');
        expect(JSON.stringify(dialog.open.calls.mostRecent().args[1]?.data))
            .toContain('which exceeds the 5 MB limit for in-browser rendering');
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('uses the plain size wording in the KML preview warning', async () => {
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['<kml></kml>'], 'site.kml'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(JSON.stringify(dialog.open.calls.mostRecent().args[1]?.data))
            .toContain('"texts":["This file\'s size is ');
    });

    it('opens the shared confirm dialog and treats its close icon as Cancel', async () => {
        const result = component.importFromFile(new File([new Uint8Array(6 * 1024 * 1024)], 'site.geojson'));
        close.next(undefined);
        close.complete();
        await result;
        const [dialogComponent, config] = dialog.open.calls.mostRecent().args;
        expect(dialogComponent).toBe(CustomConfirmDialogComponent);
        expect(config?.showHeader).toBeFalse();
        expect(config?.data).toEqual(jasmine.objectContaining({
            header: 'File too large to preview',
            buttons: [
                { name: 'Cancel', class: 'secondary' },
                { name: 'Upload without preview', class: 'primary' }
            ]
        }));
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('offers only Ok in the shared dialog above the maximum', async () => {
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 0.00001,
            geospatialMaxFileSizeMb: 0.00002,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File([new Uint8Array(101)], 'site.geojson'));
        close.next('Ok');
        close.complete();
        await result;
        const config = dialog.open.calls.mostRecent().args[1];
        expect(config?.data).toEqual(jasmine.objectContaining({
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
            spyOn<any>(component, 'setupMap');
            spyOn<any>(component, 'centerMap');
            oldValue = { type: 'Point', coordinates: [1, 2] };
            value = oldValue;
        });

        it('still imports a previewable file with a shape the field does not allow', async () => {
            (component as any).geoJsonService.getFileNames.and.returnValue([]);

            await component.importFromFile(new File([mixed], 'site.geojson'));

            expect(component.importError).toBe('');
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('refuses a previewable file that has no allowed shape', async () => {
            const result = component.importFromFile(new File([line], 'site.geojson'));
            close.next('Ok');
            close.complete();
            await result;

            expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
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

            expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });

        it('refuses a previewable KMZ that has no allowed shape', async () => {
            const entry = {
                name: 'doc.kml', flags: 0, compressionMethod: 0,
                compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
            };
            spyOn((component as any).kmzReader, 'inspect').and.resolveTo({ entry, previewSizeBytes: 20 });
            spyOn((component as any).kmzReader, 'readText').and.resolveTo(
                '<kml><Placemark><LineString><coordinates>1,2 3,4</coordinates></LineString></Placemark></kml>'
            );

            const result = component.importFromFile(new File(['zip'], 'site.kmz'));
            close.next('Ok');
            close.complete();
            await result;

            expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('offers the first allowed shape of a mixed file without preview as its point', async () => {
            settings.getGeospatialLimits.and.returnValue(of(noPreviewLimits));
            const file = new File([mixed], 'site.geojson');
            geoFiles.keepOriginal.and.resolveTo({
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
            settings.getGeospatialLimits.and.returnValue(of(noPreviewLimits));
            const result = component.importFromFile(new File([line], 'site.geojson'));
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(dialog.open.calls.count()).toBe(2);
            expect(dialog.open.calls.argsFor(0)[1]?.data)
                .toEqual(jasmine.objectContaining({ header: 'File too large to preview' }));
            expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(cannotImport);
            expect(dialog.open.calls.allArgs().every(([, config]) => config?.duplicate === true)).toBeTrue();
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('refuses a KMZ without preview that has no allowed shape', async () => {
            settings.getGeospatialLimits.and.returnValue(of(noPreviewLimits));
            const entry = {
                name: 'doc.kml', flags: 0, compressionMethod: 0,
                compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
            };
            spyOn((component as any).kmzReader, 'inspect').and.resolveTo({ entry, previewSizeBytes: 20 });
            spyOn((component as any).kmzReader, 'readCoordinate').and.callFake(
                async (_file: Blob, _entry: unknown, scanner: KmlCoordinateScanner) => {
                    scanner.write('<kml><Placemark><LineString><coordinates>1,2 3,4</coordinates></LineString></Placemark></kml>');
                    scanner.finish();
                    return scanner.coordinate;
                }
            );
            const result = component.importFromFile(new File(['zip'], 'site.kmz'));
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(dialog.open.calls.count()).toBe(2);
            expect(dialog.open.calls.argsFor(0)[1]?.data)
                .toEqual(jasmine.objectContaining({ header: 'File too large to preview' }));
            expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(cannotImport);
            expect(component.importError).toBe('');
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
    });

    it('rejects above maximum without storing', async () => {
        const file = new File([new Uint8Array(101)], 'site.kml');
        settings.getGeospatialLimits.and.returnValue(of({
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
        settings.getGeospatialLimits.and.returnValue(of({
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
        spyOn<any>(component, 'setupMap');
        const file = new File([JSON.stringify({ type: 'Point', coordinates: [12, 34] })], 'site.geojson');
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        geoFiles.keepOriginal.and.resolveTo({
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
        expect(component.isPreviewUnavailable()).toBeTrue();

        component.selectAllImportedFeatures();

        expect(value.type).toBe('FeatureCollection');
        expect(value.features.map((feature: any) => feature.geometry)).toEqual([{ type: 'Point', coordinates: [12, 34] }]);
        expect(value.geoFile.noPreview).toBeTrue();
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
        spyOn<any>(component, 'setupMap');
        spyOn<any>(component, 'centerMap');

        component.ngAfterViewInit();

        expect((component as any).setupMap).toHaveBeenCalled();
        expect(component.geometriesList.length).toBe(1);
    });

    it('zooms the map to the imported shapes when the map is set up', () => {
        jasmine.clock().install();
        const view = jasmine.createSpyObj('View', ['fit', 'animate']);
        spyOn<any>(component, 'initMap').and.callFake(() => (component as any).map = { getView: () => view });
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [36, -1] } }]
        } as any);

        (component as any).setupMap();
        jasmine.clock().tick(0);
        jasmine.clock().uninstall();

        expect(view.fit).toHaveBeenCalledWith(jasmine.any(Array), jasmine.objectContaining({ maxZoom: 14 }));
        expect(view.animate).not.toHaveBeenCalled();
    });

    it('shows the loader while Include all runs and hides it afterwards', () => {
        jasmine.clock().install();
        spyOn<any>(component, 'setupMap');
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        } as any);

        component.includeAllImportedFeatures();

        expect(component.loading).toBeTrue();
        expect(component.geometriesList.length).toBe(0);

        jasmine.clock().tick(0);
        jasmine.clock().uninstall();

        expect(component.geometriesList.length).toBe(1);
        expect(component.loading).toBeFalse();
        expect(component.renderedRows).toBe(Infinity);
    });

    it('draws the rows in batches after Include all and keeps the loader until the last batch', () => {
        jasmine.clock().install();
        spyOn<any>(component, 'setupMap');
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: Array.from({ length: 25 }, (_, i) => ({
                type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [i, 2] }
            }))
        } as any);

        component.includeAllImportedFeatures();
        jasmine.clock().tick(0);
        expect(component.geometriesList.length).toBe(25);
        expect(component.renderedRows).toBe(10);
        expect(component.loading).toBeTrue();

        jasmine.clock().tick(0);
        expect(component.renderedRows).toBe(20);

        jasmine.clock().tick(0);
        jasmine.clock().uninstall();
        expect(component.renderedRows).toBe(Infinity);
        expect(component.loading).toBeFalse();
    });

    it('returns a deleted shape from the file to the candidates', () => {
        spyOn<any>(component, 'setupMap');
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
            automaticPoint: [1, 2] as [number, number]
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
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['{}'], 'site.geojson'));
        close.next('Upload without preview');
        close.complete();
        await result;
        expect(value).toBe(oldValue);
        expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual({
            header: 'File cannot be imported',
            texts: ['No coordinates were found in this file, so it cannot be imported. Please check the file and try again.'],
            buttons: [{ name: 'Ok', class: 'primary' }]
        });
        expect(component.importError).toBe('');
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        expect(component.loading).toBeFalse();
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
            settings.getGeospatialLimits.and.returnValue(of(shapeLimits));
            spyOn<any>(component, 'setupMap');
        });

        it('warns with the shape count and keeps nothing on Cancel', async () => {
            const result = component.importFromFile(new File([points(3)], 'site.geojson'));
            close.next('Cancel');
            close.complete();
            await result;

            expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({
                header: 'File too large to preview',
                texts: [jasmine.stringContaining('This file has 3 shapes, which exceeds the 2-shape limit for in-browser rendering.')]
            }));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('offers the first point as a candidate after Upload without preview', async () => {
            const file = new File([points(3)], 'site.geojson');
            geoFiles.keepOriginal.and.resolveTo({
                idbKey: 'new', name: file.name, format: 'geojson',
                sizeBytes: file.size, previewSizeBytes: file.size
            });
            const result = component.importFromFile(file);
            close.next('Upload without preview');
            close.complete();
            await result;

            expect(value).toEqual({});
            expect((component as any).pendingGeoFile.noPreview).toBeTrue();
            expect(component.importedLocations.map(location => location.coordinates)).toEqual([[1, 2]]);
        });

        it('previews a file at the shape limit without a warning', async () => {
            (component as any).geoJsonService.getFileNames.and.returnValue([]);

            await component.importFromFile(new File([points(2)], 'site.geojson'));

            expect(dialog.open).not.toHaveBeenCalled();
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
        });

        it('applies the shape limit to a KMZ with preview', async () => {
            const entry = {
                name: 'doc.kml', flags: 0, compressionMethod: 0,
                compressedSize: 3, uncompressedSize: 20, localHeaderOffset: 0
            };
            spyOn((component as any).kmzReader, 'inspect').and.resolveTo({ entry, previewSizeBytes: 20 });
            spyOn((component as any).kmzReader, 'readText').and.resolveTo(
                '<kml><Document>' +
                ['1,2', '3,4', '5,6'].map(c => `<Placemark><Point><coordinates>${c}</coordinates></Point></Placemark>`).join('') +
                '</Document></kml>'
            );
            const result = component.importFromFile(new File(['zip'], 'site.kmz'));
            close.next('Cancel');
            close.complete();
            await result;

            expect(dialog.open.calls.mostRecent().args[1]?.data)
                .toEqual(jasmine.objectContaining({ texts: [jasmine.stringContaining('This file has 3 shapes')] }));
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
    });

    it('shows the size warning before reading a large file and does not read it on Cancel', async () => {
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        const result = component.importFromFile(new File(['{}'], 'site.geojson'));
        close.next('Cancel');
        close.complete();
        await result;
        expect(dialog.open.calls.count()).toBe(1);
        expect(dialog.open.calls.mostRecent().args[1]?.data)
            .toEqual(jasmine.objectContaining({ header: 'File too large to preview' }));
        expect(component.loading).toBeFalse();
    });

    it('refuses a small file whose only geometry has empty coordinates', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        const result = component.importFromFile(new File([JSON.stringify({ type: 'Point', coordinates: [] })], 'site.geojson'));
        close.next('Ok');
        close.complete();
        await result;
        expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({
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
        expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({
            header: 'File cannot be imported',
            buttons: [{ name: 'Ok', class: 'primary' }]
        }));
        expect(value).toBe(oldValue);
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        expect(component.loading).toBeFalse();
    });

    it('checks the KMZ archive maximum before inspect', async () => {
        const inspect = spyOn((component as any).kmzReader, 'inspect');
        settings.getGeospatialLimits.and.returnValue(of({
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
        spyOn((component as any).kmzReader, 'inspect').and.resolveTo({
            entry, previewSizeBytes: 20
        });
        const coordinate = spyOn((component as any).kmzReader, 'readCoordinate')
            .and.resolveTo([12, 34]);
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 1,
            geospatialPreviewMaxFeatures: 5000
        }));
        geoFiles.keepOriginal.and.resolveTo({
            idbKey: 'new', name: file.name, format: 'kmz',
            sizeBytes: file.size, previewSizeBytes: file.size
        });
        spyOn<any>(component, 'setupMap');
        const result = component.importFromFile(file);
        close.next('Upload without preview');
        close.complete();
        await result;
        const link = (component as any).pendingGeoFile;
        expect(coordinate).toHaveBeenCalled();
        expect(link.format).toBe('kmz');
        expect(link.previewSizeBytes).toBe(20);
        expect(link.noPreview).toBeTrue();
        expect(link.automaticPoint).toEqual([12, 34]);
        expect(value).toEqual({});
        expect(component.importedLocations.map(location => location.coordinates)).toEqual([[12, 34]]);
    });

    it('keeps old value when the KMZ reader rejects the archive', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        spyOn((component as any).kmzReader, 'inspect')
            .and.rejectWith(new Error('The KMZ central directory is missing.'));
        await component.importFromFile(new File(['bad'], 'site.kmz'));
        expect(value).toBe(oldValue);
        expect(component.importError).toBe('The KMZ central directory is missing.');
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });

    it('does not store a deflated KMZ when browser support is absent', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        const entry = {
            name: 'doc.kml', flags: 0, compressionMethod: 8,
            compressedSize: 3, uncompressedSize: 3, localHeaderOffset: 0
        };
        spyOn((component as any).kmzReader, 'inspect').and.resolveTo({ entry, previewSizeBytes: 3 });
        spyOn((component as any).kmzReader, 'readText').and.rejectWith(
            new Error('This browser cannot open KMZ files.')
        );
        await component.importFromFile(new File(['zip'], 'site.kmz'));
        expect(value).toBe(oldValue);
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
    });
});

describe('GeojsonTypeComponent loading state', () => {
    let fixture: ComponentFixture<GeojsonTypeComponent>;
    let component: GeojsonTypeComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [GeojsonTypeComponent, SwitchButton],
            imports: [FormsModule],
            providers: [
                { provide: GeoJsonService, useValue: {} },
                { provide: GeoFilePersistenceService, useValue: {} },
                { provide: ArtifactService, useValue: {} },
                { provide: SettingsService, useValue: {} },
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
        spyOn<any>(component, 'setupMap');
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
        spyOn(component, 'ngAfterViewInit');

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
        spyOn(component, 'ngAfterViewInit');

        fixture.detectChanges(false);

        const notice = fixture.nativeElement.querySelector('.geo-preview-unavailable');
        const controls = Array.from(fixture.nativeElement.querySelectorAll('.map-control-buttons button'))
            .map((button: any) => button.label || button.getAttribute('label'));
        expect(notice.textContent).toContain('Preview unavailable: this file is too large to show on the map. The marked point is the first point in the file. Add it, or draw your own shapes.');
        expect(notice.textContent).not.toContain('Download it to view.');
        expect(notice.querySelectorAll('button').length).toBe(0);
        expect(controls).toContain('Add file point');
        expect(controls).not.toContain('Include all');
    });

    it('shows the JSON text for an imported file above 1 MB', () => {
        component.isJSON = true;
        component.fileImportSize = 4;
        spyOn(component, 'ngAfterViewInit');

        fixture.detectChanges(false);

        expect(fixture.nativeElement.querySelector('#geoJsonInput')).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('too large to view');
    });

    it('explains why the shape list is hidden above 300 shapes', () => {
        component.geometriesList = Array.from({ length: 301 }, (_, i) => ({
            id: String(i), type: GeoJsonType.POINT, coordinates: [1, 2]
        })) as any;
        spyOn(component, 'ngAfterViewInit');

        fixture.detectChanges(false);

        expect(fixture.nativeElement.textContent)
            .toContain('301 shapes are selected. The list shows up to 300 shapes; the map shows them all.');
        expect(fixture.nativeElement.textContent).not.toContain('exceeds in-browser preview limits');
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
            spyOn(component, 'ngAfterViewInit');
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

        it('offers both downloads side by side under the map for a file without preview', () => {
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
    });
});
