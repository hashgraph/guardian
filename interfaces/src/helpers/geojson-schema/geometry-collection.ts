import Point from './point';
import LineString from './line-string';
import Polygon from './polygon';
import MultiPoint from './multi-point';
import MultiLineString from './multi-line-string';
import MultiPolygon from './multi-polygon';
import BoundingBox from './ref/bounding-box';

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
