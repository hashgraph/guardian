import Point from './point';
import LineString from './line-string';
import Polygon from './polygon';
import MultiPoint from './multi-point';
import MultiLineString from './multi-line-string';
import MultiPolygon from './multi-polygon';
import GeometryCollection from './geometry-collection';
import BoundingBox from './ref/bounding-box';

export default {
    title: 'GeoJSON Feature',
    type: 'object',
    required: ['type', 'properties', 'geometry'],
    properties: {
        type: {
            type: 'string',
            enum: ['Feature'],
        },
        id: {
            oneOf: [{ type: 'number' }, { type: 'string' }],
        },
        properties: {
            oneOf: [{ type: 'null' }, { type: 'object' }],
        },
        geometry: {
            oneOf: [
                { type: 'null' },
                Point,
                LineString,
                Polygon,
                MultiPoint,
                MultiLineString,
                MultiPolygon,
                GeometryCollection,
            ],
        },
        bbox: BoundingBox,
    },
};
