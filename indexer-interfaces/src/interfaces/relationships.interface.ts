import { MessageType } from '../types/message-type';
import { Message } from './message.interface';

/**
 * Relationship category
 */
export enum RelationshipCategory {
    Registry = 'Registry',
    Policy = 'Policy',
    Schema = 'Schema',
    Role = 'Role',
    VC = 'VC',
    VP = 'VP',
}

/**
 * Relationship categories
 */
export const RELATIONSHIP_CATEGORIES = [
    {
        name: RelationshipCategory.Registry,
    },
    {
        name: RelationshipCategory.Policy,
    },
    {
        name: RelationshipCategory.Schema,
    },
    {
        name: RelationshipCategory.Role,
    },
    {
        name: RelationshipCategory.VC,
    },
    {
        name: RelationshipCategory.VP,
    },
];

/**
 * Relationship
 */
export interface Relationship {
    /**
     * Message identifier
     */
    id: string;
    /**
     * UUID
     */
    uuid: string;
    /**
     * Type
     */
    type: MessageType;
    /**
     * Category
     */
    category: number;
    /**
     * Name
     */
    name: string;
}

/**
 * Relationship link
 */
export interface RelationshipLink {
    /**
     * Source
     */
    source: string;
    /**
     * Target
     */
    target: string;
}

/**
 * Relationships
 */
export interface Relationships {
    /**
     * Identifier
     */
    id: string;
    /**
     * Item
     */
    item?: Message<any>;
    /**
     * Target
     */
    target?: Relationship;
    /**
     * Relationships
     */
    relationships?: Relationship[];
    /**
     * Links
     */
    links?: RelationshipLink[];
    /**
     * Categories
     */
    categories?: typeof RELATIONSHIP_CATEGORIES;
}
