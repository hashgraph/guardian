import { of } from 'rxjs';
import { GeoFileLink } from 'src/app/services/geo-file-persistence.service';
import { GeojsonTypeComponent } from './geojson-type.component';

describe('GeojsonTypeComponent geometry dialog', () => {
    let value: any;
    let errors: Record<string, string[]>;
    let geoFiles: jasmine.SpyObj<any>;
    let component: GeojsonTypeComponent;

    const link = (idbKey: string): GeoFileLink => ({
        idbKey, name: `${idbKey}.geojson`, format: 'geojson', sizeBytes: 10, previewSizeBytes: 10
    });

    beforeEach(() => {
        value = {};
        errors = {};
        geoFiles = jasmine.createSpyObj('GeoFilePersistenceService', ['keepOriginal', 'discard']);
        geoFiles.discard.and.resolveTo();
        component = new GeojsonTypeComponent(
            { detectChanges: () => undefined } as any,
            { saveFile: () => undefined, getFileNames: () => [], getFile: () => undefined } as any,
            geoFiles,
            {} as any,
            { getGeospatialLimits: () => of({}) } as any,
            {} as any
        );
        component.formModel = {
            getValue: () => value,
            setControlValue: (next: unknown) => value = next,
            getErrors: () => errors
        } as any;
        spyOn<any>(component, 'setupMap');
        spyOn<any>(component, 'centerMap');
    });

    it('describes a single shape, several shapes and a large value', () => {
        value = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
        expect(component.summaryText()).toBe('1 polygon · 4 points');

        value = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]] };
        expect(component.summaryText()).toBe('2 polygons · 8 points');

        value = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } },
                { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
            ]
        };
        expect(component.summaryText()).toBe('2 shapes · 1 polygon · 5 points');
    });

    it('adds the size to the description of a large value', () => {
        const ring = Array.from({ length: 25_000 }, (_, i) => [i / 100000, i / 100000]);
        value = { type: 'Polygon', coordinates: [ring] };

        expect(component.isLargeValue()).toBeTrue();
        expect(component.summaryText()).toMatch(/^1 polygon · 25,000 points · [\d.]+ MB$/);
    });

    it('offers Edit only for a small value that has a preview', () => {
        value = {};
        expect(component.canEdit()).toBeFalse();

        value = { type: 'Point', coordinates: [1, 2] };
        expect(component.canEdit()).toBeTrue();

        value = { type: 'Point', coordinates: [1, 2], geoFile: { ...link('a'), noPreview: true } };
        expect(component.canEdit()).toBeFalse();

        const ring = Array.from({ length: 25_000 }, (_, i) => [i / 100000, i / 100000]);
        value = { type: 'Polygon', coordinates: [ring] };
        expect(component.canEdit()).toBeFalse();

        component.isDisabled = true;
        value = { type: 'Point', coordinates: [1, 2] };
        expect(component.canEdit()).toBeFalse();
    });

    it('restores the value and the original file when the dialog is cancelled after a new file was picked', async () => {
        const previous = link('previous');
        const original = { type: 'Point', coordinates: [1, 2], geoFile: previous };
        value = original;
        (component as any).pendingGeoFile = previous;
        const picked = link('picked');
        geoFiles.keepOriginal.and.resolveTo(picked);

        component.openDialog();
        await (component as any).replacePendingFile(new File(['x'], 'picked.geojson'), 'geojson');
        expect(value).toEqual({});
        expect(geoFiles.discard).not.toHaveBeenCalledWith(previous);

        component.cancelDialog();

        expect(value).toEqual(original);
        expect((component as any).pendingGeoFile).toBe(previous);
        expect(geoFiles.discard).toHaveBeenCalledOnceWith(picked);
        expect(component.dialogVisible).toBeFalse();
    });

    it('discards the previous file only when the dialog is saved', async () => {
        const previous = link('previous');
        value = { type: 'Point', coordinates: [1, 2], geoFile: previous };
        (component as any).pendingGeoFile = previous;
        const picked = link('picked');
        geoFiles.keepOriginal.and.resolveTo(picked);

        component.openDialog();
        await (component as any).replacePendingFile(new File(['x'], 'picked.geojson'), 'geojson');
        value = { type: 'Point', coordinates: [3, 4], geoFile: picked };
        component.saveDialog();

        expect(value.coordinates).toEqual([3, 4]);
        expect(geoFiles.discard).toHaveBeenCalledOnceWith(previous);
    });

    it('does not close with Save while the value has errors', () => {
        value = { type: 'Point', coordinates: [200, 100] };
        errors = { 0: ['Invalid Point coordinates'] };
        component.openDialog();

        component.saveDialog();

        expect(component.canSave()).toBeFalse();
        expect(component.dialogVisible).toBeTrue();
    });

    it('keeps the GeoJSON download for a value with validation errors', () => {
        value = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
        errors = { 0: ['Polygon: ring #1 must not cross or touch ring #0'] };

        expect(component.haveErrors()).toBeTrue();
        expect(component.canDownload()).toBeTrue();
    });

    it('lists the first five errors and counts the rest', () => {
        value = { type: 'Point', coordinates: [200, 100] };
        errors = { 0: Array.from({ length: 8 }, (_, i) => `error ${i}`) };

        expect(component.visibleErrors()).toEqual(['error 0', 'error 1', 'error 2', 'error 3', 'error 4']);
        expect(component.hiddenErrorCount()).toBe(3);
    });

    it('reports nothing for a geometry card that is still empty, for example after the type was changed', () => {
        errors = { 0: ['A GeoJSON object is required', 'Invalid Point coordinates'] };

        expect(component.rowErrors(0, { coordinatesString: undefined })).toEqual([]);
        expect(component.rowErrors(0, { coordinatesString: '  ' })).toEqual([]);
        expect(component.rowErrors(0, { coordinatesString: '[1, 2' })).toEqual(['A GeoJSON object is required', 'Invalid Point coordinates']);
    });

    it('shows the example coordinates on one line', () => {
        const geometry = {
            coordinatesPlaceholder: JSON.stringify([[[1.23, 4.56], [1.23, 4.56]]], null, 4)
        };

        expect(component.placeholderText(geometry)).toBe('[[[1.23, 4.56], [1.23, 4.56]]]');
        expect(component.placeholderText({})).toBe('');
    });

    it('does not turn a card into a shape when only its type was changed', () => {
        value = { type: 'Point', coordinates: [1, 2] };
        const card = component.addGeometry(value);

        card.type = 'Polygon';
        component.onTypeChange(card);

        expect(value).toEqual({});
        expect(component.summaryText()).toBe('');
        expect((component as any).geoShapesSource.getFeatures().length).toBe(0);
    });

    it('keeps an empty card out of the value and still reports errors under the right card', () => {
        const empty = component.addGeometry();
        const filled = component.addGeometry({ type: 'Point', coordinates: [200, 100] });
        empty.coordinatesString = undefined;
        filled.coordinatesString = '[200, 100]';

        (component as any).updateMap(true);
        errors = { 0: ['Invalid Point coordinates'] };

        expect(value.features.length).toBe(1);
        expect(value.features[0].geometry.coordinates).toEqual([200, 100]);
        expect(component.rowErrors(0, empty)).toEqual([]);
        expect(component.rowErrors(1, filled)).toEqual(['Invalid Point coordinates']);
    });

    it('lists only the cards typed by the user and numbers them from one', () => {
        component.onUploadMultiLocationFile({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]
        } as any);
        component.selectAllImportedFeatures();
        const typed = component.addGeometry({ type: 'Point', coordinates: [5, 6] });

        const cards = component.manualCards();

        expect(cards.length).toBe(1);
        expect(cards[0].geometry).toBe(typed);
        expect(cards[0].index).toBe(1);
    });

    it('describes a card by its type and point count', () => {
        expect(component.shapeSummary({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] })).toBe('Polygon · 4 points');
        expect(component.shapeSummary({ type: 'Point', coordinates: [1, 2] })).toBe('Point · 1 point');
        expect(component.shapeSummary({ type: 'Polygon', coordinates: [[]] })).toBe('Polygon');
    });

    it('opens on the manual tab for a typed value and on the file tab for an empty one', () => {
        component.openDialog();
        expect(component.dialogTab).toBe('file');
        component.cancelDialog();

        value = { type: 'Point', coordinates: [1, 2] };
        component.loadValue();
        component.openDialog();
        expect(component.dialogTab).toBe('manual');
    });

    it('empties the value with Clear and keeps the original file link for the next pick', () => {
        const previous = link('previous');
        value = { type: 'Point', coordinates: [1, 2], geoFile: previous };

        component.clearValue();

        expect(value).toEqual({});
        expect((component as any).pendingGeoFile).toBe(previous);
        expect(geoFiles.discard).not.toHaveBeenCalled();
    });

    it('does not open or clear in read-only mode', () => {
        component.isDisabled = true;
        value = { type: 'Point', coordinates: [1, 2] };

        component.openDialog();
        component.clearValue();

        expect(component.dialogVisible).toBeFalse();
        expect(value).toEqual({ type: 'Point', coordinates: [1, 2] });
    });

    it('opens a lone card, keeps several collapsed and opens a card that was just added', () => {
        value = { type: 'Point', coordinates: [1, 2] };
        component.loadValue();
        component.openDialog();
        const [first] = component.manualCards().map(card => card.geometry);
        expect(component.isCardOpen(first)).toBeTrue();

        component.toggleCard(first);
        expect(component.isCardOpen(first)).toBeFalse();

        component.addManualCard();
        const added = component.manualCards()[1].geometry;
        expect(component.isCardOpen(added)).toBeTrue();
        expect(component.isCardOpen(first)).toBeFalse();
    });
});
