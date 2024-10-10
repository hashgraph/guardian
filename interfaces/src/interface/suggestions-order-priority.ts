import { ConfigType } from '../type/index.js';

/**
 * Suggestions order priority
 */
export interface SuggestionsOrderPriority {
    /**
     * Identifier
     */
    id: string;
    /**
     * Config type
     */
    type: ConfigType;
    /**
     * Index
     */
    index: number;
}
