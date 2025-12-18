import {
    Entity,
    Property,
    BeforeCreate,
    BeforeUpdate,
    AfterDelete
} from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';

export enum GlobalEventsStreamStatus {
    Free = 'FREE',
    Processing = 'PROCESSING',
    Error = 'ERROR'
}

@Entity()
export class GlobalEventsStream extends RestoreEntity {
    @Property({ nullable: false, index: true })
    policyId!: string;

    @Property({ nullable: false, index: true })
    blockId!: string;

    @Property({ nullable: false, index: true })
    userId!: string;

    @Property({ nullable: true, index: true })
    userDid?: string;

    @Property({ nullable: false, index: true })
    globalTopicId!: string;

    @Property({ nullable: false })
    lastMessageCursor: string = '';

    @Property({ nullable: false })
    status: GlobalEventsStreamStatus = GlobalEventsStreamStatus.Free;

    @Property({ nullable: false })
    active: boolean = false;

    @Property({ nullable: false, type: 'json' })
    filterFieldsByBranch: Record<string, Record<string, string>> = {};

    @Property({ nullable: false, type: 'json' })
    branchDocumentTypeByBranch: Record<string, string> = {};

    @BeforeCreate()
    @BeforeUpdate()
    public prepareEntity(): void {
        this.lastMessageCursor = this.lastMessageCursor ?? '';
        this.status = this.status ?? GlobalEventsStreamStatus.Free;
        this.active = this.active ?? false;
        this.filterFieldsByBranch = this.filterFieldsByBranch ?? {};
        this.branchDocumentTypeByBranch = this.branchDocumentTypeByBranch ?? {};

        this._updatePropHash({
            policyId: this.policyId,
            blockId: this.blockId,
            userId: this.userId,
            userDid: this.userDid,
            globalTopicId: this.globalTopicId,
            lastMessageCursor: this.lastMessageCursor,
            status: this.status,
            active: this.active,
            filterFieldsByBranch: this.filterFieldsByBranch,
            branchDocumentTypeByBranch: this.branchDocumentTypeByBranch,
        });

        this._updateDocHash('');
    }

    @AfterDelete()
    override async deleteCache(): Promise<void> {
        try {
            await new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'GlobalEventsStream'
            });
        } catch (error) {
            console.error(error);
        }
    }
}
