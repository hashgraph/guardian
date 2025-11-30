import {
    AfterDelete,
    BeforeCreate,
    BeforeUpdate,
    Entity,
    Property,
} from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * External event stream subscription
 *
 * One row describes a single subscription:
 * - which policy and block own it
 * - which registry stream and document topic it points to
 * - which schema is expected
 * - current progress (lastMessage, status)
 */
@Entity()
export class ExternalEventStream extends RestoreEntity {
    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true,
    })
    policyId?: string;

    /**
     * Block UUID
     */
    @Property({
        nullable: true,
    })
    blockId?: string;

    /**
     * Registry stream id (logical id of the stream)
     */
    @Property({
        nullable: true,
    })
    streamId?: string;

    /**
     * Hedera document topic id with VC messages
     */
    @Property({
        nullable: true,
    })
    documentTopicId?: string;

    /**
     * Expected schema id (@context url)
     */
    @Property({
        nullable: true,
    })
    schemaId?: string;

    /**
     * Owner DID whose credentials will be used to read topic
     * (can be system, registry owner or dedicated DID)
     */
    @Property({
        nullable: true,
    })
    ownerDid?: string;

    /**
     * Last processed message id in the document topic
     */
    @Property({
        nullable: true,
    })
    lastMessage?: string;

    /**
     * Last successful update timestamp (ISO string)
     */
    @Property({
        nullable: true,
    })
    lastUpdate?: string;

    /**
     * Active flag
     */
    @Property({
        nullable: true,
    })
    active?: boolean;

    /**
     * Status of processing
     * (FREE | PROCESSING | ERROR | DISABLED | custom)
     */
    @Property({
        nullable: true,
    })
    status?: string;

    /**
     * Before create / update hook
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument(): Promise<void> {
        this.lastMessage = this.lastMessage || '';
        this.lastUpdate = this.lastUpdate || '';

        if (this.active === undefined || this.active === null) {
            this.active = false;
        }

        const propertiesHashSource: any = {};

        propertiesHashSource.policyId = this.policyId;
        propertiesHashSource.blockId = this.blockId;
        propertiesHashSource.streamId = this.streamId;
        propertiesHashSource.documentTopicId = this.documentTopicId;
        propertiesHashSource.schemaId = this.schemaId;
        propertiesHashSource.ownerDid = this.ownerDid;
        propertiesHashSource.lastMessage = this.lastMessage;
        propertiesHashSource.lastUpdate = this.lastUpdate;
        propertiesHashSource.active = this.active;
        propertiesHashSource.status = this.status;

        this._updatePropHash(propertiesHashSource);
        this._updateDocHash('');
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache(): Promise<void> {
        try {
            const deleteCacheHelper = new DataBaseHelper<DeleteCache>(
                DeleteCache,
            );

            await deleteCacheHelper.insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'ExternalEventStream',
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }
}
