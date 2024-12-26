import { DetailsActivity, DetailsHistory } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Label options
 */
export interface LabelOptions {
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
 * Label analytics
 */
export interface LabelAnalytics {
    /**
     * TopicId
     */
    tokenId?: string,
    /**
     * Label Name
     */
    labelName?: string,
}

/**
 * Label activity
 */
export interface LabelActivity {
    /**
     * Schemas
     */
    schemas: number;
    /**
     * VPs
     */
    vps: number;
}

/**
 * Label
 */
export type Label = Message<LabelOptions, LabelAnalytics>;

/**
 * Label details
 */
export type LabelDetails = DetailsActivity<Label, LabelActivity>;
