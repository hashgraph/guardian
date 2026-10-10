import { classifyGeoFile } from './geo-file-size';

describe('classifyGeoFile', () => {
    const mb = 1024 * 1024;
    const limits = {
        kmlPreviewMaxFileSizeMb: 10,
        geojsonPreviewMaxFileSizeMb: 5,
        geospatialMaxFileSizeMb: 100,
        geospatialPreviewMaxFeatures: 5000
    };

    it('keeps GeoJSON at its preview boundary previewable', () => {
        expect(classifyGeoFile('geojson', 5 * mb, limits)).toBe('preview');
    });

    it('warns one byte above the GeoJSON preview boundary', () => {
        expect(classifyGeoFile('geojson', 5 * mb + 1, limits)).toBe('warn');
    });

    it('keeps KML at its preview boundary previewable', () => {
        expect(classifyGeoFile('kml', 10 * mb, limits)).toBe('preview');
    });

    it('warns one byte above the KML preview boundary', () => {
        expect(classifyGeoFile('kml', 10 * mb + 1, limits)).toBe('warn');
    });

    it('warns at the maximum boundary', () => {
        expect(classifyGeoFile('geojson', 100 * mb, limits)).toBe('warn');
        expect(classifyGeoFile('kml', 100 * mb, limits)).toBe('warn');
    });

    it('rejects one byte above the maximum boundary', () => {
        expect(classifyGeoFile('geojson', 100 * mb + 1, limits)).toBe('reject');
        expect(classifyGeoFile('kml', 100 * mb + 1, limits)).toBe('reject');
    });
});
