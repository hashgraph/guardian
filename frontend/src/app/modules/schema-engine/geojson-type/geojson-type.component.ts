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
import { transform } from 'ol/proj';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { doubleClick, pointerMove } from 'ol/events/condition.js';
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

const defaultStyles: any = {
    Point: new Style({
        image: pointStyle,
    }),
    Cluster: new Style({
        image: clusterStyle,
    }),
    MultiPoint:  new Style({
        image: pointStyle,
    }),
    LineString:  new Style({
        image: pointStyle,
    }),
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
    MultiPoint:  new Style({
        image: selectedPoint,
    }),
    LineString:  new Style({
        image: selectedPoint,
    }),
    Polygon: selectedPolygon,
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

@Component({
    selector: 'app-geojson-type',
    templateUrl: './geojson-type.component.html',
    styleUrls: ['./geojson-type.component.scss'],
})
export class GeojsonTypeComponent implements OnInit, OnChanges {
    @Input('formGroup') control?: UntypedFormControl;
    @Input('preset') presetDocument: any = null;
    @Input('disabled') isDisabled: boolean = false;

    updateCoordinates: Subject<any> = new Subject<any>();

    mapOptions: google.maps.MapOptions = {
        clickableIcons: false,
        disableDoubleClickZoom: true,
        minZoom: 5,
    };
    center2: google.maps.LatLngLiteral = {
        lat: 37,
        lng: -121,
    };
    markers: {
        position: google.maps.LatLngLiteral;
    }[] = [];
    polygons: {
        paths: google.maps.LatLngLiteral[];
    }[] = [];
    lines: {
        path: google.maps.LatLngLiteral[];
    }[] = [];
    commonOptions: google.maps.MarkerOptions &
        google.maps.PolygonOptions &
        google.maps.PolylineOptions = {
            animation: null,
            clickable: false,
        };
    type: GeoJsonType = GeoJsonType.POINT;
    coordinatesPlaceholder!: string;
    pointConstructor: any = [];
    pointMarkerOptions: google.maps.MarkerOptions = {
        icon: {
            path: 0,
            scale: 5,
        },
        clickable: false,
    };
    coordinates: string = '';
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
    private center!: Coordinate;

    constructor(
        public mapService: MapService,
        private cdkRef: ChangeDetectorRef
    ) {
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

    private updateMap() {
        // this.markers = [];
        // this.polygons = [];
        // this.lines = [];

        const parsedCoordinates = JSON.parse(this.coordinates);
        console.log(this.type);
        console.log(parsedCoordinates);

        const shapeFeatures: any[] = [];

        shapeFeatures.push({
            type: 'Feature',
            geometry: {
                type: this.type,
                coordinates: parsedCoordinates,
            },
            properties: {
                // projectId: location.projectId,
            },
        });

        shapeFeatures.push({
            type: 'Feature',
            geometry: new LineString([[1,1], [4,4]]),
            properties: {
                // projectId: location.projectId,
            },
        });

        // var feature = new Feature({
        //     geometry: new LineString([
        //     [1, 1],
        //     [4, 4]
        // ])});

        // shapeFeatures.push(feature);
        
        // [
        //     [
        //         [
        //             [1, 1],
        //             [1, 4],
        //             [4, 1],
        //             [4, 4]
        //         ]
        //     ],
        //     [
        //         [
        //             [5, 5],
        //             [5, 9],
        //             [9, 5],
        //             [9, 9]
        //         ]
        //     ]
        // ]
        

        const features = new GeoJSON({
            featureProjection: 'EPSG:3857',
        }).readFeatures({
            type: 'FeatureCollection',
            features: shapeFeatures,
        });

        // this.vectorSource?.clear(true);
        // this.vectorSource?.addFeatures(features);

        this.geoShapesSource?.clear(true);
        this.geoShapesSource?.addFeatures(features);







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

        const geoShapesLayer = new VectorLayer({
            source: this.geoShapesSource,
            style: styleFunction,
        });
        
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                geoShapesLayer,
                clusterLayer,
            ],
            target: this.mapElementRef.nativeElement,
            view: new View(MAP_OPTIONS),
        });
        const selectHover = new Select({
            condition: pointerMove,
            style: activeStyleFunction,
        });
        const selectClick = new Select({
            condition: doubleClick,
            style: styleFunction,
        });
        selectClick.getFeatures().on('add', (event) => {
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

        this.map.addInteraction(selectHover);
        this.map.addInteraction(selectClick);
        
        if (this.geoShapes && this.geoShapes.length > 0) {
            this.map.getView().on('change:resolution', () => {
                const zoom = this.map?.getView().getZoom();

                if (zoom && zoom > 10) {
                    clusterLayer.setVisible(false);
                    geoShapesLayer.setVisible(true);
                } else {
                    clusterLayer.setVisible(true);
                    geoShapesLayer.setVisible(false);
                }
            });
        }
    }
    

    getFeatureCenter(feature: any): number[] {
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

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.isDisabled && !changes?.isDisabled.firstChange) {
            this.onViewTypeChange(this.control?.value);
        }

        // this.setupMap();
    }

    ngOnInit(): void {
        // this.commonOptions = {

        // }

        // this.onTypeChange(false);
        // this.control?.setValidators(
        //     ajvSchemaValidator(new ajv().compile(GeoJsonSchema))
        // );
        // this.control?.updateValueAndValidity();
        // this.updateCoordinates.subscribe(this.onCoordinatesUpdate.bind(this));
        // this.onViewTypeChange(this.presetDocument, false);
    }

    ngAfterViewInit(): void {
        this.commonOptions = {

        }

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

    // mapClick(event: any) {
    //     if (this.isDisabled) {
    //         return;
    //     }

    //     switch (this.type) {
    //         case GeoJsonType.POINT:
    //             this.markers[0] = {
    //                 position: {
    //                     lat: event.latLng.lat(),
    //                     lng: event.latLng.lng(),
    //                 },
    //             };
    //             this.updateCoordinates.next([
    //                 event.latLng.lng(),
    //                 event.latLng.lat(),
    //             ]);
    //             break;
    //         case GeoJsonType.MULTI_POINT:
    //             this.markers.push({
    //                 position: {
    //                     lat: event.latLng.lat(),
    //                     lng: event.latLng.lng(),
    //                 },
    //             });
    //             this.updateCoordinates.next(
    //                 this.markers.map((item: any) => [
    //                     item.position.lng,
    //                     item.position.lat,
    //                 ])
    //             );
    //             break;
    //         case GeoJsonType.MULTI_POLYGON:
    //         case GeoJsonType.MULTI_LINE_STRING:
    //         case GeoJsonType.LINE_STRING:
    //         case GeoJsonType.POLYGON:
    //             this.pointConstructor.push({
    //                 lng: event.latLng.lng(),
    //                 lat: event.latLng.lat(),
    //             });
    //             break;
    //         default:
    //             break;
    //     }
    // }

    // mapDblclick() {
    //     if (this.isDisabled) {
    //         return;
    //     }

    //     switch (this.type) {
    //         case GeoJsonType.POLYGON:
    //             this.pointConstructor.push(this.pointConstructor[0]);
    //             this.polygons[0] = {
    //                 paths: this.pointConstructor,
    //             };
    //             this.updateCoordinates.next([
    //                 this.polygons[0].paths.map((path: any) => [
    //                     path.lng,
    //                     path.lat,
    //                 ]),
    //             ]);
    //             break;
    //         case GeoJsonType.MULTI_POLYGON:
    //             this.pointConstructor.push(this.pointConstructor[0]);
    //             this.polygons.push({
    //                 paths: this.pointConstructor,
    //             });
    //             this.updateCoordinates.next(
    //                 this.polygons.map((polygon: any) => [
    //                     polygon.paths.map((path: any) => [path.lng, path.lat]),
    //                 ])
    //             );
    //             break;
    //         case GeoJsonType.LINE_STRING:
    //             this.lines[0] = {
    //                 path: this.pointConstructor,
    //             };
    //             this.updateCoordinates.next(
    //                 this.lines[0].path.map((path: any) => [path.lng, path.lat])
    //             );
    //             break;
    //         case GeoJsonType.MULTI_LINE_STRING:
    //             this.lines.push({
    //                 path: this.pointConstructor,
    //             });
    //             this.updateCoordinates.next(
    //                 this.lines.map((line: any) =>
    //                     line.path.map((path: any) => [path.lng, path.lat])
    //                 )
    //             );
    //             break;
    //         default:
    //             break;
    //     }

    //     this.pointConstructor = [];
    // }

    // mapRightclick() {
    //     if (this.pointConstructor?.length) {
    //         this.pointConstructor.pop();
    //         return;
    //     }

    //     switch (this.type) {
    //         case GeoJsonType.POINT:
    //             this.markers.pop();
    //             this.updateCoordinates.next(
    //                 this.markers[0]
    //                     ? [
    //                         this.markers[0].position.lng,
    //                         this.markers[0].position.lat,
    //                     ]
    //                     : null
    //             );
    //             break;
    //         case GeoJsonType.MULTI_POINT:
    //             this.markers.pop();
    //             this.updateCoordinates.next(
    //                 this.markers.length
    //                     ? this.markers.map((item: any) => [
    //                         item.position.lng,
    //                         item.position.lat,
    //                     ])
    //                     : null
    //             );
    //             break;
    //         case GeoJsonType.POLYGON:
    //             this.polygons?.pop();
    //             this.updateCoordinates.next(
    //                 this.polygons[0]
    //                     ? [
    //                         this.polygons[0].paths.map((path: any) => [
    //                             path.lng,
    //                             path.lat,
    //                         ]),
    //                     ]
    //                     : null
    //             );
    //             break;
    //         case GeoJsonType.MULTI_POLYGON:
    //             this.polygons?.pop();
    //             this.updateCoordinates.next(
    //                 this.polygons.length
    //                     ? this.polygons.map((polygon: any) => [
    //                         polygon.paths.map((path: any) => [
    //                             path.lng,
    //                             path.lat,
    //                         ]),
    //                     ])
    //                     : null
    //             );
    //             break;
    //         case GeoJsonType.LINE_STRING:
    //             this.lines?.pop();
    //             this.updateCoordinates.next(
    //                 this.lines[0]?.path.map((path: any) => [
    //                     path.lng,
    //                     path.lat,
    //                 ]) || null
    //             );
    //             break;
    //         case GeoJsonType.MULTI_LINE_STRING:
    //             this.lines?.pop();
    //             this.updateCoordinates.next(
    //                 this.lines.length
    //                     ? this.lines.map((line: any) =>
    //                         line.path.map((path: any) => [path.lng, path.lat])
    //                     )
    //                     : null
    //             );
    //             break;
    //         default:
    //             break;
    //     }
    // }

    onTypeChange(dirty = true) {
        this.setControlValue({}, dirty);
        this.coordinates = '';
        this.markers = [];
        this.polygons = [];
        this.lines = [];
        this.pointConstructor = [];

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
    }

    onViewTypeChange(value: any, dirty = true) {
        if (!value) {
            return;
        }

        if (this.isJSON || this.isDisabled) {
            this.jsonInput = JSON.stringify(value, null, 4);
            this.map = null;
            this.mapCreated = false;
        }

        if (!this.isJSON || this.isDisabled) {
            this.type = value?.type;
            this.onTypeChange(dirty);
            this.coordinates = JSON.stringify(value?.coordinates, null, 4);
            this.coordinatesChanged(dirty);
        
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
        this.markers = [];
        this.polygons = [];
        this.lines = [];
        try {
            const parsedCoordinates = JSON.parse(this.coordinates);
            this.setControlValue({
                type: this.type,
                coordinates: parsedCoordinates,
            }, dirty);
            switch (this.type) {
                case GeoJsonType.POINT:
                    this.markers.push({
                        position: {
                            lat: parsedCoordinates[1],
                            lng: parsedCoordinates[0],
                        },
                    });
                    this.center2 = {
                        lat: parsedCoordinates[1],
                        lng: parsedCoordinates[0],
                    };
                    break;
                case GeoJsonType.POLYGON:
                    this.polygons.push({
                        paths: parsedCoordinates[0].map((path: any) => {
                            return { lat: path[1], lng: path[0] };
                        }),
                    });
                    this.center2 = {
                        lat: parsedCoordinates[0][0][1],
                        lng: parsedCoordinates[0][0][0],
                    };
                    break;
                case GeoJsonType.LINE_STRING:
                    this.lines.push({
                        path: parsedCoordinates.map((path: any) => {
                            return { lat: path[1], lng: path[0] };
                        }),
                    });
                    this.center2 = {
                        lat: parsedCoordinates[0][1],
                        lng: parsedCoordinates[0][0],
                    };
                    break;
                case GeoJsonType.MULTI_POINT:
                    for (const coordinate of parsedCoordinates) {
                        this.markers.push({
                            position: {
                                lat: coordinate[1],
                                lng: coordinate[0],
                            },
                        });
                    }
                    this.center2 = {
                        lat: parsedCoordinates[0][1],
                        lng: parsedCoordinates[0][0],
                    };
                    break;
                case GeoJsonType.MULTI_POLYGON:
                    for (const paths of parsedCoordinates) {
                        this.polygons.push({
                            paths: paths[0].map((path: any) => {
                                return { lat: path[1], lng: path[0] };
                            }),
                        });
                    }
                    this.center2 = {
                        lat: parsedCoordinates[0][0][0][1],
                        lng: parsedCoordinates[0][0][0][0],
                    };
                    break;
                case GeoJsonType.MULTI_LINE_STRING:
                    for (const paths of parsedCoordinates) {
                        this.lines.push({
                            path: paths.map((path: any) => {
                                return { lat: path[1], lng: path[0] };
                            }),
                        });
                    }
                    this.center2 = {
                        lat: parsedCoordinates[0][0][1],
                        lng: parsedCoordinates[0][0][0],
                    };
                    break;
                default:
                    break;
            }
            
            this.updateMap();
        } catch {
            this.setControlValue({});
        }
    }

    authFailed() {
        this.mapService.mapLoaded = false;
        this.cdkRef.detectChanges();
    }
}
