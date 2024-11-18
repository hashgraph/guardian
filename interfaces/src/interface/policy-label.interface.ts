import { IStatisticConfig } from "./statistic.interface";

export enum NavItemType {
    Group = 'group',
    Rules = 'rules',
    Label = 'label',
    Statistic = 'statistic',
}

export interface IGroupItemConfig {
    id: string;
    type: NavItemType.Group;
    name: string;
    description?: string;
    owner?: string;
    children?: INavItemConfig[];
}

export interface ILabelItemConfig {
    id: string;
    type: NavItemType.Label;
    name: string;
    description?: string;
    owner?: string;
    messageId?: string;
    config?: IPolicyLabelConfig;
}

export interface IRulesItemConfig {
    id: string;
    type: NavItemType.Rules;
    name: string;
    description?: string;
    owner?: string;
    config?: IStatisticConfig;
}

export interface IStatisticItemConfig {
    id: string;
    type: NavItemType.Statistic;
    name: string;
    description?: string;
    messageId?: string;
    owner?: string;
    config?: IStatisticConfig;
}

export type INavItemConfig = IGroupItemConfig | IRulesItemConfig | ILabelItemConfig | IStatisticItemConfig;

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