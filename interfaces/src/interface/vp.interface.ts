import { StringifyOptions } from 'querystring';
import {uuid} from './uuid.interface';
import {IVC} from './vc.interface';

export interface IVP {
    '@context': string[],
    id: uuid,
    cid?: string
    type: string[],
    verifiableCredential: IVC[],
    proof?: any
}
