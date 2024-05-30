import { AccessType } from '../type/access.type.js'

/**
 * Entity owner
 */
export interface IOwner {
    /**
     * Current user username
     */
    username: string
    /**
     * Current user
     */
    creator: string
    /**
     * Administrator
     */
    owner: string
    /**
     * Access assigned
     */
    access: AccessType
}