export interface GeoValueSummary {
    /** Geometry type when the value is a single shape. */
    type?: string;
    shapes: number;
    polygons: number;
    points: number;
    bytes: number;
}

/** The geometries of a GeoJSON value, without the ones a field does not keep (GeometryCollection). */
export function geometriesOf(data: any): any[] {
    const geometries = data?.type === 'FeatureCollection'
        ? (data.features || []).map((feature: any) => feature?.geometry)
        : [data?.type === 'Feature' ? data.geometry : data];
    return geometries.filter((geometry: any) => geometry?.type && geometry.type !== 'GeometryCollection');
}

export function countShapes(data: any): number {
    return data?.type === 'FeatureCollection'
        ? (data.features || []).filter((feature: any) =>
            feature?.geometry?.type && feature.geometry.type !== 'GeometryCollection').length
        : 1;
}

export function countPoints(data: any): number {
    const count = (coordinates: any): number => !Array.isArray(coordinates)
        ? 0
        : typeof coordinates[0] === 'number'
            ? 1
            : coordinates.reduce((sum: number, item: any) => sum + count(item), 0);
    return geometriesOf(data).reduce((sum: number, geometry: any) => sum + count(geometry.coordinates), 0);
}

export function summarizeGeoValue(value: any): GeoValueSummary {
    if (!value || typeof value !== 'object' || !value.type) {
        return { shapes: 0, polygons: 0, points: 0, bytes: 0 };
    }
    const geometries = geometriesOf(value);
    const polygons = geometries.reduce((sum: number, geometry: any) =>
        sum + (geometry.type === 'Polygon' ? 1
            : geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)
                ? geometry.coordinates.length : 0), 0);
    const shapes = countShapes(value);
    return {
        type: shapes === 1 ? geometries[0]?.type : undefined,
        shapes,
        polygons,
        points: countPoints(value),
        bytes: JSON.stringify(value).length
    };
}

/** "4,537 polygons · 133,656 points", the wording shared by the field and the array row. */
export function describeGeoValue(summary: GeoValueSummary, size?: string): string {
    if (!summary.shapes) {
        return '';
    }
    const noun = (count: number, singular: string) =>
        `${count.toLocaleString('en-US')} ${count === 1 ? singular : `${singular}s`}`;
    const parts: string[] = [];
    if (summary.shapes === 1 && summary.type === 'MultiPolygon') {
        parts.push(noun(summary.polygons, 'polygon'));
    } else if (summary.shapes === 1) {
        parts.push(`1 ${(summary.type || 'shape').toLowerCase()}`);
    } else {
        parts.push(noun(summary.shapes, 'shape'));
        if (summary.polygons) {
            parts.push(noun(summary.polygons, 'polygon'));
        }
    }
    if (!(summary.shapes === 1 && summary.type === 'Point')) {
        parts.push(noun(summary.points, 'point'));
    }
    if (size) {
        parts.push(size);
    }
    return parts.join(' · ');
}
