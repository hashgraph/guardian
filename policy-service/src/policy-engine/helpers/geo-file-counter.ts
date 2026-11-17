import { GeoJsonValidator, GeoCoordinate, XmlToken, XmlTokenizer } from '@guardian/interfaces';

export interface GeoFileCounts {
    features: number;
    vertices: number;
}

export class GeoJsonFeatureCounter {
    constructor(private readonly validator = new GeoJsonValidator()) {}
    public write(text: string): void { this.validator.write(text); }
    public finish(): GeoFileCounts { this.validator.finish(); return this.validator.counts; }
}

class TupleSequence {
    public first: GeoCoordinate | null = null;
    public last: GeoCoordinate | null = null;
    public count = 0;
    private token = '';

    write(text: string): void {
        for (const character of text) {
            if (/\s/.test(character)) { this.flush(); }
            else if (this.token.length < 256) { this.token += character; }
        }
    }

    finish(): void {
        this.flush();
    }

    private flush(): void {
        if (!this.token) { return; }
        const values = this.token
            .replace(/\s*/g, '')
            .split(',')
            .map(value => Number.parseFloat(value))
            .filter(value => !Number.isNaN(value))
            .slice(0, 3);
        this.token = '';
        if (values.length < 2) { return; }
        const tuple: GeoCoordinate = values.length >= 3 ? [values[0], values[1], values[2]] : [values[0], values[1]];
        if (!this.first) { this.first = tuple; }
        this.last = tuple;
        this.count += 1;
    }
}

class PointTuple {
    private token = '';
    private readonly values: number[] = [];
    public write(text: string): void {
        for (const character of text) {
            if (character === ',') { this.flush(); }
            else if (!/\s/.test(character) && this.token.length < 256) { this.token += character; }
        }
    }
    private flush(): void {
        const value = Number.parseFloat(this.token);
        if (!Number.isNaN(value) && this.values.length < 3) { this.values.push(value); }
        this.token = '';
    }
    public finish(): GeoCoordinate | null {
        this.flush();
        return this.values.length >= 3 ? [this.values[0], this.values[1], this.values[2]]
            : this.values.length >= 2 ? [this.values[0], this.values[1]] : null;
    }
}

interface GeometryState {
    name: string;
    depth: number;
    tuples?: TupleSequence;
    point?: PointTuple;
    trackText: string;
    trackCount: number;
    unprefixedTrackCount: number;
    prefixedTrackCount: number;
    candidate: GeoCoordinate | null;
    polygonRings: number;
    vertices: number;
    ring?: TupleSequence;
}

interface PlacemarkState {
    depth: number;
    geometryCount: number;
    vertices: number;
    candidate: GeoCoordinate | null;
    geometryType: string;
    containerDepths: Set<number>;
    geometry: GeometryState | null;
}

interface BoundsState {
    depth: number;
    north?: number;
    south?: number;
    east?: number;
    west?: number;
    rotation?: number;
    quad?: TupleSequence;
    scalarName?: string;
    scalarText: string;
}

const GEOMETRY_NAMES = new Set([
    'Point', 'LineString', 'LinearRing', 'Polygon', 'Track', 'gx:Track'
]);
const CONTAINER_NAMES = new Set(['MultiGeometry', 'MultiTrack', 'gx:MultiTrack']);

export class KmlFeatureCounter {
    private readonly counts: GeoFileCounts = { features: 0, vertices: 0 };
    public coordinate: GeoCoordinate | null = null;
    public settled = false;
    private readonly tags: string[] = [];
    private readonly tokenizer = new XmlTokenizer(
        token => this.consume(token),
        () => this.settled
    );
    private placemark: PlacemarkState | null = null;
    private overlay: BoundsState | null = null;
    private networkLink: BoundsState | null = null;
    private groundOverlayCandidate: GeoCoordinate | null = null;
    private networkLinkCandidate: GeoCoordinate | null = null;

    constructor(private readonly allowedTypes: readonly string[] = []) {}

    public write(text: string): void {
        this.tokenizer.write(text);
    }

    public finish(): GeoFileCounts {
        this.tokenizer.finish();
        if (!this.settled) {
            this.coordinate = this.groundOverlayCandidate || this.networkLinkCandidate;
            this.settled = true;
        }
        return this.counts;
    }

    private consume(token: XmlToken): void {
        if (this.settled) { return; }
        if (token.type === 'text') {
            this.text(token.value);
        } else if (token.type === 'start') {
            this.start(token.name);
        } else {
            this.end(token.name);
        }
    }

