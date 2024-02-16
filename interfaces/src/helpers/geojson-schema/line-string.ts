import LineStringCoordinates from './ref/line-string-coordinates';
import BoundingBox from './ref/bounding-box';

export default {
    title: 'GeoJSON LineString',
    type: 'object',
    required: ['type', 'coordinates'],
    properties: {
        type: {
            type: 'string',
            enum: ['LineString'],
        },
        coordinates: LineStringCoordinates,
        bbox: BoundingBox,
    },
};
