import { TagItem } from './tag-item';


export interface TagMapItem {
    readonly name: string;
    readonly owner: string;
    readonly count: number;
    readonly items: TagItem[];
}
