import { ISchema, ISchemaDocument, SchemaCategory, SchemaEntity, SchemaStatus, ModelHelper } from '@guardian/interfaces';
import { AfterLoad, BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, Index, ObjectIdColumn } from 'typeorm';

@Entity()
export class Schema implements ISchema {
    @ObjectIdColumn()
    id: string;

    @Column()
    uuid: string;

    @Column()
    hash: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    entity: SchemaEntity;

    @Column()
    status: SchemaStatus;

    @Column()
    document: ISchemaDocument;

    @Column()
    context: any;

    @Column()
    version: string;

    @Column()
    creator: string;

    @Column()
    owner: string;

    @Column()
    topicId: string;

    @Column()
    messageId: string;

    @Column()
    documentURL: string;

    @Column()
    contextURL: string;

    @Column()
    iri: string;

    @CreateDateColumn()
    createDate: Date;

    @Column()
    readonly: boolean;

    @Column()
    system: boolean;

    @Column()
    active: boolean;

    /**
     * Virtual column.
     */
    category: SchemaCategory;

    @BeforeInsert()
    setDefaults() {
        this.entity = this.entity || SchemaEntity.NONE;
        this.status = this.status || SchemaStatus.DRAFT;
        this.readonly = !!this.readonly;
        this.uuid = this.uuid || ModelHelper.randomUUID();
        this.iri = this.iri || `${this.uuid}`;
        if (this.status == SchemaStatus.DRAFT) {
            this.messageId = null;
        }
        this.system = this.system || false;
        this.active = this.active || false;
    }

    @AfterLoad()
    defineLabel() {
        this.category = this.readonly
            ? SchemaCategory.SYSTEM
            : SchemaCategory.USER;
    }
}
