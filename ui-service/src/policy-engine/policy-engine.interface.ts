import {PolicyRole, UserRole} from 'interfaces';
import {IAuthUser} from '../auth/auth.interface';
import {ISerializedErrors, PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';

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
    parent?: IPolicyBlock;
    children?: IPolicyBlock[];
    blockType?: string;
    uuid?: string;
    tag?: string | null;
    commonBlock?: boolean;
    defaultActive?: boolean;
    options: any;
    blockClassName: string;

    serialize(): ISerializedBlock;

    updateBlock(state: any, user: IAuthUser, tag: string): any;

    hasPermission(role: PolicyRole | null, user: IAuthUser | null);

    registerChild(child: IPolicyBlock): void;

    registerSubscriptions(): void;

    destroy();

    validate(resultsContainer: PolicyValidationResultsContainer);

}

export interface IPolicyInterfaceBlock extends IPolicyBlock {
    setContent(content: string): void;

    setData(user: IAuthUser | null, data: any): Promise<any>;

    getData(user: IAuthUser | null, uuid: string, queryParams?: any): Promise<any>;
}
