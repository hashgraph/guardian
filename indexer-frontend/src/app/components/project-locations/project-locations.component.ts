import { Component, Input } from '@angular/core';
import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import { doubleClick, pointerMove } from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';
import { Router } from '@angular/router';
import { ProjectCoordinates } from '@indexer/interfaces';
import { getCenter } from 'ol/extent';
import { Geometry, MultiPolygon, Polygon } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { transform } from 'ol/proj';

const MAP_OPTIONS = {
    center: [0, 0],
    zoom: 0,
    maxZoom: 20,
};

const CLUSTER_DISTANCE = {
    distance: 35,
    minDistance: 20,
};
const CLUSTER = {
    RADIUS: 20,
    COLOR: '#19BE47',
    BORDER_COLOR: '#000',
    BORDER_WIDTH: 2,
    SELECTED_COLOR: '#fff',
    SELECTED_BORDER_COLOR: '#19BE47',
    FONT: 'bold 12px Inter, sans-serif',
    FONT_COLOR: '#fff',
};
const POINT = {
    RADIUS: 12,
    COLOR: '#19BE47',
    BORDER_COLOR: '#000',
    BORDER_WIDTH: 2,
    SELECTED_COLOR: '#fff',
    SELECTED_BORDER_COLOR: '#19BE47',
};

const POLYGON = {
    FILL_COLOR: 'rgba(25, 190, 71, 0.3)',
    BORDER_COLOR: '#19BE47',
    BORDER_WIDTH: 2,
    SELECTED_FILL_COLOR: 'rgba(255, 255, 255, 0.4)',
    SELECTED_BORDER_COLOR: '#19BE47',
    SELECTED_BORDER_WIDTH: 3
};

const cluster = new CircleStyle({
    radius: CLUSTER.RADIUS,
    fill: new Fill({ color: CLUSTER.COLOR }),
    stroke: new Stroke({
        color: CLUSTER.BORDER_COLOR,
        width: CLUSTER.BORDER_WIDTH,
    }),
});
const selectedCluster = new CircleStyle({
    radius: CLUSTER.RADIUS,
    fill: new Fill({ color: CLUSTER.SELECTED_COLOR }),
    stroke: new Stroke({
        color: CLUSTER.SELECTED_BORDER_COLOR,
        width: CLUSTER.BORDER_WIDTH,
    }),
});

const point = new CircleStyle({
    radius: POINT.RADIUS,
    fill: new Fill({ color: POINT.COLOR }),
    stroke: new Stroke({
        color: POINT.BORDER_COLOR,
        width: POINT.BORDER_WIDTH,
    }),
});
const selectedPoint = new CircleStyle({
    radius: POINT.RADIUS,
    fill: new Fill({ color: POINT.SELECTED_COLOR }),
    stroke: new Stroke({
        color: POINT.SELECTED_BORDER_COLOR,
        width: POINT.BORDER_WIDTH,
    }),
});

const polygon = new Style({
    fill: new Fill({
        color: POLYGON.FILL_COLOR,
    }),
    stroke: new Stroke({
        color: POLYGON.BORDER_COLOR,
        width: POLYGON.BORDER_WIDTH,
    }),
});
const selectedPolygon = new Style({
    fill: new Fill({
        color: POLYGON.SELECTED_FILL_COLOR,
    }),
    stroke: new Stroke({
        color: POLYGON.SELECTED_BORDER_COLOR,
        width: POLYGON.SELECTED_BORDER_WIDTH,
    }),
});

const styles: any = {
    Point: new Style({
        image: point,
    }),
};
function styleFunction(feature: any) {
    const size = feature.get('features').length;
    return size > 1
        ? new Style({
            image: cluster,
            text: new Text({
                font: CLUSTER.FONT,
                text: size.toString(),
                fill: new Fill({
                    color: CLUSTER.FONT_COLOR,
                }),
            }),
        })
        : styles.Point;
}

const activeStyles: any = {
    Point: new Style({
        image: selectedPoint,
    }),
    Cluster: new Style({
        image: selectedCluster,
    }),
    Polygon: selectedPolygon,
};
function activeStyleFunction(feature: any) {
    const geometry = feature.getGeometry();
    if (geometry) {
        const geometryType = geometry.getType();
        switch (geometryType) {
            case 'Point':
                const size = feature.get('features').length;
                return activeStyles[size > 1 ? 'Cluster' : 'Point'];

            default:
                return activeStyles[geometryType];
        }
    }

}

@Component({
    selector: 'app-project-locations',
    standalone: true,
    imports: [],
    templateUrl: './project-locations.component.html',
    styleUrl: './project-locations.component.scss',
})
export class ProjectLocationsComponent {
    @Input() projectLocations?: ProjectCoordinates[] = [];
    @Input() geoShapes?: any[] = [];

    public map!: Map;
    private vectorSource: VectorSource = new VectorSource();
    private polygonSource: VectorSource = new VectorSource();
    private center!: Coordinate;

    constructor(private router: Router) { }

    ngAfterViewInit() {
        // this.initMap();
    }

