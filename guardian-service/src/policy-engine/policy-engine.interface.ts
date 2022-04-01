import { PolicyRole, UserRole } from 'interfaces';
import { IAuthUser } from '../auth/auth.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';

export interface IPolicyRoles {
    [policyId: string]: string;
}

export interface ISerializedBlock {
    blockType: string;
    defaultActive: boolean;
    tag?: string;
    permissions: string[];
    dependencies?: string[];
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

    serialize(): ISerializedBlock;

    updateBlock(state: any, user: IAuthUser, tag?: string): any;

    hasPermission(role: PolicyRole | null, user: IAuthUser | null);

    registerChild(child: IPolicyBlock): void;

    destroy();

    validate(resultsContainer: PolicyValidationResultsContainer);

    changeStep?: (user: IAuthUser, data: any, target: IPolicyBlock) => Promise<void>;

    runNext(user: IAuthUser, data: any);

    runTarget(user: IAuthUser, data: any, target: AnyBlockType)

    isChildActive(child: AnyBlockType, user: IAuthUser): boolean;

    isActive(user: IAuthUser): boolean;

    checkDataStateDiffer?: (user) => boolean
}

export interface IPolicyInterfaceBlock extends IPolicyBlock {
    setContent(content: string): void;

    setData(user: IAuthUser | null, data: any): Promise<any>;

    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;
}

export interface IPolicyContainerBlock extends IPolicyBlock {
    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;
}

export interface IPolicySourceBlock extends IPolicyBlock {
    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;

    getFiltersAddons(): IPolicyBlock[];

    getSources(user: IAuthUser): Promise<any[]>
}

export interface IPolicyAddonBlock extends IPolicyBlock {
    filters: { [key: string]: { [key: string]: string } };

    setData(user: IAuthUser | null, data: any): Promise<any>;

    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;

    getSources(user: IAuthUser): any;

    getFromSource(user: IAuthUser): any;

    getFilters(user: IAuthUser): { [key: string]: string };

    setFilters(filters: { [key: string]: string }, user: IAuthUser): void
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

export type AnyBlockType = IPolicyBlock | IPolicyInterfaceBlock | IPolicyContainerBlock | IPolicySourceBlock | IPolicyAddonBlock | IPolicyCalculateBlock | IPolicyCalculateAddon | IPolicyRequestBlock;
