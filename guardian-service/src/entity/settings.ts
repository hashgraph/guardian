import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class Settings {
    @ObjectIdColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    value: string;
}