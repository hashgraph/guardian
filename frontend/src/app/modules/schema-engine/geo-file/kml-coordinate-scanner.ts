import { CoordinateScanner, GeoCoordinate } from './first-coordinate-reader';
import { XmlToken, XmlTokenizer } from './xml-tokenizer';

class TupleSequence {
    public first: GeoCoordinate | null = null;
    public last: GeoCoordinate | null = null;
    public count = 0;
    private token = '';

    write(text: string): void {
        for (const character of text) {
            if (/\s/.test(character)) this.flush();
            else if (this.token.length < 256) this.token += character;
        }
    }

    finish(): void {
        this.flush();
    }

    private flush(): void {
        if (!this.token) return;
        const values = this.token
            .replace(/\s*/g, '')
            .split(',')
            .map(value => Number.parseFloat(value))
            .filter(value => !Number.isNaN(value))
            .slice(0, 3);
        this.token = '';
        if (values.length < 2) return;
        const tuple = values as GeoCoordinate;
        if (!this.first) this.first = tuple;
        this.last = tuple;
        this.count += 1;
    }
}

interface GeometryState {
    name: string;
    depth: number;
    tuples?: TupleSequence;
    pointText: string;
    trackText: string;
    trackCount: number;
    candidate: GeoCoordinate | null;
    polygonRings: number;
    ring?: TupleSequence;
}

interface PlacemarkState {
    depth: number;
    geometryCount: number;
    candidate: GeoCoordinate | null;
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

export class KmlCoordinateScanner implements CoordinateScanner {
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

    public write(text: string): void {
        this.tokenizer.write(text);
    }

    public finish(): void {
        this.tokenizer.finish();
        if (!this.settled) {
            this.coordinate = this.groundOverlayCandidate || this.networkLinkCandidate;
            this.settled = true;
        }
    }

