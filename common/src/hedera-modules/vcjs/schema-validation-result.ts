/**
 * Result of validating a credential subject or VC against its JSON schema.
 */
export class SchemaValidationResult {
    /**
     * Whether validation passed
     */
    ok: boolean;
    /**
     * Validation error, present only when `ok` is false
     */
    error?: { type: string; details: any[] };

    constructor(ok: boolean, type: string = '', details: any[] = []) {
        this.ok = ok;
        if (!ok) {
            this.error = { type, details };
        }
    }
}
