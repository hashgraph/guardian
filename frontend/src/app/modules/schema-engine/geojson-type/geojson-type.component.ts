import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, } from '@angular/core';
import { FormControl } from '@angular/forms';
import { GeoJsonSchema, GeoJsonType } from '@guardian/interfaces';
import ajv from 'ajv';
import { Subject } from 'rxjs';
import { MapService } from 'src/app/services/map.service';
import { ajvSchemaValidator } from 'src/app/validators/ajv-schema.validator';

@Component({
    selector: 'app-geojson-type',
    templateUrl: './geojson-type.component.html',
    styleUrls: ['./geojson-type.component.scss'],
})
export class GeojsonTypeComponent implements OnInit, OnChanges {
    @Input('formGroup') control?: FormControl;
    @Input('preset') presetDocument: any = null;
    @Input('disabled') isDisabled: boolean = false;

    updateCoordinates: Subject<any> = new Subject<any>();

    mapOptions: google.maps.MapOptions = {
        clickableIcons: false,
        disableDoubleClickZoom: true,
        minZoom: 5,
    };
    center: google.maps.LatLngLiteral = {
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
            animation: 2,
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

    constructor(
        public mapService: MapService,
        private cdkRef: ChangeDetectorRef
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.isDisabled && !changes?.isDisabled.firstChange) {
            this.onViewTypeChange(this.control?.value);
        }
    }

    ngOnInit(): void {
        this.onTypeChange();
        this.control?.setValidators(
            ajvSchemaValidator(new ajv().compile(GeoJsonSchema))
        );
        this.control?.updateValueAndValidity();
        this.updateCoordinates.subscribe(this.onCoordinatesUpdate.bind(this));
        this.onViewTypeChange(this.presetDocument);
    }

    onCoordinatesUpdate(value: any) {
        if (!value) {
            this.coordinates = '';
            this.control?.patchValue({});
            return;
        }

        this.coordinates = JSON.stringify(value, null, 4);
        this.control?.patchValue({
            type: this.type,
            coordinates: value,
        });
    }

    mapClick(event: any) {
        if (this.isDisabled) {
            return;
        }

        switch (this.type) {
            case GeoJsonType.POINT:
                this.markers[0] = {
                    position: {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng(),
                    },
                };
                this.updateCoordinates.next([
                    event.latLng.lng(),
                    event.latLng.lat(),
                ]);
                break;
            case GeoJsonType.MULTI_POINT:
                this.markers.push({
                    position: {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng(),
                    },
                });
                this.updateCoordinates.next(
                    this.markers.map((item: any) => [
                        item.position.lng,
                        item.position.lat,
                    ])
                );
                break;
            case GeoJsonType.MULTI_POLYGON:
            case GeoJsonType.MULTI_LINE_STRING:
            case GeoJsonType.LINE_STRING:
            case GeoJsonType.POLYGON:
                this.pointConstructor.push({
                    lng: event.latLng.lng(),
                    lat: event.latLng.lat(),
                });
                break;
            default:
                break;
        }
    }

    mapDblclick() {
        if (this.isDisabled) {
            return;
        }

        switch (this.type) {
            case GeoJsonType.POLYGON:
                this.pointConstructor.push(this.pointConstructor[0]);
                this.polygons[0] = {
                    paths: this.pointConstructor,
                };
                this.updateCoordinates.next([
                    this.polygons[0].paths.map((path: any) => [
                        path.lng,
                        path.lat,
                    ]),
                ]);
                break;
            case GeoJsonType.MULTI_POLYGON:
                this.pointConstructor.push(this.pointConstructor[0]);
                this.polygons.push({
                    paths: this.pointConstructor,
                });
                this.updateCoordinates.next(
                    this.polygons.map((polygon: any) => [
                        polygon.paths.map((path: any) => [path.lng, path.lat]),
                    ])
                );
                break;
            case GeoJsonType.LINE_STRING:
                this.lines[0] = {
                    path: this.pointConstructor,
                };
                this.updateCoordinates.next(
                    this.lines[0].path.map((path: any) => [path.lng, path.lat])
                );
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                this.lines.push({
                    path: this.pointConstructor,
                });
                this.updateCoordinates.next(
                    this.lines.map((line: any) =>
                        line.path.map((path: any) => [path.lng, path.lat])
                    )
                );
                break;
            default:
                break;
        }

        this.pointConstructor = [];
    }

