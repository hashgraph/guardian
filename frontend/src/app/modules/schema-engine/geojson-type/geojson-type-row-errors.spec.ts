import { UntypedFormControl } from '@angular/forms';
import { GeoForm } from '../schema-form-model/geo-form';
import { GeojsonTypeComponent } from './geojson-type.component';

describe('GeojsonTypeComponent row errors', () => {
    const point = (coordinates: number[]) => ({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates }
        }]
    });

    const createComponent = (value: unknown): GeojsonTypeComponent => {
        const model = new GeoForm(new UntypedFormControl({}));
        model.build();
        model.setControlValue(value);
        const component: GeojsonTypeComponent = Object.create(GeojsonTypeComponent.prototype);
        component.formModel = model;
        return component;
    };

    it('returns an empty list for a row without errors', () => {
        const component = createComponent(point([36.0012, -1.0021]));

        expect(component.getErrorsByIndex(0)).toEqual([]);
    });

    it('returns an empty list for an index that has no row', () => {
        const component = createComponent(point([36.0012, -1.0021]));

        expect(component.getErrorsByIndex(5)).toEqual([]);
    });

    it('returns the errors of an invalid row', () => {
        const component = createComponent(point([200, 100]));

        expect(component.getErrorsByIndex(0)).toEqual([
            'Feature #0: Invalid Point coordinates: expected lon ∈ [-180, 180] and lat ∈ [-90, 90]'
        ]);
    });
});
