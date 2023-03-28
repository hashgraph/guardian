import { TagOperation } from "./tag-operation";
import { TagStatus } from "./tag-status";

export interface TagItem {
    readonly uuid: string;
    readonly name: string;
    readonly description: string;
    readonly entity: string;
    readonly target: string;
    readonly owner: string;
    readonly status: TagStatus;
    readonly operation: TagOperation;
    readonly messageId: string;
}