import { EventActor, PolicyInputEventType, PolicyOutputEventType } from './policy-event-type';

/**
 * Event config
 */
export interface EventConfig {
    /**
     * Output event
     */
    output: PolicyOutputEventType;
    /**
     * Input event
     */
    input: PolicyInputEventType;
    /**
     * Event target
     */
    target: string;
    /**
     * Event source
     */
    source: string;
    /**
     * Is disabled
     */
    disabled: boolean;
    /**
     * Event actor
     */
    actor: EventActor;
}
