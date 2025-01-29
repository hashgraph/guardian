import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Formula options
 */
export interface FormulaOptions {
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Policy topic identifier
     */
    policyTopicId: string;
    /**
     * Instance topic identifier
     */
    policyInstanceTopicId: string;
}

/**
 * Formula analytics
 */
export interface FormulaAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Policy id
     */
    policyId?: string;
    /**
     * Config
     */
    config?: any;
}

/**
 * Formula activity
 */
export interface FormulaActivity {
}

/**
 * Formula
 */
export type Formula = Message<FormulaOptions, FormulaAnalytics>;

/**
 * Formula details
 */
export type FormulaDetails = DetailsActivity<Formula, FormulaActivity>;
