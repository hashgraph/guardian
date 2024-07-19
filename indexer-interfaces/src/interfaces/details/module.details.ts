import { Details } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Module options
 */
export interface ModuleOptions {
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
     * Module topic identifier
     */
    moduleTopicId: string;
}

/**
 * Module analytics
 */
export interface ModuleAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
}

/**
 * Module
 */
export type Module = Message<ModuleOptions, ModuleAnalytics>;

/**
 * Module details
 */
export type ModuleDetails = Details<Module>;
