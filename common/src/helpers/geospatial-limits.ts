export interface GeospatialLimits {
    kmlPreviewMaxFileSizeMb: number;
    geojsonPreviewMaxFileSizeMb: number;
    geospatialMaxFileSizeMb: number;
    geospatialPreviewMaxFeatures: number;
}

type Environment = Record<string, string | undefined>;

function positiveNumber(value: string | undefined, fallback: number): number {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGeospatialLimits(
    environment: Environment = process.env
): GeospatialLimits {
    return {
        kmlPreviewMaxFileSizeMb: positiveNumber(
            environment.KML_PREVIEW_MAX_FILESIZE_MB,
            10
        ),
        geojsonPreviewMaxFileSizeMb: positiveNumber(
            environment.GEOJSON_PREVIEW_MAX_FILESIZE_MB,
            5
        ),
        geospatialMaxFileSizeMb: positiveNumber(
            environment.GEOSPATIAL_MAX_FILESIZE_MB,
            100
        ),
        geospatialPreviewMaxFeatures: positiveNumber(
            environment.GEOSPATIAL_PREVIEW_MAX_FEATURES,
            1500
        )
    };
}
