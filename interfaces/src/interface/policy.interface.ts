/**
 * Allowed shape of a policy documentation alias.
 * One or more `[a-z0-9-]+` segments separated by single `/`
 * (no leading/trailing/double slashes, no empty segments).
 */
export const POLICY_ALIAS_REGEX = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

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
   * Human-readable alias for the DMRV URL: lowercase letters, digits, hyphens;
   * multiple segments may be separated by `/` (e.g. `monitoring-reports/create`).
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
  /**
   * Schema IRI bound to the target block (auto-populated by /about)
   */
  schemaId?: string;
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
