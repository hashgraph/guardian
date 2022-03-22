import {SchemaEntity} from '../type/schema-entity.type';
import {SchemaStatus} from '../type/schema-status.type';
import {SchemaCategory} from '../type/schema-category.type';

export interface ISchema {
    id: string;
    uuid?: string;
    hash?: string;
    name?: string;
    description?: string;
    entity?: SchemaEntity;
    status?: SchemaStatus;
    readonly?: boolean;
    document?: string;
    context?: string;
    version?: string;
    creator?: string;
    owner?: string;
    topicId?: string;
    messageId?: string;
    documentURL?: string;
    contextURL?: string;
    iri?: string;
    isOwner?: boolean;
    isCreator?: boolean;
    relationships?: string;
    category?: SchemaCategory;
}
