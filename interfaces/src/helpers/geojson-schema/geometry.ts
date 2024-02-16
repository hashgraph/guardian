import Point from './point';
import LineString from './line-string';
import Polygon from './polygon';
import MultiPoint from './multi-point';
import MultiLineString from './multi-line-string';
import MultiPolygon from './multi-polygon';

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
