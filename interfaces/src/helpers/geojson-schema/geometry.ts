import Point from './point.js';
import LineString from './line-string.js';
import Polygon from './polygon.js';
import MultiPoint from './multi-point.js';
import MultiLineString from './multi-line-string.js';
import MultiPolygon from './multi-polygon.js';

export default {
    title: 'GeoJSON Geometry',
    oneOf: [
        Point,
        LineString,
        Polygon,
        MultiPoint,
        MultiLineString,
        MultiPolygon,
    ],
};
