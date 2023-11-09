import { RetireTokenPool } from './retire-token-pool.interface';

export interface RetireTokenRequest extends RetireTokenPool {
    serials: number[];
}