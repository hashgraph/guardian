import { Entity, Property, Index, BeforeCreate } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

import { BaseEntity } from '../models/base-entity.js';

@Entity()
@Index({ name: 'sp_policy', properties: ['policyId'] })
@Index({ name: 'sp_parent', properties: ['parentSavepointId'] })
@Index({ name: 'sp_policy_name', properties: ['policyId', 'name'] })
@Index({ name: 'sp_policy_deleted', properties: ['policyId', 'isDeleted'] })
@Index({ name: 'sp_policy_current',  properties: ['policyId', 'isCurrent'] })
export class DryRunSavepoint extends BaseEntity {
    @Property()
    policyId!: string;

    @Property()
    name!: string;

    @Property({ nullable: true })
    parentSavepointId: string | null = null;

    @Property({ type: 'array' })
    savepointPath: string[] = [];

    @Property({ type: Boolean, default: false })
    isDeleted: boolean = false;

    @Property({ type: Boolean, default: false })
    isCurrent: boolean = false;

    @BeforeCreate()
    _ensurePathWithId() {
        if (!this._id) {
           this._id = new ObjectId();
        }

        const savepointId = this._id.toHexString();

        if (this.parentSavepointId === null) {
            this.parentSavepointId = this.savepointPath.length
                ? this.savepointPath[this.savepointPath.length - 1]
                : null;
        }

        if (this.savepointPath[this.savepointPath.length - 1] !== savepointId) {
            this.savepointPath = [...this.savepointPath, savepointId];
        }
    }
}
