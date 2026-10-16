import { UntypedFormControl } from '@angular/forms';
import { GeoJsonType } from '@guardian/interfaces';
import { GeoForm } from './geo-form';
import { polygonHolesError, polygonRingError } from './polygon-ring-validation';

describe('Selected polygon ring validation', () => {
    const square = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
    const bowTie = [[0, 0], [4, 4], [0, 4], [4, 0], [0, 0]];

    function validate(type: string, coordinates: unknown, geoFile?: unknown): UntypedFormControl {
        const control = new UntypedFormControl({ type, coordinates, ...(geoFile ? { geoFile } : {}) });
        const form = new GeoForm(control);
        form.build();
        control.updateValueAndValidity();
        return control;
    }

    it('rejects a crossing polygon through the real form validator', () => {
        const control = validate('Polygon', [bowTie]);
        expect(control.invalid).toBeTrue();
        expect(control.errors?.geoJsonFieldErrors[0].join(' ')).toContain('must not cross or touch itself');
    });

    it('rejects an invalid ring in a MultiPolygon and keeps its polygon index', () => {
        const control = validate('MultiPolygon', [[square], [bowTie]]);
        expect(control.invalid).toBeTrue();
        expect(control.errors?.geoJsonFieldErrors[0]).toEqual([
            'MultiPolygon: polygon #1: ring #0 must not cross or touch itself',
        ]);
    });

    it('rejects a crossing interior ring', () => {
        expect(validate('Polygon', [square, bowTie]).invalid).toBeTrue();
    });

    it('rejects repeated vertices, overlapping edges and zero-area rings', () => {
        expect(polygonRingError([[0, 0], [4, 0], [4, 4], [4, 0], [0, 0]]))
            .toContain('repeat');
        expect(polygonRingError([[0, 0], [4, 0], [2, 0], [2, 4], [0, 0]]))
            .toContain('overlapping');
        expect(polygonRingError([[0, 0], [1, 0], [2, 0], [0, 0]])).not.toBeNull();
        expect(polygonRingError([[0, 0], [4, 0], [0, 0]])).toContain('3 distinct');
    });

    it('accepts ordinary, reversed, concave and dateline-crossing simple rings', () => {
        expect(validate('Polygon', [square]).valid).toBeTrue();
        expect(polygonRingError([...square].reverse())).toBeNull();
        expect(polygonRingError([[0, 0], [4, 0], [2, 2], [4, 4], [0, 4], [0, 0]])).toBeNull();
        expect(polygonRingError([[179, 0], [-179, 0], [-179, 4], [179, 4], [179, 0]])).toBeNull();
    });

    it('does not change input coordinates or reject a simple ring with altitude', () => {
        const ring = square.map(point => [...point, 10]);
        const before = JSON.stringify(ring);
        expect(polygonRingError(ring)).toBeNull();
        expect(JSON.stringify(ring)).toBe(before);
    });

    it('does not examine the original file and keeps its link on a valid selection', () => {
        const geoFile = { fileId: 'grid-1', cid: 'mixed-original', format: 'kml', noPreview: false };
        const control = validate('Polygon', [square], geoFile);
        expect(control.valid).toBeTrue();
        expect(control.value.geoFile).toBe(geoFile);
    });

    it('checks selected FeatureCollection polygons even with a no-preview link', () => {
        const control = new UntypedFormControl({
            type: 'FeatureCollection',
            geoFile: { noPreview: true, automaticPoint: [1, 2], fileId: 'grid-1' },
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [bowTie] } }],
        });
        const form = new GeoForm(control);
        form.setAvailableTypes([GeoJsonType.POLYGON]);
        form.build();
        control.updateValueAndValidity();
        expect(control.invalid).toBeTrue();
        expect(form.getErrors()[0].join(' ')).toContain('must not cross or touch itself');
    });

    it('rejects non-adjacent endpoint touches and collinear overlaps in either sweep direction', () => {
        const rings = [
            [[0, 0], [4, 0], [4, 4], [2, 0], [0, 4], [0, 0]],
            [[0, 0], [4, 0], [4, 4], [1, 4], [1, 0], [3, 0], [3, 2], [0, 2], [0, 0]],
        ];
        for (const ring of rings) {
            for (const candidate of [ring, [...ring].reverse(), ring.map(([x, y]) => [y, x])]) {
                const control = new UntypedFormControl({ type: 'Polygon', coordinates: [candidate] });
                new GeoForm(control).build();
                control.updateValueAndValidity();
                expect(control.errors?.geoJsonFieldErrors[0]).toEqual([
                    'Polygon: ring #0 must not cross or touch itself',
                ]);
            }
        }
    });

    it('accepts vertical edges, shared-x events and straight adjacent edges', () => {
        const ring = [[0, 0], [2, 0], [4, 0], [4, 4], [3, 4], [3, 1], [1, 1], [1, 4], [0, 4], [0, 0]];
        for (const candidate of [ring, [...ring].reverse(), ring.map(([x, y]) => [y, x])]) {
            const control = new UntypedFormControl({ type: 'Polygon', coordinates: [candidate] });
            new GeoForm(control).build();
            control.updateValueAndValidity();
            expect(control.valid).toBeTrue();
        }
    });

    it('keeps coordinate-range validation and does not throw for malformed rings', () => {
        expect(validate('Polygon', [[[0, 0], [181, 0], [0, 4], [0, 0]]]).invalid).toBeTrue();
        expect(() => validate('Polygon', [[null, [0, 0], [1, 1], [0, 0]]])).not.toThrow();
        expect(validate('Polygon', [[null, [0, 0], [1, 1], [0, 0]]]).invalid).toBeTrue();
    });
});

