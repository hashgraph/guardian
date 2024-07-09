import { Entity, Property } from '@mikro-orm/core';
import { ITask, WorkerTaskType } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

@Entity()
export class TaskEntity extends BaseEntity implements ITask{
    @Property({nullable: true})
    userId: string | null;

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
}
