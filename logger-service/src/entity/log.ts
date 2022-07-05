import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';
import { ILog, LogType } from '@guardian/interfaces';

/**
 * Log message
 */
@Entity()
export class Log implements ILog {
    /**
     * Entity id
     */
    @ObjectIdColumn()
    id: string;

    /**
     * Message
     */
    @Column()
    message: string;

    /**
     * Type
     */
    @Column()
    type: LogType;

    /**
     * Datetime
     */
    @CreateDateColumn()
    datetime: Date;

    /**
     * Attributes
     */
    @Column()
    attributes?: string[]
}
