import { ModuleStatus } from '../type/module-status.type.js';

export interface ISchemaTemplateFieldConfig {
    locked?: boolean;
    typeLocked?: boolean;
    requiredLocked?: boolean;
    visibilityLocked?: boolean;
}

export interface ISchemaTemplateSchemaConfig {
    locked?: boolean;
    deleteLocked?: boolean;
    editLocked?: boolean;
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
