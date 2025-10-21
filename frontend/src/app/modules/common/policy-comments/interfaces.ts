export interface ListItem {
    label: string;
    value: string;
    type: string;
    search?: string;
    roles?: string[];
}

export interface DiscussionItem {
    id: string;
    name: string;
    owner: string;
    targetId: string;
    historyIds: string[];
    system: string;
    count: number;
    parent?: string;
    documentId: string;
    field?: string;
    fieldName?: string;
    policyId: string;
    relationships?: string[];
    privacy?: string;
    roles?: string[];
    users?: string[];
    _count?: number;
    _unread?: number;
    _short?: string;
    _icon?: string;
    _users?: {
        icon: string,
        type: string,
        label: string
    }[];
    _hidden?: boolean;
}

export interface FieldItem {
    field: string;
    name: string;
}

export type TextItemType = 'all' | 'tag' | 'role' | 'user' | 'field' | 'text';

export interface TextItem {
    type: TextItemType,
    text: string;
    tag: string;
    label?: string;
    tooltip?: any;
}

export interface DiscussionGroup {
    name: string,
    collapsed: boolean,
    items: DiscussionItem[]
}

export interface LastRead {
    policyId: string;
    documentId: string;
    discussionId: string,
    count: number,
}

export const placeholderItems = [{
    type: 'left',
    size: 3
}, {
    type: 'left',
    size: 2
}, {
    type: 'right',
    size: 2
}, {
    type: 'left',
    size: 3
}, {
    type: 'right',
    size: 2
}, {
    type: 'right',
    size: 1
}, {
    type: 'left',
    size: 3
}, {
    type: 'left',
    size: 2
}, {
    type: 'right',
    size: 2
}]
