import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { GeoJsonSchema, GeoJsonType } from '@guardian/interfaces';
import ajv from 'ajv';
import { Subject } from 'rxjs';
import { MapService } from 'src/app/services/map.service';
import { ajvSchemaValidator } from 'src/app/validators/ajv-schema.validator';

import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js';
import { getCenter } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import { toLonLat, transform } from 'ol/proj';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { doubleClick, pointerMove, singleClick } from 'ol/events/condition.js';
import { LineString, MultiLineString, MultiPoint, MultiPolygon, Polygon } from 'ol/geom';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import Select from 'ol/interaction/Select.js';
import Feature from 'ol/Feature';



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
    SELECTED_FILL_COLOR2: 'rgba(0, 0, 255, 0.2)',
    SELECTED_BORDER_COLOR: '#19BE47',
    SELECTED_BORDER_WIDTH: 3
};

const clusterStyle = new CircleStyle({
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

const pointStyle = new CircleStyle({
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

const polygonStyle = new Style({
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
const selectedPolygon2 = new Style({
    fill: new Fill({
        color: POLYGON.SELECTED_FILL_COLOR2,
    }),
    stroke: new Stroke({
        color: POLYGON.SELECTED_BORDER_COLOR,
        width: POLYGON.SELECTED_BORDER_WIDTH,
    }),
});

const defaultStyles: any = {
    Point: new Style({
        image: pointStyle,
    }),
    Cluster: new Style({
        image: clusterStyle,
    }),
    MultiPoint: new Style({
        image: pointStyle,
    }),
    LineString: polygonStyle,
    Polygon: polygonStyle,
    MultiLineString: polygonStyle,
    MultiPolygon: polygonStyle,
};

const activeStyles: any = {
    Point: new Style({
        image: selectedPoint,
    }),
    Cluster: new Style({
        image: selectedCluster,
    }),
    MultiPoint: new Style({
        image: selectedPoint,
    }),
    LineString: selectedPolygon,
    Polygon: selectedPolygon,
    MultiLineString: selectedPolygon,
    MultiPolygon: selectedPolygon,
};

const selectedStyles: any = {
    Point: new Style({
        image: selectedPoint,
    }),
    Cluster: new Style({
        image: selectedCluster,
    }),
    MultiPoint:  new Style({
        image: selectedPoint,
    }),
    LineString:  new Style({
        image: selectedPoint,
    }),
    Polygon: selectedPolygon2,
    MultiLineString: selectedPolygon,
    MultiPolygon: selectedPolygon,
};

function styleFunction(feature: any) {
    const geometry = feature.getGeometry();
    if (geometry) {
        const geometryType = geometry.getType();
        switch (geometryType) {
            case 'Point':
                const size = feature.get('features')?.length;
                return size > 1
                    ? new Style({
                        image: clusterStyle,
                        text: new Text({
                            font: CLUSTER.FONT,
                            text: size.toString(),
                            fill: new Fill({
                                color: CLUSTER.FONT_COLOR,
                            }),
                        }),
                    })
                    : defaultStyles.Point;
            default:
                return defaultStyles[geometryType];
        }
    }
}

function activeStyleFunction(feature: any) {
    const geometry = feature.getGeometry();
    if (geometry) {
        const geometryType = geometry.getType();
        switch (geometryType) {
            case 'Point':
                const size = feature.get('features')?.length;
                return activeStyles[size > 1 ? 'Cluster' : 'Point'];

            default:
                return activeStyles[geometryType];
        }
    }
}

function selectedStyleFunction(feature: any) {
    const geometry = feature.getGeometry();
    if (geometry) {
        const geometryType = geometry.getType();
        switch (geometryType) {
            case 'Point':
                const size = feature.get('features')?.length;
                return size > 1
                    ? new Style({
                        image: clusterStyle,
                        text: new Text({
                            font: CLUSTER.FONT,
                            text: size.toString(),
                            fill: new Fill({
                                color: CLUSTER.FONT_COLOR,
                            }),
                        }),
                    })
                    : selectedStyles.Point;
            default:
                return selectedStyles[geometryType];
        }
    }
}

@Component({
    selector: 'app-geojson-type',
    templateUrl: './geojson-type.component.html',
    styleUrls: ['./geojson-type.component.scss'],
})
export class GeojsonTypeComponent implements OnChanges {
    @Input('formGroup') control?: UntypedFormControl;
    @Input('preset') presetDocument: any = null;
    @Input('disabled') isDisabled: boolean = false;

    updateCoordinates: Subject<any> = new Subject<any>();

    center2: any = {
        lat: 37,
        lng: -121,
    };


    type: GeoJsonType = GeoJsonType.POINT;
    coordinatesPlaceholder!: string;

    coordinates: string = '';
    parsedCoordinates: any;
    isJSON: boolean = false;
    jsonInput: string = '';

    typeOptions = [
        { label: 'Point', value: 'Point' },
        { label: 'Polygon', value: 'Polygon' },
        { label: 'LineString', value: 'LineString' },
        { label: 'MultiPoint', value: 'MultiPoint' },
        { label: 'MultiPolygon', value: 'MultiPolygon' },
        { label: 'MultiLineString', value: 'MultiLineString' }
    ];


    ///

    @ViewChild('map', { static: false }) mapElementRef!: ElementRef;
    
    @Input() geoShapes?: any[] = [];

    public map!: Map | null;
    public mapCreated: boolean = false;;
    private vectorSource: VectorSource = new VectorSource();
    private geoShapesSource: VectorSource = new VectorSource();
    private selectedSource: VectorSource = new VectorSource();
    private center!: Coordinate;

    private selectedFeatureIndex: number = 0;
    private selectedRingIndex: number = 0;

    private lastSelectedGeometry: any;
    private lastSelectedCoordinates: any[] = [];

    constructor(
        public mapService: MapService,
        private cdkRef: ChangeDetectorRef
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.isDisabled && !changes?.isDisabled.firstChange) {
            this.onViewTypeChange(this.control?.value);
        }

        // this.setupMap();
    }

    ngAfterViewInit(): void {
        this.resetCoordinatesStructure();

        this.onTypeChange(false);
        this.control?.setValidators(
            ajvSchemaValidator(new ajv().compile(GeoJsonSchema))
        );
        this.control?.updateValueAndValidity();
        this.updateCoordinates.subscribe(this.onCoordinatesUpdate.bind(this));
        this.onViewTypeChange(this.presetDocument, false);

        // this.map = null;
        this.setupMap();
    }

    private setupMap() {
        // this.markers = [];
        // this.polygons = [];
        // this.lines = [];

        if (this.geoShapes && this.geoShapes.length > 0) {
            const shapeFeatures: any[] = [];

            this.geoShapes.forEach((shape) => {
                if (Array.isArray(shape)) {
                    for (const item of shape) {
                        var feature = {
                            type: 'Feature',
                            geometry: item,
                        }
                        
                        shapeFeatures.push(feature);
                        this.center = transform(this.getFeatureCenter(item), 'EPSG:4326', 'EPSG:3857');
                    }
                }
                else {
                    var feature = {
                        type: 'Feature',
                        geometry: shape,
                    }
                    
                    shapeFeatures.push(feature);
                    this.center = transform(this.getFeatureCenter(shape), 'EPSG:4326', 'EPSG:3857');
                }
            });

            const features = new GeoJSON({
                featureProjection: 'EPSG:3857',
            }).readFeatures({
                type: 'FeatureCollection',
                features: shapeFeatures,
            });

            this.vectorSource?.clear(true);
            this.vectorSource?.addFeatures(features);

            this.geoShapesSource?.clear(true);
            this.geoShapesSource?.addFeatures(features);
        }

        this.selectedSource?.clear(true);

        if (!this.map && !this.mapCreated) { // ?
            this.mapCreated = true;
            setTimeout(() => {
                this.initMap();

                if (this.center) {
                    this.map?.getView().animate({
                        center: this.center,
                        zoom: 15,
                        duration: 1000,
                    });
                }
            }, 0)
        }
    }

    private selectPolygon(coordinates: any) {
        const shapeFeatures: any[] = [];

        shapeFeatures.push({
            type: 'Feature',
            geometry: {
                type: GeoJsonType.POLYGON,
                coordinates: coordinates,
            },
        });

        const features = new GeoJSON({
            featureProjection: 'EPSG:3857',
        }).readFeatures({
            type: 'FeatureCollection',
            features: shapeFeatures,
        });

        this.selectedSource?.clear(true);
        this.selectedSource?.addFeatures(features);
    }
    
    private initMap() {
        const clusterSource = new Cluster({
            distance: CLUSTER_DISTANCE.distance,
            minDistance: CLUSTER_DISTANCE.minDistance,
            source: this.vectorSource,
        });
        const clusterLayer = new VectorLayer({
            source: clusterSource,
            style: styleFunction,
        });

        const geoShapesLayer = new VectorLayer({
            source: this.geoShapesSource,
            style: styleFunction,
        });

        const selectedLayer = new VectorLayer({
            source: this.selectedSource,
            style: selectedStyleFunction,
        });

        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                geoShapesLayer,
                clusterLayer,
                selectedLayer,
            ],
            target: this.mapElementRef.nativeElement,
            view: new View(MAP_OPTIONS),
        });
        const selectHover = new Select({
            condition: pointerMove,
            style: activeStyleFunction,
        });
        const selectDoubleClick = new Select({
            condition: doubleClick,
            style: styleFunction,
        });
        selectDoubleClick.getFeatures().on('add', (event) => {
            // tslint:disable-next-line:no-shadowed-variable
            const features = event.element.get('features');
            const geometry = event.element.getGeometry();

            if (geometry && features?.length == 1 && features[0].get('projectId')) {
                const geometryType = geometry.getType();
                if (geometryType == 'Point') {
                    // this.router.navigate([
                    //     '/vc-documents',
                    //     features[0].get('projectId'),
                    // ]);
                }
            }
        });

        this.map.on('singleclick', (evt) => {
            const clickOnFeature = this.map?.forEachFeatureAtPixel(evt.pixel, (feature) => {
                const geom = feature.getGeometry();
                if (geom instanceof Polygon) {
                    const coords = geom.getCoordinates();
                    const clickCoord = evt.coordinate;

                    for (let i = 0; i < coords.length; i++) {
                        const ring = new Polygon([coords[i]]);
                        if (ring.intersectsCoordinate(clickCoord)) {
                            this.selectedRingIndex = i;

                            this.lastSelectedGeometry = feature;
                            this.lastSelectedCoordinates = clickCoord;
                            // this.selectPolygon(ring.getCoordinates().map(ring2 =>
                            //     ring2.map(coord => toLonLat(coord))
                            // ));

                            break;
                        }
                    }
                } else if (geom instanceof MultiPolygon) {
                    const polygons = geom.getPolygons();
                    const clickCoord = evt.coordinate;

                    for (let i = 0; i < polygons.length; i++) {
                        const polygon = polygons[i];
                        const coords = polygon.getCoordinates();

                        for (let j = 0; j < coords.length; j++) {
                            const ring = new Polygon([coords[j]]);
                            if (ring.intersectsCoordinate(clickCoord)) {
                                this.selectedFeatureIndex = i;
                                this.selectedRingIndex = j;
                                break;
                            }
                        }
                    }
                }

                return true;
            })

            if (!clickOnFeature) {
                this.mapClick(toLonLat(evt.coordinate));
            }
        });

        this.map.on('dblclick', (evt) => {
            evt.preventDefault();
        });

        this.map.getViewport().addEventListener('contextmenu', (evt) => {
            evt.preventDefault();

            if (this.map) {
                const pixel = this.map.getEventPixel(evt);
                const coordinate = this.map.getCoordinateFromPixel(pixel);

                let featureIndex = 0;
                let ringIndex = 0;

                const clickOnFeature = this.map?.forEachFeatureAtPixel(pixel, (feature) => {
                    const geom = feature.getGeometry();
                    if (geom instanceof Polygon) {
                        const coords = geom.getCoordinates();

                        for (let i = 0; i < coords.length; i++) {
                            const ring = new Polygon([coords[i]]);
                            if (ring.intersectsCoordinate(coordinate)) {
                                ringIndex = i;
                                return true;
                            }
                        }
                        return false;
                    } else if (geom instanceof MultiPolygon) {
                        const polygons = geom.getPolygons();

                        for (let i = 0; i < polygons.length; i++) {
                            const polygon = polygons[i];
                            const coords = polygon.getCoordinates();

                            for (let j = 0; j < coords.length; j++) {
                                const ring = new Polygon([coords[j]]);
                                if (ring.intersectsCoordinate(coordinate)) {
                                    featureIndex = i;
                                    ringIndex = j;
                                    return true;
                                }
                            }
                        }
                        return false;
                    }

                    return true;
                })

                if (clickOnFeature) {
                    this.mapRightclick(featureIndex, ringIndex);
                }
            }
        });

        this.map.addInteraction(selectHover);
        this.map.addInteraction(selectDoubleClick);
        
        if (this.geoShapes && this.geoShapes.length > 0) {
            this.map.getView().on('change:resolution', () => {
                const zoom = this.map?.getView().getZoom();

                if (zoom && zoom > 10) {
                    clusterLayer.setVisible(false);
                    geoShapesLayer.setVisible(true);
                    selectedLayer.setVisible(true);
                } else {
                    clusterLayer.setVisible(true);
                    geoShapesLayer.setVisible(false);
                    selectedLayer.setVisible(false);
                }
            });
        }
    }
    
    private updateMap(updateInput: boolean = false) {

        const shapeFeatures: any[] = [];
        

        shapeFeatures.push({
            type: 'Feature',
            geometry: {
                type: this.type,
                coordinates: this.parsedCoordinates,
            },
            properties: {
                // projectId: location.projectId,
            },
        });

        console.log(shapeFeatures);
        console.log(this.parsedCoordinates);

        // shapeFeatures.push({
        //     type: 'Feature',
        //     geometry: new LineString([[1,1], [4,4]]),
        //     properties: {
        //         // projectId: location.projectId,
        //     },
        // });

        // var feature = new Feature({
        //     geometry: new LineString([
        //     [1, 1],
        //     [4, 4]
        // ])});

        // shapeFeatures.push(feature);
        
        [
            [
                [
                    [1, 1],
                    [1, 4],
                    [4, 4],
                    [4, 1]
                ],
                [
                    [5, 1],
                    [5, 4],
                    [8, 4],
                    [8, 1]
                ]
            ],
            [
                [
                    [15, 1],
                    [15, 4],
                    [18, 4],
                    [18, 1]
                ]
            ]
        ]
        

        const features = new GeoJSON({
            featureProjection: 'EPSG:3857',
        }).readFeatures({
            type: 'FeatureCollection',
            features: shapeFeatures,
        });

        if (this.type == GeoJsonType.POLYGON && this.lastSelectedGeometry) {
            const coords = this.parsedCoordinates;
            const clickCoord = this.lastSelectedCoordinates;

            console.log(coords);
            

            for (let i = 0; i < coords.length; i++) {
                const ring = new Polygon([coords[i]]);
                if (ring.intersectsCoordinate(clickCoord)) {
                    this.selectedRingIndex = i;

                    // this.selectPolygon(ring.getCoordinates().map(ring2 =>
                    //     ring2.map(coord => toLonLat(coord))
                    // ));

                    break;
                }
            }
        }

        // this.vectorSource?.clear(true);
        // this.vectorSource?.addFeatures(features);

        this.geoShapesSource?.clear(true);
        this.geoShapesSource?.addFeatures(features);
        
        if (updateInput) {
            this.coordinates = JSON.stringify(this.parsedCoordinates, null, 4);
            this.setControlValue({
                type: this.type,
                coordinates: this.parsedCoordinates,
            }, true);
        }
        


        if (this.geoShapes && this.geoShapes.length > 0) {
            const shapeFeatures: any[] = [];

            this.geoShapes.forEach((shape) => {
                if (Array.isArray(shape)) {
                    for (const item of shape) {
                        var feature = {
                            type: 'Feature',
                            geometry: item,
                        }
                        
                        shapeFeatures.push(feature);
                        this.center = transform(this.getFeatureCenter(item), 'EPSG:4326', 'EPSG:3857');
                    }
                }
                else {
                    var feature = {
                        type: 'Feature',
                        geometry: shape,
                    }
                    
                    shapeFeatures.push(feature);
                    this.center = transform(this.getFeatureCenter(shape), 'EPSG:4326', 'EPSG:3857');
                }
            });

            const features = new GeoJSON({
                featureProjection: 'EPSG:3857',
            }).readFeatures({
                type: 'FeatureCollection',
                features: shapeFeatures,
            });

            this.vectorSource?.clear(true);
            this.vectorSource?.addFeatures(features);

            this.geoShapesSource?.clear(true);
            this.geoShapesSource?.addFeatures(features);
        }
    }

    private getFeatureCenter(feature: any): number[] {
        if (!feature || !feature.type || !feature.coordinates) return [0, 0];

        const { type, coordinates } = feature;

        switch (type) {
            case 'Point': {
                return coordinates;
            }
            case 'MultiPoint': {
                const geometry = new MultiPoint(coordinates);
                return getCenter(geometry.getExtent());
            }
            case 'LineString': {
                const geometry = new LineString(coordinates);
                return getCenter(geometry.getExtent());
            }
            case 'Polygon': {
                const geometry = new Polygon(coordinates);
                return getCenter(geometry.getExtent());
            }
            case 'MultiLineString': {
                const geometry = new MultiLineString(coordinates);
                return getCenter(geometry.getExtent());
            }
            case 'MultiPolygon': {
                const geometry = new MultiPolygon(coordinates);
                return getCenter(geometry.getExtent());
            }
            default:
                return [0, 0];
        }
    }

    setControlValue(value: any, dirty = true) {
        this.control?.patchValue(value);
        if (dirty) {
            this.control?.markAsDirty();
        }
    }

    onCoordinatesUpdate(value: any) {
        if (!value) {
            this.coordinates = '';
            this.setControlValue({});
            return;
        }

        this.coordinates = JSON.stringify(value, null, 4);
        this.setControlValue({
            type: this.type,
            coordinates: value,
        });
    }

    private mapClick(coordinates: any) {
        if (this.isDisabled) {
            return;
        }
        
        [
            [
                [
                    [1, 1],
                    [1, 4],
                    [4, 4],
                    [4, 1]
                ],
            ],
            [
                [
                    [5, 1],
                    [5, 4],
                    [8, 4],
                    [8, 1]
                ],
                [
                    [15, 1],
                    [15, 4],
                    [18, 4],
                    [18, 1]
                ]
            ]
        ]
        
        try {
            switch (this.type) {
                case GeoJsonType.POINT:
                    this.parsedCoordinates = coordinates;
                    break;
                case GeoJsonType.MULTI_POINT:
                    if (this.parsedCoordinates?.[0]?.length <= 0) {
                        this.parsedCoordinates[0] = coordinates;
                        break;
                    }

                    this.parsedCoordinates.push(coordinates);
                    break;
                case GeoJsonType.POLYGON:
                    this.parsedCoordinates?.[this.selectedRingIndex]?.push(coordinates);
                    
                    break;
                case GeoJsonType.MULTI_POLYGON:
                    if (this.parsedCoordinates?.[this.selectedFeatureIndex]?.[this.selectedRingIndex][0]?.length <= 0) {
                        this.parsedCoordinates[this.selectedFeatureIndex][this.selectedRingIndex][0] = coordinates;
                        break;
                    }

                    this.parsedCoordinates?.[this.selectedFeatureIndex]?.[this.selectedRingIndex]?.push(coordinates);
                    break;
                case GeoJsonType.MULTI_LINE_STRING:
                    this.parsedCoordinates?.[this.selectedRingIndex]?.push(coordinates);
                    break;
                case GeoJsonType.LINE_STRING:
                    if (this.parsedCoordinates?.[0]?.length <= 0) {
                        this.parsedCoordinates[0] = coordinates;
                        break;
                    }

                    this.parsedCoordinates.push(coordinates);
                    break;
                default:
                    break;
            }
            
            this.updateMap(true);
        }
        catch {}
    }

    private mapRightclick(featureIndex = 0, ringIndex = 0) {
        switch (this.type) {
            case GeoJsonType.POINT:
                this.parsedCoordinates = [];
                break;
            case GeoJsonType.MULTI_POINT:
                this.parsedCoordinates.pop();
                break;
            case GeoJsonType.POLYGON:
                this.parsedCoordinates[featureIndex].pop();
                break;
            case GeoJsonType.MULTI_POLYGON:
                this.parsedCoordinates[featureIndex][ringIndex].pop();
                break;
            case GeoJsonType.LINE_STRING:
                this.parsedCoordinates.pop();
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                this.parsedCoordinates[featureIndex].pop();
                break;
            default:
                break;
        }

        this.updateMap(true);
    }

    onTypeChange(dirty = true) {
        this.resetCoordinatesStructure();

        this.setControlValue({}, dirty);
        this.coordinates = '';

        switch (this.type) {
            case GeoJsonType.POINT:
                this.coordinatesPlaceholder = JSON.stringify(
                    [1.23, 4.56],
                    null,
                    4
                );
                break;
            case GeoJsonType.POLYGON:
                this.coordinatesPlaceholder = JSON.stringify(
                    [
                        [
                            [1.23, 4.56],
                            [1.23, 4.56],
                            [1.23, 4.56],
                            [1.23, 4.56],
                        ],
                    ],
                    null,
                    4
                );
                break;
            case GeoJsonType.LINE_STRING:
                this.coordinatesPlaceholder = JSON.stringify(
                    [
                        [1.23, 4.56],
                        [1.23, 4.56],
                        [1.23, 4.56],
                    ],
                    null,
                    4
                );
                break;
            case GeoJsonType.MULTI_POINT:
                this.coordinatesPlaceholder = JSON.stringify(
                    [
                        [1.23, 4.56],
                        [1.23, 4.56],
                        [1.23, 4.56],
                        [1.23, 4.56],
                    ],
                    null,
                    4
                );
                break;
            case GeoJsonType.MULTI_POLYGON:
                this.coordinatesPlaceholder = JSON.stringify(
                    [
                        [
                            [
                                [1.23, 4.56],
                                [1.23, 4.56],
                                [1.23, 4.56],
                                [1.23, 4.56],
                            ],
                        ],
                        [
                            [
                                [1.23, 4.56],
                                [1.23, 4.56],
                                [1.23, 4.56],
                                [1.23, 4.56],
                            ],
                        ],
                    ],
                    null,
                    4
                );
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                this.coordinatesPlaceholder = JSON.stringify(
                    [
                        [
                            [1.23, 4.56],
                            [1.23, 4.56],
                            [1.23, 4.56],
                        ],
                        [
                            [1.23, 4.56],
                            [1.23, 4.56],
                            [1.23, 4.56],
                        ],
                    ],
                    null,
                    4
                );
                break;
            default:
                break;
        }

        this.updateMap(false);
    }

    onViewTypeChange(value: any, dirty = true) {
        if (!value) {
            return;
        }

        if (this.isJSON || this.isDisabled) {
            this.jsonInput = JSON.stringify(value, null, 4);
        }

        if (!this.isJSON || this.isDisabled) {
            this.type = value?.type;
            this.onTypeChange(dirty);
            this.coordinates = JSON.stringify(value?.coordinates, null, 4);
            this.coordinatesChanged(dirty);
        
        }

        if (!this.isJSON) {
            this.map = null;
            this.mapCreated = false;
            this.setupMap();
        }
    }

    jsonChanged() {
        try {
            this.setControlValue(JSON.parse(this.jsonInput));
        } catch {
            this.setControlValue({});
        }
    }

    coordinatesChanged(dirty = true) {
        try {

            this.parsedCoordinates = JSON.parse(this.coordinates);

            const parsedCoordinates = JSON.parse(this.coordinates);
            this.setControlValue({
                type: this.type,
                coordinates: parsedCoordinates,
            }, dirty);

            switch (this.type) {
                case GeoJsonType.POINT:
                    this.center2 = {
                        lat: parsedCoordinates[1],
                        lng: parsedCoordinates[0],
                    };
                    break;
                case GeoJsonType.POLYGON:
                    this.center2 = {
                        lat: parsedCoordinates[0][0][1],
                        lng: parsedCoordinates[0][0][0],
                    };
                    break;
                case GeoJsonType.LINE_STRING:
                    this.center2 = {
                        lat: parsedCoordinates[0][1],
                        lng: parsedCoordinates[0][0],
                    };
                    break;
                case GeoJsonType.MULTI_POINT:
                    this.center2 = {
                        lat: parsedCoordinates[0][1],
                        lng: parsedCoordinates[0][0],
                    };
                    break;
                case GeoJsonType.MULTI_POLYGON:
                    this.center2 = {
                        lat: parsedCoordinates[0][0][0][1],
                        lng: parsedCoordinates[0][0][0][0],
                    };
                    break;
                case GeoJsonType.MULTI_LINE_STRING:
                    this.center2 = {
                        lat: parsedCoordinates[0][0][1],
                        lng: parsedCoordinates[0][0][0],
                    };
                    break;
                default:
                    break;
            }
                      
            this.updateMap(true);
        } catch {
            if (this.coordinates == '') {
                setTimeout(() => {
                    this.resetCoordinatesStructure();
                    // this.coordinates = JSON.stringify(this.parsedCoordinates, null, 4);
                }, 100)
            } else {
                setTimeout(() => {
                    // this.coordinates = JSON.stringify(this.parsedCoordinates, null, 4);
                }, 100)
            }
            this.setControlValue({});
        }
    }

    private resetCoordinatesStructure() {
        switch (this.type) {
            case GeoJsonType.POINT:
                this.parsedCoordinates = [];
                break;
            case GeoJsonType.POLYGON:
                this.parsedCoordinates = [[]];
                break;
            case GeoJsonType.LINE_STRING:
                this.parsedCoordinates = [[]];
                break;
            case GeoJsonType.MULTI_POINT:
                this.parsedCoordinates = [[]];
                break;
            case GeoJsonType.MULTI_POLYGON:
                this.parsedCoordinates = [[[[]]]];
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                this.parsedCoordinates = [[]];
                break;
            default:
                break;
        }
    }

    authFailed() {
        this.mapService.mapLoaded = false;
        this.cdkRef.detectChanges();
    }
}
