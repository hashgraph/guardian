import { SchemaCondition } from "..";

export interface SchemaField {
    name: string;
    title?: string;
    description?: string;
    required: boolean;
    isArray: boolean;
    isRef: boolean;
    type: string;
    format?: string;
    pattern?: string;
    readOnly: boolean;
    fields?: SchemaField[];
    conditions?: SchemaCondition[];
    unit?: string,
    unitSystem?: string,
    context?: {
        type: string;
        context: string;
    };
}
