/**
 * Policy response item
 */
export interface Policy {
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

/**
 * Policy response list
 */
export interface PolicyListResponse {
  /**
   * policies
   */
  policies: Policy[];
  /**
   * count
   */
  count: number;
}
