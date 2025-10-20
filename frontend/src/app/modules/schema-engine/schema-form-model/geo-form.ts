import { UntypedFormControl } from '@angular/forms';
import { ajvSchemaValidator } from 'src/app/validators/ajv-schema.validator';
import ajv from 'ajv';
import { GeoJsonSchema, GeoJsonType } from '@guardian/interfaces';

export class GeoForm {
    private readonly form: UntypedFormControl;
    private presetDocument: any;
    private availableTypes: any;
    private errorsFieldName = 'geoJsonFieldErrors';

    constructor(form: UntypedFormControl) {
        this.form = form;
        this.presetDocument = null;
        this.availableTypes = null;
    }

    public setData(data: {
        preset: any;
    }) {
        if (data.preset) {
            this.presetDocument = data.preset;
        }
    }

    public setAvailableTypes(types: GeoJsonType[]) {
        this.availableTypes = types;
    }

    public build() {
        this.form.setValidators(
            [
                ajvSchemaValidator(new ajv().compile(GeoJsonSchema)),
                (data) => {
                    const errors = this.validatePayload(data.value) || {};

                    if (Object.keys(errors).length) {
                        return {
                            [this.errorsFieldName]: errors
                        };
                    }

                    return null;
                }
            ]
        );
        if (this.presetDocument) {
            const type = this.presetDocument?.geometry?.type || this.presetDocument.type;
            const coordinates = this.presetDocument?.geometry?.coordinates || this.presetDocument.coordinates;
            const features = this.presetDocument.features;
            this.form.patchValue({
                type,
                coordinates,
                features,
            }, { emitEvent: false, onlySelf: true });
        }

        // this.form.updateValueAndValidity();
    }

    public setControlValue(value: any, dirty = true) {
        this.form?.patchValue(value);
        if (dirty) {
            this.form?.markAsDirty();
        }
    }

    public getValue() {
        return this.form?.value;
    }

    public setExternalErrors(errors?: Record<string | number, string[]>): void {
        const current = this.form.errors || {};

        if (errors && Object.keys(errors).length) {
            this.form.setErrors({
                ...current,
                [this.errorsFieldName]: {
                    ...(current?.[this.errorsFieldName] || {}),
                    ...errors,
                },
            });
        }
    }

    public getErrors(): Record<string | number, string[]> {
        return this.form.errors?.[this.errorsFieldName] || {};
    }

    private isNumber(n: any): n is number {
        return typeof n === 'number' && isFinite(n);
    }

    private validatePayload(value: any): Record<string | number, string[]> {
        if (!value || typeof value !== 'object' || this.safeStringify(value) === '{}') {
            return { 0: ['A GeoJSON object is required'] };
        }

        const errors: Record<string | number, string[]> = {};

        if (value.type === 'FeatureCollection') {
            if (!Array.isArray(value.features)) {
                return { 0: ['FeatureCollection: the "features" field must be an array'] };
            }
            value.features
                .filter((f: any) => f && f.geometry && f.geometry.type !== 'GeometryCollection')
                .forEach((f: any, i: number) => {
                    if (!f.geometry?.type) {
                        errors[i] = [`Feature #${i}: "geometry.type" is missing`];
                        return;
                    }
                    const coords = Array.isArray(f.geometry.coordinates)
                        ? f.geometry.coordinates
                        : (f.geometry.coordinates && this.safeParse(f.geometry.coordinates)) || [];

                    const r = this.validateGeometryCore(f.geometry.type, coords);
                    if (!r.valid) {
                        errors[i] = r.errors.map(e => `Feature #${i}: ${e}`);
                    }
                });

            return errors;
        }

        if (value.type === 'Feature') {
            if (!value.geometry?.type) {
                return { 0: ['Feature: "geometry.type" is missing'] };
            }
            const coords = Array.isArray(value.geometry.coordinates)
                ? value.geometry.coordinates
                : (value.geometry.coordinates && this.safeParse(value.geometry.coordinates)) || [];

            const r = this.validateGeometryCore(value.geometry.type, coords);
            if (!r.valid) {
                errors[0] = r.errors;
            }
            return errors;
        }

        if (typeof value.type === 'string' && 'coordinates' in value) {
            const coords = Array.isArray(value.coordinates)
                ? value.coordinates
                : (value.coordinates && this.safeParse(value.coordinates)) || [];
            const r = this.validateGeometryCore(value.type, coords);
            if (!r.valid) {
                errors[0] = r.errors;
            }
            return errors;
        }

        return { 0: ['Unrecognized GeoJSON format'] };
    }

