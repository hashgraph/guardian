/**
 * Other policy error
 */
export class PolicyOtherError extends Error {
    constructor(message: string, private policyId, private code: number = 500) {
        super(message);
    }

    /**
     * Error object getter
     */
    public get errorObject() {
        return {
            type: 'policyOtherError',
            code: this.code,
            policyId: this.policyId,
            message: this.message
        }
    }
}