describe('Polygon compatibility and performance', () => {
    it('accepts consecutive duplicates and repeated closing points without changing the input', () => {
        for (const ring of [
            [[0, 0], [4, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
            [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0], [0, 0]],
        ]) {
            const before = JSON.stringify(ring);
            expect(polygonRingError(ring)).toBeNull();
            const control = new UntypedFormControl({ type: 'Polygon', coordinates: [ring] });
            new GeoForm(control).build();
            control.updateValueAndValidity();
            expect(control.valid).toBeTrue();
            expect(JSON.stringify(ring)).toBe(before);
        }
    });

    function comb(teeth: number, rotate: boolean): number[][] {
        const step = 10 / (teeth + 1);
        const ring = [[0, 0], [10, 0]];
        for (let tooth = 1; tooth <= teeth; tooth++) {
            const y = tooth * step;
            ring.push([10, y], [1, y], [1, y + step / 2], [10, y + step / 2]);
        }
        ring.push([10, 11], [0, 11], [0, 0]);
        return rotate ? ring.map(([x, y]) => [(x - y) / Math.SQRT2, (x + y) / Math.SQRT2]) : ring;
    }

    for (const rotated of [false, true]) {
        it('checks a valid 40,005-point ' + (rotated ? 'diagonal' : 'horizontal') + ' comb under 1000 ms', () => {
            const ring = comb(10000, rotated);
            expect(new Blob([JSON.stringify({ type: 'Polygon', coordinates: [ring] })]).size)
                .toBeLessThan(5 * 1024 * 1024);
            const before = JSON.stringify(ring);
            const started = performance.now();
            const control = new UntypedFormControl({ type: 'Polygon', coordinates: [ring] });
            new GeoForm(control).build();
            control.updateValueAndValidity();
            const elapsed = performance.now() - started;
            expect(control.valid).toBeTrue();
            expect(elapsed).toBeLessThan(1000);
            expect(JSON.stringify(ring)).toBe(before);
            console.info('Polygon real-form comb', rotated, elapsed);
        });
    }

    function star(points: number, innerRadius: number): number[][] {
        const ring = Array.from({ length: points }, (_, index) => {
            const angle = 2 * Math.PI * index / points;
            const radius = index % 2 ? innerRadius : 10;
            return [radius * Math.cos(angle), radius * Math.sin(angle)];
        });
        ring.push([...ring[0]]);
        return ring;
    }

    for (const points of [20000, 40000]) {
        for (const radius of [0.001, 5]) {
            it('checks a valid ' + (points + 1) + '-point star with inner radius ' + radius + ' under 1000 ms', () => {
                const ring = star(points, radius);
                expect(ring.length).toBe(points + 1);
                expect(new Blob([JSON.stringify({ type: 'Polygon', coordinates: [ring] })]).size)
                    .toBeLessThan(5 * 1024 * 1024);
                const before = JSON.stringify(ring);
                const started = performance.now();
                const control = new UntypedFormControl({ type: 'Polygon', coordinates: [ring] });
                new GeoForm(control).build();
                control.updateValueAndValidity();
                const elapsed = performance.now() - started;
                expect(control.valid).toBeTrue();
                expect(elapsed).toBeLessThan(1000);
                expect(JSON.stringify(ring)).toBe(before);
                console.info('Polygon real-form star', points + 1, radius, elapsed);
            });
        }
    }

    it('rejects a crossing 40,001-point star through the real form under 1000 ms', () => {
        const ring = star(40000, 0.001);
        [ring[100], ring[102]] = [ring[102], ring[100]];
        expect(new Blob([JSON.stringify({ type: 'Polygon', coordinates: [ring] })]).size)
            .toBeLessThan(5 * 1024 * 1024);
        const before = JSON.stringify(ring);
        const started = performance.now();
        const control = new UntypedFormControl({ type: 'Polygon', coordinates: [ring] });
        new GeoForm(control).build();
        control.updateValueAndValidity();
        const elapsed = performance.now() - started;
        expect(control.invalid).toBeTrue();
        expect(control.errors?.geoJsonFieldErrors[0]).toEqual([
            'Polygon: ring #0 must not cross or touch itself',
        ]);
        expect(elapsed).toBeLessThan(1000);
        expect(JSON.stringify(ring)).toBe(before);
        console.info('Polygon real-form crossing star', ring.length, elapsed);
    });

    it('still finds a crossing among sweep neighbors', () => {
        expect(polygonRingError([[0, 0], [6, 6], [0, 6], [6, 0], [0, 0]]))
            .toBe('must not cross or touch itself');
    });
});

describe('Polygon sweep differential regression', () => {
    function cross(a: number[], b: number[], c: number[]): number {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }

    function onSegment(a: number[], b: number[], p: number[]): boolean {
        return p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) &&
            p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
    }

    function pairwiseInvalid(points: number[][]): boolean {
        const count = points.length - 1;
        for (let i = 0; i < count; i++) {
            const a = points[(i + count - 1) % count];
            const b = points[i];
            const c = points[(i + 1) % count];
            if (cross(a, b, c) === 0 &&
                (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]) > 0) return true;
            for (let j = i + 2; j < count; j++) {
                if (i === 0 && j === count - 1) continue;
                const first = points[i];
                const second = points[(i + 1) % count];
                const third = points[j];
                const fourth = points[(j + 1) % count];
                const p = cross(first, second, third);
                const q = cross(first, second, fourth);
                const r = cross(third, fourth, first);
                const s = cross(third, fourth, second);
                if ((((p < 0 && q > 0) || (p > 0 && q < 0)) &&
                    ((r < 0 && s > 0) || (r > 0 && s < 0))) ||
                    (p === 0 && onSegment(first, second, third)) ||
                    (q === 0 && onSegment(first, second, fourth)) ||
                    (r === 0 && onSegment(third, fourth, first)) ||
                    (s === 0 && onSegment(third, fourth, second))) return true;
            }
        }
        return points.slice(0, count).reduce((sum, point, index) =>
            sum + point[0] * points[(index + 1) % count][1] -
            points[(index + 1) % count][0] * point[1], 0) === 0;
    }

    it('agrees with a complete pairwise oracle for 1,000 seeded small rings', () => {
        let seed = 6738;
        const random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (let iteration = 0; iteration < 1000; iteration++) {
            const count = 3 + Math.floor(random() * 18);
            const points: number[][] = [];
            const positions = new Set<string>();
            while (points.length < count) {
                const point = iteration % 2
                    ? [Math.floor(random() * 21) - 10, Math.floor(random() * 21) - 10]
                    : [random() * 20 - 10, random() * 20 - 10];
                const key = point.join('|');
                if (!positions.has(key)) {
                    positions.add(key);
                    points.push(point);
                }
            }
            if (iteration % 3 === 0) {
                points.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
            }
            points.push([...points[0]]);
            expect(Boolean(polygonRingError(points))).withContext('seeded ring ' + iteration)
                .toBe(pairwiseInvalid(points));
        }
    });
});

