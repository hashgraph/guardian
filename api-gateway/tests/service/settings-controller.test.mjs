import assert from 'node:assert/strict';
import { SettingsApi } from '../../dist/api/service/settings.js';

describe('SettingsApi geospatial limits', function () {
    const names = [
        'KML_PREVIEW_MAX_FILESIZE_MB',
        'GEOJSON_PREVIEW_MAX_FILESIZE_MB',
        'GEOSPATIAL_MAX_FILESIZE_MB'
    ];
    let previous;

    beforeEach(function () {
        previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
    });

    afterEach(function () {
        for (const name of names) {
            if (previous[name] === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = previous[name];
            }
        }
    });

    it('returns the shared parsed environment values', function () {
        process.env.KML_PREVIEW_MAX_FILESIZE_MB = '11';
        process.env.GEOJSON_PREVIEW_MAX_FILESIZE_MB = '4.5';
        process.env.GEOSPATIAL_MAX_FILESIZE_MB = '101';
        const api = new SettingsApi({});

        assert.deepEqual(api.getGeospatialLimits(), {
            kmlPreviewMaxFileSizeMb: 11,
            geojsonPreviewMaxFileSizeMb: 4.5,
            geospatialMaxFileSizeMb: 101
        });
    });

    it('returns shared defaults for invalid values', function () {
        process.env.KML_PREVIEW_MAX_FILESIZE_MB = 'bad';
        process.env.GEOJSON_PREVIEW_MAX_FILESIZE_MB = '0';
        process.env.GEOSPATIAL_MAX_FILESIZE_MB = '';
        const api = new SettingsApi({});

        assert.deepEqual(api.getGeospatialLimits(), {
            kmlPreviewMaxFileSizeMb: 10,
            geojsonPreviewMaxFileSizeMb: 5,
            geospatialMaxFileSizeMb: 100
        });
    });
});
