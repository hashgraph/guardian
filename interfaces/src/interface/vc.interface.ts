import {ICredentialSubject} from './credential-subject.interface';
import {did} from './did.interface';
import {uuid} from './uuid.interface';

export interface IVC {
    '@context': string[],
    id: uuid,
    cid?: string,
    type: string[],
    credentialSubject: ICredentialSubject[],
    issuer: did,
    issuanceDate: string,
    proof?: any
}