    private consume(token: XmlToken): void {
        if (this.settled) return;
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
                depth, geometryCount: 0, candidate: null,
                containerDepths: new Set<number>(), geometry: null
            };
        }
        if (this.placemark && CONTAINER_NAMES.has(name)) {
            const eligible = parent === 'Placemark' || this.placemark.containerDepths.has(depth - 1);
            if (eligible) this.placemark.containerDepths.add(depth);
        }
        if (this.placemark && GEOMETRY_NAMES.has(name)) {
            const eligible = parent === 'Placemark' || this.placemark.containerDepths.has(depth - 1);
            if (eligible && !this.placemark.geometry) {
                this.placemark.geometry = {
                    name, depth, pointText: '', trackText: '', trackCount: 0,
                    candidate: null, polygonRings: 0,
                    tuples: name === 'LineString' || name === 'LinearRing' ? new TupleSequence() : undefined
                };
            }
        }
        const geometry = this.placemark?.geometry;
        if (geometry && name === 'coordinates') {
            if (geometry.name === 'Polygon' && parent === 'LinearRing') geometry.ring = new TupleSequence();
        }
        if (geometry && (name === 'coord' || name.endsWith(':coord')) &&
            (geometry.name === 'Track' || geometry.name === 'gx:Track')) {
            geometry.trackText = '';
        }
        if (name === 'GroundOverlay') this.overlay = this.emptyBounds(depth);
        if (name === 'NetworkLink') this.networkLink = this.emptyBounds(depth);
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
                if (geometry.pointText.length < 256) geometry.pointText += value;
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
        if (this.overlay?.quad && current === 'coordinates') this.overlay.quad.write(value);
        if (this.overlay?.scalarName === current && this.overlay.scalarText.length < 256) {
            this.overlay.scalarText += value;
        }
        if (this.networkLink?.scalarName === current && this.networkLink.scalarText.length < 256) {
            this.networkLink.scalarText += value;
        }
    }

    private end(name: string): void {
        const depth = this.tags.length;
        const geometry = this.placemark?.geometry;
        if (geometry && name === 'coordinates') this.finishCoordinates(geometry);
        if (geometry && (name === 'coord' || name.endsWith(':coord'))) this.finishTrackCoordinate(geometry);
        if (geometry && name === 'LinearRing' && geometry.name === 'Polygon' && geometry.ring) {
            geometry.ring.finish();
            const closed = geometry.ring.first && geometry.ring.last &&
                !this.sameTuple(geometry.ring.first, geometry.ring.last);
            if (geometry.ring.count + (closed ? 1 : 0) >= 4) {
                geometry.polygonRings += 1;
                if (!geometry.candidate) geometry.candidate = geometry.ring.first;
            }
            geometry.ring = undefined;
        }
        if (geometry && geometry.depth === depth && geometry.name === name) {
            this.finishGeometry(geometry);
            if (this.placemark) this.placemark.geometry = null;
        }
        this.finishScalar(this.overlay, name);
        this.finishScalar(this.networkLink, name);
        if (name === 'GroundOverlay' && this.overlay) {
            if (!this.groundOverlayCandidate) this.groundOverlayCandidate = this.boundsCoordinate(this.overlay);
            this.overlay = null;
        }
        if (name === 'NetworkLink' && this.networkLink) {
            if (!this.networkLinkCandidate) this.networkLinkCandidate = this.boundsCoordinate(this.networkLink);
            this.networkLink = null;
        }
        if (name === 'Placemark' && this.placemark) {
            if (this.placemark.geometryCount === 1 && this.placemark.candidate) {
                this.coordinate = this.placemark.candidate;
                this.settled = true;
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
            const values = geometry.pointText
                .replace(/\s*/g, '')
                .split(',')
                .map(value => Number.parseFloat(value))
                .filter(value => !Number.isNaN(value))
                .slice(0, 3);
            if (values.length >= 2) geometry.candidate = values as GeoCoordinate;
        } else if (geometry.name !== 'Polygon') {
            geometry.tuples?.finish();
            geometry.candidate = geometry.tuples?.first || null;
        }
    }

    private finishTrackCoordinate(geometry: GeometryState): void {
        const values = geometry.trackText.split(' ').map(value => Number.parseFloat(value));
        geometry.trackText = '';
        if (values.length >= 2 && !values.some(value => Number.isNaN(value))) {
            if (!geometry.candidate) geometry.candidate = values.slice(0, 3) as GeoCoordinate;
            geometry.trackCount += 1;
        }
    }

    private finishGeometry(geometry: GeometryState): void {
        let valid = false;
        if (geometry.name === 'Point') valid = !!geometry.candidate;
        else if (geometry.name === 'LineString' || geometry.name === 'LinearRing') {
            valid = !!geometry.candidate && (geometry.tuples?.count || 0) >= 2;
        } else if (geometry.name === 'Polygon') {
            valid = !!geometry.candidate && geometry.polygonRings > 0;
        } else {
            valid = !!geometry.candidate && geometry.trackCount > 0;
        }
        if (!valid || !this.placemark) return;
        this.placemark.geometryCount += 1;
        if (!this.placemark.candidate) this.placemark.candidate = geometry.candidate;
    }

    private emptyBounds(depth: number): BoundsState {
        return { depth, scalarText: '' };
    }

    private beginScalar(bounds: BoundsState | null, name: string, eligible: boolean): void {
        if (!bounds || !eligible) return;
        if (['north', 'south', 'east', 'west', 'rotation'].includes(name)) {
            bounds.scalarName = name;
            bounds.scalarText = '';
        }
    }

    private finishScalar(bounds: BoundsState | null, name: string): void {
        if (!bounds || bounds.scalarName !== name) return;
        const value = Number.parseFloat(bounds.scalarText);
        if (!Number.isNaN(value)) bounds[name as 'north' | 'south' | 'east' | 'west' | 'rotation'] = value;
        bounds.scalarName = undefined;
        bounds.scalarText = '';
        if (name === 'coordinates') bounds.quad?.finish();
    }

    private boundsCoordinate(bounds: BoundsState): GeoCoordinate | null {
        bounds.quad?.finish();
        if (bounds.quad?.first) return bounds.quad.first;
        if ([bounds.north, bounds.south, bounds.east, bounds.west].some(value => typeof value !== 'number')) {
            return null;
        }
        const west = bounds.west as number;
        const north = bounds.north as number;
        if (typeof bounds.rotation !== 'number') return [west, north];
        const east = bounds.east as number;
        const south = bounds.south as number;
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
            if (left[index] !== right[index]) return false;
        }
        return true;
    }
}
