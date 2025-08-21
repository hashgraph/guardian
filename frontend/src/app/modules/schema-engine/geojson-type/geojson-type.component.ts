import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { GeoJsonType } from '@guardian/interfaces';
import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js';
import { getCenter } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import { toLonLat, transform } from 'ol/proj';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { doubleClick, pointerMove } from 'ol/events/condition.js';
import { LineString, MultiLineString, MultiPoint, MultiPolygon, Polygon } from 'ol/geom';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import Select from 'ol/interaction/Select.js';
import { GeoForm } from '../schema-form-model/geo-form';
import { GeoJsonService } from 'src/app/services/geo-json.service';
import { DOMParser } from 'xmldom';
import { DialogService } from 'primeng/dynamicdialog';
import { UploadGeoDataDialog } from '../upload-geo-data-dialog/upload-geo-data-dialog.component';
import { Feature, FeatureCollection } from 'geojson';
import { kml } from '@tmcw/togeojson';

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
    MultiPoint: new Style({
        image: selectedPoint,
    }),
    LineString: new Style({
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
    @ViewChild('map', { static: false }) mapElementRef!: ElementRef;

    @Input('preset') presetDocument: any = null;
    @Input('form-model') formModel!: GeoForm;
    @Input('disabled') isDisabled: boolean = false;

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

    public map!: Map | null;
    public mapCreated: boolean = false;;
    private vectorSource: VectorSource = new VectorSource();
    private geoShapesSource: VectorSource = new VectorSource();
    private center: Coordinate | null;

    private selectedFeatureIndex: number = 0;
    private selectedRingIndex: number = 0;

    private lastSelectedGeometry: any;
    private lastSelectedCoordinates: any[] = [];

    public geometriesList: {
        type: GeoJsonType,
        coordinates: any
    }[] = [];

    constructor(
        private cdkRef: ChangeDetectorRef,
        private geoJsonService: GeoJsonService,
        private dialogService: DialogService
    ) { }

    private getValue() {
        const value = this.formModel?.getValue();
        if (!value || !value.type) {
            this.geometriesList.push({
                type: GeoJsonType.POINT,
                coordinates: undefined
            })
            return undefined;
        }
        if (
            value.type === GeoJsonType.POINT ||
            value.type === GeoJsonType.LINE_STRING ||
            value.type === GeoJsonType.POLYGON ||
            value.type === GeoJsonType.MULTI_POINT ||
            value.type === GeoJsonType.MULTI_LINE_STRING ||
            value.type === GeoJsonType.MULTI_POLYGON
        ) {
            this.geometriesList.push({
                type: value.type,
                coordinates: value.coordinates
            })
            return value;
        } else if (value.type === GeoJsonType.FEATURE_COLLECTION && value.features?.length > 0) {
            value.features.forEach((feature: any) => {
                if (feature && feature.geometry) {
                    this.geometriesList.push({
                        type: feature.geometry.type,
                        coordinates: feature.geometry.coordinates
                    })
                }
            });
        } else {
            return undefined;
        }
    }

    ngOnInit(): void {
        if (!this.formModel) {
            const form = new UntypedFormControl({});
            this.formModel = new GeoForm(form);
            this.formModel.setData({
                preset: this.presetDocument
            });
            this.formModel.build();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.isDisabled && !changes?.isDisabled.firstChange) {
            this.onViewTypeChange();
        }
    }

    ngAfterViewInit(): void {
        // this.resetCoordinatesStructure();
        if (this.getValue()) {
            this.onViewTypeChange(false);
        } else {
            this.onTypeChange(false);
            this.onViewTypeChange(false);
        }
        this.setupMap();
    }

    private setControlValue(value: any, dirty = true) {
        this.formModel?.setControlValue(value, dirty);
    }

    private setupMap() {
        if (!this.map && !this.mapCreated) {
            this.mapCreated = true;
            setTimeout(() => {
                this.initMap();

                if (this.center) {
                    this.map?.getView().animate({
                        center: this.center,
                        zoom: 7,
                        duration: 500,
                    });
                }
            }, 0)
        }
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

        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                geoShapesLayer,
                clusterLayer
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
    }

    private updateMap(updateInput: boolean = false) {
        // try {
            const shapeFeatures: any[] = this.geometriesList.map(item => ({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: item.type,
                    coordinates: item.coordinates?.length > 0 ? item.coordinates : item.coordinates && JSON.parse(item.coordinates) || [],
                }
            }));

            if (shapeFeatures.length <= 0) {
                return;
            }

            const features = new GeoJSON({
                featureProjection: 'EPSG:3857',
            }).readFeatures({
                type: 'FeatureCollection',
                features: shapeFeatures,
            });

            if (this.type == GeoJsonType.POLYGON && this.lastSelectedGeometry) {
                const coords = this.parsedCoordinates;
                const clickCoord = this.lastSelectedCoordinates;

                for (let i = 0; i < coords.length; i++) {
                    const ring = new Polygon([coords[i]]);
                    if (ring.intersectsCoordinate(clickCoord)) {
                        this.selectedRingIndex = i;

                        break;
                    }
                }
            }

            this.geoShapesSource?.clear(true);
            this.geoShapesSource?.addFeatures(features);

            if (updateInput) {
                // console.log({
                //     type: 'FeatureCollection',
                //     features: shapeFeatures
                // });

                this.coordinates = JSON.stringify(this.parsedCoordinates, null, 4);
                this.setControlValue({
                    type: 'FeatureCollection',
                    features: shapeFeatures
                }, true);
            }
        // } catch (error) {
        //     console.log(error);
        // }
    }

    private mapClick(coordinates: any) {
        if (this.isDisabled) {
            return;
        }

        const firstGeoType = this.geometriesList[0];


        try {
            switch (firstGeoType.type) {
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

            firstGeoType.coordinates = JSON.stringify(this.parsedCoordinates);

            this.updateMap(true);
        }
        catch { }
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

    public onTypeChange(geometry: any, dirty = true) {
        this.resetCoordinatesStructure(geometry);

        this.setControlValue({}, dirty); // todo

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

    public onViewTypeChange(dirty = true) {
        const value = this.formModel?.getValue();
        if (!value || !value.type) {

        if (!this.isJSON) {
            this.map = null;
            this.mapCreated = false;
            this.setupMap();
        }
            return;
        }

        if (this.isJSON || this.isDisabled) {
            this.jsonInput = JSON.stringify(value, null, 4);
        }

        if (!this.isJSON || this.isDisabled) {
            this.type = value?.type || GeoJsonType.POINT;
            this.coordinates = JSON.stringify(value?.coordinates, null, 4);


            this.geometriesList = [];

            value.features.forEach((feature: any) => {
                if (feature && feature.geometry && feature.geometry.type !== 'GeometryCollection') {
                    this.geometriesList.push({
                        type: feature.geometry.type,
                        coordinates: feature.geometry.coordinates
                    })
                }
            });
            
            this.updateMap(false);

            // this.coordinatesChanged(null);
            // this.onTypeChange(null, dirty);
            // this.coordinates = JSON.stringify(value?.coordinates, null, 4);

            // this.allCoordinatesChanged();
        }

        if (!this.isJSON) {
            this.map = null;
            this.mapCreated = false;
            this.setupMap();
        }
    }

    public jsonChanged() {
        try {
            let value = JSON.parse(this.jsonInput);
            if (value.features) {
                value.features = value.features.filter((feature: any) => feature?.geometry?.type && feature.geometry.type !== 'GeometryCollection');
            }
            this.setControlValue(value);
        } catch {
            this.setControlValue({});
        }
    }

    public addGeometry() {
        this.geometriesList.push({
            type: GeoJsonType.POINT,
            coordinates: undefined
        })
    }
    // [[[1,1],[1,2]]]
    public allCoordinatesChanged() {
        this.geometriesList.forEach(geometry => {
            this.coordinatesChanged(geometry);
        })
    }

    public coordinatesChanged(geometry: any) {
        try {

            // this.parsedCoordinates = JSON.parse(geometry.coordinates);
            const parsedCoordinates = geometry.coordinates;

            // this.setControlValue({
            //     type: geometry.type,
            //     coordinates: parsedCoordinates,
            // }, dirty);

            setTimeout(() => {
                if (geometry.type == GeoJsonType.POINT && parsedCoordinates?.length == 2) {
                    this.center = transform(parsedCoordinates, 'EPSG:4326', 'EPSG:3857');
                } else if (geometry.type == GeoJsonType.MULTI_POINT && parsedCoordinates?.[0]?.length == 2) {
                    const geometry = new MultiPoint(parsedCoordinates);
                    this.center = transform(getCenter(geometry.getExtent()), 'EPSG:4326', 'EPSG:3857');
                } else if (geometry.type == GeoJsonType.POLYGON && parsedCoordinates?.[0]?.[0]?.length == 2) {
                    const geometry = new Polygon(parsedCoordinates);
                    this.center = transform(getCenter(geometry.getExtent()), 'EPSG:4326', 'EPSG:3857');
                } else if (geometry.type == GeoJsonType.MULTI_POLYGON && parsedCoordinates?.[0]?.[0]?.[0]?.length == 2) {
                    const geometry = new MultiPolygon(parsedCoordinates);
                    this.center = transform(getCenter(geometry.getExtent()), 'EPSG:4326', 'EPSG:3857');
                } else if (geometry.type == GeoJsonType.LINE_STRING && parsedCoordinates?.[0]?.length == 2) {
                    const geometry = new LineString(parsedCoordinates);
                    this.center = transform(getCenter(geometry.getExtent()), 'EPSG:4326', 'EPSG:3857');
                } else if (geometry.type == GeoJsonType.MULTI_LINE_STRING && parsedCoordinates?.[0]?.[0]?.length == 2) {
                    const geometry = new MultiLineString(parsedCoordinates);
                    this.center = transform(getCenter(geometry.getExtent()), 'EPSG:4326', 'EPSG:3857');
                } else {
                    this.center = null;
                }

                if (this.center && this.center.length > 1) {
                    this.map?.getView().animate({
                        center: this.center,
                        zoom: 7,
                        duration: 500,
                    });

                    this.updateMap(true);
                }
            }, 500)
        } catch (e) {
            if (geometry.coordinates == '') {
                setTimeout(() => {
                    this.resetCoordinatesStructure(geometry);
                    // this.setControlValue({});
                    this.updateMap();
                }, 100)
            } else {
                setTimeout(() => {
                    // this.coordinates = JSON.stringify(this.parsedCoordinates, null, 4);
                }, 100)
            }
        }
    }

    private resetCoordinatesStructure(geometry: any) {
        switch (geometry.type) {
            case GeoJsonType.POINT:
                geometry.coordinates = [];
                break;
            case GeoJsonType.POLYGON:
                geometry.coordinates = [[]];
                break;
            case GeoJsonType.LINE_STRING:
                geometry.coordinates = [[]];
                break;
            case GeoJsonType.MULTI_POINT:
                geometry.coordinates = [[]];
                break;
            case GeoJsonType.MULTI_POLYGON:
                geometry.coordinates = [[[[]]]];
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                geometry.coordinates = [[]];
                break;
            default:
                break;
        }
    }

    authFailed() {
        this.cdkRef.detectChanges();
    }

    public importFromFile(file: any) {
        const fileType = file.name.split('.').pop()?.toLowerCase();

        if (fileType === 'json') {
            this.importJsonFile(file);
        } else if (fileType === 'kml') {
            this.importKmlFile(file);
        } else if (fileType === 'shp') {
            // this.importShapefile(file);
        } else {
            console.error('Wrong file format!');
        }
    }

    public importJsonFile(file: any) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;

            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                return;
            }

            const decoder = new TextDecoder('utf-8');
            const fileContent = decoder.decode(arrayBuffer);

            try {
                const geoJsonData = JSON.parse(fileContent);
                this.geoJsonService.saveFile(file.name, geoJsonData);
            } catch (error) {
                console.error('Error JSON:', error);
            }

            this.getShapeFromFile();
        });
    }

    public importKmlFile(file: any) {
        const reader = new FileReader();
        reader.readAsText(file);

        reader.addEventListener('load', (e: any) => {
            const kmlText = e.target.result;

            if (!kmlText) {
                return;
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(kmlText, 'application/xml');
            const geoJsonData = kml(xmlDoc);

            // geoJsonData.features.forEach((feature: any) => {
            //     if (feature.geometry.type === 'Point') {
            //         feature.geometry.coordinates = feature.geometry.coordinates.slice(0, 2);
            //     }
            // });
            // geoJsonData = geoJsonData.features[0].geometry;

            this.geoJsonService.saveFile(file.name, geoJsonData);

            this.getShapeFromFile();
        });
    }

    public getShapeFromFile() {
        const getFileNames = this.geoJsonService.getFileNames();

        for (const [id, name] of getFileNames) {
            const shapeFile = this.geoJsonService.getFile(id);

            if (shapeFile) {
                if (shapeFile.type === 'FeatureCollection') {
                    shapeFile.features = shapeFile.features.map((feature: any) => ({
                        type: feature.type,
                        geometry: feature.geometry,
                        property: {}
                    }));
                    this.onUploadMultiLocationFile(shapeFile);
                } else {
                    this.jsonInput = JSON.stringify(shapeFile.geometry, null, 4);
                    this.jsonChanged();
                }
            } else {
                this.setControlValue({});
            }
        }
    }

    public onUploadMultiLocationFile(featureCollection: FeatureCollection) {

        if (featureCollection) {
            this.jsonInput = JSON.stringify(featureCollection, null, 4);
            this.jsonChanged();
        }

        // const dialogRef = this.dialogService.open(UploadGeoDataDialog, {
        //     header: 'Upload file',
        //     width: '860px',
        //     styleClass: 'custom-dialog',
        //     data: {
        //         featureCollection,
        //     }
        // });
        // dialogRef.onClose.subscribe(async (result) => {
        //     if (result && result.feature) {
        //         this.jsonInput = JSON.stringify(result.feature.geometry, null, 4);
        //         this.jsonChanged();
        //     }
        // });
    }
}
