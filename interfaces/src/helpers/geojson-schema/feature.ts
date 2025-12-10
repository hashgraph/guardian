import Point from './point.js';
import LineString from './line-string.js';
import Polygon from './polygon.js';
import MultiPoint from './multi-point.js';
import MultiLineString from './multi-line-string.js';
import MultiPolygon from './multi-polygon.js';
import GeometryCollection from './geometry-collection.js';
import BoundingBox from './ref/bounding-box.js';

export default {
    title: 'GeoJSON Feature',
    type: 'object',
    required: ['type', 'geometry'],
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
