import { RetireTokenPool } from './retire-token-pool.interface.js';

export interface RetireTokenRequest extends RetireTokenPool {
    serials: number[];
}
