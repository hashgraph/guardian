import { IStatisticConfig } from './statistic.js';

export enum NavItemType {
    Group = 'group',
    Rules = 'rules',
    Label = 'label',
    Statistic = 'statistic',
}

export enum GroupType {
    One = 'one',
    Every = 'every',
}

//children
export interface IItemConfig {
    id: string;
    tag?: string;
    title?: string;
    name?: string;
    description?: string;
    owner?: string;
    schemaId?:string;
}

export interface IGroupItemConfig extends IItemConfig {
    type: NavItemType.Group;
    rule?: GroupType;
    children?: INavItemConfig[];
}

export interface ILabelItemConfig extends IItemConfig {
    type: NavItemType.Label;
    messageId?: string;
    config?: IPolicyLabelConfig;
}

export interface IRulesItemConfig extends IItemConfig {
    type: NavItemType.Rules;
    config?: IStatisticConfig;
}

export interface IStatisticItemConfig extends IItemConfig {
    type: NavItemType.Statistic;
    messageId?: string;
    config?: IStatisticConfig;
}

export type INavItemConfig = IGroupItemConfig | IRulesItemConfig | ILabelItemConfig | IStatisticItemConfig;

//imports
export interface INavStatisticImportConfig {
    id: string;
    type: NavItemType.Statistic;
    name?: string;
    description?: string;
    messageId?: string;
    owner?: string;
    config?: IStatisticConfig;
}

export interface INavLabelImportConfig {
    id: string;
    type: NavItemType.Label;
    name?: string;
    description?: string;
    messageId?: string;
    owner?: string;
    config?: IPolicyLabelConfig;
}

export type INavImportsConfig = INavStatisticImportConfig | INavLabelImportConfig

export interface IPolicyLabelConfig {
    schemaId?:string;
    imports?: INavImportsConfig[];
    children?: INavItemConfig[];
}

export interface IPolicyLabel {
    id?: string;
    name?: string;
    description?: string;
    instanceTopicId?: string;
    policyId?: string;
    messageId?: string;
    owner?: string;
    status?: string;
    config?: IPolicyLabelConfig;
}