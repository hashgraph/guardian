import { ProjectLocationsComponent } from './project-locations.component';
import { fakeAsync, tick } from '@angular/core/testing';
import { transform } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Select from 'ol/interaction/Select';
import VectorLayer from 'ol/layer/Vector';
import { Cluster } from 'ol/source';

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

describe('ProjectLocationsComponent shared centers', () => {
    function feature(id: string, coordinates = [36, -1]): Feature {
        const value = new Feature(new Point(transform(coordinates, 'EPSG:4326', 'EPSG:3857')));
        value.set('projectId', id);
        return value;
    }

    it('keeps both coincident markers and lets either document be opened from the cluster', fakeAsync(() => {
        const router = jasmine.createSpyObj('Router', ['navigate']);
        const component = new ProjectLocationsComponent(router);
        component.projectLocations = [
            { coordinates: '36|-1', projectId: 'document-a' },
            { coordinates: '36|-1', projectId: 'document-b' },
        ];
        component.ngOnChanges();
        tick();
        const layer = component.map.getLayers().item(2);
        if (!(layer instanceof VectorLayer)) throw new Error('Missing marker layer');
        const source = layer.getSource();
        if (!(source instanceof Cluster)) throw new Error('Missing cluster source');
        const selection = component.map.getInteractions().getArray()
            .filter((interaction): interaction is Select => interaction instanceof Select)[1];
        const cluster = new Feature(new Point(transform([36, -1], 'EPSG:4326', 'EPSG:3857')));
        cluster.set('features', source.getSource()!.getFeatures());
        selection.getFeatures().push(cluster);

        expect(component.clusterDocumentIds).toEqual(['document-a', 'document-b']);
        expect(router.navigate).not.toHaveBeenCalled();
        component.openDocument('document-b');
        expect(router.navigate).toHaveBeenCalledWith(['/vc-documents', 'document-b']);
        expect(selection.getFeatures().getLength()).toBe(0);
        expect(component.clusterDocumentIds).toEqual([]);
        component.map.setTarget(undefined);
    }));

    it('leaves ordinary clusters to the existing zoom interaction', () => {
        const router = jasmine.createSpyObj('Router', ['navigate']);
        const component = new ProjectLocationsComponent(router);
        component.selectCluster([feature('document-a'), feature('document-b', [37, -1])]);
        expect(component.clusterDocumentIds).toEqual([]);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('does not open document-page shapes without navigation identifiers', () => {
        const router = jasmine.createSpyObj('Router', ['navigate']);
        const component = new ProjectLocationsComponent(router);
        const shape = new Feature(new Point([0, 0]));
        component.selectCluster([shape, shape]);
        expect(component.clusterDocumentIds).toEqual([]);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('opens one coincident document directly even if several shapes share its center', () => {
        const router = jasmine.createSpyObj('Router', ['navigate']);
        const component = new ProjectLocationsComponent(router);
        component.selectCluster([feature('document-a'), feature('document-a')]);
        expect(router.navigate).toHaveBeenCalledOnceWith(['/vc-documents', 'document-a']);
        expect(component.clusterDocumentIds).toEqual([]);
    });

    it('reopens the same cluster after Close at maximum zoom', fakeAsync(() => {
        const component = new ProjectLocationsComponent(jasmine.createSpyObj('Router', ['navigate']));
        component.initMap();
        component.map.getView().setZoom(20);
        const selection = component.map.getInteractions().getArray()
            .filter((interaction): interaction is Select => interaction instanceof Select)[1];
        const cluster = new Feature(new Point([0, 0]));
        cluster.set('features', [feature('document-a'), feature('document-b')]);
        selection.getFeatures().push(cluster);
        expect(component.clusterDocumentIds).toEqual(['document-a', 'document-b']);

        component.closeDocumentPicker();
        expect(selection.getFeatures().getLength()).toBe(0);
        selection.getFeatures().push(cluster);
        expect(component.clusterDocumentIds).toEqual(['document-a', 'document-b']);
        component.map.setTarget(undefined);
        tick();
    }));
});
