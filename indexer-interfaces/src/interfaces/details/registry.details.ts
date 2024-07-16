import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Registry options
 */
export interface RegistryOptions {
    /**
     * DID
     */
    did: string;
    /**
     * Registrant topic identifier
     */
    registrantTopicId: string;
    /**
     * Lang
     */
    lang: string;
    /**
     * Attributes
     */
    attributes: any;
}

/**
 * Registry analytics
 */
export interface RegistryAnalytics {
    /**
     * Text search
     */
    textSearch: string;
}

/**
 * Registry activity
 */
export interface RegistryActivity {
    /**
     * VCs
     */
    vcs: number;
    /**
     * VPs
     */
    vps: number;
    /**
     * Policies
     */
    policies: number;
    /**
     * Roles
     */
    roles: number;
    /**
     * Tools
     */
    tools: number;
    /**
     * Modules
     */
    modules: number;
    /**
     * Tokens
     */
    tokens: number;
    /**
     * Users
     */
    users: number;
}

/**
 * Registry
 */
export type Registry = Message<RegistryOptions, RegistryAnalytics>;

/**
 * Registry details
 */
export type RegistryDetails = DetailsActivity<Registry, RegistryActivity>;
