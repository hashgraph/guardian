import {did} from './did.interface';

export interface ICredentialSubject {
    '@context': string[];
    id: did;
    type: 'Installer';

    [x: string]: any;
}
