import { ISchema, ModelHelper, SchemaEntity, SchemaStatus, SchemaCategory, ISchemaDocument } from 'interfaces';
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
    readonly: boolean;

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
        if(this.status == SchemaStatus.DRAFT) {
            this.messageId = null;
        }
    }

    @AfterLoad()
    defineLabel() {
        this.category = this.readonly
            ? SchemaCategory.SYSTEM
            : SchemaCategory.USER;
    }
}
