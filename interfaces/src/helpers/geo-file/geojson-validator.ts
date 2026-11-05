import { JsonEvent, JsonTokenizer } from './json-tokenizer.js';

export interface GeoJsonCheckResult {
    valid: boolean;
    reason?: string;
}

type Role = 'geo' | 'coordinates' | 'bbox' | 'features' | 'geometries' | 'foreign';
type Shape = 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
interface Summary {
    kind: string;
    path: string;
    text?: string;
    number?: number;
    length?: number;
    numbers?: number[];
    errors?: Record<Shape, string | undefined>;
    ringError?: string;
    error?: string;
    geoType?: string;
    dimensionMin?: number;
    dimensionMax?: number;
    countable?: boolean;
    features?: number;
    vertices?: number;
}
interface Frame {
    kind: 'object' | 'array';
    role: Role;
    path: string;
    key: string;
    members: Map<string, Summary>;
    count: number;
    allNumbers: boolean;
    numbers: number[];
    first?: Summary;
    last?: Summary;
    childErrors: Partial<Record<Shape, string>>;
    childRingError?: string;
    error?: string;
    dimensionMin?: number;
    dimensionMax?: number;
    features: number;
    vertices: number;
}
const shapes: Shape[] = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
const types = [...shapes, 'GeometryCollection', 'Feature', 'FeatureCollection'];
const members = new Set(['type', 'coordinates', 'geometry', 'geometries', 'features', 'properties', 'id', 'bbox']);

export class GeoJsonValidator {
    private readonly tokenizer = new JsonTokenizer(event => this.accept(event));
    private readonly stack: Frame[] = [];
    private root?: Summary;
    private syntaxError = false;
    public counts = { features: 0, vertices: 0 };

    public write(text: string): void {
        if (this.syntaxError) return;
        try { this.tokenizer.write(text); } catch { this.syntaxError = true; }
    }

    public finish(): GeoJsonCheckResult {
        try { this.tokenizer.finish(); } catch { this.syntaxError = true; }
        if (this.syntaxError) return { valid: false, reason: 'The file is not valid JSON.' };
        if (!this.root || this.root.kind !== 'object') return { valid: false, reason: 'A GeoJSON object is required at $.' };
        this.counts = { features: this.root.features || 0, vertices: this.root.vertices || 0 };
        return this.root.error ? { valid: false, reason: this.root.error } : { valid: true };
    }

    private location(): { role: Role; path: string } {
        const parent = this.stack[this.stack.length - 1];
        if (!parent) return { role: 'geo', path: '$' };
        const path = parent.kind === 'array' ? `${parent.path}[${parent.count}]` : `${parent.path}.${parent.key}`;
        if (parent.role === 'foreign') return { role: 'foreign', path: parent.path };
        if (parent.kind === 'array') return {
            role: parent.role === 'features' || parent.role === 'geometries' ? 'geo' : parent.role,
            path
        };
        const role: Role = parent.role === 'geo'
            ? parent.key === 'geometry' ? 'geo'
                : parent.key === 'coordinates' || parent.key === 'bbox' || parent.key === 'features' || parent.key === 'geometries'
                    ? parent.key : 'foreign'
            : 'foreign';
        return { role, path };
    }

    private accept(event: JsonEvent): void {
        if (event.type === 'key') { this.stack[this.stack.length - 1].key = event.name; return; }
        if (event.type === 'startObject' || event.type === 'startArray') {
            const location = this.location();
            this.stack.push({ ...location, kind: event.type === 'startObject' ? 'object' : 'array', key: '',
                members: new Map(), count: 0, allNumbers: true, numbers: [], childErrors: {}, features: 0, vertices: 0 });
        } else if (event.type === 'endObject' || event.type === 'endArray') {
            const frame = this.stack.pop();
            this.deliver(frame.kind === 'object' ? this.object(frame) : this.array(frame));
        } else {
            const { path } = this.location();
            this.deliver({ kind: event.type, path,
                ...(event.type === 'string' ? { text: event.truncated ? '' : event.head } : {}),
                ...(event.type === 'number' ? { number: event.value } : {}) });
        }
    }

