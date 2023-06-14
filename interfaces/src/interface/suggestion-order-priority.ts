import { ConfigType } from '../type';

/**
 * Suggestion order priority
 */
export interface SuggestionOrderPriority {
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
