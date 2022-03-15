import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class Settings {
    @ObjectIdColumn()
    id: string;

    @Column({
        unique: true
    })
    name: string;

    @Column()
    value: string;
}