    private dimensions(frame: Frame, child: Summary): void {
        if (child.dimensionMin !== undefined) frame.dimensionMin = Math.min(frame.dimensionMin ?? Infinity, child.dimensionMin);
        if (child.dimensionMax !== undefined) frame.dimensionMax = Math.max(frame.dimensionMax ?? 0, child.dimensionMax);
    }

    private deliver(child: Summary): void {
        const parent = this.stack[this.stack.length - 1];
        if (!parent) { this.root = child; return; }
        if (parent.role === 'foreign') { parent.count += 1; return; }
        if (parent.kind === 'object') {
            if (members.has(parent.key)) parent.members.set(parent.key, child);
            return;
        }
        parent.count += 1;
        if (parent.role === 'coordinates' || parent.role === 'bbox') {
            if (child.kind === 'number' && parent.allNumbers) parent.numbers.push(child.number);
            else { parent.allNumbers = false; parent.numbers = []; }
            if (!parent.first) parent.first = child;
            parent.last = child;
            for (const type of shapes) {
                const error = child.errors?.[type] || (child.kind !== 'array' ? `An array is required at ${child.path}.` : undefined);
                if (error && !parent.childErrors[type]) parent.childErrors[type] = error;
            }
            parent.childRingError ||= child.kind !== 'array' ? `An array is required at ${child.path}.` : child.ringError;
            this.dimensions(parent, child);
            parent.vertices += child.vertices || 0;
        } else if (parent.role === 'features' || parent.role === 'geometries') {
            const expected = parent.role === 'features' ? child.geoType === 'Feature' : child.geoType && child.geoType !== 'Feature' && child.geoType !== 'FeatureCollection';
            if (!parent.error) parent.error = !expected ? `A ${parent.role === 'features' ? 'Feature' : 'geometry'} object is required at ${child.path}.` : child.error;
            this.dimensions(parent, child);
            if (child.countable) { parent.features += 1; parent.vertices += child.vertices || 0; }
        }
    }

    private array(frame: Frame): Summary {
        const result: Summary = { kind: 'array', path: frame.path, length: frame.count, error: frame.error,
            features: frame.features, vertices: frame.vertices, dimensionMin: frame.dimensionMin, dimensionMax: frame.dimensionMax };
        if (frame.role !== 'coordinates' && frame.role !== 'bbox') return result;
        const positionError = !frame.allNumbers || frame.count < 2 || frame.numbers.some(number => !Number.isFinite(number))
            ? `A position of at least two numbers is required at ${frame.path}.`
            : Math.abs(frame.numbers[0]) > 180 || Math.abs(frame.numbers[1]) > 90
                ? `Coordinates at ${frame.path} must use WGS 84 longitude and latitude.` : undefined;
        const pointsError = frame.childErrors.Point;
        const lineError = frame.count < 2 ? `A LineString at ${frame.path} must contain at least two positions.` : pointsError;
        const ringError = frame.count < 4 ? `A Polygon ring at ${frame.path} must contain at least four positions.` : pointsError ||
            (!frame.first?.numbers || !frame.last?.numbers || frame.first.numbers.length !== frame.last.numbers.length ||
                frame.first.numbers.some((number, index) => number !== frame.last.numbers[index])
                ? `Polygon ring at ${frame.path} is not closed.` : undefined);
        result.errors = { Point: positionError, MultiPoint: pointsError, LineString: lineError,
            MultiLineString: frame.childErrors.LineString,
            Polygon: frame.childRingError,
            MultiPolygon: frame.childErrors.Polygon };
        result.ringError = ringError;
        if (frame.allNumbers) {
            result.numbers = frame.numbers;
            result.vertices = frame.count >= 2 ? 1 : 0;
            result.dimensionMin = result.dimensionMax = frame.count >= 2 ? frame.count : undefined;
        }
        return result;
    }

