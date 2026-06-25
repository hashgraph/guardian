import {
    AfterCreate,
    AfterDelete,
    AfterUpdate,
    BeforeCreate,
    BeforeUpdate,
    Entity,
    Index,
    OnLoad,
    Property,
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { ITask, WorkerTaskType } from '@guardian/interfaces';
import { BaseEntity, DataBaseHelper } from '@guardian/common';

const TASK_DATA_GRIDFS_LIMIT = (+process.env.TASK_DATA_GRIDFS_LIMIT || 5 * 1024 * 1024);

@Entity()
@Index({ name: 'idx_status_createDate', properties: ['done', 'sent', 'createDate'], options: { createDate: -1 } })
@Index({ name: 'idx_status_processedTime', properties: ['done', 'sent', 'processedTime'], options: { processedTime: -1 } })
@Index({ name: 'idx_processedTime_priority', properties: ['processedTime', 'priority'] })
export class TaskEntity extends BaseEntity implements ITask {
    @Index({ name: 'userId' })
    @Property({ nullable: true })
    userId: string | null;

    @Index({ name: 'taskId' })
    @Property({ nullable: true })
    taskId: string;

    @Property({ nullable: true })
    priority: number;

    @Property({ nullable: true })
    dryRun: string;

    @Property({ nullable: true })
    mockId: string;

    @Property()
    type: WorkerTaskType;

    @Property({ nullable: true })
    data: any;

    @Property({ nullable: true })
    dataFileId?: ObjectId;

    @Property({ nullable: true })
    sent: boolean;

    @Property({ nullable: true })
    isRetryableTask: boolean;

    @Property({ nullable: true })
    attempts: number

    @Property({ nullable: true })
    processedTime: Date;

    @Property({ nullable: true })
    done: boolean;

    @Property({ nullable: true })
    isError: boolean;

    @Property({ nullable: true })
    errorReason: string;

    @Property({ nullable: true })
    attempt: number;

    @Property({ nullable: true })
    interception: string | null;

    @BeforeCreate()
    async offloadDataOnCreate() {
        await this.offloadData();
    }

    @BeforeUpdate()
    async offloadDataOnUpdate() {
        if (this.dataFileId) {
            this.data = null;
            return;
        }
        await this.offloadData();
    }

    @OnLoad()
    @AfterCreate()
    @AfterUpdate()
    async restoreData() {
        if (this.dataFileId && (this.data === null || this.data === undefined)) {
            const buffer = await this._loadFile(this.dataFileId);
            this.data = JSON.parse(buffer.toString());
        }
    }

    @AfterDelete()
    deleteDataFile() {
        if (this.dataFileId) {
            DataBaseHelper.gridFS
                .delete(this.dataFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: Task, ${this._id}, dataFileId`);
                    console.error(reason);
                });
        }
    }

    private async offloadData(): Promise<void> {
        if (this.data === null || this.data === undefined) {
            return;
        }
        const json = JSON.stringify(this.data);
        if (Buffer.byteLength(json) > TASK_DATA_GRIDFS_LIMIT) {
            this.dataFileId = await this._createFile(json, 'Task');
            this.data = null;
        }
    }
}
