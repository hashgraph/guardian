import { FieldSchema } from '../query-builder';

export const POLICY_SCHEMA_FIELD_SCHEMA: FieldSchema = {
    schemaId: {
        sql: 'ps."schemaId"',
        filter: 'ilike',
        sortable: true,
    },
    name: {
        sql: 'ps.name',
        filter: 'ilike',
        sortable: true,
    },
    description: {
        sql: 'ps.description',
        filter: 'ilike',
        sortable: true,
    },
    sourceCid: {
        sql: 'ps."sourceCid"',
        filter: 'eq',
        sortable: true,
    },
    version: {
        sql: 'ps."schemaVersion"',
        filter: 'ilike',
        sortable: true,
    },
    createdAt: {
        sql: 'ps."createdAt"',
        sortable: true,
    },
    updatedAt: {
        sql: 'ps."updatedAt"',
        sortable: true,
    },
};
