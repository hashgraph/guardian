import { Entity, Property} from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Invite collection
 */
@Entity()
export class OtpSecret extends BaseEntity {
    /**
    * User Id
    */
    @Property({ nullable: true })
    userId: string;

    /**
     * Otp Secret
     */
    @Property({ nullable: true })
    secret: string;

    /**
     * Otp Secret
     */
    @Property({ nullable: true })
    config: any;

    @Property({ nullable: true })
    backupCodes: string[];

    @Property()
    enabled: boolean;

    /**
     * Encripted
     */
    @Property()
    encrypted: boolean;

}