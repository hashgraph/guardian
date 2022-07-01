import {
    ISchema,
    ISchemaDocument,
    SchemaCategory,
    SchemaEntity,
    SchemaStatus,
    GenerateUUIDv4
} from '@guardian/interfaces';
import { AfterLoad, BeforeInsert, Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

/**
 * Schema collection
 */
@Entity()
export class Schema implements ISchema {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Schema uuid
     */
    @Column()
    uuid: string;

    /**
     * Schema hash
     */
    @Column()
    hash: string;

    /**
     * Schema name
     */
    @Column()
    name: string;

    /**
     * Schema description
     */
    @Column()
    description: string;

    /**
     * Schema entity
     */
    @Column()
    entity: SchemaEntity;

    /**
     * Schema status
     */
    @Column()
    status: SchemaStatus;

    /**
     * Schema instance
     */
    @Column()
    document: ISchemaDocument;

    /**
     * Context
     */
    @Column()
    context: any;

    /**
     * Version
     */
    @Column()
    version: string;

    /**
     * Creator
     */
    @Column()
    creator: string;

    /**
     * Owner
     */
    @Column()
    owner: string;

    /**
     * Topic id
     */
    @Column()
    topicId: string;

    /**
     * Message id
     */
    @Column()
    messageId: string;

    /**
     * Document URL
     */
    @Column()
    documentURL: string;

    /**
     * Context URL
     */
    @Column()
    contextURL: string;

    /**
     * IRI
     */
    @Column()
    iri: string;

    /**
     * Created at
     */
    @CreateDateColumn()
    createDate: Date;

    /**
     * Readonly flag
     */
    @Column()
    readonly: boolean;

    /**
     * Is system schema
     */
    @Column()
    system: boolean;

    /**
     * Is active
     */
    @Column()
    active: boolean;

    /**
     * Virtual column.
     */
    category: SchemaCategory;

    /**
     * Schema defaults
     */
    @BeforeInsert()
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
    @AfterLoad()
    defineLabel() {
        this.category = this.readonly
            ? SchemaCategory.SYSTEM
            : SchemaCategory.USER;
    }
}
