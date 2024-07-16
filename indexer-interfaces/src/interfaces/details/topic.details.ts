import { TopicType } from '../../types/index.js';
import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';
import { RawTopic } from '../raw-topic.interface.js';

/**
 * Topic options
 */
export interface TopicOptions {
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
     * Message type
     */
    messageType: TopicType;
    /**
     * Child topic identifier
     */
    childId: string;
    /**
     * Parent topic identifier
     */
    parentId: string;
    /**
     * Rationale
     */
    rationale: string;
}

/**
 * Topic analytics
 */
export interface TopicAnalytics {
    /**
     * Text search
     */
    textSearch: string;
}

/**
 * Topic activity
 */
export interface TopicActivity {
    /**
     * Registries
     */
    registries: number;
    /**
     * Topics
     */
    topics: number;
    /**
     * Policies
     */
    policies: number;
    /**
     * Tools
     */
    tools: number;
    /**
     * Modules
     */
    modules: number;
    /**
     * Schemas
     */
    schemas: number;
    /**
     * Tokens
     */
    tokens: number;
    /**
     * Roles
     */
    roles: number;
    /**
     * DIDs
     */
    dids: number;
    /**
     * VCs
     */
    vcs: number;
    /**
     * VPs
     */
    vps: number;
    /**
     * Contracts
     */
    contracts: number;
}

/**
 * Topic
 */
export type Topic = Message<TopicOptions, TopicAnalytics>;

/**
 * Topic details
 */
export type TopicDetails = DetailsActivity<Topic, TopicActivity, RawTopic>;
