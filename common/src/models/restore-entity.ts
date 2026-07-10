import { Property } from '@mikro-orm/core';
import { BaseEntity } from './index.js';
import crypto from 'node:crypto';

export abstract class RestoreEntity extends BaseEntity {
    /**
     * Restore ID
     */
    @Property({ nullable: true })
    _restoreId?: string;

    /**
     * Properties Hash
     */
    @Property({ nullable: true })
    _propHash?: string;

    /**
     * Document Hash
     */
    @Property({ nullable: true })
    _docHash?: string;

    protected _updatePropHash(prop: any) {
        this._propHash = crypto
            .createHash('md5')
            .update(JSON.stringify(prop))
            .digest('hex');
    }

    protected _updateDocHash(document: string) {
        if (document) {
            this._docHash = crypto
                .createHash('md5')
                .update(document)
                .digest('hex');
        } else {
            this._docHash = '';
        }
    }

    /**
     * Save delete cache
     */
    abstract deleteCache(): Promise<void>
}
