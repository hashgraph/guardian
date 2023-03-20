import PointCoordinates from './ref/point-coordinates';
import BoundingBox from './ref/bounding-box';

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