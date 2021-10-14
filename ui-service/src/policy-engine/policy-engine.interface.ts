import {UserRole} from 'interfaces';
import {IAuthUser} from '../auth/auth.interface';

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

    hasPermission(role: UserRole);

    registerChild(child: IPolicyBlock): void;

    registerSubscriptions(): void;

    destroy();
}

export interface IPolicyInterfaceBlock extends IPolicyBlock {
    setContent(content: string): void;

    setData(user: IAuthUser | null, data: any): Promise<any>;

    getData(user: IAuthUser | null, uuid: string): Promise<any>;
}
