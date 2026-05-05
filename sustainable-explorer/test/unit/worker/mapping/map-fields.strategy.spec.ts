import { describe, expect, it } from '@jest/globals';
import { HeuristicFieldMapperService } from '../../../../src/worker/mapping/strategies/map-fields/heuristic-field-mapper.service';
import { LlmFieldMapperService } from '../../../../src/worker/mapping/strategies/map-fields/llm-field-mapper.service';

describe('field mapping strategies', () => {
    const schemaMap = { ProjectSchema: 'schema-1' };
    const schemas = [
        {
            id: 'schema-1',
            name: 'ProjectSchema',
            rawSchema: {},
        },
    ];
    const fields = [
        {
            fieldName: 'Project Title',
            description: 'Dummy field',
            keywords: ['title'],
        },
    ];

    it('HeuristicFieldMapperService returns an empty dummy map', async () => {
        const service = new HeuristicFieldMapperService();

        const result = await service.execute(schemaMap, schemas, fields);

        expect(result).toEqual({});
    });

    it('LlmFieldMapperService returns an empty dummy map', async () => {
        const service = new LlmFieldMapperService();

        const result = await service.execute(schemaMap, schemas, fields);

        expect(result).toEqual({});
    });
});