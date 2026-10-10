import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GenerateUUIDv4, GeoJsonType } from '@guardian/interfaces';
import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js';
import { extend, getCenter, isEmpty } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import { toLonLat, transform } from 'ol/proj';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { doubleClick, pointerMove } from 'ol/events/condition.js';
import { LineString, MultiLineString, MultiPoint, MultiPolygon, Polygon } from 'ol/geom';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import Select from 'ol/interaction/Select.js';
import { GeoForm } from '../schema-form-model/geo-form';
import { GeoJsonService } from 'src/app/services/geo-json.service';
import { DOMParser } from '@xmldom/xmldom';
import { ArtifactService } from 'src/app/services/artifact.service';
import { GeoFileFormat, GeoFileLink, GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { DialogService } from 'primeng/dynamicdialog';
import { DEFAULT_GEOSPATIAL_LIMITS, GeospatialLimits, SettingsService } from 'src/app/services/settings.service';
import { classifyGeoFile, PreviewableGeoFileFormat } from '../geo-file/geo-file-size';
import { gunzipIfCompressed } from '../geo-file/geo-file-compression';
import { GeoCoordinate, readFirstCoordinate } from '../geo-file/first-coordinate-reader';
import { GeoJsonCoordinateScanner } from '../geo-file/geojson-coordinate-scanner';
import { KmzEntry, KmzReader } from '../geo-file/kmz-reader';
import { KmlCoordinateScanner } from '../geo-file/kml-coordinate-scanner';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { FeatureCollection } from 'geojson';
import { kml } from '@tmcw/togeojson';

const MAX_EDITABLE_SHAPES = 300;
const ROWS_PER_BATCH = 10;

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
    IMPORTED_COLOR: '#c4c4c4',
    IMPORTED_BORDER_COLOR: '#949494',
};
const POINT = {
    RADIUS: 12,
    COLOR: '#19BE47',
    BORDER_COLOR: '#000',
    BORDER_WIDTH: 2,
    SELECTED_COLOR: '#fff',
    SELECTED_BORDER_COLOR: '#19BE47',
    IMPORTED_COLOR: '#c4c4c4',
    IMPORTED_BORDER_COLOR: '#949494',
};
const POLYGON = {
    FILL_COLOR: 'rgba(25, 190, 71, 0.3)',
    BORDER_COLOR: '#19BE47',
    BORDER_WIDTH: 2,
    SELECTED_FILL_COLOR: 'rgba(255, 255, 255, 0.4)',
    SELECTED_FILL_COLOR2: 'rgba(0, 0, 255, 0.2)',
    SELECTED_BORDER_COLOR: '#19BE47',
    SELECTED_BORDER_WIDTH: 3,
    IMPORTED_COLOR: '#c4c4c4',
    IMPORTED_BORDER_COLOR: '#949494',
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
const importedCluster = new CircleStyle({
    radius: CLUSTER.RADIUS,
    fill: new Fill({ color: CLUSTER.IMPORTED_COLOR }),
    stroke: new Stroke({
        color: CLUSTER.IMPORTED_BORDER_COLOR,
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
const importedPoint = new CircleStyle({
    radius: POINT.RADIUS,
    fill: new Fill({ color: POINT.IMPORTED_COLOR }),
    stroke: new Stroke({
        color: POINT.IMPORTED_BORDER_COLOR,
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
const importedPolygon = new Style({
    fill: new Fill({
        color: POLYGON.IMPORTED_COLOR,
    }),
    stroke: new Stroke({
        color: POLYGON.IMPORTED_BORDER_COLOR,
        width: POLYGON.BORDER_WIDTH,
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
const importedStyles: any = {
    Point: new Style({
        image: importedPoint,
    }),
    Cluster: new Style({
        image: importedCluster,
    }),
    MultiPoint: new Style({
        image: importedPoint,
    }),
    LineString: importedPolygon,
    Polygon: importedPolygon,
    MultiLineString: importedPolygon,
    MultiPolygon: importedPolygon,
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
function importedStyleFunction(feature: any) {
    const geometry = feature.getGeometry();
    if (geometry) {
        const geometryType = geometry.getType();
        switch (geometryType) {
            case 'Point':
                const size = feature.get('features')?.length;
                return size > 1
                    ? new Style({
                        image: importedCluster,
                        text: new Text({
                            font: CLUSTER.FONT,
                            text: size.toString(),
                            fill: new Fill({
                                color: CLUSTER.FONT_COLOR,
                            }),
                        }),
                    })
                    : importedStyles.Point;
            default:
                return importedStyles[geometryType];
        }
    }
}

@Component({
    selector: 'app-geojson-type',
    templateUrl: './geojson-type.component.html',
    styleUrls: ['./geojson-type.component.scss'],
    standalone: false
})
export class GeojsonTypeComponent implements OnChanges {
    @ViewChild('map', { static: false }) mapElementRef!: ElementRef;

    @Input('preset') presetDocument: any = null;
    @Input('form-model') formModel!: GeoForm;
    @Input('disabled') isDisabled: boolean = false;
    @Input('available-options') availableOptions?: string[] = [];

    type: GeoJsonType = GeoJsonType.POINT;
    parsedCoordinates: any;
    isJSON: boolean = false;
    jsonInput: string = '';

    typeOptions = [
        { label: 'Point', value: GeoJsonType.POINT },
        { label: 'Polygon', value: GeoJsonType.POLYGON },
        { label: 'LineString', value: GeoJsonType.LINE_STRING },
        { label: 'MultiPoint', value: GeoJsonType.MULTI_POINT },
        { label: 'MultiPolygon', value: GeoJsonType.MULTI_POLYGON },
        { label: 'MultiLineString', value: GeoJsonType.MULTI_LINE_STRING }
    ];

    public map!: Map | null;
    public mapCreated: boolean = false;
    private vectorSource: VectorSource = new VectorSource();
    private geoShapesSource: VectorSource = new VectorSource();
    private importedShapesSource: VectorSource = new VectorSource();
    private center: Coordinate | null;

    private selectedFeatureIndex: number = 0;
    private selectedRingIndex: number = 0;

    private lastSelectedGeometry: any;
    private lastSelectedCoordinates: any[] = [];

    public geometriesList: {
        id: string,
        type: GeoJsonType,
        coordinates: any,
        coordinatesString?: string;
        coordinatesPlaceholder?: string;
    }[] = [];

    public displayedLocations: {
        type: GeoJsonType,
        coordinates: any
    }[] = [];

    public allImportedLocations: {
        id: string,
        type: GeoJsonType,
        coordinates: any
    }[] = [];

    public importedLocations: {
        id: string,
        type: GeoJsonType,
        coordinates: any
    }[] = [];

    public selectedImportedLocations: {
        id: string,
        type: GeoJsonType,
        coordinates: any
    }[] = [];

    public fileImportName: string = '';
    public fileImportSize: number = 0;
    public loading: boolean = false;
    public readonly maxEditableShapes = MAX_EDITABLE_SHAPES;
    public renderedRows: number = Infinity;
    public importError: string = '';
    private pendingGeoFile?: GeoFileLink;
    private selectedOriginalFile?: File;
    private geospatialLimits?: GeospatialLimits;
    private limitsRequest?: Promise<GeospatialLimits>;
    private readonly kmzReader = new KmzReader();

    constructor(
        private cdkRef: ChangeDetectorRef,
        private geoJsonService: GeoJsonService,
        private geoFiles: GeoFilePersistenceService,
        private artifacts: ArtifactService,
        private settings: SettingsService,
        private dialog: DialogService
    ) { }


    private sameCoord(a: any, b: any): boolean {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        const len = Math.min(a.length, b.length, 3); // lon, lat, alt
        for (let i = 0; i < len; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    private closeRing(ring: any[]): any[] {
        if (!Array.isArray(ring)) return ring;
        const n = ring.length;
        if (n >= 3 && !this.sameCoord(ring[0], ring[n - 1])) {
            return [...ring, Array.isArray(ring[0]) ? [...ring[0]] : ring[0]];
        }
        return ring;
    }

    private normalizeGeometryForTransport(geom: any): any {
        if (!geom || typeof geom !== 'object') return geom;

        if (geom.type === 'Polygon') {
            const rings = Array.isArray(geom.coordinates)
                ? geom.coordinates.map((ring: any) => this.closeRing(ring))
                : geom.coordinates;
            return { ...geom, coordinates: rings };
        }

        if (geom.type === 'MultiPolygon') {
            const polys = Array.isArray(geom.coordinates)
                ? geom.coordinates.map((poly: any) =>
                    Array.isArray(poly) ? poly.map((ring: any) => this.closeRing(ring)) : poly
                )
                : geom.coordinates;
            return { ...geom, coordinates: polys };
        }
        return geom;
    }

    private normalizeGeoJSON(value: any): any {
        if (!value || typeof value !== 'object') return value;
        const geoFile = value.geoFile || this.pendingGeoFile || this.formModel?.getValue?.()?.geoFile;

        if (value.type === 'FeatureCollection' && Array.isArray(value.features)) {
            return {
                type: 'FeatureCollection',
                features: value.features
                    .filter((f: any) => f && f.geometry && f.geometry.type !== 'GeometryCollection')
                    .map((f: any) => ({
                        ...f,
                        geometry: this.normalizeGeometryForTransport(f.geometry),
                    })),
                ...(geoFile ? { geoFile } : {})
            };
        }
        if (value.type === 'Feature' && value.geometry) {
            return {
                ...value,
                geometry: this.normalizeGeometryForTransport(value.geometry),
                ...(geoFile ? { geoFile } : {})
            };
        }

        if (typeof value.type === 'string' && 'coordinates' in value) {
            return {
                ...this.normalizeGeometryForTransport(value),
                ...(geoFile ? { geoFile } : {})
            };
        }

        return value;
    }

    private buildExportObject(): any {
        const v = this.formModel?.getValue?.() || {};

        if (v && typeof v === 'object' && v.type === 'FeatureCollection' && Array.isArray(v.features)) {
            const features = v.features
                .filter((f: any) => f && f.geometry && f.geometry.type !== 'GeometryCollection')
                .map((f: any) => ({ ...f, geometry: this.normalizeGeometryForTransport(f.geometry) }));
            return { type: 'FeatureCollection', features };
        }

        const isGeometry =
            v && typeof v === 'object' && typeof v.type === 'string' && 'coordinates' in v;

        if (isGeometry) {
            return {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: {},
                        geometry: this.normalizeGeometryForTransport({ type: v.type, coordinates: v.coordinates }),
                    },
                ],
            };
        }

        if (Array.isArray(this.geometriesList) && this.geometriesList.length > 0) {
            const features = this.geometriesList.map(item => {
                const rawCoords = Array.isArray(item.coordinates)
                    ? item.coordinates
                    : (item.coordinates && JSON.parse(item.coordinates)) || [];
                return {
                    type: 'Feature',
                    properties: {},
                    geometry: this.normalizeGeometryForTransport({ type: item.type, coordinates: rawCoords }),
                };
            });
            return { type: 'FeatureCollection', features };
        }

        return { type: 'FeatureCollection', features: [] };
    }

    public haveErrors(): boolean {
        return Object.values(this.formModel.getErrors()).some((errors) => errors.length);
    }

    public getErrorsByIndex(i = 0): string[] {
        return this.formModel.getErrors()[i] || [];
    }

    public getAllErrors(): string[] {
        return Object.values(this.formModel.getErrors()).reduce((acc, val) => acc.concat(val), []);
    }

    public canDownload(): boolean {
        const haveErrors = this.haveErrors();

        if (haveErrors) {
            return false;
        }

        const value = this.formModel?.getValue?.();
        if (value?.geoFile && typeof value.type === 'string' && 'coordinates' in value) return true;

        if (!value?.features?.length) {
            return false;
        }

        return true;
    }

    private makeFileName(): string {
        return `geojson-${Date.now()}.geojson`;
    }

    public downloadGeoJSON(): void {
        try {
            const obj = this.buildExportObject();
            const json = JSON.stringify(obj, null, 2);
            const blob = new Blob([json], { type: 'application/geo+json;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = this.makeFileName();
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to export GeoJSON:', e);
        }
    }

    public hasOriginalFile(): boolean {
        return !!this.formModel?.getValue?.()?.geoFile?.fileId;
    }

    public async downloadOriginal(): Promise<void> {
        const link = this.formModel?.getValue?.()?.geoFile as GeoFileLink | undefined;
        if (this.selectedOriginalFile && link && link.idbKey === this.pendingGeoFile?.idbKey) {
            this.downloadBlob(this.selectedOriginalFile, link.name);
            return;
        }
        if (!link?.fileId) {
            return;
        }
        const blob = await firstValueFrom(this.artifacts.getFileBlob(link.fileId));
        this.downloadBlob(await gunzipIfCompressed(blob), link.name);
    }

    private downloadBlob(blob: Blob, name: string): void {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    private fileFormat(name: string): GeoFileFormat | null {
        const extension = name.split('.').pop()?.toLowerCase();
        if (extension === 'json' || extension === 'geojson') return 'geojson';
        if (extension === 'kml') return 'kml';
        if (extension === 'kmz') return 'kmz';
        return null;
    }

    public isPreviewUnavailable(): boolean {
        return this.currentGeoFile()?.noPreview === true;
    }

    public originalFileLabel(): string {
        const link = this.currentGeoFile();
        return link ? `${link.name} (${this.formatSize(link.sizeBytes)})` : '';
    }

    private currentGeoFile(): GeoFileLink | undefined {
        return this.formModel?.getValue?.()?.geoFile || this.pendingGeoFile;
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
        this.applyAvailableOptionsFilter();
        this.formModel.setAvailableTypes(this.typeOptions.map(({ value }) => value));
        this.formModel.setOriginalFileCheck(idbKey => this.geoFiles.ensurePendingFile(idbKey));
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.availableOptions) {
            this.applyAvailableOptionsFilter();
            this.formModel.setAvailableTypes(this.typeOptions.map(({ value }) => value));
        }
        if (changes?.isDisabled && !changes?.isDisabled.firstChange) {
            this.onViewTypeChange();
        }
    }

    ngAfterViewInit(): void {
        // this.resetCoordinatesStructure();
        if (this.getValue()) {
            this.onViewTypeChange(false);
        } else {
            // this.onTypeChange(false, 0);
            this.onViewTypeChange(false);
        }
        this.setupMap();
    }

    private applyAvailableOptionsFilter(): void {
        if (!this.availableOptions || this.availableOptions.length === 0) {
            return;
        }

        this.typeOptions = this.typeOptions.filter(o => this.availableOptions!.includes(o.value));

        const first = this.getFirstAvailableType();
        this.type = first;
    }

    private getFirstAvailableType(): GeoJsonType {
        if (this.typeOptions.length) {
            return this.typeOptions[0].value;
        }

        return GeoJsonType.POINT;
    }

    private getValue() {
        const value = this.formModel?.getValue();
        if (!value || !value.type) {
            // this.addGeometry();
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
            this.addGeometry(value);
            return value;
        } else if (value.type === GeoJsonType.FEATURE_COLLECTION && value.features?.length > 0) {
            value.features.forEach((feature: any) => {
                if (feature && feature.geometry) {
                    this.addGeometry(feature.geometry);
                }
            });
        } else {
            return undefined;
        }
    }

    private setControlValue(value: any, dirty = true) {
        const normalized = this.normalizeGeoJSON(value);
        this.formModel?.setControlValue(normalized, dirty);
    }

    private setupMap() {
        if (!this.map && !this.mapCreated) {
            this.mapCreated = true;
            setTimeout(() => {
                this.initMap();

                const importedExtent = this.importedShapesSource?.getExtent();
                if (this.importedLocations.length > 0 && importedExtent && !isEmpty(importedExtent)) {
                    this.map?.getView().fit(importedExtent, { padding: [40, 40, 40, 40], maxZoom: 14, duration: 350 });
                } else if (this.center) {
                    this.map?.getView().animate({
                        center: this.center,
                        zoom: 6,
                        duration: 350,
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

        const importedShapesLayer = new VectorLayer({
            source: this.importedShapesSource,
            style: importedStyleFunction,
        });

        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                importedShapesLayer,
                geoShapesLayer,
                clusterLayer
            ],
            target: this.mapElementRef?.nativeElement,
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

        if (!this.isDisabled) {
            this.map.on('singleclick', (evt) => {
                const clickOnFeature = this.map?.forEachFeatureAtPixel(evt.pixel, (feature) => {
                    const geom = feature.getGeometry();

                    this.selectFeature(feature);

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
    }

    private selectFeature(feature: any) {
        if (!feature.ol_uid) {
            return;
        }

        const importedLocation = this.importedLocations.find(location => location.id === feature.getId());
        if (importedLocation) {
            this.addGeometry(importedLocation);

            this.importedShapesSource?.removeFeature(feature);
            this.importedLocations = this.importedLocations.filter(location => location.id !== feature.getId());

            this.updateMap(true);
        } else if (feature.getId() && this.allImportedLocations.some(item => item.id === feature.getId())) {
            this.deleteGeometry(feature.getId());
        }
    }

    public includeAllImportedFeatures(): void {
        this.loading = true;
        this.cdkRef.detectChanges();
        setTimeout(() => {
            this.selectAllImportedFeatures();
            this.renderedRows = 0;
            this.renderNextRows();
        });
    }

    private renderNextRows(): void {
        this.renderedRows += ROWS_PER_BATCH;
        if (this.displayLocationEditor() && this.renderedRows < this.geometriesList.length) {
            this.cdkRef.detectChanges();
            setTimeout(() => this.renderNextRows());
            return;
        }
        this.renderedRows = Infinity;
        this.loading = false;
        this.cdkRef.detectChanges();
    }

    public selectAllImportedFeatures() {
        this.importedLocations.forEach(importedLocation => {
            if (importedLocation) {
                this.addGeometry(importedLocation);
            }
        });

        this.importedShapesSource?.clear();
        this.importedLocations = [];
        this.updateMap(true);
    }

    public displayLocationEditor() {
        return this.geometriesList.length <= MAX_EDITABLE_SHAPES;
    }

    public async clearSelectionFeatures(): Promise<void> {
        const picked = this.geometriesList;
        this.geometriesList = [];
        this.geoShapesSource?.clear(true);
        this.pendingGeoFile = this.pendingGeoFile || this.formModel?.getValue?.()?.geoFile;

        picked.forEach(geometry => {
            const location = this.allImportedLocations.find(item => item.id === geometry.id);
            if (location) this.addImportedLocation(location);
        });

        this.setControlValue({});
        this.jsonInput = '';
    }

    private updateMap(updateInput: boolean = false) {
        const shapeFeatures: any[] = this.geometriesList.map(item => {
            const rawCoords = Array.isArray(item.coordinates)
                ? item.coordinates
                : (item.coordinates && JSON.parse(item.coordinates)) || [];

            const normalizedGeometry = this.normalizeGeometryForTransport({
                type: item.type,
                coordinates: rawCoords,
            });

            return {
                id: item.id,
                type: 'Feature',
                properties: {},
                geometry: normalizedGeometry,
            }
        })

        if (shapeFeatures.length <= 0) {
            this.geoShapesSource?.clear(true);
            // if (updateInput) this.setControlValue({ type: 'FeatureCollection', features: [] }, true);
            return;
        }

        const features = new GeoJSON({ featureProjection: 'EPSG:3857' }).readFeatures({
            type: 'FeatureCollection',
            features: shapeFeatures,
        });

        // todo on feature collection
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
            this.setControlValue({
                type: 'FeatureCollection',
                features: shapeFeatures.map(item => ({
                    type: item.type,
                    properties: item.properties,
                    geometry: item.geometry
                }))
            }, true);

            this.geometriesList.forEach((item, i) => {
                try {
                    if (item.coordinatesString) {
                        JSON.parse(item.coordinatesString)
                    }
                } catch {
                    this.formModel.setExternalErrors({
                        [i]: ["Unrecognized GeoJSON format"]
                    })
                }
            })
        }
    }

    // todo for multiple locations
    private mapClick(coordinates: any) {
        if (this.isDisabled) {
            return;
        }

        let firstGeoType = this.geometriesList[0];

        if (!firstGeoType) {
            firstGeoType = this.addGeometry();
        }

        try {
            this.clearAutomaticPoint(firstGeoType);
            switch (firstGeoType.type) {
                case GeoJsonType.POINT:
                    firstGeoType.coordinates = coordinates;
                    break;
                case GeoJsonType.MULTI_POINT:
                    if (firstGeoType.coordinates?.[0]?.length <= 0) {
                        firstGeoType.coordinates[0] = coordinates;
                        break;
                    }

                    firstGeoType.coordinates.push(coordinates);
                    break;
                case GeoJsonType.POLYGON:
                    firstGeoType.coordinates?.[this.selectedRingIndex]?.push(coordinates);

                    break;
                case GeoJsonType.MULTI_POLYGON:
                    if (firstGeoType.coordinates?.[this.selectedFeatureIndex]?.[this.selectedRingIndex][0]?.length <= 0) {
                        firstGeoType.coordinates[this.selectedFeatureIndex][this.selectedRingIndex][0] = coordinates;
                        break;
                    }

                    firstGeoType.coordinates?.[this.selectedFeatureIndex]?.[this.selectedRingIndex]?.push(coordinates);
                    break;
                case GeoJsonType.MULTI_LINE_STRING:
                    firstGeoType.coordinates?.[this.selectedRingIndex]?.push(coordinates);
                    break;
                case GeoJsonType.LINE_STRING:
                    if (firstGeoType.coordinates?.[0]?.length <= 0) {
                        firstGeoType.coordinates[0] = coordinates;
                        break;
                    }

                    firstGeoType.coordinates.push(coordinates);
                    break;
                default:
                    break;
            }

            firstGeoType.coordinatesString = JSON.stringify(firstGeoType.coordinates, null, 4);

            this.updateMap(true);
        }
        catch { }
    }

    // todo for multiple locations
    private mapRightclick(featureIndex = 0, ringIndex = 0) {
        this.clearAutomaticPoint(this.geometriesList[featureIndex]);
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
        this.clearAutomaticPoint(geometry);
        this.resetCoordinatesStructure(geometry);

        this.updateMap(true);
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
            this.geometriesList = [];

            if (value.type === GeoJsonType.FEATURE_COLLECTION && value.features) {
                value.features.forEach((feature: any) => {
                    if (feature && feature.geometry && feature.geometry.type !== 'GeometryCollection') {
                        this.addGeometry(feature.geometry);
                    }
                });
            } else {
                this.addGeometry(value);
            }

            this.updateMap(false);

            // this.onTypeChange(null, dirty);

            // this.allCoordinatesChanged();
        }

        if (!this.isJSON) {
            this.map = null;
            this.mapCreated = false;
            this.setupMap();

            this.centerMap();
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

    public addGeometry(geometry?: any): any {
        if (geometry) {
            const newGeometry = {
                id: geometry.id || GenerateUUIDv4(),
                type: geometry.type,
                coordinates: Array.isArray(geometry.coordinates) ? geometry.coordinates : geometry.coordinates && JSON.parse(geometry.coordinates) || [],
                coordinatesString: Array.isArray(geometry.coordinates) ? JSON.stringify(geometry.coordinates, null, 4) : geometry.coordinates
            };
            this.geometriesList.push(newGeometry);

            return newGeometry;
        } else {
            const defaultType = this.getFirstAvailableType();

            const newGeometry = {
                id: GenerateUUIDv4(),
                type: defaultType,
                coordinates: [],
                coordinatesString: undefined
            };
            this.geometriesList.push(newGeometry);
            this.resetCoordinatesStructure(newGeometry);
            this.type = defaultType;
            return newGeometry;
        }
    }

    public deleteGeometry(geometryId: string): any {
        if (geometryId) {
            const location = this.allImportedLocations.find(item => item.id === geometryId);
            if (!location) this.clearAutomaticPoint(this.geometriesList.find(item => item.id === geometryId));
            this.geometriesList = this.geometriesList.filter(item => item.id !== geometryId);
            if (!this.geometriesList.length) {
                this.pendingGeoFile = this.pendingGeoFile || this.formModel?.getValue?.()?.geoFile;
                this.setControlValue({});
                this.jsonInput = '';
            }
            if (location) this.addImportedLocation(location);
            this.updateMap(true);
        }
    }

    public getCoordinates(geometry: any) {
        return Array.isArray(geometry.coordinates) ? JSON.stringify(geometry.coordinates) : geometry.coordinates;
    }

    private centerMap(geometry?: any) {
        setTimeout(() => {
            if (!geometry) {
                geometry = this.formModel.getValue();
            }

            let parsedCoordinates;
            if (geometry.type !== 'FeatureCollection') {
                parsedCoordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : JSON.parse(geometry.coordinates);
            }

            if (geometry.type === 'FeatureCollection' && Array.isArray(geometry.features)) {
                const features = new GeoJSON().readFeatures(geometry, {
                    featureProjection: 'EPSG:4326',
                });

                if (features.length > 0) {
                    let extent: any = null;

                    for (const f of features) {
                        const geom = f.getGeometry();
                        if (!geom) continue;

                        if (!extent) {
                            extent = geom.getExtent();
                        } else {
                            extent = extend(extent, geom.getExtent());
                        }
                    }

                    if (extent) {
                        this.center = transform(getCenter(extent), 'EPSG:4326', 'EPSG:3857');
                    }
                }
            } else if (geometry.type == GeoJsonType.POINT && parsedCoordinates?.length >= 2) {
                this.center = transform(parsedCoordinates, 'EPSG:4326', 'EPSG:3857');
            } else if (geometry.type == GeoJsonType.MULTI_POINT && parsedCoordinates?.[0]?.length >= 2) {
                const geom = new MultiPoint(parsedCoordinates);
                this.center = transform(getCenter(geom.getExtent()), 'EPSG:4326', 'EPSG:3857');
            } else if (geometry.type == GeoJsonType.POLYGON && parsedCoordinates?.[0]?.[0]?.length >= 2) {
                const geom = new Polygon(parsedCoordinates);
                this.center = transform(getCenter(geom.getExtent()), 'EPSG:4326', 'EPSG:3857');
            } else if (geometry.type == GeoJsonType.MULTI_POLYGON && parsedCoordinates?.[0]?.[0]?.[0]?.length >= 2) {
                const geom = new MultiPolygon(parsedCoordinates);
                this.center = transform(getCenter(geom.getExtent()), 'EPSG:4326', 'EPSG:3857');
            } else if (geometry.type == GeoJsonType.LINE_STRING && parsedCoordinates?.[0]?.length >= 2) {
                const geom = new LineString(parsedCoordinates);
                this.center = transform(getCenter(geom.getExtent()), 'EPSG:4326', 'EPSG:3857');
            } else if (geometry.type == GeoJsonType.MULTI_LINE_STRING && parsedCoordinates?.[0]?.[0]?.length >= 2) {
                const geom = new MultiLineString(parsedCoordinates);
                this.center = transform(getCenter(geom.getExtent()), 'EPSG:4326', 'EPSG:3857');
            } else {
                this.center = null;
            }

            if (this.center && this.center.length > 1) {
                this.map?.getView().animate({
                    center: this.center,
                    zoom: 6,
                    duration: 350,
                });
                this.updateMap(true);
            }
        }, 500);
    }

    public coordinatesChanged(value: string, geometry: any, index: number) {
        try {
            const parsedCoordinates = JSON.parse(value);
            this.clearAutomaticPoint(geometry);
            geometry.coordinates = parsedCoordinates;
            geometry.coordinatesString = value;

            this.centerMap(geometry);
            // this.updateMap(true);
        } catch (e) {
            geometry.coordinatesString = value;

            this.formModel.setExternalErrors({
                [index]: ["Unrecognized GeoJSON format"]
            })
        }
    }

    private resetCoordinatesStructure(geometry: any) {
        switch (geometry.type) {
            case GeoJsonType.POINT:
                geometry.coordinates = [];
                geometry.coordinatesString = undefined;
                geometry.coordinatesPlaceholder = JSON.stringify(
                    [1.23, 4.56],
                    null,
                    4
                );
                break;
            case GeoJsonType.POLYGON:
                geometry.coordinates = [[]];
                geometry.coordinatesString = undefined;
                geometry.coordinatesPlaceholder = JSON.stringify(
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
                geometry.coordinates = [[]];
                geometry.coordinatesString = undefined;
                geometry.coordinatesPlaceholder = JSON.stringify(
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
                geometry.coordinates = [[]];
                geometry.coordinatesString = undefined;
                geometry.coordinatesPlaceholder = JSON.stringify(
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
                geometry.coordinates = [[[[]]]];
                geometry.coordinatesString = undefined;
                geometry.coordinatesPlaceholder = JSON.stringify(
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
                geometry.coordinates = [[]];
                geometry.coordinatesString = undefined;
                geometry.coordinatesPlaceholder = JSON.stringify(
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

    authFailed() {
        this.cdkRef.detectChanges();
    }

    public async importFromFile(file: File): Promise<void> {
        const format = this.fileFormat(file.name);
        if (!format) {
            console.error('Wrong file format.');
            return;
        }
        this.importError = '';
        let limits: GeospatialLimits;
        try {
            limits = await this.loadLimits();
        } catch {
            limits = DEFAULT_GEOSPATIAL_LIMITS;
        }
        if (format === 'kmz') {
            await this.importKmz(file, limits);
            return;
        }
        const decision = classifyGeoFile(format, file.size, limits);
        if (decision === 'reject') {
            await this.openLimitDialog(
                'reject',
                'File exceeds size limit',
                `This file's size is ${this.formatSize(file.size)}, which exceeds the ${limits.geospatialMaxFileSizeMb} MB maximum for upload. Please reduce the size before uploading.`
            );
            return;
        }
        if (decision === 'warn') {
            const previewLimit = format === 'geojson'
                ? limits.geojsonPreviewMaxFileSizeMb
                : limits.kmlPreviewMaxFileSizeMb;
            const accepted = await this.openLimitDialog(
                'warn',
                'File too large to preview',
                `This file's size is ${this.formatSize(file.size)}, which exceeds the ${previewLimit} MB limit for in-browser rendering. If you choose to proceed, browser rendering will not be available and a dedicated GIS tool, such as ArcGIS, will be required to inspect it.`
            );
            if (!accepted) return;
            const allowedTypes = this.allowedFileTypes();
            const coordinate = await this.findAutomaticPoint(() => readFirstCoordinate(
                file,
                format === 'geojson'
                    ? new GeoJsonCoordinateScanner(allowedTypes)
                    : new KmlCoordinateScanner(allowedTypes)
            ));
            if (!coordinate) return;
            await this.importWithoutPreview(file, format, coordinate);
            return;
        }
        await this.importWithPreview(file, format, limits);
    }

    private loadLimits(): Promise<GeospatialLimits> {
        if (this.geospatialLimits) return Promise.resolve(this.geospatialLimits);
        if (!this.limitsRequest) {
            this.limitsRequest = firstValueFrom(this.settings.getGeospatialLimits())
                .then(limits => {
                    this.geospatialLimits = limits;
                    return limits;
                })
                .catch(error => {
                    this.limitsRequest = undefined;
                    throw error;
                });
        }
        return this.limitsRequest;
    }

    private async openLimitDialog(
        mode: 'warn' | 'reject', header: string, message: string
    ): Promise<boolean> {
        const buttons = mode === 'warn'
            ? [{ name: 'Cancel', class: 'secondary' }, { name: 'Upload without preview', class: 'primary' }]
            : [{ name: 'Ok', class: 'primary' }];
        const reference = this.dialog.open(CustomConfirmDialogComponent, {
            showHeader: false, width: '640px', styleClass: 'guardian-dialog', duplicate: true,
            data: { header, texts: [message], buttons }
        });
        if (!reference) return false;
        return (await firstValueFrom(reference.onClose)) === 'Upload without preview';
    }

    private async findAutomaticPoint(
        read: () => Promise<GeoCoordinate | null>
    ): Promise<GeoCoordinate | null> {
        let coordinate: GeoCoordinate | null;
        this.loading = true;
        this.cdkRef.detectChanges();
        try {
            coordinate = await read();
        } catch (error) {
            this.importError = error instanceof Error ? error.message : String(error);
            return null;
        } finally {
            this.loading = false;
            this.cdkRef.detectChanges();
        }
        if (!coordinate) await this.rejectFileWithoutShapes();
        return coordinate;
    }

    private async rejectFileWithoutShapes(): Promise<void> {
        this.loading = false;
        this.cdkRef.detectChanges();
        await this.openLimitDialog('reject', 'File cannot be imported', this.noCoordinateMessage());
    }

    private async importWithoutPreview(
        file: File, format: PreviewableGeoFileFormat, coordinate: GeoCoordinate
    ): Promise<void> {
        this.loading = true;
        try {
            const link = await this.replacePendingFile(file, format);
            link.noPreview = true;
            link.automaticPoint = coordinate;
            link.previewSizeBytes = file.size;
            this.fileImportName = file.name;
            this.fileImportSize = Math.round(file.size / (1024 * 1024));
            this.showFilePoint(coordinate);
        } catch (error) {
            this.importError = error instanceof Error ? error.message : String(error);
        } finally {
            this.loading = false;
            this.cdkRef.detectChanges();
        }
    }

    private async importWithPreview(
        file: File, format: PreviewableGeoFileFormat, limits: GeospatialLimits
    ): Promise<void> {
        this.loading = true;
        try {
            let geoJsonData: any;
            if (format === 'geojson') {
                geoJsonData = JSON.parse(new TextDecoder('utf-8').decode(await file.arrayBuffer()));
            } else {
                const xmlDoc = new DOMParser().parseFromString(await file.text(), 'application/xml');
                geoJsonData = kml(xmlDoc);
            }
            if (!this.hasAllowedShape(geoJsonData)) {
                await this.rejectFileWithoutShapes();
                return;
            }
            if (this.hasTooManyShapes(geoJsonData, limits)) {
                if (!await this.confirmShapeLimit(geoJsonData, limits)) return;
                const allowedTypes = this.allowedFileTypes();
                const coordinate = await this.findAutomaticPoint(() => readFirstCoordinate(
                    file,
                    format === 'geojson'
                        ? new GeoJsonCoordinateScanner(allowedTypes)
                        : new KmlCoordinateScanner(allowedTypes)
                ));
                if (!coordinate) return;
                await this.importWithoutPreview(file, format, coordinate);
                return;
            }
            await this.replacePendingFile(file, format);
            this.fileImportName = file.name;
            this.fileImportSize = Math.round(file.size / (1024 * 1024));
            this.geoJsonService.saveFile(file.name, geoJsonData);
            this.getShapeFromFile();
        } catch (error) {
            this.importError = error instanceof Error ? error.message : String(error);
            this.loading = false;
            this.cdkRef.detectChanges();
        }
    }

    private async replacePendingFile(file: File, format: GeoFileFormat): Promise<GeoFileLink> {
        const previous = this.browserGeoFile();
        const link = await this.geoFiles.keepOriginal(file, format);
        try {
            if (previous) await this.geoFiles.discard(previous);
        } catch (error) {
            await this.geoFiles.discard(link);
            throw error;
        }
        this.pendingGeoFile = link;
        this.selectedOriginalFile = file;
        this.geometriesList = [];
        this.geoShapesSource?.clear(true);
        this.clearImportedLocations();
        this.importedShapesSource?.clear();
        this.setControlValue({});
        this.jsonInput = '';
        return link;
    }

    private browserGeoFile(): GeoFileLink | undefined {
        if (this.pendingGeoFile) return this.pendingGeoFile;
        const link = this.formModel?.getValue?.()?.geoFile as GeoFileLink | undefined;
        return link?.idbKey && !link.fileId ? link : undefined;
    }

    private formatSize(bytes: number): string {
        const value = bytes / (1024 * 1024);
        return `${Number.isInteger(value) ? value : value.toFixed(2)} MB`;
    }

    private async importKmz(file: File, limits: GeospatialLimits): Promise<void> {
        const maximumBytes = limits.geospatialMaxFileSizeMb * 1024 * 1024;
        if (file.size > maximumBytes) {
            await this.openLimitDialog(
                'reject', 'File exceeds size limit',
                `This file's size is ${this.formatSize(file.size)}, which exceeds the ${limits.geospatialMaxFileSizeMb} MB maximum for upload. Please reduce the size before uploading.`
            );
            return;
        }
        try {
            const inspection = await this.kmzReader.inspect(file);
            if (inspection.previewSizeBytes > maximumBytes) {
                await this.openLimitDialog(
                    'reject', 'File exceeds size limit',
                    `This file's uncompressed size is ${this.formatSize(inspection.previewSizeBytes)}, which exceeds the ${limits.geospatialMaxFileSizeMb} MB maximum for upload. Please reduce the size before uploading.`
                );
                return;
            }
            const decision = classifyGeoFile('kml', inspection.previewSizeBytes, limits);
            if (decision === 'warn') {
                const accepted = await this.openLimitDialog(
                    'warn', 'File too large to preview',
                    `This file's uncompressed size is ${this.formatSize(inspection.previewSizeBytes)}, which exceeds the ${limits.kmlPreviewMaxFileSizeMb} MB limit for in-browser rendering. If you choose to proceed, browser rendering will not be available and a dedicated GIS tool, such as ArcGIS, will be required to inspect it.`
                );
                if (!accepted) return;
                const coordinate = await this.findAutomaticPoint(() => this.kmzReader.readCoordinate(
                    file, inspection.entry, new KmlCoordinateScanner(this.allowedFileTypes()), maximumBytes
                ));
                if (!coordinate) return;
                await this.importKmzWithoutPreview(file, inspection.previewSizeBytes, coordinate);
                return;
            }
            await this.importKmzWithPreview(
                file, inspection.entry, inspection.previewSizeBytes, maximumBytes, limits
            );
        } catch (error) {
            this.importError = error instanceof Error ? error.message : String(error);
            this.loading = false;
            this.cdkRef.detectChanges();
        }
    }

    private async importKmzWithoutPreview(
        file: File, previewSizeBytes: number, coordinate: GeoCoordinate
    ): Promise<void> {
        this.loading = true;
        const link = await this.replacePendingFile(file, 'kmz');
        link.noPreview = true;
        link.automaticPoint = coordinate;
        link.previewSizeBytes = previewSizeBytes;
        this.fileImportName = file.name;
        this.fileImportSize = Math.round(file.size / (1024 * 1024));
        this.showFilePoint(coordinate);
        this.loading = false;
        this.cdkRef.detectChanges();
    }

    private showFilePoint(coordinate: GeoCoordinate): void {
        this.addImportedLocation({ type: GeoJsonType.POINT, coordinates: coordinate });
        this.isJSON = false;
        this.onViewTypeChange();
    }

    private async importKmzWithPreview(
        file: File, entry: KmzEntry, previewSizeBytes: number, maximumBytes: number, limits: GeospatialLimits
    ): Promise<void> {
        this.loading = true;
        const text = await this.kmzReader.readText(file, entry, maximumBytes);
        const xmlDoc = new DOMParser().parseFromString(text, 'application/xml');
        const geoJsonData = kml(xmlDoc);
        if (!this.hasAllowedShape(geoJsonData)) {
            await this.rejectFileWithoutShapes();
            return;
        }
        if (this.hasTooManyShapes(geoJsonData, limits)) {
            if (!await this.confirmShapeLimit(geoJsonData, limits)) return;
            const coordinate = await this.findAutomaticPoint(() => this.kmzReader.readCoordinate(
                file, entry, new KmlCoordinateScanner(this.allowedFileTypes()), maximumBytes
            ));
            if (!coordinate) return;
            await this.importKmzWithoutPreview(file, previewSizeBytes, coordinate);
            return;
        }
        const link = await this.replacePendingFile(file, 'kmz');
        link.previewSizeBytes = previewSizeBytes;
        this.fileImportName = file.name;
        this.fileImportSize = Math.round(file.size / (1024 * 1024));
        this.geoJsonService.saveFile(file.name, geoJsonData);
        this.getShapeFromFile();
    }

    private shapeCount(data: any): number {
        return data?.type === 'FeatureCollection'
            ? (data.features || []).filter((feature: any) =>
                feature?.geometry?.type && feature.geometry.type !== 'GeometryCollection').length
            : 1;
    }

    private shapeLimit(limits: GeospatialLimits): number {
        return limits.geospatialPreviewMaxFeatures ?? DEFAULT_GEOSPATIAL_LIMITS.geospatialPreviewMaxFeatures;
    }

    private hasTooManyShapes(data: any, limits: GeospatialLimits): boolean {
        return this.shapeCount(data) > this.shapeLimit(limits);
    }

    private async confirmShapeLimit(data: any, limits: GeospatialLimits): Promise<boolean> {
        this.loading = false;
        this.cdkRef.detectChanges();
        return this.openLimitDialog(
            'warn',
            'File too large to preview',
            `This file has ${this.shapeCount(data).toLocaleString('en-US')} shapes, which exceeds the ${this.shapeLimit(limits).toLocaleString('en-US')}-shape limit for in-browser rendering. If you choose to proceed, browser rendering will not be available and a dedicated GIS tool, such as ArcGIS, will be required to inspect it.`
        );
    }

    private allowedFileTypes(): string[] {
        return this.availableOptions?.length ? this.typeOptions.map(({ value }) => value) : [];
    }

    private hasAllowedShape(data: any): boolean {
        const allowedTypes = this.allowedFileTypes();
        const geometries = data?.type === 'FeatureCollection'
            ? (data.features || []).map((feature: any) => feature?.geometry)
            : [data?.type === 'Feature' ? data.geometry : data];
        return geometries.some((geometry: any) => (allowedTypes.length
            ? allowedTypes.includes(geometry?.type)
            : !!geometry?.type && geometry.type !== 'GeometryCollection') && this.hasCoordinates(geometry.coordinates));
    }

    private hasCoordinates(coordinates: any): boolean {
        return Array.isArray(coordinates) && (typeof coordinates[0] === 'number'
            || coordinates.some((item: any) => this.hasCoordinates(item)));
    }

    private noCoordinateMessage(): string {
        const allowedTypes = this.allowedFileTypes();
        return allowedTypes.length
            ? `No shapes of an allowed type were found in this file. Allowed shapes: ${allowedTypes.join(', ')}.`
            : 'No coordinates were found in this file, so it cannot be imported. Please check the file and try again.';
    }

    private clearAutomaticPoint(geometry: any): void {
        const link = this.formModel?.getValue?.()?.geoFile as GeoFileLink | undefined;
        if (link?.automaticPoint && geometry?.type === GeoJsonType.POINT &&
            this.sameCoord(link.automaticPoint, geometry.coordinates)) {
            delete link.automaticPoint;
        }
    }

    public getShapeFromFile() {
        const getFileNames = this.geoJsonService.getFileNames();

        for (const [id, name] of getFileNames) {
            const shapeFile = this.geoJsonService.getFile(id);

            if (shapeFile) {
                this.clearImportedLocations();

                if (shapeFile.type === 'FeatureCollection') {
                    shapeFile.features = shapeFile.features.map((feature: any) => ({
                        type: feature.type,
                        geometry: feature.geometry,
                        property: {}
                    }));
                    this.onUploadMultiLocationFile(shapeFile);
                } else {
                    this.addImportedLocation(shapeFile);
                }
            } else {
                this.setControlValue({});
            }
        }

        this.isJSON = false
        this.loading = false;

        this.onViewTypeChange();
    }

    private clearImportedLocations() {
        this.allImportedLocations = [];
        this.importedLocations = [];
    }

    public onUploadMultiLocationFile(featureCollection: FeatureCollection) {
        if (featureCollection) {
            if (featureCollection.features) {
                featureCollection.features = featureCollection.features.filter((feature: any) => feature?.geometry?.type && feature.geometry.type !== 'GeometryCollection');
            }

            featureCollection.features.forEach((feature: any, i) => {
                if (feature && feature.geometry && feature.geometry.type !== 'GeometryCollection') {
                    const location = {
                        id: GenerateUUIDv4(),
                        type: feature.geometry.type,
                        coordinates: feature.geometry.coordinates
                    };
                    this.importedLocations.push(location);
                    this.allImportedLocations.push(location);
                }
            });

            const shapeFeatures: any[] = this.importedLocations.map(item => ({
                id: item.id,
                type: 'Feature',
                properties: {},
                geometry: {
                    type: item.type,
                    coordinates: item.coordinates?.length > 0 ? item.coordinates : item.coordinates && JSON.parse(item.coordinates) || []
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

            this.importedShapesSource?.clear(true);
            this.importedShapesSource?.addFeatures(features);
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

    private addImportedLocation(feature: any) {
        const location = {
            id: GenerateUUIDv4(),
            type: feature?.geometry?.type || feature?.type,
            coordinates: feature?.geometry?.coordinates || feature?.coordinates
        };
        this.importedLocations.push(location);
        this.allImportedLocations.push(location);

        const shapeFeatures: any[] = this.importedLocations.map(item => ({
            id: item.id,
            type: 'Feature',
            properties: {},
            geometry: {
                type: item.type,
                coordinates: item.coordinates?.length > 0 ? item.coordinates : item.coordinates && JSON.parse(item.coordinates) || []
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

        this.importedShapesSource?.clear(true);
        this.importedShapesSource?.addFeatures(features);
    }
}
