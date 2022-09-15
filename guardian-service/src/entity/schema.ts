import {
    ISchema,
    ISchemaDocument,
    SchemaCategory,
    SchemaEntity,
    SchemaStatus,
    GenerateUUIDv4
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    Enum,
    BeforeCreate,
    OnLoad
} from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Schema collection
 */
@Entity()
export class Schema extends BaseEntity implements ISchema {
    /**
     * Schema uuid
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Schema hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Schema name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Schema description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Schema entity
     */
    @Enum({ nullable: true })
    entity?: SchemaEntity;

    /**
     * Schema status
     */
    @Enum({ nullable: true })
    status?: SchemaStatus;

    /**
     * Schema instance
     */
    @Property({ nullable: true })
    document?: ISchemaDocument;

    /**
     * Context
     */
    @Property({ nullable: true })
    context?: any;

    /**
     * Version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Document URL
     */
    @Property({ nullable: true })
    documentURL?: string;

    /**
     * Context URL
     */
    @Property({ nullable: true })
    contextURL?: string;

    /**
     * IRI
     */
    @Property({ nullable: true })
    iri?: string;

    /**
     * Created at
     */
    @Property()
    createDate: Date = new Date();

    /**
     * Readonly flag
     */
    @Property({ nullable: true })
    readonly?: boolean;

    /**
     * Is system schema
     */
    @Property({ nullable: true })
    system?: boolean;

    /**
     * Is active
     */
    @Property({ nullable: true })
    active?: boolean;

    /**
     * Virtual column.
     */
    category: SchemaCategory;

    /**
     * Schema defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.entity = this.entity || SchemaEntity.NONE;
        this.status = this.status || SchemaStatus.DRAFT;
        this.readonly = !!this.readonly;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.iri = this.iri || `${this.uuid}`;
        if (this.status === SchemaStatus.DRAFT) {
            this.messageId = null;
        }
        this.system = this.system || false;
        this.active = this.active || false;
    }

    /**
     * Set schema category
     */
    @OnLoad()
    defineLabel() {
        this.category = this.readonly
            ? SchemaCategory.SYSTEM
            : SchemaCategory.USER;
    }
}
