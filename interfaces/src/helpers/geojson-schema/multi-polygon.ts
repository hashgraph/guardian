import PolygonCoordinates from './ref/polygon-coordinates';
import BoundingBox from './ref/bounding-box';

export default {
    title: 'GeoJSON MultiPolygon',
    type: 'object',
    required: ['type', 'coordinates'],
    properties: {
        type: {
            type: 'string',
            enum: ['MultiPolygon'],
        },
        coordinates: {
            type: 'array',
            items: PolygonCoordinates,
        },
        bbox: BoundingBox,
    },
};
