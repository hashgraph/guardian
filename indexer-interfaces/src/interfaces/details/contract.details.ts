import { ContractType } from '../../types/index.js';
import { Details } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Contract options
 */
export interface ContractOptions {
    /**
     * Contract identifier
     */
    contractId: string;
    /**
     * Description
     */
    description: string;
    /**
     * Contract Type
     */
    contractType: ContractType;
    /**
     * Owner
     */
    owner: string;
}

/**
 * Contract analytics
 */
export interface ContractAnalytics {
    textSearch?: string;
}

/**
 * Contract
 */
export type Contract = Message<ContractOptions, ContractAnalytics>;

/**
 * Contract details
 */
export type ContractDetails = Details<Contract>;