    mapRightclick() {
        if (this.pointConstructor?.length) {
            this.pointConstructor.pop();
            return;
        }

        switch (this.type) {
            case GeoJsonType.POINT:
                this.markers.pop();
                this.updateCoordinates.next(
                    this.markers[0]
                        ? [
                            this.markers[0].position.lng,
                            this.markers[0].position.lat,
                        ]
                        : null
                );
                break;
            case GeoJsonType.MULTI_POINT:
                this.markers.pop();
                this.updateCoordinates.next(
                    this.markers.length
                        ? this.markers.map((item: any) => [
                            item.position.lng,
                            item.position.lat,
                        ])
                        : null
                );
                break;
            case GeoJsonType.POLYGON:
                this.polygons?.pop();
                this.updateCoordinates.next(
                    this.polygons[0]
                        ? [
                            this.polygons[0].paths.map((path: any) => [
                                path.lng,
                                path.lat,
                            ]),
                        ]
                        : null
                );
                break;
            case GeoJsonType.MULTI_POLYGON:
                this.polygons?.pop();
                this.updateCoordinates.next(
                    this.polygons.length
                        ? this.polygons.map((polygon: any) => [
                            polygon.paths.map((path: any) => [
                                path.lng,
                                path.lat,
                            ]),
                        ])
                        : null
                );
                break;
            case GeoJsonType.LINE_STRING:
                this.lines?.pop();
                this.updateCoordinates.next(
                    this.lines[0]?.path.map((path: any) => [
                        path.lng,
                        path.lat,
                    ]) || null
                );
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                this.lines?.pop();
                this.updateCoordinates.next(
                    this.lines.length
                        ? this.lines.map((line: any) =>
                            line.path.map((path: any) => [path.lng, path.lat])
                        )
                        : null
                );
                break;
            default:
                break;
        }
    }

    onTypeChange() {
        this.control?.patchValue({});
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

    onViewTypeChange(value: any) {
        if (!value) {
            return;
        }

        if (this.isJSON || this.isDisabled) {
            this.jsonInput = JSON.stringify(value, null, 4);
        }

        if (!this.isJSON || this.isDisabled) {
            this.type = value?.type;
            this.onTypeChange();
            this.coordinates = JSON.stringify(value?.coordinates, null, 4);
            this.coordinatesChanged();
        }
    }

    jsonChanged() {
        try {
            this.control?.patchValue(JSON.parse(this.jsonInput));
        } catch {
            this.control?.patchValue({});
        }
    }

    coordinatesChanged() {
        this.markers = [];
        this.polygons = [];
        this.lines = [];
        try {
            const parsedCoordinates = JSON.parse(this.coordinates);
            this.control?.patchValue({
                type: this.type,
                coordinates: parsedCoordinates,
            });
            switch (this.type) {
                case GeoJsonType.POINT:
                    this.markers.push({
                        position: {
                            lat: parsedCoordinates[1],
                            lng: parsedCoordinates[0],
                        },
                    });
                    this.center = {
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
                    this.center = {
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
                    this.center = {
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
                    this.center = {
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
                    this.center = {
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
                    this.center = {
                        lat: parsedCoordinates[0][0][1],
                        lng: parsedCoordinates[0][0][0],
                    };
                    break;
                default:
                    break;
            }
        } catch {
            this.control?.patchValue({});
        }
    }

    authFailed() {
        this.mapService.mapLoaded = false;
        this.cdkRef.detectChanges();
    }
}
