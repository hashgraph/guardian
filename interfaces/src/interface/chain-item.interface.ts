import { IconType, IVCDocument, IVPDocument } from '..';

/**
 * Chain item interface
 */
export interface IChainItem {
    /**
     * Item type
     */
    type: 'VP' | 'VC' | 'DID';
    /**
     * Item id
     */
    id: string;
    /**
     * Item document instance
     */
    document: any;
    /**
     * Item owner
     */
    owner: string;
    /**
     * Item schema
     */
    schema: string;
    /**
     * Item label
     */
    label: string;
    /**
     * Item tag
     */
    tag: string;
    /**
     * Item entity
     */
    entity: string;
}

/**
 * VP report interface
 */
export interface IVPReport {
    /**
     * Report type
     */
    type: string;
    /**
     * Report title
     */
    title: string;
    /**
     * Report tag
     */
    tag: string;
    /**
     * Report hash
     */
    hash: string;
    /**
     * Report issuer
     */
    issuer: string;
    /**
     * Report username
     */
    username: string;
    /**
     * Report document instance
     */
    document: IVPDocument;
}

/**
 * VC report interface
 */
export interface IVCReport {
    /**
     * Report type
     */
    type: string;
    /**
     * Report title
     */
    title: string;
    /**
     * Report tag
     */
    tag: string;
    /**
     * Report hash
     */
    hash: string;
    /**
     * Report issuer
     */
    issuer: string;
    /**
     * Report username
     */
    username: string;
    /**
     * Report document instance
     */
    document: IVCDocument;
}

/**
 * Token report interface
 */
export interface ITokenReport {
    /**
     * Token type
     */
    type: string;
    /**
     * Token ID
     */
    tokenId: string;
    /**
     * Report date
     */
    date: string;
    /**
     * Report tag
     */
    tag: string;
    /**
     * Report issuer
     */
    issuer: string;
    /**
     * Report username
     */
    username: string;
    /**
     * Report document instance
     */
    document: IVCDocument;
}

/**
 * Policy report interface
 */
export interface IPolicyReport {
    /**
     * Report type
     */
    type: string;
    /**
     * Report name
     */
    name: string;
    /**
     * Report description
     */
    description: string;
    /**
     * Report version
     */
    version: string;
    /**
     * Report tag
     */
    tag: string;
    /**
     * Report issuer
     */
    issuer: string;
    /**
     * Report username
     */
    username: string;
    /**
     * Report document instance
     */
    document: IVCDocument;
}

/**
 * Report item interface
 */
export interface IReportItem {
    /**
     * Item type
     */
    type: string;
    /**
     * Item icon
     */
    icon?: string;
    /**
     * Item title
     */
    title: string;
    /**
     * Item description
     */
    description: string;
    /**
     * Item tag
     */
    tag: string;
    /**
     * Item issuer
     */
    issuer: string;
    /**
     * Item username
     */
    username: string;
    /**
     * Item VC document instance
     */
    document: IVCDocument;
    /**
     * Item child instances
     */
    documents?: IReportItem[];
    /**
     * Is item visible
     */
    visible: boolean,
    /**
     * Item icon type
     */
    iconType?: IconType
}

/**
 * Report interface
 */
export interface IReport {
    /**
     * VP document instance
     */
    vpDocument?: IVPReport;
    /**
     * VC document instance
     */
    vcDocument?: IVCReport;
    /**
     * Mint document instance
     */
    mintDocument?: ITokenReport;
    /**
     * Policy document instance
     */
    policyDocument?: IPolicyReport;
    /**
     * Policy creator document report item
     */
    policyCreatorDocument?: IReportItem;
    /**
     * Report items
     */
    documents?: IReportItem[];
}
