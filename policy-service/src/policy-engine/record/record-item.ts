import { RecordAction } from "./action.type";
import { RecordMethod } from "./method.type";

export interface RecordItem {
    uuid?: string,
    policyId?: string,
    method?: RecordMethod,
    action?: RecordAction,
    time?: number,
    user?: string,
    target?: string,
    document?: any,
}