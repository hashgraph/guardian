import { IPolicy } from './policy.interface';
import { IVCDocument } from './vc-document.interface';

/**
 * StandardRegistryAccountResponse - Related to response
 */
export interface IStandardRegistryResponse {
  /**
   * Did - User info
   */
  did: string;

  /**
   * Username
   */
  username: string;

  /**
   * Hedera account id
   */
  hederaAccountId: string;

  /**
   * Policies list
   */
  policies: IPolicy[];

  /**
   * VC Document
   */
  vcDocument: IVCDocument;
}
