import { IPolicy } from './policy.interface.js';
import { IVCDocument } from './vc-document.interface.js';

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
