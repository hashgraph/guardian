import { Entity, Property, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';
import {GlobalDocumentType, GlobalEventsStreamStatus} from '@guardian/interfaces';

@Entity()
export class GlobalEventsWriterStream extends RestoreEntity {
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
    active: boolean = false;

    @Property({ nullable: false, index: true })
    documentType: GlobalDocumentType = 'any';

    @Property({ nullable: true, index: true })
    public lastPublishMessageId: string | null = null;

    @BeforeCreate()
    @BeforeUpdate()
    public prepareEntity(): void {
        this._updatePropHash({
            policyId: this.policyId,
            blockId: this.blockId,
            userId: this.userId,
            userDid: this.userDid,
            globalTopicId: this.globalTopicId,
            active: this.active,
            documentType: this.documentType,
            lastPublishMessageId: this.lastPublishMessageId
        });

        this._updateDocHash('');
    }

    @AfterDelete()
    override async deleteCache(): Promise<void> {
        try {
            await new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'GlobalEventsWriterStream',
            });
        } catch (error) {
            console.error(error);
        }
    }
}
