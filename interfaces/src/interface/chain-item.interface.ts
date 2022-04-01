import { IconType, IVCDocument, IVPDocument } from "..";

export interface IChainItem {
    type: 'VP' | 'VC' | 'DID';
    id: string;
    document: any;
    owner: string;
    schema: string;
    label: string;
    tag: string;
    entity: string;
}

export interface IVPReport {
    type: string;
    title: string;
    tag: string;
    hash: string;
    issuer: string;
    username: string;
    document: IVPDocument;
}

export interface IVCReport {
    type: string;
    title: string;
    tag: string;
    hash: string;
    issuer: string;
    username: string;
    document: IVCDocument;
}

export interface ITokenReport {
    type: string;
    tokenId: string;
    date: string;
    tag: string;
    issuer: string;
    username: string;
    document: IVCDocument;
}

export interface IPolicyReport {
    type: string;
    name: string;
    description: string;
    version: string;
    tag: string;
    issuer: string;
    username: string;
    document: IVCDocument;
}

export interface IReportItem {
    type: string;
    icon?: string;
    title: string;
    description: string;
    tag: string;
    issuer: string;
    username: string;
    document: IVCDocument;
    documents?: IReportItem[];
    visible: boolean,
    iconType?: IconType
}

export interface IReport {
    vpDocument?: IVPReport;
    vcDocument?: IVCReport;
    mintDocument?: ITokenReport;
    policyDocument?: IPolicyReport;
    policyCreatorDocument?: IReportItem;
    documents?: IReportItem[];
}