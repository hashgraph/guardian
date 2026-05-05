import { Injectable, Logger } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { FieldDescriptor, FieldMap, SchemaInfo, SchemaLabelMap } from '../../types';

@Injectable()
export class HeuristicFieldMapperService implements IMapFieldsStrategy {
    private readonly logger = new Logger(HeuristicFieldMapperService.name);

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        void schemaMap;
        void schemas;
        void fields;

        this.logger.warn('Heuristic field mapper is a dummy implementation');
        return {};
    }
}