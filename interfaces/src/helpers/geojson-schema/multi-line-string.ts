import LineStringCoordinates from './ref/line-string-coordinates.js';
import BoundingBox from './ref/bounding-box.js';

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
