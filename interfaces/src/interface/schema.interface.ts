import { SchemaEntity } from '../type/schema-entity.type';
import { SchemaStatus } from '../type/schema-status.type';
import { SchemaCategory } from '../type/schema-category.type';
import { ISchemaDocument } from './schema-document.interface';

/**
 * Schema interface
 */
export interface ISchema {
    /**
     * Id
     */
    _id: any;

    /**
     * Serialized Id
     */
    id: string;
    /**
     * UUID
     */
    uuid?: string;
    /**
     * Hash
     */
    hash?: string;
    /**
     * Name
     */
    name?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Entity
     */
    entity?: SchemaEntity;
    /**
     * Schema status
     */
    status?: SchemaStatus;
    /**
     * Is readonly
     */
    readonly?: boolean;
    /**
     * Schema document instance
     */
    document?: ISchemaDocument;
    /**
     * Context
     */
    context?: any;
    /**
     * Version
     */
    version?: string;
    /**
     * Creator
     */
    creator?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Topic ID
     */
    topicId?: string;
    /**
     * Message ID
     */
    messageId?: string;
    /**
     * Document URL
     */
    documentURL?: string;
    /**
     * Context URL
     */
    contextURL?: string;
    /**
     * IRI
     */
    iri?: string;
    /**
     * Is owner
     */
    isOwner?: boolean;
    /**
     * Is creator
     */
    isCreator?: boolean;
    /**
     * Relationships
     */
    relationships?: string;
    /**
     * Schema category
     */
    category?: SchemaCategory;
    /**
     * Is system schema
     */
    system?: boolean;
    /**
     * Is active schema
     */
    active?: boolean;
}
