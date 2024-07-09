import { DetailsActivity } from './details.interface.js';
import { Message } from './message.details.js';

/**
 * Policy options
 */
export interface PolicyOptions {
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
     * Topic description
     */
    topicDescription: string;
    /**
     * Version
     */
    version: string;
    /**
     * Policy tag
     */
    policyTag: string;
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
    instanceTopicId: string;
    /**
     * Synchronization topic identifier
     */
    synchronizationTopicId: string;
    /**
     * Discontinued date
     */
    discontinuedDate?: string;
}

/**
 * Policy analytics
 */
export interface PolicyAnalytics {
    /**
     * Text search
     */
    textSearch: string;
    /**
     * Tools
     */
    tools: string[];
    /**
     * Registry message identifier
     */
    registryId: string;
}

/**
 * Policy activity
 */
export interface PolicyActivity {
    /**
     * VCs
     */
    vcs: number;
    /**
     * VPs
     */
    vps: number;
    /**
     * Roles
     */
    roles: number;
    /**
     * Schemas
     */
    schemas: number;
}

/**
 * Policy
 */
export type Policy = Message<PolicyOptions, PolicyAnalytics>;

/**
 * Policy details
 */
export type PolicyDetails = DetailsActivity<Policy, PolicyActivity>;
