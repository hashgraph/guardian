import {SchemaEntity} from '../type/schema-entity.type';
import {SchemaStatus} from '../type/schema-status.type';

export interface ISchema {
    id: string;
    uuid: string;
    hash?: string;
    name: string;
    description?: string;
    relationships?: string;
    entity?: SchemaEntity;
    status: SchemaStatus;
    readonly?: boolean;
    document: string;
}