    private object(frame: Frame): Summary {
        const m = frame.members;
        const type = m.get('type')?.text;
        const result: Summary = { kind: 'object', path: frame.path, geoType: type, features: 1, vertices: 0 };
        if (frame.role !== 'geo') return result;
        const invalid = (reason: string) => { result.error ||= reason; };
        if (!types.includes(type)) invalid(`A valid GeoJSON type is required at ${frame.path}.`);
        const geometry = type !== 'Feature' && type !== 'FeatureCollection';
        const forbidden = geometry ? ['geometry', 'properties', 'features'] : type === 'Feature' ? ['coordinates', 'geometries', 'features'] : ['coordinates', 'geometries', 'geometry', 'properties'];
        for (const name of forbidden) if (m.has(name)) invalid(`Member "${name}" is not allowed on ${type} at ${frame.path}.`);
        let content: Summary | undefined;
        if (shapes.some(shape => shape === type)) {
            content = m.get('coordinates');
            if (content?.kind !== 'array') invalid(`Coordinates must be an array at ${frame.path}.coordinates.`);
            else if (content.length) {
                const error = content.errors?.[type];
                if (error) invalid(error);
            }
            result.countable = true;
            result.vertices = content?.vertices || 0;
        } else if (type === 'Feature') {
            content = m.get('geometry');
            if (content?.kind !== 'null' && (content?.kind !== 'object' || !content.geoType || content.geoType === 'Feature' || content.geoType === 'FeatureCollection')) invalid(`A geometry object or null is required at ${frame.path}.geometry.`);
            else if (content?.error) invalid(content.error);
            const properties = m.get('properties');
            if (properties?.kind !== 'object' && properties?.kind !== 'null') invalid(`Properties must be an object or null at ${frame.path}.properties.`);
            const id = m.get('id');
            if (id && id.kind !== 'string' && id.kind !== 'number') invalid(`Feature id must be a string or number at ${frame.path}.id.`);
            result.countable = content?.countable;
            result.vertices = content?.countable ? content.vertices : 0;
        } else if (type === 'FeatureCollection' || type === 'GeometryCollection') {
            const name = type === 'FeatureCollection' ? 'features' : 'geometries';
            content = m.get(name);
            if (content?.kind !== 'array') invalid(`Member "${name}" must be an array at ${frame.path}.${name}.`);
            else if (content.error) invalid(content.error);
            if (type === 'FeatureCollection') { result.features = content?.features || 0; result.vertices = content?.vertices || 0; }
        }
        result.dimensionMin = content?.dimensionMin;
        result.dimensionMax = content?.dimensionMax;
        const bbox = m.get('bbox');
        if (bbox) {
            const numbers = bbox.numbers;
            const n = numbers ? numbers.length / 2 : 0;
            if (bbox.kind !== 'array' || !numbers || n < 2 || !Number.isInteger(n) || numbers.some(value => !Number.isFinite(value))) invalid(`Bounding box at ${frame.path}.bbox must contain 2*n numbers with n at least two.`);
            else if (Math.abs(numbers[1]) > 90 || Math.abs(numbers[n + 1]) > 90 || numbers[1] > numbers[n + 1] ||
                numbers.slice(2, n).some((value, index) => value > numbers[n + index + 2])) invalid(`Bounding box axes are invalid at ${frame.path}.bbox.`);
            else if (result.dimensionMin !== undefined && n !== result.dimensionMax) invalid(`Bounding box dimensions do not match the geometry at ${frame.path}.bbox.`);
        }
        return result;
    }
}

export function validateGeoJsonValue(value: unknown): GeoJsonCheckResult {
    try {
        const text = JSON.stringify(value);
        if (text === undefined) return { valid: false, reason: 'The GeoJSON value cannot be read.' };
        const validator = new GeoJsonValidator();
        validator.write(text);
        return validator.finish();
    } catch { return { valid: false, reason: 'The GeoJSON value cannot be read.' }; }
}
