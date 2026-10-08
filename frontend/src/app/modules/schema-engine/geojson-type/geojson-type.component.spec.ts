import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, ReplaySubject, throwError } from 'rxjs';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SettingsService } from 'src/app/services/settings.service';
import { ArtifactService } from 'src/app/services/artifact.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { GeoJsonService } from 'src/app/services/geo-json.service';
import { SwitchButton } from '../../common/switch-button/switch-button.component';
import { gzipBlob } from '../geo-file/geo-file-compression';
import { KmlCoordinateScanner } from '../geo-file/kml-coordinate-scanner';
import { GeojsonTypeComponent } from './geojson-type.component';

describe('GeojsonTypeComponent original file link', () => {
    let value: any;
    let geoFiles: jasmine.SpyObj<GeoFilePersistenceService>;
    let artifacts: jasmine.SpyObj<ArtifactService>;
    let settings: jasmine.SpyObj<SettingsService>;
    let dialog: jasmine.SpyObj<DialogService>;
    let close: ReplaySubject<boolean>;
    let component: GeojsonTypeComponent;

    beforeEach(() => {
        value = {};
        geoFiles = jasmine.createSpyObj('GeoFilePersistenceService', [
            'keepOriginal',
            'discard'
        ]);
        artifacts = jasmine.createSpyObj('ArtifactService', ['getFileBlob']);
        settings = jasmine.createSpyObj('SettingsService', ['getGeospatialLimits']);
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100
        }));
        close = new ReplaySubject<boolean>(1);
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

    it('discards a pending original when the selection is cleared', async () => {
        const link = {
            idbKey: 'geo-key', name: 'site.kml', format: 'kml' as const,
            sizeBytes: 10, previewSizeBytes: 10
        };
        (component as any).pendingGeoFile = link;
        geoFiles.discard.and.resolveTo();

        await component.clearSelectionFeatures();

        expect(geoFiles.discard).toHaveBeenCalledOnceWith(link);
        expect((component as any).pendingGeoFile).toBeUndefined();
    });

    it('uses the default limits when limits cannot be loaded', async () => {
        settings.getGeospatialLimits.and.returnValue(throwError(() => new Error('offline')));
        const result = component.importFromFile(new File([new Uint8Array(6 * 1024 * 1024)], 'site.geojson'));
        close.next(false);
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
            geospatialMaxFileSizeMb: 1
        }));
        const result = component.importFromFile(new File(['<kml></kml>'], 'site.kml'));
        close.next(false);
        close.complete();
        await result;
        expect(JSON.stringify(dialog.open.calls.mostRecent().args[1]?.data))
            .toContain('"message":"This file\'s size is ');
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
        const noPreviewLimits = {
            kmlPreviewMaxFileSizeMb: 0.000001,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1
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
            await component.importFromFile(new File([line], 'site.geojson'));

            expect(component.importError).toBe(message);
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
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

            await component.importFromFile(new File(['zip'], 'site.kmz'));

            expect(component.importError).toBe(message);
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('stores a mixed file without preview with its point on the first allowed shape', async () => {
            settings.getGeospatialLimits.and.returnValue(of(noPreviewLimits));
            const file = new File([mixed], 'site.geojson');
            geoFiles.keepOriginal.and.resolveTo({
                idbKey: 'new', name: file.name, format: 'geojson',
                sizeBytes: file.size, previewSizeBytes: file.size
            });
            const result = component.importFromFile(file);
            close.next(true);
            close.complete();
            await result;

            expect(component.importError).toBe('');
            expect(geoFiles.keepOriginal).toHaveBeenCalled();
            expect(value.geoFile.automaticPoint).toEqual([5, 6]);
        });

        it('refuses a file without preview that has no allowed shape', async () => {
            settings.getGeospatialLimits.and.returnValue(of(noPreviewLimits));
            const result = component.importFromFile(new File([line], 'site.geojson'));
            close.next(true);
            close.complete();
            await result;

            expect(component.importError).toBe(message);
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
            close.next(true);
            close.complete();
            await result;

            expect(component.importError).toBe(message);
            expect(value).toBe(oldValue);
            expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        });
    });

    it('rejects above maximum without storing', async () => {
        const file = new File([new Uint8Array(101)], 'site.kml');
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 0.00001,
            geojsonPreviewMaxFileSizeMb: 1,
            geospatialMaxFileSizeMb: 0.00002
        }));
        const result = component.importFromFile(file);
        close.next(false);
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
            geospatialMaxFileSizeMb: 1
        }));
        const result = component.importFromFile(new File(['<kml></kml>'], 'new.kml'));
        close.next(false);
        close.complete();
        await result;
        expect(value).toBe(oldValue);
        expect((component as any).pendingGeoFile).toBe(oldLink);
        expect(geoFiles.discard).not.toHaveBeenCalled();
    });

    it('stores one marker after accepting large GeoJSON', async () => {
        const file = new File([JSON.stringify({ type: 'Point', coordinates: [12, 34] })], 'site.geojson');
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1
        }));
        geoFiles.keepOriginal.and.resolveTo({
            idbKey: 'new', name: file.name, format: 'geojson',
            sizeBytes: file.size, previewSizeBytes: file.size
        });
        const result = component.importFromFile(file);
        close.next(true);
        close.complete();
        await result;
        expect(value.type).toBe('Point');
        expect(value.coordinates).toEqual([12, 34]);
        expect(value.geoFile.noPreview).toBeTrue();
        expect(value.geoFile.automaticPoint).toEqual([12, 34]);
        expect(component.geometriesList[0].coordinates).toEqual([12, 34]);
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

    it('does not delete or clear the last no-preview shape', async () => {
        const link = {
            idbKey: 'new', name: 'large.kml', format: 'kml' as const,
            sizeBytes: 20, previewSizeBytes: 20, noPreview: true,
            automaticPoint: [1, 2] as [number, number]
        };
        value = { type: 'Point', coordinates: [1, 2], geoFile: link };
        const geometry = component.addGeometry(value);

        component.deleteGeometry(geometry.id);
        await component.clearSelectionFeatures();

        expect(component.geometriesList.length).toBe(1);
        expect(value.geoFile).toBe(link);
        expect(geoFiles.discard).not.toHaveBeenCalled();
    });

    it('keeps old value when no coordinate exists', async () => {
        const oldValue = { type: 'Point', coordinates: [1, 2] };
        value = oldValue;
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 1,
            geojsonPreviewMaxFileSizeMb: 0.000001,
            geospatialMaxFileSizeMb: 1
        }));
        const result = component.importFromFile(new File(['{}'], 'site.geojson'));
        close.next(true);
        close.complete();
        await result;
        expect(value).toBe(oldValue);
        expect(component.importError).toBe('No coordinates were found in this file.');
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
        expect(component.loading).toBeFalse();
    });

    it('checks the KMZ archive maximum before inspect', async () => {
        const inspect = spyOn((component as any).kmzReader, 'inspect');
        settings.getGeospatialLimits.and.returnValue(of({
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 0.00001
        }));
        const result = component.importFromFile(new File([new Uint8Array(100)], 'site.kmz'));
        close.next(false);
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
            geospatialMaxFileSizeMb: 1
        }));
        geoFiles.keepOriginal.and.resolveTo({
            idbKey: 'new', name: file.name, format: 'kmz',
            sizeBytes: file.size, previewSizeBytes: file.size
        });
        const result = component.importFromFile(file);
        close.next(true);
        close.complete();
        await result;
        expect(coordinate).toHaveBeenCalled();
        expect(value.geoFile.format).toBe('kmz');
        expect(value.geoFile.previewSizeBytes).toBe(20);
        expect(value.geoFile.noPreview).toBeTrue();
        expect(value.geoFile.automaticPoint).toEqual([12, 34]);
        expect(component.geometriesList[0].coordinates).toEqual([12, 34]);
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
            setAvailableTypes: () => undefined
        } as any;
        spyOn<any>(component, 'setupMap');
    });

    it('renders a status while a no-preview file is read', () => {
        component.loading = true;

        fixture.detectChanges();

        const status = fixture.nativeElement.querySelector('.geo-file-loading');
        expect(status).not.toBeNull();
        expect(status.textContent).toContain('Reading file...');
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
            setAvailableTypes: () => undefined
        } as any;
        spyOn(component, 'ngAfterViewInit');

        fixture.detectChanges(false);

        const notice = fixture.nativeElement.querySelector('.geo-preview-unavailable');
        expect(notice.textContent).toContain('The map does not show the full file. Download it to view.');
    });

    describe('download buttons in the document view', () => {
        const render = (value: unknown): string[] => {
            component.formModel = {
                getValue: () => value,
                getErrors: () => ({}),
                setControlValue: () => undefined,
                setAvailableTypes: () => undefined
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

        it('offers the GeoJSON in the map area and the original in the notice for a file without preview', () => {
            const labels = render({
                type: 'Point', coordinates: [1, 2],
                geoFile: { ...geoFile, noPreview: true, automaticPoint: [1, 2] }
            });

            expect(labels).toEqual(['Download original file', 'Download GeoJSON']);
        });

        it('offers only the GeoJSON download for a document without a file', () => {
            expect(render(collection)).toEqual(['Download GeoJSON']);
        });
    });
});
