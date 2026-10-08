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

    it('routes linked values to original-file download', () => {
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

        component.downloadOriginal();

        expect(artifacts.getFileBlob).toHaveBeenCalledWith('grid-1');
        expect(anchor.download).toBe('site.kml');
        expect(click).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('keeps legacy generated download available', () => {
        value = {
            type: 'FeatureCollection',
            features: [{ geometry: { type: 'Point', coordinates: [1, 2] } }]
        };

        expect(component.hasOriginalFile()).toBeFalse();
        expect(component.canDownload()).toBeTrue();
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

    it('fails closed when limits cannot be loaded', async () => {
        settings.getGeospatialLimits.and.returnValue(throwError(() => new Error('offline')));
        const file = new File(['{}'], 'site.geojson');
        spyOn(file, 'arrayBuffer');
        await component.importFromFile(file);
        expect(component.importError).toBe('Upload limits could not be loaded. Please try again later.');
        expect(file.arrayBuffer).not.toHaveBeenCalled();
        expect(geoFiles.keepOriginal).not.toHaveBeenCalled();
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
            new Error('This browser cannot open KMZ files. Please use a current version of Chrome, Edge, Firefox or Safari.')
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
});
