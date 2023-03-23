import Feature from './feature';
import BoundingBox from './ref/bounding-box';

export default {
    title: 'GeoJSON FeatureCollection',
    type: 'object',
    required: ['type', 'features'],
    properties: {
        type: {
            type: 'string',
            enum: ['FeatureCollection'],
        },
        features: {
            type: 'array',
            items: Feature,
        },
        bbox: BoundingBox,
    },
};
