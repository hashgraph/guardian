import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Tool options
 */
export interface ToolOptions {
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
     * Hash
     */
    hash: string;
    /**
     * Tool topic identifier
     */
    toolTopicId: string;
    /**
     * Tags topic identifier
     */
    tagsTopicId: string;
}

/**
 * Tool analytics
 */
export interface ToolAnalytics {
    /**
     * Text search
     */
    textSearch: string;
}

/**
 * Tool activity
 */
export interface ToolActivity {
    /**
     * Policies
     */
    policies: number;
    /**
     * Schemas
     */
    schemas: number;
}

/**
 * Tool
 */
export type Tool = Message<ToolOptions, ToolAnalytics>;

/**
 * Tool details
 */
export type ToolDetails = DetailsActivity<Tool, ToolActivity>;