describe('Selected polygon holes', () => {
    const shell = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const hole = [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]];

    function errors(type: string, coordinates: unknown): string[] {
        const control = new UntypedFormControl({ type, coordinates });
        new GeoForm(control).build();
        control.updateValueAndValidity();
        return control.errors?.geoJsonFieldErrors?.[0] || [];
    }

    it('accepts holes inside the outer ring in either direction', () => {
        expect(errors('Polygon', [shell, hole])).toEqual([]);
        expect(errors('Polygon', [shell, [...hole].reverse(), [[6, 6], [8, 6], [8, 8], [6, 8], [6, 6]]])).toEqual([]);
        expect(polygonHolesError([shell])).toBeNull();
    });

    it('rejects a hole outside the outer ring', () => {
        expect(errors('Polygon', [shell, [[12, 12], [14, 12], [14, 14], [12, 14], [12, 12]]])).toEqual([
            'Polygon: ring #1 must lie inside ring #0',
        ]);
    });

    it('rejects a hole that crosses or touches the outer ring', () => {
        expect(errors('Polygon', [shell, [[8, 2], [12, 2], [12, 4], [8, 4], [8, 2]]])).toEqual([
            'Polygon: ring #1 must not cross or touch ring #0',
        ]);
        expect(errors('Polygon', [shell, [[5, 0], [6, 2], [4, 2], [5, 0]]])).toEqual([
            'Polygon: ring #1 must not cross or touch ring #0',
        ]);
    });

    it('rejects holes that touch each other or lie inside each other', () => {
        expect(errors('Polygon', [shell, hole, [[4, 2], [6, 2], [6, 4], [4, 4], [4, 2]]])).toEqual([
            'Polygon: ring #2 must not cross or touch ring #1',
        ]);
        const left = [[1, 5], [3, 3], [5, 5], [3, 7], [1, 5]];
        const right = [[5, 5], [7, 3], [9, 5], [7, 7], [5, 5]];
        expect(errors('Polygon', [shell, left, right])).toEqual([
            'Polygon: ring #2 must not cross or touch ring #1',
        ]);
        expect(errors('Polygon', [shell, [...left].reverse(), [...right].reverse()])).toEqual([
            'Polygon: ring #2 must not cross or touch ring #1',
        ]);
        expect(errors('Polygon', [shell, right, left])).toEqual([
            'Polygon: ring #2 must not cross or touch ring #1',
        ]);
        const large = [[1, 1], [9, 1], [9, 9], [1, 9], [1, 1]];
        const small = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
        expect(errors('Polygon', [shell, large, small])).toEqual([
            'Polygon: ring #2 must not lie inside ring #1',
        ]);
        expect(errors('Polygon', [shell, small, large])).toEqual([
            'Polygon: ring #1 must not lie inside ring #2',
        ]);
    });

    it('keeps the polygon index for a MultiPolygon member', () => {
        expect(errors('MultiPolygon', [[shell, hole], [shell, [[12, 12], [14, 12], [14, 14], [12, 12]]]])).toEqual([
            'MultiPolygon: polygon #1: ring #1 must lie inside ring #0',
        ]);
    });

    it('reports only the ring error when a ring is invalid on its own', () => {
        expect(errors('Polygon', [shell, [[2, 2], [4, 4], [2, 4], [4, 2], [2, 2]]])).toEqual([
            'Polygon: ring #1 must not cross or touch itself',
        ]);
    });

    it('handles holes written on the other side of the dateline', () => {
        const dateline = [[179, 0], [-179, 0], [-179, 4], [179, 4], [179, 0]];
        expect(errors('Polygon', [dateline, [[179.5, 1], [-179.5, 1], [-179.5, 2], [179.5, 2], [179.5, 1]]])).toEqual([]);
        expect(errors('Polygon', [dateline, [[-179.8, 1], [-179.6, 1], [-179.6, 2], [-179.8, 2], [-179.8, 1]]])).toEqual([]);
        expect(errors('Polygon', [dateline, [[-178, 1], [-177, 1], [-177, 2], [-178, 2], [-178, 1]]])).toEqual([
            'Polygon: ring #1 must lie inside ring #0',
        ]);
    });

    it('does not change the input coordinates', () => {
        const coordinates = [shell, hole, [[12, 12], [14, 12], [14, 14], [12, 12]]];
        const before = JSON.stringify(coordinates);
        expect(polygonHolesError(coordinates)).toBe('ring #2 must lie inside ring #0');
        expect(JSON.stringify(coordinates)).toBe(before);
    });

    it('checks a 40,001-point star with 400 holes through the real form under 1000 ms', () => {
        const star = Array.from({ length: 40000 }, (_, index) => {
            const angle = 2 * Math.PI * index / 40000;
            const radius = index % 2 ? 5 : 10;
            return [radius * Math.cos(angle), radius * Math.sin(angle)];
        });
        star.push([...star[0]]);
        const holes: number[][][] = [];
        for (let row = 0; row < 20; row++) {
            for (let column = 0; column < 20; column++) {
                const x = -3 + column * 0.3;
                const y = -3 + row * 0.3;
                holes.push([[x, y], [x + 0.1, y], [x + 0.1, y + 0.1], [x, y + 0.1], [x, y]]);
            }
        }
        const coordinates = [star, ...holes];
        const started = performance.now();
        expect(errors('Polygon', coordinates)).toEqual([]);
        const elapsed = performance.now() - started;
        expect(elapsed).toBeLessThan(1000);
        holes[399] = [[20, 20], [20.1, 20], [20.1, 20.1], [20, 20]];
        expect(errors('Polygon', [star, ...holes])).toEqual(['Polygon: ring #400 must lie inside ring #0']);
        console.info('Polygon real-form star with holes', star.length, holes.length, elapsed);
    });
});
