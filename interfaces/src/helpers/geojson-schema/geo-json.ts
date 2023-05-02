import Point from './point';
import LineString from './line-string';
import Polygon from './polygon';
import MultiPoint from './multi-point';
import MultiLineString from './multi-line-string';
import MultiPolygon from './multi-polygon';
import GeometryCollection from './geometry-collection';
import Feature from './feature';
import FeatureCollection from './feature-collection';

export default {
    $id: '#GeoJSON',
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
