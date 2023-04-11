import LineStringCoordinates from './ref/line-string-coordinates';
import BoundingBox from './ref/bounding-box';

export default {
    title: 'GeoJSON MultiLineString',
    type: 'object',
    required: ['type', 'coordinates'],
    properties: {
        type: {
            type: 'string',
            enum: ['MultiLineString'],
        },
        coordinates: {
            type: 'array',
            items: LineStringCoordinates,
        },
        bbox: BoundingBox,
    },
};
