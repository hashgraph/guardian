import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Role options
 */
export interface RoleOptions {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * Role
     */
    role: string;
    /**
     * Group
     */
    group: string;
}

/**
 * Role analytics
 */
export interface RoleAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
    /**
     * Policy message identifier
     */
    policyId?: string;
}

/**
 * Role activity
 */
export interface RoleActivity {
    /**
     * VCs
     */
    vcs: number;
}

/**
 * Role
 */
export type Role = Message<RoleOptions, RoleAnalytics>;

/**
 * Role details
 */
export type RoleDetails = DetailsActivity<Role, RoleActivity>;
