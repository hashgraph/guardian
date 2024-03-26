import Point from './point.js';
import LineString from './line-string.js';
import Polygon from './polygon.js';
import MultiPoint from './multi-point.js';
import MultiLineString from './multi-line-string.js';
import MultiPolygon from './multi-polygon.js';
import GeometryCollection from './geometry-collection.js';
import Feature from './feature.js';
import FeatureCollection from './feature-collection.js';

export default {
    $id: '#GeoJSON',
    type: 'object',
    title: 'GeoJSON',
    oneOf: [
        Point,
        LineString,
        Polygon,
        MultiPoint,
        MultiLineString,
        MultiPolygon,
        GeometryCollection,
        Feature,
        FeatureCollection,
    ],
};
