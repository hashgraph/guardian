import { ISchema, SchemaEntity } from 'interfaces';
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
    isDefault: boolean;

    @Column()
    document: any;

    @BeforeInsert()
    setDefaults() {
        this.entity = this.entity || SchemaEntity.NONE;
        this.isDefault = !!this.isDefault;
    }
}
