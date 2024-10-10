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
}
