import { IVerificationMethod } from "./verification-method";


export interface IDidDocument {
    '@context': string | string[];
    id: string;
    verificationMethod: IVerificationMethod;
    authentication: string;
    assertionMethod: string | string;
}
