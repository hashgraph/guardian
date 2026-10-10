import { UntypedFormControl } from '@angular/forms';
import { GeoJsonType } from '@guardian/interfaces';
import { GeoForm, MISSING_ORIGINAL_FILE_ERROR } from './geo-form';

describe('GeoForm no-preview validation', () => {
    function errors(value: unknown): any {
        const control = new UntypedFormControl(value);
        const form = new GeoForm(control);
        form.setAvailableTypes([GeoJsonType.POLYGON]);
        form.build();
        control.updateValueAndValidity();
        return control.errors?.geoJsonFieldErrors;
    }

    const geoFile = {
        fileId: 'grid-1',
        name: 'large.kml',
        format: 'kml',
        sizeBytes: 20,
        previewSizeBytes: 20,
        noPreview: true,
        automaticPoint: [1, 2]
    };

    it('accepts only the automatic no-preview Point', () => {
        expect(errors({
            type: 'Point',
            coordinates: [1, 2],
            geoFile
        })).toBeUndefined();
    });

    it('rejects an edited automatic Point in a polygon-only field', () => {
        expect(errors({
            type: 'Point',
            coordinates: [3, 4],
            geoFile
        })[0]).toContain('geometry type "Point" is not available');
    });

    it('does not exempt a second matching Point', () => {
        const result = errors({
            type: 'FeatureCollection',
            geoFile,
            features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } }
            ]
        });

        expect(result[0]).toBeUndefined();
        expect(result[1]).toContain('Feature #1: geometry type "Point" is not available');
    });

    it('rejects an ordinary Point in a polygon-only field', () => {
        expect(errors({ type: 'Point', coordinates: [1, 2] })[0])
            .toContain('geometry type "Point" is not available');
    });

    it('rejects a previewed linked Point in a polygon-only field', () => {
        expect(errors({
            type: 'Point', coordinates: [1, 2],
            geoFile: {
                fileId: 'grid-1', name: 'small.kml', format: 'kml',
                sizeBytes: 2, previewSizeBytes: 2
            }
        })[0]).toContain('geometry type "Point" is not available');
    });

    it('does not infer the exception from large size metadata', () => {
        expect(errors({
            type: 'Point', coordinates: [1, 2],
            geoFile: {
                fileId: 'grid-1', name: 'large.kml', format: 'kml',
                sizeBytes: 200, previewSizeBytes: 200, noPreview: false
            }
        })[0]).toContain('geometry type "Point" is not available');
    });
});

describe('GeoForm original file link', () => {
    const browserLink = {
        idbKey: 'geo-key', name: 'site.kml', format: 'kml',
        sizeBytes: 20, previewSizeBytes: 20
    };

    it('keeps the file link of a preset value', () => {
        const control = new UntypedFormControl({});
        const form = new GeoForm(control);
        const storedLink = {
            fileId: 'grid-1', name: 'site.kml', format: 'kml',
            sizeBytes: 20, previewSizeBytes: 20
        };
        form.setData({ preset: { type: 'Point', coordinates: [1, 2], geoFile: storedLink } });

        form.build();

        expect(control.value.geoFile).toBe(storedLink);
        expect(control.value.coordinates).toEqual([1, 2]);
    });

    it('marks a value invalid when its browser file is missing', async () => {
        const control = new UntypedFormControl({ type: 'Point', coordinates: [1, 2], geoFile: browserLink });
        const form = new GeoForm(control);
        form.build();
        const check = jasmine.createSpy('check').and.resolveTo(false);

        form.setOriginalFileCheck(check);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(check).toHaveBeenCalledWith('geo-key');
        expect(control.invalid).toBeTrue();
        expect(form.getErrors()[0]).toEqual([MISSING_ORIGINAL_FILE_ERROR]);
    });

    it('keeps a value valid when its browser file is available', async () => {
        const control = new UntypedFormControl({ type: 'Point', coordinates: [1, 2], geoFile: browserLink });
        const form = new GeoForm(control);
        form.build();

        form.setOriginalFileCheck(async () => true);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(control.valid).toBeTrue();
    });

    it('does not check a stored file', () => {
        const control = new UntypedFormControl({});
        const form = new GeoForm(control);
        form.build();
        const check = jasmine.createSpy('check').and.resolveTo(false);
        form.setOriginalFileCheck(check);

        control.setValue({
            type: 'Point', coordinates: [1, 2],
            geoFile: { ...browserLink, fileId: 'grid-1' }
        });

        expect(check).not.toHaveBeenCalled();
        expect(control.valid).toBeTrue();
    });
});
