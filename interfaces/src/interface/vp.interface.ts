import {uuid} from './uuid.interface';
import {IVC} from './vc.interface';

export interface IVP {
    '@context': string[],
    id: uuid,
    type: string[],
    verifiableCredential: IVC[],
    proof?: any
}
