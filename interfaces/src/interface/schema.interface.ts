import {SchemaEntity} from '../type/schema-entity.type';
import {SchemaStatus} from '../type/schema-status.type';

export interface ISchema {
    id: string;
    uuid: string;
    document: string;
    status: SchemaStatus;
    hash?: string;
    name?: string;
    description?: string;
    relationships?: string;
    entity?: SchemaEntity;
    readonly?: boolean;
    owner?: string;
    version?: string;
    isOwner?: boolean;
}
