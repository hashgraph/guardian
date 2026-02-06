import {AfterDelete, BeforeCreate, BeforeUpdate, Entity, Property} from '@mikro-orm/core';
import {RestoreEntity} from '../models/index.js';
import {DataBaseHelper} from '../helpers/index.js';
import {DeleteCache} from './delete-cache.js';
import {GlobalDocumentType, GlobalEventsStreamStatus} from '@guardian/interfaces';

@Entity()
export class GlobalEventsReaderStream extends RestoreEntity {
    @Property({ nullable: false, index: true })
    policyId!: string;

    @Property({ nullable: false, index: true })
    blockId!: string;

    @Property({ nullable: false, index: true })
    userId!: string;

    @Property({ nullable: false, index: true })
    userDid!: string;

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
    branchDocumentTypeByBranch: Record<string, GlobalDocumentType> = {};

    @BeforeCreate()
    @BeforeUpdate()
    public prepareEntity(): void {
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
                collection: 'GlobalEventsReaderStream'
            });
        } catch (error) {
            console.error(error);
        }
    }
}
