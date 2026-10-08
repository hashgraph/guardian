import { CoordinateScanner, GeoCoordinate } from './first-coordinate-reader';

type JsonToken =
    | { type: 'punctuation'; value: '{' | '}' | '[' | ']' | ':' | ',' }
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'literal'; value: true | false | null };

type ObjectState = 'keyOrEnd' | 'colon' | 'value' | 'commaOrEnd';
type ArrayState = 'valueOrEnd' | 'commaOrEnd';

interface ObjectFrame {
    kind: 'object';
    path: string[];
    state: ObjectState;
    key: string | null;
    geometry: boolean;
    geometryType: string | null;
    candidate: GeoCoordinate | null;
}

interface ArrayFrame {
    kind: 'array';
    path: string[];
    state: ArrayState;
    coordinateOwner: ObjectFrame | null;
}

type Frame = ObjectFrame | ArrayFrame;

interface CoordinateCapture {
    owner: ObjectFrame;
    depth: number;
    numberDepth: number | null;
    numbers: number[];
    failed: boolean;
}

const GEOMETRY_TYPES = new Set([
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon'
]);

export class GeoJsonCoordinateScanner implements CoordinateScanner {
    public coordinate: GeoCoordinate | null = null;
    public settled = false;
    private readonly frames: Frame[] = [];
    private mode: 'plain' | 'string' | 'escape' | 'unicode' | 'number' | 'literal' = 'plain';
    private token = '';
    private unicode = '';
    private stringValue = '';
    private capture: CoordinateCapture | null = null;

    public write(text: string): void {
        for (const character of text) {
            this.consume(character);
            if (this.settled) return;
        }
    }

    public finish(): void {
        if (this.mode === 'number') this.emitNumber();
        else if (this.mode === 'literal') this.emitLiteral();
        this.settled = true;
    }

    private consume(character: string): void {
        if (this.mode === 'string') {
            if (character === '\\') this.mode = 'escape';
            else if (character === '"') {
                this.mode = 'plain';
                this.emit({ type: 'string', value: this.stringValue });
                this.stringValue = '';
            } else this.stringValue += character;
            return;
        }
        if (this.mode === 'escape') {
            const escapes: Record<string, string> = {
                '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f',
                n: '\n', r: '\r', t: '\t'
            };
            if (character === 'u') {
                this.unicode = '';
                this.mode = 'unicode';
            } else {
                this.stringValue += escapes[character] ?? character;
                this.mode = 'string';
            }
            return;
        }
        if (this.mode === 'unicode') {
            this.unicode += character;
            if (this.unicode.length === 4) {
                const code = Number.parseInt(this.unicode, 16);
                this.stringValue += Number.isFinite(code) ? String.fromCharCode(code) : '';
                this.mode = 'string';
            }
            return;
        }
        if (this.mode === 'number') {
            if (/[0-9eE+\-.]/.test(character)) {
                this.token += character;
                return;
            }
            this.emitNumber();
            this.consume(character);
            return;
        }
        if (this.mode === 'literal') {
            if (/[A-Za-z]/.test(character)) {
                this.token += character;
                return;
            }
            this.emitLiteral();
            this.consume(character);
            return;
        }
        if (/\s/.test(character)) return;
        if (character === '"') {
            this.stringValue = '';
            this.mode = 'string';
        } else if (/[0-9\-]/.test(character)) {
            this.token = character;
            this.mode = 'number';
        } else if (/[tfn]/.test(character)) {
            this.token = character;
            this.mode = 'literal';
        } else if ('{}[]:,'.includes(character)) {
            this.emit({ type: 'punctuation', value: character as '{' | '}' | '[' | ']' | ':' | ',' });
        }
    }

    private emitNumber(): void {
        const value = Number(this.token);
        this.mode = 'plain';
        this.token = '';
        if (Number.isFinite(value)) this.emit({ type: 'number', value });
    }

    private emitLiteral(): void {
        const value = this.token === 'true' ? true : this.token === 'false' ? false : null;
        this.mode = 'plain';
        this.token = '';
        this.emit({ type: 'literal', value });
    }

