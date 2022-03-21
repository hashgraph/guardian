import {did} from './did.interface';

export interface ICredentialSubject {
    id?: did;
    type?: string;
    '@context': string | string[];
    [x: string]: any;
}