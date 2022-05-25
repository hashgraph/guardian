import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';
import { ILog, LogType } from '@guardian/interfaces';

@Entity()
export class Log implements ILog {
    @ObjectIdColumn()
    id: string;

    @Column()
    message: string;

    @Column()
    type: LogType;

    @CreateDateColumn()
    datetime: Date;

    @Column()
    attributes?: string[]
}