    private emit(token: JsonToken): void {
        if (token.type === 'punctuation') {
            if (token.value === '{' || token.value === '[') {
                this.open(token.value);
                return;
            }
            if (token.value === '}' || token.value === ']') {
                this.close(token.value);
                return;
            }
            this.separator(token.value);
            return;
        }
        const frame = this.frames[this.frames.length - 1];
        if (!frame) return;
        if (frame.kind === 'object' && frame.state === 'keyOrEnd' && token.type === 'string') {
            frame.key = token.value.length <= 64 ? token.value : '';
            frame.state = 'colon';
            return;
        }
        if (frame.kind === 'object' && frame.state === 'value') {
            if (frame.key === 'type' && token.type === 'string') frame.geometryType = token.value;
            this.completeValue(frame);
        } else if (frame.kind === 'array' && frame.state === 'valueOrEnd') {
            this.captureNumber(token);
            this.completeValue(frame);
        }
    }

    private open(value: '{' | '['): void {
        const parent = this.frames[this.frames.length - 1];
        const path = this.childPath(parent);
        const owner = value === '[' && parent?.kind === 'object' &&
            parent.state === 'value' && parent.key === 'coordinates' && parent.geometry
            ? parent
            : null;
        if (parent) this.completeValue(parent);
        if (value === '{') {
            const geometry = path.length === 0 ||
                (path[path.length - 1] === 'geometry' &&
                    path.every(key => key === 'features' || key === 'geometry'));
            this.frames.push({
                kind: 'object', path, state: 'keyOrEnd', key: null,
                geometry, geometryType: null, candidate: null
            });
        } else {
            const frame: ArrayFrame = { kind: 'array', path, state: 'valueOrEnd', coordinateOwner: owner };
            this.frames.push(frame);
            if (owner) this.capture = { owner, depth: 1, numberDepth: null, numbers: [], failed: false };
            else if (this.capture) this.capture.depth += 1;
        }
    }

    private close(value: '}' | ']'): void {
        const frame = this.frames.pop();
        if (!frame) return;
        if (value === ']' && this.capture) {
            if (this.capture.numberDepth === this.capture.depth) {
                const [longitude, latitude, altitude] = this.capture.numbers;
                if (!this.capture.failed && longitude !== undefined && latitude !== undefined) {
                    this.capture.owner.candidate = altitude === undefined
                        ? [longitude, latitude]
                        : [longitude, latitude, altitude];
                }
                this.capture = null;
            } else {
                if (this.capture.numberDepth === null && this.capture.depth > 1) {
                    this.capture.failed = true;
                }
                this.capture.depth -= 1;
                if (this.capture.depth === 0) this.capture = null;
            }
        }
        if (value === '}' && frame.kind === 'object' && frame.geometry) {
            if (frame.geometryType && GEOMETRY_TYPES.has(frame.geometryType) && frame.candidate) {
                this.coordinate = frame.candidate;
                this.settled = true;
            }
        }
    }

    private separator(value: ':' | ','): void {
        const frame = this.frames[this.frames.length - 1];
        if (!frame) return;
        if (frame.kind === 'object') {
            if (value === ':' && frame.state === 'colon') frame.state = 'value';
            else if (value === ',' && frame.state === 'commaOrEnd') {
                frame.state = 'keyOrEnd';
                frame.key = null;
            }
        } else if (value === ',' && frame.state === 'commaOrEnd') {
            frame.state = 'valueOrEnd';
        }
    }

    private childPath(parent?: Frame): string[] {
        if (!parent) return [];
        if (parent.kind === 'array') return parent.path;
        return parent.key ? [...parent.path, parent.key] : parent.path;
    }

    private completeValue(frame: Frame): void {
        frame.state = 'commaOrEnd';
    }

    private captureNumber(token: JsonToken): void {
        if (!this.capture || token.type !== 'number' || this.capture.failed) return;
        if (this.capture.numberDepth === null) this.capture.numberDepth = this.capture.depth;
        if (this.capture.numberDepth === this.capture.depth && this.capture.numbers.length < 3) {
            this.capture.numbers.push(token.value);
        }
    }
}
