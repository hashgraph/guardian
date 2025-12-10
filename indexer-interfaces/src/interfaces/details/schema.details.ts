import { DetailsActivity } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Schema options
 */
export interface SchemaOptions {
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Entity
     */
    entity: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * UUID
     */
    uuid: string;
    /**
     * Version
     */
    version: string;
    /**
     * Code version
     */
    codeVersion: string;
    /**
     * Relationships
     */
    relationships: string[];
}

/**
 * Child schema
 */
export interface ChildSchema {
    /**
     * Message identifier
     */
    id: string;
    /**
     * Name
     */
    name: string;
}

/**
 * Schema analytics
 */
export interface SchemaAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
    /**
     * Policy message identifiers
     */
    policyIds?: string[];
    /**
     * Child schemas identifiers
     */
    childSchemas?: ChildSchema[];
    /**
     * Schema properties
     */
    properties?: string[];
}

/**
 * Schema activity
 */
export interface SchemaActivity {
    /**
     * VCs
     */
    vcs: number;
    /**
     * VPs
     */
    vps: number;
}

/**
 * Schema
 */
export type ISchema = Message<SchemaOptions, SchemaAnalytics>;

/**
 * Schema details
 */
export type SchemaDetails = DetailsActivity<ISchema, SchemaActivity>;

/**
 * Schemas Package activity
 */
export interface SchemasPackageActivity {
    /**
     * Schema
     */
    schemas: number;
}

export type SchemasPackageDetails = DetailsActivity<ISchema, SchemasPackageActivity>;
