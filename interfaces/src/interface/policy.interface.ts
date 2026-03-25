/**
 * Policy documentation entry
 */
export interface IPolicyDocumentationEntry {
  /**
   * User-visible name
   */
  name: string;
  /**
   * User-provided description
   */
  description: string;
  /**
   * Block target name (unique block name in the policy tree)
   */
  target: string;
  /**
   * HTTP method: GET | POST
   */
  method: string;
  /**
   * Human-readable alias for the DMRV URL (lowercase, alphanumeric, hyphens)
   */
  alias: string;
  /**
   * Technical URL (auto-generated on save, points to block by tag)
   */
  url: string;
  /**
   * External DMRV URL (auto-generated on save, based on alias)
   */
  dmrvUrl: string;
  /**
   * Block type (auto-populated for query params display)
   */
  blockType?: string;
}

/**
 * Policy response item
 */
export interface IPolicy {
  /**
   * _id
   */
  _id: string;
  /**
   * createDate
   */
  createDate: string;
  /**
   * uuid
   */
  uuid: string;
  /**
   * name
   */
  name: string;
  /**
   * description
   */
  description: string;
  /**
   * status
   */
  status: string;
  /**
   * creator
   */
  creator: string;
  /**
   * owner
   */
  owner: string;
  /**
   * topicId
   */
  topicId: string;
  /**
   * policyTag
   */
  policyTag: string;
  /**
   * codeVersion
   */
  codeVersion: string;
  /**
   * version
   */
  version?: string;
  /**
   * userRoles
   */
  userRoles: string[];
  /**
   * userGroups
   */
  userGroups: any[];
  /**
   * userRole
   */
  userRole: string;
  /**
   * userGroup
   */
  userGroup: any;
  /**
   * id
   */
  id: string;
  /**
   * policyDocumentation
   */
  policyDocumentation?: IPolicyDocumentationEntry[];
}
