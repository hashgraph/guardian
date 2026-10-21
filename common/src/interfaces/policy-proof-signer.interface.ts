/**
 * The signing surface `PolicyImportExport` needs to attach an export proof to a
 * policy archive. `VcHelper` satisfies it, but it is declared structurally so
 * `common` stays free of `@guardian/hedera` and, through it, of
 * `@hiero-ledger/sdk`. The caller supplies the implementation.
 */
export interface IPolicyProofSigner {
    /**
     * Load the DID document of the policy owner
     * @param owner
     * @param ownerId
     */
    loadDidDocument(owner: string, ownerId?: string | null): Promise<any>;

    /**
     * Issue a verifiable credential for the given subject
     * @param subject
     * @param didDocument
     * @param signatureType
     * @param uuid
     */
    createVerifiableCredential(
        subject: any,
        didDocument: any,
        signatureType: any,
        uuid: any
    ): Promise<{ getDocument(): any }>;
}
