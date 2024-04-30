import Feature from './feature.js';
import BoundingBox from './ref/bounding-box.js';

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
