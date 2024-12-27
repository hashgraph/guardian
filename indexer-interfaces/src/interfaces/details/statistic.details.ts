import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Statistic options
 */
export interface StatisticOptions {
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
 * Statistic analytics
 */
export interface StatisticAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Config
     */
    config?: any;
}

/**
 * Statistic activity
 */
export interface StatisticActivity {
    /**
     * Schemas
     */
    schemas: number;
    /**
     * VCs
     */
    vcs: number;
}

/**
 * Statistic
 */
export type Statistic = Message<StatisticOptions, StatisticAnalytics>;

/**
 * Statistic details
 */
export type StatisticDetails = DetailsActivity<Statistic, StatisticActivity>;
