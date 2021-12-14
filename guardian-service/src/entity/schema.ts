import { ISchema, SchemaEntity, SchemaStatus, Schema as SchemaModel } from 'interfaces';
import { BeforeInsert, Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class Schema implements ISchema {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
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
    document: string;

    @BeforeInsert()
    setDefaults() {
        this.entity = this.entity || SchemaEntity.NONE;
        this.status = this.status || SchemaStatus.DRAFT;
        this.readonly = !!this.readonly;
        this.uuid = this.uuid || SchemaModel.randomUUID();
    }
}