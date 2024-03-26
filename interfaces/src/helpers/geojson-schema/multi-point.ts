import PointCoordinates from './ref/point-coordinates.js';
import BoundingBox from './ref/bounding-box.js';

export default {
    title: 'GeoJSON MultiPoint',
    type: 'object',
    required: ['type', 'coordinates'],
    properties: {
        type: {
            type: 'string',
            enum: ['MultiPoint'],
        },
        coordinates: {
            type: 'array',
            items: PointCoordinates,
        },
        bbox: BoundingBox,
    },
};
