import PointCoordinates from './ref/point-coordinates.js';
import BoundingBox from './ref/bounding-box.js';

export default {
  title: 'GeoJSON Point',
  type: 'object',
  required: ['type', 'coordinates'],
  properties: {
    type: {
      type: 'string',
      enum: ['Point']
    },
    coordinates: PointCoordinates,
    bbox: BoundingBox
  }
};
