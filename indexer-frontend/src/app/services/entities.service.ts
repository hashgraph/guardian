import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api';
import { ApiUtils } from './utils';
import {
    Contract,
    ContractDetails,
    DID,
    DIDDetails,
    ISchema,
    SchemaTree,
    Module,
    ModuleDetails,
    NFT,
    NFTDetails,
    Page,
    PageFilters,
    Policy,
    PolicyDetails,
    Registry,
    RegistryDetails,
    RegistryUser,
    RegistryUserDetails,
    Role,
    RoleDetails,
    SchemaDetails,
    Token,
    TokenDetails,
    Tool,
    ToolDetails,
    Topic,
    TopicDetails,
    VC,
    VCDetails,
    VP,
    VPDetails,
    Relationships,
    Statistic,
    StatisticDetails,
    Label,
    LabelDetails,
    Formula,
    FormulaDetails,
    FormulaRelationships,
} from '@indexer/interfaces';

/**
 * Services for working from entities.
 */
@Injectable()
export class EntitiesService {
    private readonly url: string = `${API_BASE_URL}/entities`;

    constructor(private http: HttpClient) { }

    public loadFile(cid: string): Observable<string> {
        return this.http.get(`${this.url}/ipfs/${cid}`, { responseType: 'text' });
    }

    //#region ACCOUNTS
    //#region REGISTRIES
    public getRegistries(filters: PageFilters): Observable<Page<Registry>> {
        const entity = 'registries';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Registry>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getRegistry(messageId: string): Observable<RegistryDetails> {
        const entity = 'registries';
        return this.http.get<RegistryDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getRegistryRelationships(messageId: string): Observable<Relationships> {
        const entity = 'registries';
        return this.http.get<Relationships>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#region REGISTRY USERS
    public getRegistryUsers(
        filters: PageFilters
    ): Observable<Page<RegistryUser>> {
        const entity = 'registry-users';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<RegistryUser>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getRegistryUser(messageId: string): Observable<RegistryUserDetails> {
        const entity = 'registry-users';
        return this.http.get<RegistryUserDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }
    //#endregion
    //#endregion

    //#region METHODOLOGIES
    //#region POLICIES
    public getPolicies(filters: PageFilters): Observable<Page<Policy>> {
        const entity = 'policies';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Policy>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getPolicy(messageId: string): Observable<PolicyDetails> {
        const entity = 'policies';
        return this.http.get<PolicyDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getPolicyRelationships(messageId: string): Observable<Relationships> {
        const entity = 'policies';
        return this.http.get<Relationships>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#region MODULES
    public getModules(filters: PageFilters): Observable<Page<Module>> {
        const entity = 'modules';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Module>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getModule(messageId: string): Observable<ModuleDetails> {
        const entity = 'modules';
        return this.http.get<ModuleDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }
    //#endregion
    //#region TOOLS
    public getTools(filters: PageFilters): Observable<Page<Tool>> {
        const entity = 'tools';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Tool>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getTool(messageId: string): Observable<ToolDetails> {
        const entity = 'tools';
        return this.http.get<ToolDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }
    //#endregion
    //#region SCHEMAS
    public getSchemas(filters: PageFilters): Observable<Page<ISchema>> {
        const entity = 'schemas';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<ISchema>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getSchema(messageId: string): Observable<SchemaDetails> {
        const entity = 'schemas';
        return this.http.get<SchemaDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getSchemaTree(messageId: string): Observable<SchemaTree> {
        const entity = 'schemas';
        return this.http.get<SchemaTree>(
            `${this.url}/${entity}/${messageId}/tree`
        ) as any;
    }

    public getSchemasPackages(filters: PageFilters): Observable<Page<ISchema>> {
        const entity = 'schemas-packages';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<ISchema>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getSchemasPackage(messageId: string): Observable<SchemaDetails> {
        const entity = 'schemas-packages';
        return this.http.get<SchemaDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }
    //#endregion
    //#region TOKENS
    public getTokens(filters: PageFilters): Observable<Page<Token>> {
        const entity = 'tokens';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Token>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getToken(messageId: string): Observable<TokenDetails> {
        const entity = 'tokens';
        return this.http.get<any>(`${this.url}/${entity}/${messageId}`) as any;
    }
    //#endregion
    //#region ROLES
    public getRoles(filters: PageFilters): Observable<Page<Role>> {
        const entity = 'roles';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Role>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getRole(messageId: string): Observable<RoleDetails> {
        const entity = 'roles';
        return this.http.get<RoleDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }
    //#endregion
    //#endregion

    //#region DOCUMENTS
    //#region DIDS
    public getDidDocuments(filters: PageFilters): Observable<Page<DID>> {
        const entity = 'did-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<DID>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getDidDocument(messageId: string): Observable<DIDDetails> {
        const entity = 'did-documents';
        return this.http.get<DIDDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getDidRelationships(messageId: string): Observable<Relationships> {
        const entity = 'did-documents';
        return this.http.get<Relationships>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#region VPS
    public getVpDocuments(filters: PageFilters): Observable<Page<VP>> {
        const entity = 'vp-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<VP>>(`${this.url}/${entity}`, options) as any;
    }

    public getVpDocument(messageId: string): Observable<VPDetails> {
        const entity = 'vp-documents';
        return this.http.get<VPDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getVpRelationships(messageId: string): Observable<Relationships> {
        const entity = 'vp-documents';
        return this.http.get<Relationships>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion
    //#region VCS
    public getVcDocuments(filters: PageFilters): Observable<Page<VC>> {
        const entity = 'vc-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<VC>>(`${this.url}/${entity}`, options) as any;
    }

    public getVcDocument(messageId: string): Observable<VCDetails> {
        const entity = 'vc-documents';
        return this.http.get<VCDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getVcRelationships(messageId: string): Observable<Relationships> {
        const entity = 'vc-documents';
        return this.http.get<Relationships>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }

    public getVcDiscussions(messageId: string): Observable<any> {
        const entity = 'vc-documents';
        return this.http.get<any>(
            `${this.url}/${entity}/${messageId}/discussions`
        ) as any;
    }

    public getVcComments(
        messageId: string,
        discussionId: string,
        filters: PageFilters
    ): Observable<any> {
        const options = ApiUtils.getOptions(filters);
        const entity = 'vc-documents';
        return this.http.get<any>(
            `${this.url}/${entity}/${messageId}/discussions/${discussionId}/comments`,
            options
        ) as any;
    }
    //#endregion
    //#endregion

    //#region OTHERS
    //#region NFTS
    public getNFTs(filters: PageFilters): Observable<Page<NFT>> {
        const entity = 'nfts';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<NFT>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getNFT(
        tokenId: string,
        serialNubmer: string
    ): Observable<NFTDetails> {
        const entity = 'nfts';
        return this.http.get<NFTDetails>(
            `${this.url}/${entity}/${tokenId}/${serialNubmer}`
        ) as any;
    }
    //#endregion
    //#region TOPICS
    public getTopics(filters: PageFilters): Observable<Page<Topic>> {
        const entity = 'topics';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Topic>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }
    public getTopic(topicId: string): Observable<TopicDetails> {
        const entity = 'topics';
        return this.http.get<TopicDetails>(
            `${this.url}/${entity}/${topicId}`
        ) as any;
    }
    //#endregion
    //#region CONTRACTS
    public getContracts(filters: PageFilters): Observable<Page<Contract>> {
        const entity = 'contracts';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Contract>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getContract(messageId: string): Observable<ContractDetails> {
        const entity = 'contracts';
        return this.http.get<ContractDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }
    //#endregion
    //#region LABELS
    public getLabels(filters: PageFilters): Observable<Page<Label>> {
        const entity = 'labels';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Label>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getLabel(messageId: string): Observable<LabelDetails> {
        const entity = 'labels';
        return this.http.get<LabelDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getLabelDocuments(filters: PageFilters): Observable<Page<VP>> {
        const entity = 'label-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<VP>>(`${this.url}/${entity}`, options) as any;
    }

    public getLabelDocument(messageId: string): Observable<VPDetails> {
        const entity = 'label-documents';
        return this.http.get<VPDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    //#endregion
    //#region STATISTICS
    public getStatistics(filters: PageFilters): Observable<Page<Statistic>> {
        const entity = 'statistics';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Statistic>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getStatistic(messageId: string): Observable<StatisticDetails> {
        const entity = 'statistics';
        return this.http.get<StatisticDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getStatisticDocuments(filters: PageFilters): Observable<Page<VC>> {
        const entity = 'statistic-documents';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<VC>>(`${this.url}/${entity}`, options) as any;
    }
    //#endregion
    //#endregion

    //#region FORMULAS
    public getFormulas(filters: PageFilters): Observable<Page<Formula>> {
        const entity = 'formulas';
        const options = ApiUtils.getOptions(filters);
        return this.http.get<Page<Formula>>(
            `${this.url}/${entity}`,
            options
        ) as any;
    }

    public getFormula(messageId: string): Observable<FormulaDetails> {
        const entity = 'formulas';
        return this.http.get<FormulaDetails>(
            `${this.url}/${entity}/${messageId}`
        ) as any;
    }

    public getFormulaRelationships(messageId: string): Observable<FormulaRelationships> {
        const entity = 'formulas';
        return this.http.get<FormulaRelationships>(
            `${this.url}/${entity}/${messageId}/relationships`
        ) as any;
    }
    //#endregion

    public updateFiles<T>(messageId: string): Observable<T> {
        return this.http.post<T>(`${this.url}/update-files`, {
            messageId
        }) as any;
    }

    public unpackSchemas<T>(messageId: string): Observable<T> {
        return this.http.post<T>(`${this.url}/unpack-schemas`, {
            messageId
        }) as any;
    }
}
