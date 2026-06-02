import { TagOperation } from "./tag-operation";
import { TagStatus } from "./tag-status";

export interface TagItem {
    readonly uuid: string;
    readonly name: string;
    readonly description: string;
    readonly entity: string;
    readonly target: string;
    readonly targets: string[];
    readonly localTarget: string;
    readonly owner: string;
    readonly status: TagStatus;
    readonly operation: TagOperation;
    readonly messageId: string;
    readonly topicId: string;
    readonly document: any;
    readonly uri: string;
    readonly date: string;
    open?: boolean;
}