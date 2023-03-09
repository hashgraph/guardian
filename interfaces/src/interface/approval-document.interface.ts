/**
 * Approval document interface
 */
export interface IApprovalDocument {
    /**
     * Document ID
     */
    id: string;
    /**
     * Document owner
     */
    owner?: string;
    /**
     * Document approver
     */
    approver?: string;
    /**
     * Document instance
     */
    document?: any;
    /**
     * Document policy id
     */
    policyId?: string;
    /**
     * Document type
     */
    type?: string;
    /**
     * Date of creation
     */
    createDate: Date;
    /**
     * Last change
     */
    updateDate: Date;
    /**
     * Option
     */
    option?: any;
}
