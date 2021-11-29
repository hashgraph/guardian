import {SchemaEntity} from '../type/schema-entity.type';
import {SchemaStatus} from '../type/schema-status.type';
import {ISchemaDocument} from './schema-document.interface';

export interface ISchema {
    id: string;
    name: string;
    entity: SchemaEntity;
    status: SchemaStatus;
    readonly: boolean;
    document: ISchemaDocument;
}
