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
    context?: {
        type: string;
        context: string;
    };
}
