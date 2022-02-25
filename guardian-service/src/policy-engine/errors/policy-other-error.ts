/**
 * Other policy error
 */
export class PolicyOtherError extends Error {
    constructor(message: string, private policyId, private code: number = 500) {
        super(message);
    }

    public get errorObject() {
        console.error(this.message);
        return {
            type: 'policyOtherError',
            code: this.code,
            policyId: this.policyId,
            message: this.message
        }
    }
}
