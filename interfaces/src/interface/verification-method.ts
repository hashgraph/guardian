
export interface IVerificationMethod {
    id: string;
    type: "Ed25519VerificationKey2018";
    controller: string;
    publicKeyBase58: string;
    privateKeyBase58?: string;
}
