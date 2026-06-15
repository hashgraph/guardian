import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import { Page, PageFilters, Policy } from '@indexer/interfaces';

/** Aggregate token issuance per individual token within a project */
export interface ProjectTokenIssuance {
    tokenId: string;
    tokenName: string;
    totalMinted: number;
    mintEventCount: number;
    lastMintTimestamp?: string;
}

/** Aggregate mint data per policy project */
export interface ProjectTonnage {
    policyId: string;
    policyName?: string;
    owner?: string;
    totalMinted: number;
    mintEventCount: number;
    tokens: ProjectTokenIssuance[];
    coordinates?: string;
    topicId?: string;
}

export interface ProjectTonnagePage {
    items: ProjectTonnage[];
    total: number;
    pageIndex: number;
    pageSize: number;
}

/** A single node in a VC relationship tree */
export interface VcTreeNode {
    messageId: string;
    type: string;
    schemaName?: string;
    schemaId?: string;
    issuer?: string;
    policyId?: string;
    topicId?: string;
    consensusTimestamp?: string;
    tokenAmount?: number;
    tokenId?: string;
    children: VcTreeNode[];
}

export interface VcTree {
    rootId: string;
    depth: number;
    nodeCount: number;
    root: VcTreeNode;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private readonly url = `${API_BASE_URL}/analytics`;

    constructor(private http: HttpClient) {}

    public comparePolicyOriginal(messageId: string, options: any): Observable<any> {
        return this.http.post<any>(`${this.url}/compare/policy/original/${messageId}`, options);
    }

    public getDerivations(messageId: string, filters: PageFilters) {
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Policy>>(`${this.url}/derivations/${messageId}`, options) as any;
    }

    /**
     * Get project tonnage — aggregate Mint Token data per policy project.
     * Supports filtering by policyId, owner, topicId, minMinted and pagination.
     * Addresses #4509: project/tonnage API for eCommerce consumers.
     */
    public getProjects(filters: {
        pageIndex?: number;
        pageSize?: number;
        orderField?: string;
        orderDir?: string;
        policyId?: string;
        owner?: string;
        topicId?: string;
        minMinted?: number;
    } = {}): Observable<ProjectTonnagePage> {
        const options = ApiUtils.getOptions(filters as any);
        return this.http.get<ProjectTonnagePage>(`${this.url}/projects`, options);
    }

    /**
     * Get VC document relationship tree rooted at the given message ID.
     * Addresses #4509: Tree API for consumer eCommerce transactions.
     */
    public getVcTree(messageId: string, maxDepth: number = 10): Observable<VcTree> {
        const options = ApiUtils.getOptions({ maxDepth } as any);
        return this.http.get<VcTree>(`${this.url}/vc-tree/${messageId}`, options);
    }
}
