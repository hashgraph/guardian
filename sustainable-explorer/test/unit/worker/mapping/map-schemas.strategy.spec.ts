import { describe, expect, it } from '@jest/globals';
import { GeoJsonMapSchemasService } from '../../../../src/worker/mapping/strategies/map-schemas/geo-json-map-schemas.service';

describe('GeoJsonMapSchemasService', () => {
    it('returns a dummy ProjectSchema mapping for the provided schemas', async () => {
        const service = new GeoJsonMapSchemasService();

        const result = await service.execute([
            {
                id: 'schema-1',
                name: 'ProjectSchema',
                rawSchema: {},
            },
            {
                id: 'schema-2',
                name: 'PDD',
                rawSchema: {},
            },
        ]);

        expect(result).toEqual({
            ProjectSchema: 'schema-2',
        });
    });

    it('returns an empty map when no schemas are provided', async () => {
        const service = new GeoJsonMapSchemasService();

        const result = await service.execute([]);

        expect(result).toEqual({});
    });
});