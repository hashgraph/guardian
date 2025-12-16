import { Entity, Index, Property } from '@mikro-orm/core';
import { ITask, WorkerTaskType } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

@Entity()
@Index({ name: 'idx_status_createDate', properties: ['done', 'sent', 'createDate'], options: { createDate: -1 } })
@Index({ name: 'idx_status_processedTime', properties: ['done', 'sent', 'processedTime'], options: { processedTime: -1 } })
@Index({ name: 'idx_processedTime_priority', properties: ['processedTime', 'priority'] })
export class TaskEntity extends BaseEntity implements ITask{
    @Index({ name: 'userId' })
    @Property({nullable: true})
    userId: string | null;

    @Index({ name: 'taskId' })
    @Property({nullable: true})
    taskId: string;

    @Property({nullable: true})
    priority: number;

    @Property()
    type: WorkerTaskType;

    @Property()
    data: any;

    @Property({nullable: true})
    sent: boolean;

    @Property({nullable: true})
    isRetryableTask: boolean;

    @Property({nullable: true})
    attempts: number

    @Property({nullable: true})
    processedTime: Date;

    @Property({nullable: true})
    done: boolean;

    @Property({nullable: true})
    isError: boolean;

    @Property({nullable: true})
    errorReason: string;

    @Property({nullable: true})
    attempt: number;

    @Property({nullable: true})
    interception: string | null;
}
