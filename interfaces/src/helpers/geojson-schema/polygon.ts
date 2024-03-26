import PolygonCoordinates from './ref/polygon-coordinates.js';
import BoundingBox from './ref/bounding-box.js';

export default {
  title: 'GeoJSON Polygon',
  type: 'object',
  required: ['type', 'coordinates'],
  properties: {
    type: {
      type: 'string',
      enum: ['Polygon']
    },
    coordinates: PolygonCoordinates,
    bbox: BoundingBox
  }
};
