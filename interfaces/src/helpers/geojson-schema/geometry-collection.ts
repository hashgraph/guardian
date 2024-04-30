import Point from './point.js';
import LineString from './line-string.js';
import Polygon from './polygon.js';
import MultiPoint from './multi-point.js';
import MultiLineString from './multi-line-string.js';
import MultiPolygon from './multi-polygon.js';
import BoundingBox from './ref/bounding-box.js';

export default {
    title: 'GeoJSON GeometryCollection',
    type: 'object',
    required: ['type', 'geometries'],
    properties: {
        type: {
            type: 'string',
            enum: ['GeometryCollection'],
        },
        geometries: {
            type: 'array',
            items: {
                oneOf: [
                    Point,
                    LineString,
                    Polygon,
                    MultiPoint,
                    MultiLineString,
                    MultiPolygon,
                ],
            },
        },
        bbox: BoundingBox,
    },
};
