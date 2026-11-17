import type { Mock } from "vitest";
import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { GeojsonTypeComponent } from './geojson-type.component';

const ring = (points: number, shift = 0): number[][] => {
    const result: number[][] = [];
    for (let i = 0; i < points - 1; i++) {
        result.push([shift + Math.cos(i) / 100, Math.sin(i) / 100]);
    }
    result.push(result[0]);
    return result;
};

const multiPolygon = (polygons: number, pointsPerPolygon: number) => ({
    type: 'MultiPolygon',
    coordinates: Array.from({ length: polygons }, (_, i) => [ring(pointsPerPolygon, i)])
});

describe('GeojsonTypeComponent large value', () => {
    let value: any;
    let setControlValue: Mock;
    let component: GeojsonTypeComponent;

    const limits = (points: number, features: number) => {
        (component as any).geospatialLimits = {
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100,
            geospatialPreviewMaxFeatures: features,
            geospatialPreviewMaxPoints: points
        };
    };

    beforeEach(() => {
        value = {};
        setControlValue = vi.fn().mockImplementation((next: unknown) => value = next);
        const settings: any = { getGeospatialLimits: () => of({}) };
        component = new GeojsonTypeComponent({ detectChanges: () => undefined } as any, { saveFile: () => undefined, getFileNames: () => [], getFile: () => undefined } as any, {} as any, {} as any, settings, {} as any);
        component.formModel = {
            getValue: () => value,
            setControlValue,
            getErrors: () => ({})
        } as any;
        vi.spyOn(component as any, 'setupMap').mockImplementation(() => undefined);
    });

    it('counts shapes, polygons and points of a single MultiPolygon', () => {
        value = multiPolygon(4, 10);

        const summary = component.valueSummary();

        expect(summary.shapes).toBe(1);
        expect(summary.polygons).toBe(4);
        expect(summary.points).toBe(40);
        expect(component.valueBytes()).toBeGreaterThan(0);
    });

    it('counts a FeatureCollection by its shapes and skips GeometryCollections', () => {
        value = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } },
                { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring(5)] } },
                { type: 'Feature', properties: {}, geometry: { type: 'GeometryCollection', geometries: [] } }
            ]
        };

        const summary = component.valueSummary();

        expect(summary.shapes).toBe(2);
        expect(summary.polygons).toBe(1);
        expect(summary.points).toBe(6);
    });

    it('is large above the point limit and not at it', () => {
        limits(40, 1500);
        value = multiPolygon(4, 10);
        expect(component.isLargeValue()).toBe(false);

        value = multiPolygon(4, 11);
        expect(component.isLargeValue()).toBe(true);
    });

    it('is large above the shape limit', () => {
        limits(1000000, 2);
        value = {
            type: 'FeatureCollection',
            features: [1, 2, 3].map(x => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [x, x] } }))
        };

        expect(component.isLargeValue()).toBe(true);
    });

    it('uses the default limits until the configured ones are loaded', () => {
        value = multiPolygon(25, 1000);

        expect(component.isLargeValue()).toBe(true);
    });

    it('does not rebuild the summary for the same value', () => {
        value = multiPolygon(4, 10);

        expect(component.valueSummary()).toBe(component.valueSummary());
    });

    it('keeps the coordinates text of a small value for the editor', () => {
        value = { type: 'Point', coordinates: [1, 2] };

        component.loadValue();

        expect(component.geometriesList.length).toBe(1);
        expect(JSON.parse(component.geometriesList[0].coordinatesString!)).toEqual([1, 2]);
    });

    it('builds no coordinates text for a large value', () => {
        value = multiPolygon(25, 1000);

        component.loadValue();

        expect(component.geometriesList.length).toBe(1);
        expect(component.geometriesList[0].coordinatesString).toBeUndefined();
        expect((component as any).jsonInput).toBeUndefined();
    });

    it('leaves the loaded value untouched, including after the map centers', fakeAsync(() => {
        const original = multiPolygon(25, 1000);
        value = original;

        component.loadValue();
        tick(1000);

        expect(setControlValue).not.toHaveBeenCalled();
        expect(value).toBe(original);
    }));

    it('still exports the full large value for download', () => {
        value = multiPolygon(25, 1000);

        const exported = (component as any).buildExportObject();

        expect(exported.type).toBe('FeatureCollection');
        expect(exported.features.length).toBe(1);
        expect(exported.features[0].geometry.coordinates.length).toBe(25);
        expect(exported.features[0].geometry.coordinates[0][0].length).toBe(1000);
    });
});
