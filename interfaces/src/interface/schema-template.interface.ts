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
>;

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
