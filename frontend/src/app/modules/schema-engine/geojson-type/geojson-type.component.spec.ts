import { of } from 'rxjs';
import { ArtifactService } from 'src/app/services/artifact.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { GeoJsonService } from 'src/app/services/geo-json.service';
import { GeojsonTypeComponent } from './geojson-type.component';

describe('GeojsonTypeComponent original file link', () => {
    let value: any;
    let geoFiles: jasmine.SpyObj<GeoFilePersistenceService>;
    let artifacts: jasmine.SpyObj<ArtifactService>;
    let component: GeojsonTypeComponent;

    beforeEach(() => {
        value = {};
        geoFiles = jasmine.createSpyObj('GeoFilePersistenceService', [
            'keepOriginal',
            'discard'
        ]);
        artifacts = jasmine.createSpyObj('ArtifactService', ['getFileBlob']);
        const geoJsonService = jasmine.createSpyObj<GeoJsonService>('GeoJsonService', [
            'saveFile',
            'getFileNames',
            'getFile'
        ]);
        component = new GeojsonTypeComponent(
            { detectChanges: () => undefined } as any,
            geoJsonService,
            geoFiles,
            artifacts
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
});
