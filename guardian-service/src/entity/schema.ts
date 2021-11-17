import { ISchema, SchemaEntity, SchemaStatus } from 'interfaces';
import { BeforeInsert, Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class Schema implements ISchema {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
    type: string;

    @Column()
    entity: SchemaEntity;

    @Column()
    status: SchemaStatus;

    @Column()
    readonly: boolean;

    @Column()
    document: any;

    @BeforeInsert()
    setDefaults() {
        this.entity = this.entity || SchemaEntity.NONE;
        this.readonly = !!this.readonly;
        this.status = this.status || SchemaStatus.DRAFT;
    }
}