    private isLonLat(coord: any): boolean {
        if (!Array.isArray(coord) || coord.length < 2) {
            return false;
        }
        const [lon, lat] = coord;
        return this.isNumber(lon) && this.isNumber(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
    }

    private validatePoint(coords: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(coords) || coords.length < 2) {
            errors.push('Point must be an array [longitude, latitude]');
            return errors;
        }
        if (!this.isLonLat(coords)) {
            errors.push('Invalid Point coordinates: expected lon ∈ [-180, 180] and lat ∈ [-90, 90]');
        }
        return errors;
    }

    private validateLineString(coords: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(coords) || coords.length < 2) {
            errors.push('LineString must contain at least 2 points');
            return errors;
        }
        coords.forEach((c: any, i: number) => {
            if (!this.isLonLat(c)) {
                errors.push(`LineString: invalid point #${i}`);
            }
        });
        return errors;
    }

    private validatePolygon(coords: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(coords) || coords.length < 1) {
            errors.push('Polygon must contain at least one ring');
            return errors;
        }
        coords.forEach((ring: any, ri: number) => {
            if (!Array.isArray(ring) || ring.length < 3) {
                errors.push(`Polygon: ring #${ri} must contain at least 3 points (excluding the closing point)`);
                return;
            }
            ring.forEach((c: any, ci: number) => {
                if (!this.isLonLat(c)) {
                    errors.push(`Polygon: invalid point #${ci} in ring #${ri}`);
                }
            });
        });
        return errors;
    }

    private validateMultiPoint(coords: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(coords) || coords.length < 1) {
            errors.push('MultiPoint must contain at least one point');
            return errors;
        }
        coords.forEach((c: any, i: number) => {
            if (!this.isLonLat(c)) {
                errors.push(`MultiPoint: invalid point #${i}`);
            }
        });
        return errors;
    }

    private validateMultiLineString(coords: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(coords) || coords.length < 1) {
            errors.push('MultiLineString must contain at least one line');
            return errors;
        }
        coords.forEach((line: any, li: number) => {
            if (!Array.isArray(line) || line.length < 2) {
                errors.push(`MultiLineString: line #${li} must contain at least 2 points`);
                return;
            }
            line.forEach((c: any, ci: number) => {
                if (!this.isLonLat(c)) {
                    errors.push(`MultiLineString: invalid point #${ci} in line #${li}`);
                }
            });
        });
        return errors;
    }

    private validateMultiPolygon(coords: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(coords) || coords.length < 1) {
            errors.push('MultiPolygon must contain at least one polygon');
            return errors;
        }
        coords.forEach((poly: any, pi: number) => {
            if (!Array.isArray(poly) || poly.length < 1) {
                errors.push(`MultiPolygon: polygon #${pi} must contain at least one ring`);
                return;
            }
            poly.forEach((ring: any, ri: number) => {
                if (!Array.isArray(ring) || ring.length < 3) {
                    errors.push(`MultiPolygon: in polygon #${pi}, ring #${ri} must contain at least 3 points`);
                    return;
                }
                ring.forEach((c: any, ci: number) => {
                    if (!this.isLonLat(c)) {
                        errors.push(`MultiPolygon: invalid point #${ci} in polygon #${pi}, ring #${ri}`);
                    }
                });
            });
        });
        return errors;
    }

    private validateGeometryCore(type: string, coords: any): { valid: boolean; errors: string[] } {
        let errors: string[] = [];

        if (Array.isArray(this.availableTypes) && this.availableTypes.length && !this.availableTypes.includes(type)) {
            return { valid: false, errors: [`geometry type "${type}" is not available`] };
        }

        switch (type) {
            case GeoJsonType.POINT:
                errors = this.validatePoint(coords);
                break;
            case GeoJsonType.LINE_STRING:
                errors = this.validateLineString(coords);
                break;
            case GeoJsonType.POLYGON:
                errors = this.validatePolygon(coords);
                break;
            case GeoJsonType.MULTI_POINT:
                errors = this.validateMultiPoint(coords);
                break;
            case GeoJsonType.MULTI_LINE_STRING:
                errors = this.validateMultiLineString(coords);
                break;
            case GeoJsonType.MULTI_POLYGON:
                errors = this.validateMultiPolygon(coords);
                break;
            default:
                errors = ['Unsupported geometry type'];
        }
        return { valid: errors.length === 0, errors };
    }

    private safeParse(s: string): any { try { return JSON.parse(s); } catch { return []; } }
    private safeStringify(s: string): any { try { return JSON.stringify(s); } catch { return {}; } }
}