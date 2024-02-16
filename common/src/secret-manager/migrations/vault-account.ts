import { Entity, Property } from '@mikro-orm/core';
import { IWalletAccount } from '@guardian/interfaces';
import { BaseEntity } from '../../models';

/**
 * Wallet collection
 */
@Entity()
export class WalletAccount extends BaseEntity implements IWalletAccount {
  /**
   * Token
   */
  @Property({ nullable: true })
  token?: string;

  /**
   * Type
   */
  @Property({ nullable: true })
  type?: string; // type|did

  /**
   * Key
   */
  @Property({ nullable: true })
  key?: string;
}