    private start(name: string): void {
        const parent = this.tags[this.tags.length - 1];
        this.tags.push(name);
        const depth = this.tags.length;
        if (name === 'Placemark') {
            this.placemark = {
                depth, geometryCount: 0, vertices: 0, candidate: null, geometryType: '',
                containerDepths: new Set<number>(), geometry: null
            };
        }
        if (this.placemark && CONTAINER_NAMES.has(name)) {
            const eligible = parent === 'Placemark' || this.placemark.containerDepths.has(depth - 1);
            if (eligible) { this.placemark.containerDepths.add(depth); }
        }
        if (this.placemark && GEOMETRY_NAMES.has(name)) {
            const eligible = parent === 'Placemark' || this.placemark.containerDepths.has(depth - 1);
            if (eligible && !this.placemark.geometry) {
                this.placemark.geometry = {
                    name, depth, vertices: 0, point: name === 'Point' ? new PointTuple() : undefined, trackText: '', trackCount: 0, unprefixedTrackCount: 0, prefixedTrackCount: 0,
                    candidate: null, polygonRings: 0,
                    tuples: name === 'LineString' || name === 'LinearRing' ? new TupleSequence() : undefined
                };
            }
        }
        const geometry = this.placemark?.geometry;
        if (geometry && name === 'coordinates') {
            if (geometry.name === 'Polygon' && parent === 'LinearRing') { geometry.ring = new TupleSequence(); }
        }
        if (geometry && (name === 'coord' || name.endsWith(':coord')) &&
            (geometry.name === 'Track' || geometry.name === 'gx:Track')) {
            geometry.trackText = '';
        }
        if (name === 'GroundOverlay') { this.overlay = this.emptyBounds(depth); }
        if (name === 'NetworkLink') { this.networkLink = this.emptyBounds(depth); }
        if (this.overlay && name === 'coordinates' && this.tags.includes('gx:LatLonQuad')) {
            this.overlay.quad = new TupleSequence();
        }
        this.beginScalar(this.overlay, name, this.tags.includes('LatLonBox'));
        this.beginScalar(
            this.networkLink,
            name,
            this.tags.includes('Region') && this.tags.includes('LatLonAltBox')
        );
    }

    private text(value: string): void {
        const geometry = this.placemark?.geometry;
        const current = this.tags[this.tags.length - 1];
        if (geometry && current === 'coordinates') {
            if (geometry.name === 'Point') {
                geometry.point?.write(value);
            } else if (geometry.name === 'Polygon') {
                geometry.ring?.write(value);
            } else {
                geometry.tuples?.write(value);
            }
        }
        if (geometry && (current === 'coord' || current?.endsWith(':coord')) &&
            (geometry.name === 'Track' || geometry.name === 'gx:Track') &&
            geometry.trackText.length < 256) {
            geometry.trackText += value;
        }
        if (this.overlay?.quad && current === 'coordinates') { this.overlay.quad.write(value); }
        if (this.overlay && this.overlay.scalarName === current && this.overlay.scalarText.length < 256) {
            this.overlay.scalarText += value;
        }
        if (this.networkLink && this.networkLink.scalarName === current &&
            this.networkLink.scalarText.length < 256) {
            this.networkLink.scalarText += value;
        }
    }

    private end(name: string): void {
        const depth = this.tags.length;
        const geometry = this.placemark?.geometry;
        if (geometry && name === 'coordinates') { this.finishCoordinates(geometry); }
        if (geometry && (name === 'coord' || name.endsWith(':coord'))) { this.finishTrackCoordinate(geometry); }
        if (geometry && name === 'LinearRing' && geometry.name === 'Polygon' && geometry.ring) {
            geometry.ring.finish();
            const closed = geometry.ring.first && geometry.ring.last &&
                !this.sameTuple(geometry.ring.first, geometry.ring.last);
            if (geometry.ring.count + (closed ? 1 : 0) >= 4) {
                geometry.polygonRings += 1;
                geometry.vertices += geometry.ring.count + (closed ? 1 : 0);
                if (!geometry.candidate) { geometry.candidate = geometry.ring.first; }
            }
            geometry.ring = undefined;
        }
        if (geometry && geometry.depth === depth && geometry.name === name) {
            this.finishGeometry(geometry);
            if (this.placemark) { this.placemark.geometry = null; }
        }
        this.finishScalar(this.overlay, name);
        this.finishScalar(this.networkLink, name);
        if (name === 'GroundOverlay' && this.overlay) {
            if (this.boundsCoordinate(this.overlay)) {
                this.overlay.quad?.finish();
                this.counts.features += 1;
                this.counts.vertices += this.overlay.quad ? this.overlay.quad.count + (this.overlay.quad.first && this.overlay.quad.last && !this.sameTuple(this.overlay.quad.first, this.overlay.quad.last) ? 1 : 0) : 5;
            }
            if (!this.groundOverlayCandidate && this.allows('Polygon')) {
                this.groundOverlayCandidate = this.boundsCoordinate(this.overlay);
            }
            this.overlay = null;
        }
        if (name === 'NetworkLink' && this.networkLink) {
            if (this.boundsCoordinate(this.networkLink)) { this.counts.features += 1; this.counts.vertices += 5; }
            if (!this.networkLinkCandidate && this.allows('Polygon')) {
                this.networkLinkCandidate = this.boundsCoordinate(this.networkLink);
            }
            this.networkLink = null;
        }
        if (name === 'Placemark' && this.placemark) {
            if (this.placemark.geometryCount === 1 && this.placemark.candidate &&
                this.allows(this.placemark.geometryType)) {
                this.coordinate = this.placemark.candidate;
                this.counts.features += 1;
                this.counts.vertices += this.placemark.vertices;
            }
            this.placemark = null;
        }
        if (this.placemark && CONTAINER_NAMES.has(name)) {
            this.placemark.containerDepths.delete(depth);
        }
        this.tags.pop();
    }

