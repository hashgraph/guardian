import assert from 'node:assert/strict';
import { getGeospatialLimits } from '../../../dist/index.js';

describe('getGeospatialLimits', function () {
    it('returns all shared defaults when values are absent', function () {
        assert.deepEqual(getGeospatialLimits({}), {
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100
        });
    });

    it('accepts positive integer and decimal values', function () {
        assert.deepEqual(getGeospatialLimits({
            KML_PREVIEW_MAX_FILESIZE_MB: '12',
            GEOJSON_PREVIEW_MAX_FILESIZE_MB: '6.5',
            GEOSPATIAL_MAX_FILESIZE_MB: '125'
        }), {
            kmlPreviewMaxFileSizeMb: 12,
            geojsonPreviewMaxFileSizeMb: 6.5,
            geospatialMaxFileSizeMb: 125
        });
    });

    it('uses defaults for blank, zero and negative values', function () {
        assert.deepEqual(getGeospatialLimits({
            KML_PREVIEW_MAX_FILESIZE_MB: ' ',
            GEOJSON_PREVIEW_MAX_FILESIZE_MB: '0',
            GEOSPATIAL_MAX_FILESIZE_MB: '-1'
        }), {
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100
        });
    });

    it('uses defaults for non-numeric and non-finite values', function () {
        assert.deepEqual(getGeospatialLimits({
            KML_PREVIEW_MAX_FILESIZE_MB: 'bad',
            GEOJSON_PREVIEW_MAX_FILESIZE_MB: 'Infinity',
            GEOSPATIAL_MAX_FILESIZE_MB: 'NaN'
        }), {
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100
        });
    });
});
