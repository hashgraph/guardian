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

// Hard ceiling on task size (bytes), rejected at creation. Not MQ_MAX_PAYLOAD - large payloads
// go out-of-band via LargePayloadContainer. Keep in sync with the worker memory limit.
const taskMaxPayload = (): number => (+process.env.TASK_MAX_PAYLOAD || 256 * 1024 * 1024);

@Entity()
@Index({ name: 'idx_status_createDate', properties: ['done', 'sent', 'createDate'], options: { createDate: -1 } })
@Index({ name: 'idx_status_processedTime', properties: ['done', 'sent', 'processedTime'], options: { processedTime: -1 } })
@Index({ name: 'idx_processedTime_priority', properties: ['processedTime', 'priority'] })
// Covers refreshAndReassignTasks's dispatch query. ESR order: processedTime (equality) leads,
// createDate (sort) next, priority (range) last - don't reorder without re-checking explain().
@Index({ name: 'idx_dispatch_queue', properties: ['processedTime', 'createDate', 'priority'] })
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

    /** Serialized size of `data` in bytes; used to scale the dispatch ack timeout. */
    @Property({ nullable: true })
    dataSize?: number;

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

    /** Failed hand-off attempts (transport/timeout), separate from `attempt`'s worker-reported failures. */
    @Property({ nullable: true })
    dispatchAttempt?: number;

    @Property({ nullable: true })
    interception: string | null;

    @BeforeCreate()
    async offloadDataOnCreate() {
        // Validate size only on insert - a queued task must stay saveable.
        await this.offloadData(true);
    }

    @BeforeUpdate()
    async offloadDataOnUpdate() {
        if (this.dataFileId) {
            this.data = null;
            return;
        }
        await this.offloadData(false);
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

    /** Offloads `data` to GridFS above the inline limit; on insert, also rejects payloads over TASK_MAX_PAYLOAD. */
    private async offloadData(validateSize: boolean): Promise<void> {
        if (this.data === null || this.data === undefined) {
            return;
        }
        const json = JSON.stringify(this.data);
        const size = Buffer.byteLength(json);
        this.dataSize = size;

        // Fail fast with a message the caller can surface, instead of hanging until its deadline.
        const maxPayload = taskMaxPayload();
        if (validateSize && size > maxPayload) {
            throw new Error(
                `Task payload is too large: ${TaskEntity.formatBytes(size)} ` +
                `(limit ${TaskEntity.formatBytes(maxPayload)}, task type "${this.type}"). ` +
                `Reduce the file size or split the upload.`
            );
        }

        if (size > TASK_DATA_GRIDFS_LIMIT) {
            this.dataFileId = await this._createFile(json, 'Task');
            this.data = null;
        }
    }

    /** Human-readable byte size for error messages. */
    private static formatBytes(bytes: number): string {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}
