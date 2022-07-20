import { Column, Entity, ObjectIdColumn } from 'typeorm';

/**
 * Settings collection
 */
@Entity()
export class Settings {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Setting name
     */
    @Column({
        unique: true
    })
    name: string;

    /**
     * Setting value
     */
    @Column()
    value: string;
}
