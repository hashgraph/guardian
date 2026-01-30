import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

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
     * Comments topic identifier
     */
    commentsTopicId: string;
    /**
     * Discontinued date
     */
    discontinuedDate?: string;

    originalHash?: string;

    currentHash?: string;

    originalMessageId?: string;
}

/**
 * Policy analytics
 */
export interface PolicyAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
    /**
     * Tools
     */
    tools?: string[];
    /**
     * Registry message identifier
     */
    registryId?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Tokens
     */
    tokens?: string[];
    /**
     * VC count
     */
    vcCount?: number;
    /**
     * VP count
     */
    vpCount?: number;
    /**
     * Tokens count
     */
    tokensCount?: number;
    /**
     * Tags
     */
    tags?: string[];
    /**
     * Hash
     */
    hash?: string;
    /**
     * Hash map
     */
    hashMap?: any;
    /**
     * Dynamic topics
     */
    dynamicTopics?: string[];

    derivationsCount?: number;
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
    /**
     * Schemas
     */
    schemaPackages: number;
    /**
     * Formulas
     */
    formulas: number;
}

/**
 * Policy
 */
export type Policy = Message<PolicyOptions, PolicyAnalytics>;

/**
 * Policy details
 */
export type PolicyDetails = DetailsActivity<Policy, PolicyActivity>;
