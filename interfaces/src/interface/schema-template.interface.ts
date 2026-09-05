import { ModuleStatus } from '../type/module-status.type.js';
import { SchemaEntity } from '../type/schema-entity.type.js';
import { SchemaCondition } from './schema-condition.interface.js';
import { SchemaField } from './schema-field.interface.js';

export interface IPolicySchemaTemplateBinding {
    templateId: string;
    templateName?: string;
    templateVersion?: string;
    templateStatus?: ModuleStatus;
    templateMessageId?: string;
    templateHash?: string;
    templateStateHash?: string;
    snapshotId?: string;
    appliedAt: string;
    updatedAt?: string;
    schemaMap: Record<string, string>;
}

export type ISchemaTemplateSnapshotField = Omit<
    SchemaField,
    'path' | 'fullPath' | 'fullType' | 'arrayLvl' | 'errors'
> & {
    refTemplateSchemaId?: string;
};

export interface ISchemaTemplateSnapshotSchema {
    templateSchemaId: string;
    name?: string;
    description?: string;
    entity?: SchemaEntity;
    version?: string;
    fields: ISchemaTemplateSnapshotField[];
    conditions?: SchemaCondition[];
}

export interface ISchemaTemplateSnapshotSchemas {
    schemas: Record<string, ISchemaTemplateSnapshotSchema>;
}

export interface ISchemaTemplateSnapshot {
    _id?: any;
    id?: string;
    policyId?: string;
    policyUUID?: string;
    templateId?: string;
    templateUUID?: string;
    templateName?: string;
    templateVersion?: string;
    templateStatus?: ModuleStatus;
    templateMessageId?: string;
    templateHash?: string;
    templateStateHash?: string;
    appliedAt?: string;
    schemaMap?: Record<string, string>;
    config?: ISchemaTemplateConfig;
    schemas?: ISchemaTemplateSnapshotSchemas;
    configFileId?: any;
    schemasFileId?: any;
}

export enum SchemaTemplateUpdateChangeType {
    SCHEMA_ADD = 'SCHEMA_ADD',
    SCHEMA_UPDATE = 'SCHEMA_UPDATE',
    SCHEMA_REMOVE = 'SCHEMA_REMOVE',
    FIELD_ADD = 'FIELD_ADD',
    FIELD_UPDATE = 'FIELD_UPDATE',
    FIELD_REMOVE = 'FIELD_REMOVE',
    CUSTOM_FIELD_PRESERVE = 'CUSTOM_FIELD_PRESERVE',
    CUSTOM_FIELD_REMOVE = 'CUSTOM_FIELD_REMOVE'
}

export enum SchemaTemplateUpdateConflictType {
    SCHEMA_REMOVED_WITH_POLICY_USAGE = 'SCHEMA_REMOVED_WITH_POLICY_USAGE'
}

export enum SchemaTemplateUpdateResolutionAction {
    KEEP_AS_CUSTOM_SCHEMA = 'KEEP_AS_CUSTOM_SCHEMA',
    REMOVE_FROM_POLICY = 'REMOVE_FROM_POLICY'
}

export interface ISchemaTemplateUpdateChange {
    type: SchemaTemplateUpdateChangeType;
    templateSchemaId?: string;
    templateFieldId?: string;
    schemaName?: string;
    fieldName?: string;
    before?: string;
    after?: string;
    details?: {
        label: string;
        before?: string;
        after?: string;
    }[];
    message: string;
}

export interface ISchemaTemplateUpdateConflict {
    id: string;
    type: SchemaTemplateUpdateConflictType;
    templateSchemaId?: string;
    templateFieldId?: string;
    schemaName?: string;
    fieldName?: string;
    message: string;
    allowedActions: SchemaTemplateUpdateResolutionAction[];
}

export interface ISchemaTemplateUpdatePreview {
    policyId: string;
    templateId: string;
    templateName?: string;
    templateVersion?: string;
    previousTemplateId?: string;
    previousTemplateName?: string;
    previousTemplateVersion?: string;
    canApply: boolean;
    changes: ISchemaTemplateUpdateChange[];
    conflicts: ISchemaTemplateUpdateConflict[];
}

export interface ISchemaTemplateUpdateResolution {
    conflictId: string;
    action: SchemaTemplateUpdateResolutionAction;
}

export interface ISchemaTemplateUpdateOptions {
    resolutions?: ISchemaTemplateUpdateResolution[];
    /** Switch the binding to a different template instead of refreshing the same one. */
    targetTemplateId?: string;
}

export interface ISchemaTemplateDetachOptions {
    deleteSchemas?: boolean;
}

export interface ISchemaTemplateFieldConfig {
    locked?: boolean;
}

export interface ISchemaTemplateSchemaConfig {
    schemaSettingsLocked?: boolean;
    customFieldsLocked?: boolean;
    fields?: Record<string, ISchemaTemplateFieldConfig>;
}

export interface ISchemaTemplateConfig {
    schemas?: Record<string, ISchemaTemplateSchemaConfig>;
}

export interface ISchemaTemplate {
    _id?: any;
    id?: string;
    uuid?: string;
    name?: string;
    description?: string;
    owner?: string;
    creator?: string;
    status?: ModuleStatus;
    version?: string;
    previousVersion?: string;
    topicId?: string;
    messageId?: string;
    config?: ISchemaTemplateConfig;
    contentFileId?: any;
}
