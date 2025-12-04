import { Entity, Property, BeforeCreate, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';

/**
 * GlobalNotificationStream entity mirrors ExternalEventStream style.
 * Used to track consumption state for global notifications topics.
 */
@Entity()
export class GlobalEventsStream extends RestoreEntity {
    @Property({ nullable: true, index: true })
    policyId?: string;

    @Property({ nullable: true, index: true })
    blockId?: string;

    @Property({ nullable: true, index: true })
    globalTopicId?: string;

    @Property({ nullable: true })
    ownerDid?: string;

    @Property({ nullable: true })
    routingHint?: string;

    @Property({ nullable: true })
    lastMessage?: string;

    @Property({ nullable: true })
    lastUpdate?: string;

    @Property({ nullable: true })
    active?: boolean;

    @Property({ nullable: true })
    status?: string;

    /**
     * Ensure default values and hash before create/update.
     */
    @BeforeCreate()
    @BeforeUpdate()
    public prepareEntity(): void {
        this.lastMessage = this.lastMessage || '';
        this.lastUpdate = this.lastUpdate || '';
        this.active = this.active || false;
        const propertiesHashSource: any = {
            policyId: this.policyId,
            blockId: this.blockId,
            globalTopicId: this.globalTopicId,
            ownerDid: this.ownerDid,
            routingHint: this.routingHint,
            lastMessage: this.lastMessage,
            lastUpdate: this.lastUpdate,
            active: this.active,
            status: this.status
        };
        this._updatePropHash(propertiesHashSource);
        this._updateDocHash('');
    }

    /**
     * Save delete cache entry.
     */
    @AfterDelete()
    public async deleteCache(): Promise<void> {
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