    ngOnChanges() {
        let mappedLocations: Record<string, ProjectCoordinates[]> = {};

        const points: any[] = [];

        if (this.projectLocations && this.projectLocations.length > 0) {
            // mappedLocations = this.projectLocations?.reduce((acc: Record<string, any[]>, location: ProjectCoordinates) => {
            //     (acc[location.projectId] ||= []).push(location);
            //     return acc;
            // }, {} as Record<string, ProjectCoordinates[]>)

            // const polygons: any[] = [];

            console.log(this.projectLocations);

            this.projectLocations.forEach(location => {
                const coordinates = location.coordinates
                    .split('|')
                    .map((coordinate: string) => parseFloat(coordinate));

                points.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: coordinates,
                    },
                    properties: {
                        projectId: location.projectId,
                    },
                });
            });
            
            
            // for (const [projectId, locations] of Object.entries(mappedLocations)) {
            //     const projectCoordinates: any = [];
            //     let pointsSum: number[] = [0, 0];

            //     locations.forEach(location => {
            //         const coordinates = location.coordinates
            //             .split('|')
            //             .map((coordinate: string) => parseFloat(coordinate));
            //         pointsSum[0] += coordinates[0];
            //         pointsSum[1] += coordinates[1];
            //         projectCoordinates.push(coordinates);

                    
            //         points.push({
            //             type: 'Feature',
            //             geometry: {
            //                 type: 'Point',
            //                 coordinates: coordinates,
            //             },
            //             properties: {
            //                 projectId: projectId,
            //             },
            //         });
            //     });

            //     const centerPoint: number[] = [pointsSum[0] / locations.length, pointsSum[1] / locations.length];

            //     points.push({
            //         type: 'Feature',
            //         geometry: {
            //             type: 'Point',
            //             coordinates: centerPoint,
            //         },
            //         properties: {
            //             projectId: projectId,
            //         },
            //     });
            // }

            const pointsFeature = new GeoJSON({
                featureProjection: 'EPSG:3857',
            }).readFeatures({
                type: 'FeatureCollection',
                features: points,
            });

            this.vectorSource?.clear(true);
            this.vectorSource?.addFeatures(pointsFeature);

            this.polygonSource?.clear(true);
            // this.polygonSource?.addFeatures(polygonsFeature);
        }

        if (this.geoShapes && this.geoShapes.length > 0) {
            console.log('geoShapes');
            
            const shapeFeatures: any[] = [];
            
            this.geoShapes.forEach((shape) => {
                var feature = {
                    type: 'Feature',
                    geometry: shape,
                }
                shapeFeatures.push(feature);


                this.center = transform(this.getFeatureCenter(shape), 'EPSG:4326', 'EPSG:3857');
            });


            const features = new GeoJSON({
                featureProjection: 'EPSG:3857',
            }).readFeatures({
                type: 'FeatureCollection',
                features: shapeFeatures,
            });

            // const polygonsFeature = new GeoJSON({
            //     featureProjection: 'EPSG:3857',
            // }).readFeatures({
            //     type: 'FeatureCollection',
            //     features: polygons,
            // });

            this.vectorSource?.clear(true);
            this.vectorSource?.addFeatures(features);

            this.polygonSource?.clear(true);
            this.polygonSource?.addFeatures(features);
        }

        if (!this.map) {
            setTimeout(() => {
                this.initMap();
                
                if (this.center) {
                    this.map.getView().animate({
                        center: this.center,
                        zoom: 15,
                        duration: 1000,
                    });
                }
            }, 0)
        }
    }

    initMap() {
        const clusterSource = new Cluster({
            distance: CLUSTER_DISTANCE.distance,
            minDistance: CLUSTER_DISTANCE.minDistance,
            source: this.vectorSource,
        });
        const clusterLayer = new VectorLayer({
            source: clusterSource,
            style: styleFunction,
        });

        const polygonLayer = new VectorLayer({
            source: this.polygonSource,
            style: polygon,
        });

        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                polygonLayer,
                clusterLayer,
            ],
            target: 'map',
            view: new View(MAP_OPTIONS),
        });
        const selectHover = new Select({
            condition: pointerMove,
            style: activeStyleFunction,
        });
        const selectClick = new Select({
            condition: doubleClick,
        });
        selectClick.getFeatures().on('add', (event) => {
            // tslint:disable-next-line:no-shadowed-variable
            const features = event.element.get('features');
            const geometry = event.element.getGeometry();

            if (geometry && features.length == 1 && features[0].get('projectId')) {
                const geometryType = geometry.getType();
                if (geometryType == 'Point') {
                    this.router.navigate([
                        '/vc-documents',
                        features[0].get('projectId'),
                    ]);
                }
            }
        });
        
        this.map.addInteraction(selectHover);
        this.map.addInteraction(selectClick);

        if (this.geoShapes) {
            this.map.getView().on('change:resolution', () => {
                const zoom = this.map.getView().getZoom();
                
                if (zoom && zoom > 10) {
                    clusterLayer.setVisible(false);
                    polygonLayer.setVisible(true);
                } else {
                    clusterLayer.setVisible(true);
                    polygonLayer.setVisible(false);
                }
            });
        }
    }

    getFeatureCenter(feature: any): number[] {
        if (!feature || !feature.type || !feature.coordinates) return [0, 0];

        const { type, coordinates } = feature;

        if (type === 'Point') {
            return coordinates;
        }

        if (type === 'Polygon') {
            const polygon = new Polygon(coordinates);
            return getCenter(polygon.getExtent());
        }

        if (type === 'MultiPolygon') {
            const multiPolygon = new MultiPolygon(coordinates);
            return getCenter(multiPolygon.getExtent());
        }

        return [0, 0];
    }
}
