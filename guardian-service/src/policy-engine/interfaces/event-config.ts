import { PolicyInputEventType, PolicyOutputEventType } from "./policy-event-type";

export interface EventConfig {
    output: PolicyOutputEventType
    input: PolicyInputEventType;
    target: string;
    source: string;
    disabled: boolean;
    actor: string;
}