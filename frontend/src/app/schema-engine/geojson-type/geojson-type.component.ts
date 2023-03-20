import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { GeoJsonSchema, GeoJsonType } from '@guardian/interfaces';
import ajv from 'ajv';
import { Subject } from 'rxjs';
import { ajvSchemaValidator } from 'src/app/validators/ajv-schema.validator';

@Component({
    selector: 'app-geojson-type',
    templateUrl: './geojson-type.component.html',
    styleUrls: ['./geojson-type.component.css'],
})
export class GeojsonTypeComponent implements OnInit {
    @Input('formGroup') group?: FormControl;
    @Input('preset') presetDocument: any = null;
    @Input('disabled') disabled: boolean = false;

    updateCoordinates: Subject<any> = new Subject<any>();
    center: google.maps.LatLngLiteral = {
        lat: 37,
        lng: -121,
    };
    markers: {
        position: any;
    }[] = [];
    polygons: {
        paths: any;
    }[] = [];
    lines: {
        path: any;
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

    constructor() {}

    ngOnInit(): void {
        this.onTypeChange();
        this.group?.setValidators(
            ajvSchemaValidator(new ajv().compile(GeoJsonSchema))
        );
        this.updateCoordinates.subscribe(this.onCoordinatesUpdate.bind(this));
        if (this.presetDocument) {
            this.group?.patchValue(this.presetDocument);
            this.onViewTypeChange(this.presetDocument);
        }
    }

    onCoordinatesUpdate(value: any) {
        this.coordinates = JSON.stringify(value, null, 4);
        this.group?.patchValue({
            type: this.type,
            coordinates: value,
        });
    }

    mapClick(event: any) {
        if (this.disabled) {
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
                    event.latLng.lat(),
                    event.latLng.lng(),
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
                        item.position.lat,
                        item.position.lng,
                    ])
                );
                break;
            case GeoJsonType.MULTI_POLYGON:
            case GeoJsonType.MULTI_LINE_STRING:
            case GeoJsonType.LINE_STRING:
            case GeoJsonType.POLYGON:
                this.pointConstructor.push({
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng(),
                });
                break;
            default:
                break;
        }
    }

    mapDblclick() {
        if (this.disabled) {
            return;
        }
        switch (this.type) {
            case GeoJsonType.POLYGON:
                this.polygons[0] = {
                    paths: this.pointConstructor,
                };
                this.updateCoordinates.next([
                    this.polygons[0].paths.map((path: any) => [
                        path.lat,
                        path.lng,
                    ]),
                ]);
                break;
            case GeoJsonType.MULTI_POLYGON:
                this.polygons.push({
                    paths: this.pointConstructor,
                });
                this.updateCoordinates.next(
                    this.polygons.map((polygon: any) => [
                        polygon.paths.map((path: any) => [path.lat, path.lng]),
                    ])
                );
                break;
            case GeoJsonType.LINE_STRING:
                this.lines[0] = {
                    path: this.pointConstructor,
                };
                this.updateCoordinates.next(
                    this.lines[0].path.map((path: any) => [path.lat, path.lng])
                );
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                this.lines.push({
                    path: this.pointConstructor,
                });
                this.updateCoordinates.next(
                    this.lines.map((line: any) =>
                        line.path.map((path: any) => [path.lat, path.lng])
                    )
                );
                break;
            default:
                break;
        }

        this.pointConstructor = [];
    }

    mapRightclick() {
        this.pointConstructor?.pop();
    }

    onTypeChange(clearInputs: boolean = true) {
        if (clearInputs) {
            this.group?.patchValue({});
            this.coordinates = '';
            this.markers = [];
            this.polygons = [];
            this.lines = [];
            this.pointConstructor = [];
        }

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

    onViewTypeChange(value: any, clearInputs: boolean = true) {
        if (!value) {
            return;
        }
        if (this.isJSON || this.disabled) {
            this.jsonInput = JSON.stringify(value, null, 4);
        }
        if (!this.isJSON || this.disabled) {
            this.type = value?.type;
            this.onTypeChange(clearInputs);
            this.coordinates = JSON.stringify(value?.coordinates, null, 4);
            this.coordinatesChanged();
        }
    }

    jsonChanged() {
        try {
            this.group?.patchValue(JSON.parse(this.jsonInput));
        } catch {
            this.group?.patchValue({});
        }
    }

    coordinatesChanged() {
        this.markers = [];
        this.polygons = [];
        this.lines = [];
        try {
            const parsedCoordinates = JSON.parse(this.coordinates);
            this.group?.patchValue({
                type: this.type,
                coordinates: parsedCoordinates,
            });
            switch (this.type) {
                case GeoJsonType.POINT:
                    this.markers.push({
                        position: {
                            lat: parsedCoordinates[0],
                            lng: parsedCoordinates[1],
                        },
                    });
                    this.center = {
                        lat: parsedCoordinates[0],
                        lng: parsedCoordinates[1],
                    };
                    break;
                case GeoJsonType.POLYGON:
                    this.polygons.push({
                        paths: parsedCoordinates[0].map((path: any) => {
                            return { lat: path[0], lng: path[1] };
                        }),
                    });
                    this.center = {
                        lat: parsedCoordinates[0][0][0],
                        lng: parsedCoordinates[0][0][1],
                    };
                    break;
                case GeoJsonType.LINE_STRING:
                    this.lines.push({
                        path: parsedCoordinates.map((path: any) => {
                            return { lat: path[0], lng: path[1] };
                        }),
                    });
                    this.center = {
                        lat: parsedCoordinates[0][0],
                        lng: parsedCoordinates[0][1],
                    };
                    break;
                case GeoJsonType.MULTI_POINT:
                    for (const coordinate of parsedCoordinates) {
                        this.markers.push({
                            position: {
                                lat: coordinate[0],
                                lng: coordinate[1],
                            },
                        });
                    }
                    this.center = {
                        lat: parsedCoordinates[0][0],
                        lng: parsedCoordinates[0][1],
                    };
                    break;
                case GeoJsonType.MULTI_POLYGON:
                    for (const paths of parsedCoordinates) {
                        this.polygons.push({
                            paths: paths[0].map((path: any) => {
                                return { lat: path[0], lng: path[1] };
                            }),
                        });
                    }
                    this.center = {
                        lat: parsedCoordinates[0][0][0][0],
                        lng: parsedCoordinates[0][0][0][1],
                    };
                    break;
                case GeoJsonType.MULTI_LINE_STRING:
                    for (const paths of parsedCoordinates) {
                        this.lines.push({
                            path: paths.map((path: any) => {
                                return { lat: path[0], lng: path[1] };
                            }),
                        });
                    }
                    this.center = {
                        lat: parsedCoordinates[0][0][0],
                        lng: parsedCoordinates[0][0][1],
                    };
                    break;
                default:
                    break;
            }
        } catch {
            this.group?.patchValue({});
        }
    }
}
