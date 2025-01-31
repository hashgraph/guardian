import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';
import { ISchema } from './schema.details.js';

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
 * Formula Relationships
 */
export interface FormulaRelationships {
    /**
     * Message ID
     */
    id: string;
    /**
     * Formula
     */
    item?: Formula;
    /**
     * Schemas
     */
    schemas?: ISchema[];
    /**
     * Formulas
     */
    formulas?: Formula[];
}

/**
 * Formula activity
 */
// tslint:disable-next-line:no-empty-interface
export interface FormulaActivity {}

/**
 * Formula
 */
export type Formula = Message<FormulaOptions, FormulaAnalytics>;

/**
 * Formula details
 */
export type FormulaDetails = DetailsActivity<Formula, FormulaActivity>;
