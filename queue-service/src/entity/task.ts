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

/**
 * Hard ceiling on task payload size (bytes). A task larger than this is rejected at creation
 * instead of being accepted into the queue.
 *
 * This is deliberately NOT `MQ_MAX_PAYLOAD` (1MB). Payloads above `MQ_MAX_PAYLOAD` are legitimate
 * and are delivered out-of-band through `LargePayloadContainer` (see `ZipCodec.encode`), so
 * rejecting at 1MB would break every IPFS `add-file` above ~750KB. What must be rejected is a
 * payload no worker can realistically fetch, parse and hold in memory.
 *
 * Keep this in sync with the worker-service memory limit: decoding a task costs roughly 4-6x its
 * serialized size on the worker (arraybuffer -> UTF-16 string -> JSON.parse -> base64 decode).
 */
const taskMaxPayload = (): number => (+process.env.TASK_MAX_PAYLOAD || 256 * 1024 * 1024);

@Entity()
@Index({ name: 'idx_status_createDate', properties: ['done', 'sent', 'createDate'], options: { createDate: -1 } })
@Index({ name: 'idx_status_processedTime', properties: ['done', 'sent', 'processedTime'], options: { processedTime: -1 } })
@Index({ name: 'idx_processedTime_priority', properties: ['processedTime', 'priority'] })
// Covers the dispatch query in QueueService.refreshAndReassignTasks (filter on
// processedTime/done/isError/priority, ordered by createDate).
//
// Field order follows the ESR (Equality, Sort, Range) rule, not filter order: `processedTime`
// is the only equality predicate in the query, so it leads. `done`/`isError` use `$ne` - Mongo
// can't collapse that into a single tight bound (it splits into two scan ranges), so they add
// nothing as index keys and are left as cheap residual filters on the already-narrowed
// candidates instead. `createDate` (the sort key) comes right after the equality prefix so the
// index can stream results in order instead of Mongo adding a blocking in-memory SORT stage.
// `priority` - the actual range predicate - goes last. Do not reorder without re-checking
// explain('executionStats') on a realistic queue depth for a SORT stage above the IXSCAN.
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

    /**
     * Serialized size of `data` in bytes, recorded at creation. Used to scale the dispatch ack
     * timeout and to make oversized tasks visible in logs without re-serializing (or
     * re-downloading from GridFS) the payload.
     */
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

    /**
     * Number of failed *dispatch* attempts (queue-service could not hand the task to a worker at
     * all - send-task-to-worker timeout / transport error).
     *
     * Deliberately separate from `attempt`, which counts worker-reported business failures.
     * Conflating them would let a couple of transport hiccups silently eat a task's real retry
     * budget. Reset to 0 on every successful hand-off.
     */
    @Property({ nullable: true })
    dispatchAttempt?: number;

    @Property({ nullable: true })
    interception: string | null;

    @BeforeCreate()
    async offloadDataOnCreate() {
        // Only validate the size ceiling on insert, so a task that is already in the queue can
        // never be made un-saveable by a later status update.
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

    /**
     * Move `data` to GridFS if its serialized size exceeds the inline limit. Also records the
     * serialized size and, on insert, rejects payloads above `TASK_MAX_PAYLOAD` so an undeliverable
     * task never enters the queue in the first place.
     *
     * @param validateSize enforce the TASK_MAX_PAYLOAD ceiling (insert only)
     */
    private async offloadData(validateSize: boolean): Promise<void> {
        if (this.data === null || this.data === undefined) {
            return;
        }
        const json = JSON.stringify(this.data);
        const size = Buffer.byteLength(json);
        this.dataSize = size;

        // Fail fast, with a message the caller can surface to the user. The throw propagates
        // through save() to the ADD_TASK_TO_QUEUE handler, which replies { ok: false }, which
        // Workers.addTask turns into a rejected task promise (i.e. a visible publish error)
        // rather than a request that hangs until the caller's own deadline.
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

    /**
     * Human-readable byte size for user-facing error messages.
     */
    private static formatBytes(bytes: number): string {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}
