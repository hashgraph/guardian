import { PolicyInputEventType, PolicyOutputEventType } from './policy-event-type';

/**
 * Children type
 */
export enum ChildrenType {
    None = 'None',
    Special = 'Special',
    Any = 'Any',
}

/**
 * Control type
 */
export enum ControlType {
    UI = 'UI',
    Special = 'Special',
    Server = 'Server',
    None = 'None',
}

/**
 * Block about
 */
export interface BlockAbout {
    /**
     * Label
     */
    label: string;
    /**
     * Title
     */
    title: string;
    /**
     * Post
     */
    post: boolean;
    /**
     * Get
     */
    get: boolean;
    /**
     * Input event type
     */
    input?: PolicyInputEventType[];
    /**
     * Output event type
     */
    output?: PolicyOutputEventType[];
    /**
     * Children type
     */
    children: ChildrenType;
    /**
     * Control type
     */
    control: ControlType;
    /**
     * Default event
     */
    defaultEvent: boolean;
}
