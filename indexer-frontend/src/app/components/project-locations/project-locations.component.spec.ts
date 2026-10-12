import { ProjectLocationsComponent } from './project-locations.component';
import { transform } from 'ol/proj';

describe('ProjectLocationsComponent geospatial shapes', () => {
    const point = { type: 'Point', coordinates: [36, -1] };
    const line = { type: 'LineString', coordinates: [[34, -3], [38, 1]] };
    const polygon = { type: 'Polygon', coordinates: [[[34, -3], [38, -3], [38, 1], [34, 1], [34, -3]]] };

    function createComponent(): any {
        const component: any = new ProjectLocationsComponent(jasmine.createSpyObj('Router', ['navigate']));
        component.map = {};
        return component;
    }

    const values = [point, line, { ...line, type: 'MultiPoint' }, polygon,
        { ...polygon, type: 'MultiLineString' }, { type: 'MultiPolygon', coordinates: [polygon.coordinates] }];

    for (const geometry of values) {
        it(`renders and centers a wrapped ${geometry.type} with the real GeoJSON reader`, () => {
            const component = createComponent();
            const shape = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry }],
                geoFile: { noPreview: true, automaticPoint: [0, 0] } };
            const original = JSON.stringify(shape);
            component.geoShapes = [shape];
            component.ngOnChanges();
            const features = component.geoShapesSource.getFeatures();
            expect(features.length).toBe(1);
            expect(features[0].getGeometry().getType()).toBe(geometry.type);
            expect(component.vectorSource.getFeatures().length).toBe(1);
            expect(component.center).toEqual(transform(component.getFeatureCenter(geometry), 'EPSG:4326', 'EPSG:3857'));
            expect(JSON.stringify(shape)).toBe(original);
        });
    }

    it('accepts array fields, standalone Features, bare geometries and null feature geometries together', () => {
        const component = createComponent();
        component.geoShapes = [[{ type: 'Feature', geometry: point }, line], {
            type: 'FeatureCollection', features: [{ type: 'Feature', geometry: null }, { type: 'Feature', geometry: polygon }],
        }];
        component.ngOnChanges();
        expect(component.geoShapesSource.getFeatures().map((feature: any) => feature.getGeometry().getType()))
            .toEqual(['Point', 'LineString', 'Polygon']);
    });

    it('renders an empty FeatureCollection without throwing or inventing a location', () => {
        const component = createComponent();
        component.geoShapes = [{ type: 'FeatureCollection', features: [] }];
        component.ngOnChanges();
        expect(component.geoShapesSource.getFeatures()).toEqual([]);
        expect(component.center).toBeUndefined();
    });

    it('draws a LineString with a visible stroke and keeps the point marker style', () => {
        const component = createComponent();
        component.geoShapes = [{ type: 'FeatureCollection', features: [
            { type: 'Feature', geometry: line },
            { type: 'Feature', geometry: point },
        ] }];
        component.ngOnChanges();
        component.initMap();
        const shapesLayer = component.map.getLayers().item(1);
        const [lineFeature, pointFeature] = component.geoShapesSource.getFeatures();
        const lineStyle = shapesLayer.getStyleFunction()(lineFeature, 1);
        const pointStyle = shapesLayer.getStyleFunction()(pointFeature, 1);
        expect(lineStyle.getStroke()?.getColor()).toBe('#19BE47');
        expect(lineStyle.getStroke()?.getWidth()).toBeGreaterThan(0);
        expect(pointStyle.getImage()).toBeTruthy();
        component.map.setTarget(undefined);
    });

    it('preserves project marker coordinates and the document navigation id', () => {
        const component = createComponent();
        component.projectLocations = [{ coordinates: '36|-1', projectId: 'document-id' }];
        component.ngOnChanges();
        const features = component.vectorSource.getFeatures();
        expect(features.length).toBe(1);
        expect(features[0].get('projectId')).toBe('document-id');
        expect(features[0].getGeometry().getCoordinates()).toEqual(transform([36, -1], 'EPSG:4326', 'EPSG:3857'));
    });
});
