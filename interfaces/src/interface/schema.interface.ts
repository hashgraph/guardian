import {SchemaEntity} from '../type/schema-entity.type';

export interface ISchema {
    id: string;
    type: string;
    entity: SchemaEntity;
    isDefault: boolean;
    document: any;
}
