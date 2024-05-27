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
     * Only assigned
     */
    assigned: boolean
    /**
     * Only published
     */
    published: boolean
}