import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import {
    IDetailsResults,
    IGridFilters,
    IGridResults,
    IRelationshipsResults,
} from './types';
import { ISchemaTreeResult } from '@indexer/interfaces';

/**
 * Services for working from entities.
 */
@Injectable()
export class EntitiesService {
    private readonly url: string = `${API_BASE_URL}/entities`;

    constructor(private http: HttpClient) {}

    //#region ACCOUNTS
    //#region REGISTRIES
    public getRegistries(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'registries';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getRegistry(messageId: string): Observable<IDetailsResults> {
        const entity = 'registries';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#region REGISTRY USERS
    public getRegistryUsers(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'registry-users';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getRegistryUser(messageId: string): Observable<IDetailsResults> {
        const entity = 'registry-users';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#endregion

    //#region METHODOLOGIES
    //#region POLICIES
    public getPolicies(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'policies';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getPolicy(messageId: string): Observable<IDetailsResults> {
        const entity = 'policies';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#region MODULES
    public getModules(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'modules';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getModule(messageId: string): Observable<IDetailsResults> {
        const entity = 'modules';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#region TOOLS
    public getTools(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'tools';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getTool(messageId: string): Observable<IDetailsResults> {
        const entity = 'tools';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#region SCHEMAS
    public getSchemas(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'schemas';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getSchema(messageId: string): Observable<IDetailsResults> {
        const entity = 'schemas';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }

    public getSchemaTree(messageId: string): Observable<ISchemaTreeResult> {
        const entity = 'schemas';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}/tree`) as any;
    }
    //#endregion
    //#region TOKENS
    public getTokens(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'tokens';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getToken(messageId: string): Observable<IDetailsResults> {
        const entity = 'tokens';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#region ROLES
    public getRoles(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'roles';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getRole(messageId: string): Observable<IDetailsResults> {
        const entity = 'roles';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#endregion

    //#region DOCUMENTS
    //#region DIDS
    public getDidDocuments(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'did-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getDidDocument(messageId: string): Observable<IDetailsResults> {
        const entity = 'did-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }

    public getDidRelationships(
        messageId: string
    ): Observable<IRelationshipsResults> {
        const entity = 'did-documents';
        return this.http.get<any>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#region VPS
    public getVpDocuments(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'vp-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getVpDocument(messageId: string): Observable<IDetailsResults> {
        const entity = 'vp-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }

    public getVpRelationships(
        messageId: string
    ): Observable<IRelationshipsResults> {
        const entity = 'vp-documents';
        return this.http.get<any>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#region VCS
    public getVcDocuments(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'vc-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getVcDocument(messageId: string): Observable<IDetailsResults> {
        const entity = 'vc-documents';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }

    public getVcRelationships(
        messageId: string
    ): Observable<IRelationshipsResults> {
        const entity = 'vc-documents';
        return this.http.get<any>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#endregion

    //#region OTHERS
    //#region NFTS
    public getNFTs(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'nfts';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getNFT(
        tokenId: string,
        serialNubmer: string
    ): Observable<IDetailsResults> {
        const entity = 'nfts';
        return this.http.get<any>(
            `${this.url}/${entity}/${tokenId}/${serialNubmer}`
        ) as any;
    }
    //#endregion
    //#region TOPICS
    public getTopics(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'topics';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }
    public getTopic(topicId: string): Observable<IDetailsResults> {
        const entity = 'topics';
        return this.http.get<any>(`${this.url}/${entity}/${topicId}`) as any;
    }
    //#endregion
    //#region CONTRACTS
    public getContracts(filters: IGridFilters): Observable<IGridResults> {
        const entity = 'contracts';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<any>(`${this.url}/${entity}`, options) as any;
    }

    public getContract(messageId: string): Observable<IDetailsResults> {
        const entity = 'contracts';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#endregion
}
