import { GeospatialLimits } from 'src/app/services/settings.service';

export type PreviewableGeoFileFormat = 'geojson' | 'kml';
export type GeoFileDecision = 'preview' | 'warn' | 'reject';

export function classifyGeoFile(
    format: PreviewableGeoFileFormat,
    sizeBytes: number,
    limits: GeospatialLimits
): GeoFileDecision {
    const megabyte = 1024 * 1024;
    if (sizeBytes > limits.geospatialMaxFileSizeMb * megabyte) {
        return 'reject';
    }
    const previewLimit = format === 'geojson'
        ? limits.geojsonPreviewMaxFileSizeMb
        : limits.kmlPreviewMaxFileSizeMb;
    if (sizeBytes > previewLimit * megabyte) {
        return 'warn';
    }
    return 'preview';
}
