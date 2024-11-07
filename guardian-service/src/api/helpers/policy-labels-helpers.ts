import { IOwner, ISchemaRulesConfig } from '@guardian/interfaces';

export function publishLabelConfig(data?: ISchemaRulesConfig): ISchemaRulesConfig {
    if (data) {
        const schemas = new Set<string>();
        if (data.fields) {
            for (const field of data.fields) {
                schemas.add(field.schemaId);
            }
        }
        data.schemas = Array.from(schemas);
    }
    return data;
}