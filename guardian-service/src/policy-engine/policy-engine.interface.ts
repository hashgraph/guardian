import { PolicyRole } from '@guardian/interfaces';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyInputEventType, PolicyOutputEventType } from './interfaces/policy-event-type';
import { EventConfig, IPolicyEvent } from './interfaces';

export interface IPolicyRoles {
    [policyId: string]: string;
}

export interface ISerializedBlock {
    blockType: string;
    defaultActive: boolean;
    tag?: string;
    permissions: string[];
    uuid?: string;
    children?: ISerializedBlock[];
}

export interface ISerializedBlockExtend extends ISerializedBlock {
    _parent?: IPolicyBlock;
}

export interface IPolicyBlock {
    parent?: AnyBlockType;
    children?: AnyBlockType[];
    blockType?: string;
    uuid?: string;
    tag?: string | null;
    commonBlock?: boolean;
    defaultActive?: boolean;
    options: any;
    blockClassName: string;
    policyId: string;
    policyOwner: string;
    policyInstance: any;

    readonly actions: any[];
    readonly outputActions: any[];
    readonly events: EventConfig[];

    readonly next: IPolicyBlock;

    getChild(uuid: string): IPolicyBlock;

    getChildIndex(uuid: string): number;

    getNextChild(uuid: string): IPolicyBlock;

    checkDataStateDiffer?: (user: IAuthUser) => boolean

    serialize(): ISerializedBlock;

    updateBlock(state: any, user: IAuthUser, tag?: string): any;

    hasPermission(role: PolicyRole | null, user: IAuthUser | null): any;

    registerChild(child: IPolicyBlock): void;

    destroy(): void;

    validate(resultsContainer: PolicyValidationResultsContainer): void;

    isChildActive(child: AnyBlockType, user: IAuthUser): boolean;

    isActive(user: IAuthUser): boolean;

    log(message: string): void;

    error(message: string): void;

    warn(message: string): void;

    triggerEvents(eventType: PolicyOutputEventType, user?: IAuthUser, data?: any): void;

    triggerEvent(event: any, user?: IAuthUser, data?: any): void;

    saveState(): Promise<void>;

    beforeInit(): Promise<void>;

    afterInit(): Promise<void>;

    addSourceLink(link: any): void;

    addTargetLink(link: any): void;

    runAction(event: IPolicyEvent<any>): Promise<any>;
}

export interface IPolicyInterfaceBlock extends IPolicyBlock {
    setContent(content: string): void;

    setData(user: IAuthUser | null, data: any): Promise<any>;

    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;

    updateDataState(user: IAuthUser, data: any): boolean;
}

export interface IPolicyContainerBlock extends IPolicyBlock {
    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;

    changeStep(user: IAuthUser, data: any, target: IPolicyBlock): Promise<void>;

    isLast(target: IPolicyBlock): boolean;

    isCyclic(): boolean;

    getLast(): IPolicyBlock;

    getFirst(): IPolicyBlock;
}

export interface IPolicySourceBlock extends IPolicyBlock {
    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;

    getChildFiltersAddons(): IPolicyBlock[];

    getFiltersAddons(): IPolicyBlock[];

    getSources(user: IAuthUser, globalFilters: any, paginationData: any): Promise<any[]>;

    getGlobalSources(user: IAuthUser, paginationData: any): Promise<any[]>;

    getCommonAddons(): IPolicyBlock[];
}

export interface IPolicyAddonBlock extends IPolicyBlock {
    filters: { [key: string]: { [key: string]: string } };

    setData(user: IAuthUser | null, data: any): Promise<any>;

    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;

    getSources(user: IAuthUser, globalFilters: any): any;

    getFromSource(user: IAuthUser, globalFilters: any): any;

    getFilters(user: IAuthUser): { [key: string]: string };

    setFilters(filters: { [key: string]: string }, user: IAuthUser): void

    getState(user: IAuthUser): any;
}


export interface IPolicyCalculateBlock extends IPolicyBlock {
    getAddons(): IPolicyCalculateAddon[];
}

export interface IPolicyCalculateAddon extends IPolicyBlock {
    run(scope: any): Promise<any>;

    getVariables(variables: any): any;

    evaluate(formula: string, scope: any): any;

    parse(formula: string): boolean;
}

export interface IPolicyReportBlock extends IPolicyBlock {
    getItems(): IPolicyReportItemBlock[];
}

export interface IPolicyReportItemBlock extends IPolicyBlock {
    run(fieldsResult: any[], mapVariables: any): Promise<any>;

    getItems(): IPolicyReportItemBlock[];
}

export interface IPolicyRequestBlock extends IPolicyBlock {
    getData(user: IAuthUser): Promise<any>;

    setData(user: IAuthUser, _data: any): Promise<any>;

    getSources(user: IAuthUser): Promise<any[]>
}

export type AnyBlockType =
    IPolicyBlock
    | IPolicyInterfaceBlock
    | IPolicyContainerBlock
    | IPolicySourceBlock
    | IPolicyAddonBlock
    | IPolicyCalculateBlock
    | IPolicyCalculateAddon
    | IPolicyRequestBlock;
