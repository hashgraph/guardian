import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Registry user options
 */
export interface RegistryUserOptions {
    /**
     * DID
     */
    did: string;
}

/**
 * Registry user analytics
 */
export interface RegistryUserAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
}

/**
 * Registry user activity
 */
export interface RegistryUserActivity {
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
}

/**
 * Registry user
 */
export type RegistryUser = Message<RegistryUserOptions, RegistryUserAnalytics>;

/**
 * Registry user details
 */
export type RegistryUserDetails = DetailsActivity<
    RegistryUser,
    RegistryUserActivity
>;
