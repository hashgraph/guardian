import { TagItem } from './tag-item';


export interface TagMapItem {
    readonly name: string;
    readonly owner: boolean;
    readonly count: number;
    readonly items: TagItem[];
}