    private finishCoordinates(geometry: GeometryState): void {
        if (geometry.name === 'Point') {
            geometry.candidate = geometry.point?.finish() || null;
        } else if (geometry.name !== 'Polygon') {
            geometry.tuples?.finish();
            geometry.candidate = geometry.tuples?.first || null;
        }
    }

    private finishTrackCoordinate(geometry: GeometryState): void {
        if (geometry.name !== 'Track' && geometry.name !== 'gx:Track') { return; }
        const unprefixed = this.tags[this.tags.length - 1] === 'coord';
        const first = unprefixed ? geometry.unprefixedTrackCount === 0
            : geometry.unprefixedTrackCount === 0 && geometry.prefixedTrackCount === 0;
        if (unprefixed) { geometry.unprefixedTrackCount += 1; }
        else { geometry.prefixedTrackCount += 1; }
        geometry.trackCount = geometry.unprefixedTrackCount || geometry.prefixedTrackCount;
        if (first) { geometry.candidate = [0, 0]; }
        geometry.trackText = '';
    }

    private finishGeometry(geometry: GeometryState): void {
        let valid = false;
        if (geometry.name === 'Point') { valid = !!geometry.candidate; }
        else if (geometry.name === 'LineString' || geometry.name === 'LinearRing') {
            valid = !!geometry.candidate && (geometry.tuples?.count || 0) >= 2;
        } else if (geometry.name === 'Polygon') {
            valid = !!geometry.candidate && geometry.polygonRings > 0;
        } else {
            valid = !!geometry.candidate && geometry.trackCount > 0;
        }
        if (!valid || !this.placemark) { return; }
        this.placemark.geometryCount += 1;
        this.placemark.vertices += geometry.name === 'Point' ? 1
            : geometry.name === 'Polygon' ? geometry.vertices
            : geometry.tuples ? geometry.tuples.count : geometry.trackCount > 2 ? geometry.trackCount : 1;
        if (!this.placemark.candidate) {
            this.placemark.candidate = geometry.candidate;
            this.placemark.geometryType = this.geoJsonType(geometry);
        }
    }

    private geoJsonType(geometry: GeometryState): string {
        if (geometry.name === 'Point' || geometry.name === 'Polygon') { return geometry.name; }
        if (geometry.name === 'LineString' || geometry.name === 'LinearRing') { return 'LineString'; }
        return geometry.trackCount > 2 ? 'LineString' : 'Point';
    }

    private allows(type: string): boolean {
        return !this.allowedTypes.length || this.allowedTypes.includes(type);
    }

    private emptyBounds(depth: number): BoundsState {
        return { depth, scalarText: '' };
    }

    private beginScalar(bounds: BoundsState | null, name: string, eligible: boolean): void {
        if (!bounds || !eligible) { return; }
        if (['north', 'south', 'east', 'west', 'rotation'].includes(name)) {
            bounds.scalarName = name;
            bounds.scalarText = '';
        }
    }

    private finishScalar(bounds: BoundsState | null, name: string): void {
        if (!bounds || bounds.scalarName !== name) { return; }
        const value = Number.parseFloat(bounds.scalarText);
        if (!Number.isNaN(value) && ['north', 'south', 'east', 'west', 'rotation'].includes(name)) { Reflect.set(bounds, name, value); }
        bounds.scalarName = undefined;
        bounds.scalarText = '';
        if (name === 'coordinates') { bounds.quad?.finish(); }
    }

    private boundsCoordinate(bounds: BoundsState): GeoCoordinate | null {
        bounds.quad?.finish();
        if (bounds.quad?.first) { return bounds.quad.first; }
        const { west, north, east, south } = bounds;
        if (typeof west !== 'number' || typeof north !== 'number' || typeof east !== 'number' || typeof south !== 'number') { return null; }
        if (typeof bounds.rotation !== 'number') { return [west, north]; }
        const centerX = (west + east) / 2;
        const centerY = (south + north) / 2;
        const dx = west - centerX;
        const dy = north - centerY;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        const angle = Math.atan2(dy, dx) + bounds.rotation * Math.PI / 180;
        return [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance];
    }

    private sameTuple(left: GeoCoordinate, right: GeoCoordinate): boolean {
        const length = Math.max(left.length, right.length);
        for (let index = 0; index < length; index += 1) {
            if (left[index] !== right[index]) { return false; }
        }
        return true;
    }
}
