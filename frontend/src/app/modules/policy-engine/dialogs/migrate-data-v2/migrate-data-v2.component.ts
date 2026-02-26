import { ChangeDetectorRef, Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
    MigrationRunStatusItem,
    MigrationRunSummary,
    MigrationSummaryItem,
    PolicyStatus
} from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaService } from 'src/app/services/schema.service';
import { JsonEditorDialogComponent } from '../json-editor-dialog/json-editor-dialog.component';

export interface MigrationActionResult {
    action: 'start' | 'resume' | 'retryFailed';
    migrationConfig?: any;
    runId?: string;
}

type DocumentType = 'VC' | 'VP';
type SummaryMetric = keyof Pick<MigrationSummaryItem, 'total' | 'success' | 'failed'>;

interface MigrationDocumentItem {
    id: string;
    owner?: string;
    schema?: string;
    selected?: boolean;
    document?: {
        credentialSubject?: any[];
    };
}

interface PageEvent {
    page?: number;
    rows?: number;
}

function findAllEntities(
    obj: { [key: string]: any },
    names: string[]
): string[] {
    const result: any[] = [];

    const finder = (o: { [key: string]: any }): void => {
        if (!o) {
            return;
        }

        for (const name of names) {
            if (o.hasOwnProperty(name)) {
                result.push(o[name]);
            }
        }

        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child);
            }
        }
    };
    finder(obj);

    const map: any = {};
    for (const item of result) {
        map[item] = item;
    }
    return Object.values(map);
}

class MigrationConfig {
    private readonly _systemSchemas = [
        '#ActivityImpact',
        '#TokenDataSource',
        '#Chunk',
        '#Issuer',
        '#PolicyIssuer',
        '#WipeToken',
        '#StandardRegistry',
        '#Policy',
        '#Token',
        '#Retire',
        '#MintNFToken',
        '#MintToken',
        '#IntegrationDataV2',
        '#UserRole',
    ];

    private _vcs: { id: string; schema?: string }[] = [];
    private _vps: string[] = [];
    private _schemas: { [key: string]: string | undefined } = {};
    private _groups: { [key: string]: string | undefined } = {};
    private _roles: { [key: string]: string | undefined } = {};
    private _blocks: { [key: string]: string | undefined } = {};
    private _tokens: { [key: string]: string | undefined } = {};
    private _tokensMap: { [key: string]: string | undefined } = {};
    private _editedVCs: { [key: string]: string | undefined } = {};

    public migrateState = false;
    public migrateRetirePools: boolean = false;
    public retireContractId: string = '';

    private _policiesValidity: boolean = false;
    private _vcsValidity: boolean = false;
    private _schemasValidity: boolean = true;

    constructor(
        private _src?: string,
        private _dst?: string
    ) { }

    updatePolicyValidity() {
        this._policiesValidity = !!this._src && !!this._dst;
    }

    updateVcValidity() {
        this._vcsValidity = this._vps.length > 0 || this._vcs.length > 0;
    }

    updateSchemasValidity() {
        this._schemasValidity = Object.values(this._schemas).every(
            (val) => !!val
        );
    }

    setSchema(key: string, value: string) {
        this._schemas[key] = value;
        this.updateSchemasValidity();
    }

    clearSchemas() {
        this._schemas = {};
        this.updateSchemasValidity();
    }

    clearBlocks() {
        this._blocks = {};
    }

    clearEditedVCs() {
        this._editedVCs = {};
    }

    setRole(key: string, value?: string) {
        this._roles[key] = value;
    }

    setGroup(key: string, value?: string) {
        this._groups[key] = value;
    }

    setToken(key: string, value?: string) {
        this._tokens[key] = value;
    }

    setTokenMap(key: string, value?: string) {
        this._tokensMap[key] = value;
    }

    clearRoles() {
        this._roles = {};
    }

    clearGroups() {
        this._groups = {};
    }

    clearTokens() {
        this._tokens = {};
    }

    clearTokensMap() {
        this._tokensMap = {};
    }

    clearVCs() {
        this._vcs = [];
        this.clearEditedVCs();
        this.updateVcValidity();
        this.clearSchemas();
    }

    clearVPs() {
        this._vps = [];
        this.updateVcValidity();
    }

    get src() {
        return this._src;
    }

    set src(value: string | undefined) {
        this._src = value;
        this.updatePolicyValidity();
    }

    get dst() {
        return this._dst;
    }

    set dst(value: string | undefined) {
        this._dst = value;
        this.updatePolicyValidity();
    }

    get vcs() {
        return this._vcs;
    }

    get vps() {
        return this._vps;
    }

    get schemas() {
        return this._schemas;
    }

    get blocks() {
        return this._blocks;
    }

    get editedVCs() {
        return this._editedVCs;
    }

    get roles() {
        return this._roles;
    }

    get groups() {
        return this._groups;
    }

    get tokens() {
        return this._tokens;
    }

    get tokensMap() {
        return this._tokensMap;
    }

    get policiesValidity() {
        return this._policiesValidity;
    }

    get vcsValidity() {
        return this._vcsValidity;
    }

    get schemasValidity() {
        return this._schemasValidity;
    }

    get value() {
        return {
            policies: {
                src: this._src,
                dst: this._dst,
            },
            vcs: this._vcs.map((_vc) => _vc.id),
            vps: this._vps,
            schemas: this._schemas,
            groups: this._groups,
            roles: this._roles,
            migrateState: this.migrateState,
            editedVCs: this.editedVCs,
            blocks: this._blocks,
            tokens: this._tokens,
            tokensMap: this._tokensMap,
            migrateRetirePools: this.migrateRetirePools,
            retireContractId: this.retireContractId,
        };
    }

    ifSystem(iri: string): boolean {
        if (!iri) {
            return false;
        }
        for (const systemIRI of this._systemSchemas) {
            if (iri.startsWith(systemIRI)) {
                return true;
            }
        }
        return false;
    }

    addVC(vc: { id: string; schema?: string }) {
        this._vcs.push({
            id: vc.id,
            schema: vc.schema,
        });
        this.updateVcValidity();
        if (
            !!vc.schema &&
            !this.ifSystem(vc.schema) &&
            !this._schemas.hasOwnProperty(vc.schema)
        ) {
            this._schemas[vc.schema] = undefined;
        }
        this.updateSchemasValidity();
    }

    removeVC(vc: any) {
        this._vcs = this._vcs.filter((_vc) => _vc.id !== vc.id);
        this.updateVcValidity();
        Object.keys(this._schemas)
            .filter(
                (key) => this._vcs.findIndex((_vc) => _vc.schema === key) < 0
            )
            .forEach((key) => {
                delete this._schemas[key];
            });
        this.updateSchemasValidity();
    }

    addVP(vp: any) {
        this._vps.push(vp.id);
        this.updateVcValidity();
    }

    removeVP(vp: any) {
        this._vps = this._vps.filter((_vp) => _vp !== vp.id);
        this.updateVcValidity();
    }
}

@Component({
    selector: 'migrate-data-v2',
    templateUrl: './migrate-data-v2.component.html',
    styleUrls: ['./migrate-data-v2.component.scss'],
})
export class MigrateDataV2 {
    loading = false;
    loadings = {
        vps: false,
        vcs: false,
        schemas: false,
        blocks: false,
    };

    migrationConfig: MigrationConfig;

    contracts: any[];
    policies: any[];
    pList1: any[];
    pList2: any[];
    uploadedPolicy: any;

    activeIndex: number = 0;
    items: MenuItem[] = [
        {
            id: 'policies',
            label: 'Policies',
        },
        {
            id: 'vps',
            label: 'VP Documents',
        },
        {
            id: 'vcs',
            label: 'VC Documents',
        },
        {
            id: 'schemas',
            label: 'Schemas',
        },
        {
            id: 'roles',
            label: 'Roles',
        },
        {
            id: 'groups',
            label: 'Groups',
        },
        {
            id: 'tokens',
            label: 'Tokens',
        },
    ];

    vps: MigrationDocumentItem[] = [];
    allVPsSelected: boolean = false;
    pageIndexVP: number = 0;
    pageSizeVP: number = 5;
    totalVPs!: number;

    vcs: MigrationDocumentItem[] = [];
    allVCsSelected: boolean = false;
    pageIndexVC: number = 0;
    pageSizeVC: number = 5;
    totalVCs!: number;

    srcRoles: string[] = [];
    dstRoles: string[] = [];
    roleKeys: string[] = [];
    pagedRoleKeys: string[] = [];
    pageIndexRoles: number = 0;
    pageSizeRoles: number = 5;
    totalRoles: number = 0;

    srcSchemas: any[] = [];
    dstSchemas: any[] = [];
    schemaIds: string[] = [];
    pagedSchemaIds: string[] = [];
    pageIndexSchemas: number = 0;
    pageSizeSchemas: number = 5;
    totalSchemas: number = 0;

    srcBlocks: any[] = [];
    dstBlocks: any[] = [];
    private srcBlockNameById: { [id: string]: string } = {};
    private dstBlockNameById: { [id: string]: string } = {};
    blockIds: string[] = [];
    pagedBlockIds: string[] = [];
    pageIndexBlocks: number = 0;
    pageSizeBlocks: number = 5;
    totalBlocks: number = 0;

    srcGroups: string[] = [];
    dstGroups: string[] = [];
    groupKeys: string[] = [];
    pagedGroupKeys: string[] = [];
    pageIndexGroups: number = 0;
    pageSizeGroups: number = 5;
    totalGroups: number = 0;

    srcTokens: string[] = [];
    dstTokens: string[] = [];
    tokenKeys: string[] = [];
    pagedTokenKeys: string[] = [];
    pageIndexTokens: number = 0;
    pageSizeTokens: number = 5;
    totalTokens: number = 0;

    dstTokenMap: string[] = [];

    showMigrateRetirePools = false;
    activeTabIndex = 0;
    historyLoading = false;
    historyItems: MigrationRunStatusItem[] = [];
    historyPageIndex = 0;
    historyPageSize = 10;
    historyTotal = 0;
    pairProgressWarning = '';
    pairHistoryWarning = '';
    runningMigrationWarning = '';
    private hasRunningMigration = false;
    readonly rowsPerPageOptions = [5, 10, 25, 50, 100];
    private readonly runningStatus = 'running';
    private readonly historyRunningLimit = 100;
    private readonly zeroPercent = '0%';
    private readonly stepsWithBottomLayout = new Set([
        'vps',
        'vcs',
        'schemas',
        'roles',
        'groups',
        'tokens',
        'blocks',
    ]);

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private _changeDetector: ChangeDetectorRef,
        private _policyEngineService: PolicyEngineService,
        private _schemaService: SchemaService,
        private _dialogService: DialogService
    ) {
        this.migrationConfig = new MigrationConfig();
        this.contracts = this.config.data.contracts || [];
        this.policies = this.config.data.policies || [];
        this.policies = JSON.parse(JSON.stringify(this.policies));
        this.pList1 = this.policies;
        this.pList2 = this.policies;
    }

    ngOnInit() {
        this.loading = false;
        setTimeout(this.onChange.bind(this));
    }

    loadVCs() {
        this.loadDocuments('VC');
    }

    loadVPs() {
        this.loadDocuments('VP');
    }

    private loadDocuments(documentType: DocumentType): void {
        if (!this.migrationConfig.src) {
            return;
        }

        const isVc = documentType === 'VC';
        const pageIndex = isVc ? this.pageIndexVC : this.pageIndexVP;
        const pageSize = isVc ? this.pageSizeVC : this.pageSizeVP;
        const selectedIds = isVc
            ? this.migrationConfig.vcs.map((item) => item.id)
            : this.migrationConfig.vps;

        this.setDocumentLoading(documentType, true);
        this._policyEngineService
            .documents(
                this.migrationConfig.src,
                true,
                documentType,
                pageIndex,
                pageSize
            )
            .subscribe({
                next: (response) => {
                    const documents = (response.body || []).map((item: MigrationDocumentItem) => {
                        return {
                            ...item,
                            selected: selectedIds.includes(item.id),
                        };
                    });
                    const total = this.getTotalCount(
                        response?.headers?.get('X-Total-Count'),
                        documents.length
                    );

                    if (isVc) {
                        this.vcs = documents;
                        this.totalVCs = total;
                    } else {
                        this.vps = documents;
                        this.totalVPs = total;
                    }

                    this.updateAllDocumentsSelected(documentType);
                    this.setDocumentLoading(documentType, false);
                },
                error: () => {
                    if (isVc) {
                        this.vcs = [];
                        this.totalVCs = 0;
                    } else {
                        this.vps = [];
                        this.totalVPs = 0;
                    }

                    this.updateAllDocumentsSelected(documentType);
                    this.setDocumentLoading(documentType, false);
                },
            });
    }

    onClose(): void {
        this.ref.close();
    }

    onSubmit() {
        if (this.hasPolicySelectionError) {
            return;
        }
        const result: MigrationActionResult = {
            action: 'start',
            migrationConfig: this.migrationConfig.value
        };
        this.ref.close(result);
    }

    loadSchemas() {
        if (!this.migrationConfig.policiesValidity) {
            this.schemaIds = [];
            this.pagedSchemaIds = [];
            this.totalSchemas = 0;
            return;
        }
        forkJoin([
            this._schemaService.getSchemasByPolicy(this.migrationConfig.src!),
            this._schemaService.getSchemasByPolicy(this.migrationConfig.dst!),
        ]).subscribe((schemas) => {
            this.srcSchemas = schemas[0];
            this.dstSchemas = schemas[1];
            this.refreshSchemasPagination();
        });
    }

    loadBlocks() {
        if (!this.migrationConfig.policiesValidity) {
            this.blockIds = [];
            this.pagedBlockIds = [];
            this.totalBlocks = 0;
            return;
        }
        forkJoin([
            this._policyEngineService.getTagBlockMap(this.migrationConfig.src!),
            this._policyEngineService.getTagBlockMap(this.migrationConfig.dst!),
        ]).subscribe((blocks) => {
            const srcBlocks = blocks[0];
            const dstBlocks = blocks[1];
            this.srcBlockNameById = {};
            this.dstBlockNameById = {};
            this.migrationConfig.clearBlocks();
            for (const srcBlockTag of Object.keys(srcBlocks)) {
                this.migrationConfig.blocks[srcBlocks[srcBlockTag]] =
                    dstBlocks[srcBlockTag];
                this.srcBlockNameById[srcBlocks[srcBlockTag]] = srcBlockTag;
            }
            for (const dstBlockTag of Object.keys(dstBlocks)) {
                this.dstBlockNameById[dstBlocks[dstBlockTag]] = dstBlockTag;
            }
            this.srcBlocks = Object.entries(srcBlocks).map((item) => ({
                tag: item[0],
                id: item[1],
            }));
            this.dstBlocks = Object.entries(dstBlocks).map((item) => ({
                tag: item[0],
                id: item[1],
            }));
            this.blockIds = Object.keys(this.migrationConfig.blocks);
            this.totalBlocks = this.blockIds.length;
            if (this.pageIndexBlocks * this.pageSizeBlocks >= this.totalBlocks) {
                this.pageIndexBlocks = 0;
            }
            this.updatePagedBlocks();
        });
    }

    async onChange() {
        this.resetSchemaAndBlocksState();
        this.resetMigrationMappings();
        this.resetPolicyMappingState();
        this.updateSourcePolicyOptions();
        this.updateDestinationPolicyOptions();

        let srcPolicy: any;

        if (this.migrationConfig.dst) {
            const dstPolicy = await this.loadPolicy(this.migrationConfig.dst);
            this.applyDestinationPolicyData(dstPolicy);
        }

        if (this.migrationConfig.src) {
            this.loadVCs();
            this.loadVPs();

            srcPolicy = await this.loadSourcePolicy();
            this.applySourcePolicyData(srcPolicy);
        }

        this.refreshGroupsPagination();
        this.refreshRolesPagination();
        this.refreshTokensPagination();

        this.showMigrateRetirePools = srcPolicy?.status !== PolicyStatus.DRY_RUN;
        if (!this.showMigrateRetirePools) {
            this.migrationConfig.migrateRetirePools = false;
        }

        this.loadSchemas();
        this.loadBlocks();
        this.loadPairStatus();
        this.loadRunningMigrationWarning();
        this.refreshOverflowAfterRender();
    }

    private resetSchemaAndBlocksState(): void {
        this.pageIndexSchemas = 0;
        this.schemaIds = [];
        this.pagedSchemaIds = [];
        this.totalSchemas = 0;

        this.pageIndexBlocks = 0;
        this.blockIds = [];
        this.pagedBlockIds = [];
        this.totalBlocks = 0;

        this.pageIndexGroups = 0;
        this.groupKeys = [];
        this.pagedGroupKeys = [];
        this.totalGroups = 0;

        this.pageIndexRoles = 0;
        this.roleKeys = [];
        this.pagedRoleKeys = [];
        this.totalRoles = 0;

        this.pageIndexTokens = 0;
        this.tokenKeys = [];
        this.pagedTokenKeys = [];
        this.totalTokens = 0;
    }

    private resetMigrationMappings(): void {
        this.migrationConfig.clearTokensMap();
        this.migrationConfig.clearTokens();
        this.migrationConfig.clearGroups();
        this.migrationConfig.clearRoles();
    }

    private resetPolicyMappingState(): void {
        this.srcRoles = [];
        this.dstRoles = [];
        this.srcGroups = [];
        this.dstGroups = [];
        this.srcTokens = [];
        this.dstTokens = [];
        this.dstTokenMap = [];
    }

    private updateSourcePolicyOptions(): void {
        const destinationPolicy = this.getPolicyData(this.migrationConfig.dst);
        const destinationMode = this.getPolicyMigrationMode(destinationPolicy);

        if (this.migrationConfig.dst) {
            this.pList1 = this.policies.filter(
                (policy) => policy.id !== this.migrationConfig.dst
            );
        } else {
            this.pList1 = this.policies;
        }

        if (destinationMode) {
            this.pList1 = this.pList1.filter((policy) => {
                return this.getPolicyMigrationMode(policy) === destinationMode;
            });
        }

        if (this.uploadedPolicy) {
            const uploadedMode = this.getPolicyMigrationMode(this.uploadedPolicy);
            if (!destinationMode || uploadedMode === destinationMode) {
                this.pList1 = [this.uploadedPolicy, ...this.pList1];
            }
        }
    }

    private updateDestinationPolicyOptions(): void {
        const sourcePolicy = this.getPolicyData(this.migrationConfig.src);
        const sourceMode = this.getPolicyMigrationMode(sourcePolicy);

        if (this.migrationConfig.src) {
            this.pList2 = this.policies.filter(
                (policy) => policy.id !== this.migrationConfig.src
            );
        } else {
            this.pList2 = this.policies;
        }

        if (sourceMode) {
            this.pList2 = this.pList2.filter((policy) => {
                return this.getPolicyMigrationMode(policy) === sourceMode;
            });
        }
    }

    private async loadPolicy(policyId: string): Promise<any> {
        return firstValueFrom(this._policyEngineService.policy(policyId));
    }

    private async loadSourcePolicy(): Promise<any> {
        if (this.migrationConfig.src === this.uploadedPolicy?.id) {
            return this.uploadedPolicy;
        }

        return this.loadPolicy(this.migrationConfig.src!);
    }

    private applyDestinationPolicyData(policy: any): void {
        this.dstRoles = policy?.policyRoles || [];
        this.dstGroups = policy?.policyGroups?.map(
            (group: { name: string }) => group.name
        ) || [];
        this.dstTokens = policy?.policyTokens?.map(
            (token: { templateTokenTag: string }) => token.templateTokenTag
        ) || [];
        this.dstTokenMap = findAllEntities(policy?.config || {}, ['tokenId']);
    }

    private applySourcePolicyData(policy: any): void {
        this.srcRoles = policy?.policyRoles || [];
        if (this.dstRoles.length > 0) {
            this.srcRoles.forEach((role) => {
                this.migrationConfig.setRole(role);
            });
        }

        this.srcGroups = policy?.policyGroups?.map(
            (group: { name: string }) => group.name
        ) || [];
        if (this.dstGroups.length > 0) {
            this.srcGroups.forEach((group) => {
                this.migrationConfig.setGroup(group);
            });
        }

        this.srcTokens = policy?.policyTokens?.map(
            (token: { templateTokenTag: string }) => token.templateTokenTag
        ) || [];
        if (this.dstTokens.length > 0) {
            this.srcTokens.forEach((token) => {
                this.migrationConfig.setToken(token);
            });
        }

        const srcTokensMap = findAllEntities(policy?.config || {}, ['tokenId']);
        if (srcTokensMap.length > 0) {
            srcTokensMap.forEach((token) => {
                this.migrationConfig.setTokenMap(token);
            });
        }
    }

    onActiveIndexChange(event: number) {
        this.activeIndex = event;
    }

    isStepWithBottomLayout(stepId: string): boolean {
        return this.stepsWithBottomLayout.has(stepId);
    }

    onTabChange(event: any) {
        this.activeTabIndex = event.index;
        if (this.activeTabIndex === 1) {
            this.loadMigrationRuns();
        }
    }

    nextStep() {
        if (this.activeIndex + 1 > this.items.length - 1) {
            return;
        }
        this.activeIndex++;
        this.refreshOverflowAfterRender();
    }

    prevStep() {
        if (this.activeIndex - 1 < 0) {
            return;
        }
        this.activeIndex--;
        this.refreshOverflowAfterRender();
    }

    viewDocument(document: any) {
        if (!document) {
            return;
        }
        this._dialogService.open(JsonEditorDialogComponent, {
            closable: true,
            modal: true,
            width: '70vw',
            styleClass: 'custom-json-dialog',
            header: 'View document',
            data: {
                data: JSON.stringify(document, null, 4),
                readOnly: true,
            },
        });
    }

    selectAllVCs() {
        this.toggleSelectAllDocuments('VC');
    }

    selectAllVPs() {
        this.toggleSelectAllDocuments('VP');
    }

    private toggleSelectAllDocuments(documentType: DocumentType): void {
        const allSelected = documentType === 'VC'
            ? this.allVCsSelected
            : this.allVPsSelected;

        if (!allSelected) {
            this.clearSelectedDocuments(documentType);
            this.setCurrentPageSelection(documentType, false);
            if (documentType === 'VC') {
                this.refreshSchemasPagination();
            }
            this.updateAllDocumentsSelected(documentType);
            return;
        }

        if (!this.migrationConfig.src) {
            this.updateAllDocumentsSelected(documentType);
            return;
        }

        this.setDocumentLoading(documentType, true);
        this._policyEngineService
            .documents(this.migrationConfig.src, false, documentType)
            .subscribe({
                next: (response) => {
                    const documents = response.body || [];
                    this.clearSelectedDocuments(documentType);
                    documents.forEach((document: MigrationDocumentItem) => {
                        this.addDocumentSelection(documentType, document);
                    });
                    this.setCurrentPageSelection(documentType, true);
                    if (documentType === 'VC') {
                        this.refreshSchemasPagination();
                    }
                    this.updateAllDocumentsSelected(documentType);
                    this.setDocumentLoading(documentType, false);
                },
                error: () => {
                    this.updateAllDocumentsSelected(documentType);
                    this.setDocumentLoading(documentType, false);
                },
            });
    }

    selectVC(vc: MigrationDocumentItem) {
        this.toggleDocumentSelection(vc, 'VC');
    }

    selectVP(vp: MigrationDocumentItem) {
        this.toggleDocumentSelection(vp, 'VP');
    }

    private toggleDocumentSelection(document: MigrationDocumentItem, documentType: DocumentType): void {
        if (document.selected) {
            this.addDocumentSelection(documentType, document);
        } else {
            this.removeDocumentSelection(documentType, document);
        }

        if (documentType === 'VC') {
            this.refreshSchemasPagination();
        }

        this.updateAllDocumentsSelected(documentType);
        this.refreshOverflowAfterRender();
    }

    onPageVC(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeVC);
        this.pageIndexVC = state.pageIndex;
        this.pageSizeVC = state.pageSize;
        this.loadVCs();
    }

    onPageVP(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeVP);
        this.pageIndexVP = state.pageIndex;
        this.pageSizeVP = state.pageSize;
        this.loadVPs();
    }

    onPageBlocks(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeBlocks);
        this.pageIndexBlocks = state.pageIndex;
        this.pageSizeBlocks = state.pageSize;
        this.updatePagedBlocks();
    }

    onPageSchemas(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeSchemas);
        this.pageIndexSchemas = state.pageIndex;
        this.pageSizeSchemas = state.pageSize;
        this.updatePagedSchemas();
    }

    onPageGroups(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeGroups);
        this.pageIndexGroups = state.pageIndex;
        this.pageSizeGroups = state.pageSize;
        this.updatePagedGroups();
    }

    onPageRoles(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeRoles);
        this.pageIndexRoles = state.pageIndex;
        this.pageSizeRoles = state.pageSize;
        this.updatePagedRoles();
    }

    onPageTokens(event: PageEvent) {
        const state = this.resolvePageState(event, this.pageSizeTokens);
        this.pageIndexTokens = state.pageIndex;
        this.pageSizeTokens = state.pageSize;
        this.updatePagedTokens();
    }

    private resolvePageState(
        event: PageEvent,
        currentPageSize: number
    ): { pageIndex: number; pageSize: number } {
        return {
            pageIndex: Number(event?.page || 0),
            pageSize: Number(event?.rows || currentPageSize),
        };
    }

    private setDocumentLoading(documentType: DocumentType, loading: boolean): void {
        if (documentType === 'VC') {
            this.loadings.vcs = loading;
        } else {
            this.loadings.vps = loading;
        }
    }

    private clearSelectedDocuments(documentType: DocumentType): void {
        if (documentType === 'VC') {
            this.migrationConfig.clearVCs();
        } else {
            this.migrationConfig.clearVPs();
        }
    }

    private addDocumentSelection(documentType: DocumentType, document: MigrationDocumentItem): void {
        if (documentType === 'VC') {
            this.migrationConfig.addVC({
                id: document.id,
                schema: document.schema,
            });
        } else {
            this.migrationConfig.addVP({
                id: document.id,
            });
        }
    }

    private removeDocumentSelection(documentType: DocumentType, document: MigrationDocumentItem): void {
        if (documentType === 'VC') {
            this.migrationConfig.removeVC({
                id: document.id,
            });
        } else {
            this.migrationConfig.removeVP({
                id: document.id,
            });
        }
    }

    private setCurrentPageSelection(documentType: DocumentType, selected: boolean): void {
        if (documentType === 'VC') {
            this.vcs = this.vcs.map((item) => {
                return {
                    ...item,
                    selected,
                };
            });
        } else {
            this.vps = this.vps.map((item) => {
                return {
                    ...item,
                    selected,
                };
            });
        }
    }

    private updateAllDocumentsSelected(documentType: DocumentType): void {
        if (documentType === 'VC') {
            this.allVCsSelected = this.totalVCs > 0 &&
                this.migrationConfig.vcs.length === this.totalVCs;
        } else {
            this.allVPsSelected = this.totalVPs > 0 &&
                this.migrationConfig.vps.length === this.totalVPs;
        }
    }

    private getTotalCount(totalCountValue: string | null, fallback: number): number {
        if (!totalCountValue) {
            return fallback;
        }

        const parsedCount = Number(totalCountValue);
        if (Number.isNaN(parsedCount)) {
            return fallback;
        }

        return parsedCount;
    }

    getObjectKeys(obj: any): string[] {
        return Object.keys(obj);
    }

    getPolicyData(policyId?: string) {
        if (!policyId) {
            return null;
        }
        if (this.uploadedPolicy?.id === policyId) {
            return this.uploadedPolicy;
        }
        return this.policies?.find((policy) => policy.id === policyId) || null;
    }

    private getPolicyMigrationMode(
        policy: { status?: PolicyStatus } | null | undefined
    ): 'dry-run' | 'publish' | null {
        const status = policy?.status;
        if (status === PolicyStatus.DRY_RUN || status === PolicyStatus.DEMO) {
            return 'dry-run';
        }
        if (status === PolicyStatus.PUBLISH || status === PolicyStatus.DISCONTINUED) {
            return 'publish';
        }
        return null;
    }

    getPolicyName(policyId?: string): string {
        const policy = this.getPolicyData(policyId);
        if (policy?.name) {
            return policy.name;
        }
        if (!policyId) {
            return '-';
        }
        return policyId;
    }

    getPolicyVersion(policyId?: string): string {
        const policy = this.getPolicyData(policyId);
        const version = policy?.version;
        if (!version && version !== 0) {
            return '-';
        }
        return String(version);
    }

    getPolicyStatus(policyId?: string): string {
        const policy = this.getPolicyData(policyId);
        return policy?.status || '-';
    }

    getPolicyTopic(policyId?: string): string {
        const policy = this.getPolicyData(policyId);
        return policy?.topicId || policy?.topic || '-';
    }

    getSchemaName(schemas: { iri: string; name: string }[], iri: string) {
        return schemas.find((item) => item.iri === iri)?.name || iri;
    }

    private getSchemaByIri(iri?: string): any | null {
        if (!iri) {
            return null;
        }
        return this.dstSchemas.find((item) => item.iri === iri) || null;
    }

    getDestinationSchemaName(srcSchemaIri: string): string {
        const dstSchemaIri = this.migrationConfig.schemas[srcSchemaIri];
        const dstSchema = this.getSchemaByIri(dstSchemaIri);
        if (dstSchema?.name) {
            return String(dstSchema.name);
        }
        return '';
    }

    getDestinationSchemaVersion(srcSchemaIri: string): string {
        const dstSchemaIri = this.migrationConfig.schemas[srcSchemaIri];
        const dstSchema = this.getSchemaByIri(dstSchemaIri);
        const version = dstSchema?.version ?? dstSchema?.sourceVersion;

        if (version === 0 || version) {
            return String(version);
        }
        return '-';
    }

    getDestinationSchemaStatus(srcSchemaIri: string): string {
        const dstSchemaIri = this.migrationConfig.schemas[srcSchemaIri];
        const dstSchema = this.getSchemaByIri(dstSchemaIri);
        if (dstSchema?.status) {
            return String(dstSchema.status);
        }
        return '-';
    }

    getDestinationBlockName(srcBlockId: string): string {
        const dstBlockId = this.migrationConfig.blocks[srcBlockId];
        if (!dstBlockId) {
            return '';
        }
        return this.dstBlockNameById[dstBlockId] || dstBlockId;
    }

    getSourceBlockName(srcBlockId: string): string {
        return this.srcBlockNameById[srcBlockId] || srcBlockId;
    }

    isTextOverflow(element?: HTMLElement | null): boolean {
        if (!element) {
            return false;
        }

        if (element.clientWidth <= 0) {
            return false;
        }
        return element.scrollWidth > element.clientWidth;
    }

    isDropdownLabelOverflow(container?: HTMLElement | null): boolean {
        if (!container) {
            return false;
        }
        const label = container.querySelector('.p-dropdown-label') as HTMLElement | null;
        if (!label) {
            return false;
        }
        if (label.clientWidth <= 0) {
            return false;
        }
        return label.scrollWidth > label.clientWidth;
    }

    private updatePagedBlocks(): void {
        const startIndex = this.pageIndexBlocks * this.pageSizeBlocks;
        const endIndex = startIndex + this.pageSizeBlocks;
        this.pagedBlockIds = this.blockIds.slice(startIndex, endIndex);
        this.refreshOverflowAfterRender();
    }

    private refreshSchemasPagination(): void {
        this.schemaIds = Object.keys(this.migrationConfig.schemas);
        this.totalSchemas = this.schemaIds.length;
        if (this.pageIndexSchemas * this.pageSizeSchemas >= this.totalSchemas) {
            this.pageIndexSchemas = 0;
        }
        this.updatePagedSchemas();
    }

    private updatePagedSchemas(): void {
        const startIndex = this.pageIndexSchemas * this.pageSizeSchemas;
        const endIndex = startIndex + this.pageSizeSchemas;
        this.pagedSchemaIds = this.schemaIds.slice(startIndex, endIndex);
        this.refreshOverflowAfterRender();
    }

    private refreshGroupsPagination(): void {
        this.groupKeys = Object.keys(this.migrationConfig.groups);
        this.totalGroups = this.groupKeys.length;
        if (this.pageIndexGroups * this.pageSizeGroups >= this.totalGroups) {
            this.pageIndexGroups = 0;
        }
        this.updatePagedGroups();
    }

    private refreshRolesPagination(): void {
        this.roleKeys = Object.keys(this.migrationConfig.roles);
        this.totalRoles = this.roleKeys.length;
        if (this.pageIndexRoles * this.pageSizeRoles >= this.totalRoles) {
            this.pageIndexRoles = 0;
        }
        this.updatePagedRoles();
    }

    private updatePagedRoles(): void {
        const startIndex = this.pageIndexRoles * this.pageSizeRoles;
        const endIndex = startIndex + this.pageSizeRoles;
        this.pagedRoleKeys = this.roleKeys.slice(startIndex, endIndex);
        this.refreshOverflowAfterRender();
    }

    private updatePagedGroups(): void {
        const startIndex = this.pageIndexGroups * this.pageSizeGroups;
        const endIndex = startIndex + this.pageSizeGroups;
        this.pagedGroupKeys = this.groupKeys.slice(startIndex, endIndex);
        this.refreshOverflowAfterRender();
    }

    private refreshTokensPagination(): void {
        this.tokenKeys = Object.keys(this.migrationConfig.tokens);
        this.totalTokens = this.tokenKeys.length;
        if (this.pageIndexTokens * this.pageSizeTokens >= this.totalTokens) {
            this.pageIndexTokens = 0;
        }
        this.updatePagedTokens();
    }

    private updatePagedTokens(): void {
        const startIndex = this.pageIndexTokens * this.pageSizeTokens;
        const endIndex = startIndex + this.pageSizeTokens;
        this.pagedTokenKeys = this.tokenKeys.slice(startIndex, endIndex);
        this.refreshOverflowAfterRender();
    }

    private refreshOverflowAfterRender(): void {
        setTimeout(() => {
            this._changeDetector.detectChanges();
        });
    }

    getDocumentSchemaName(document: any): string {
        if (!document?.schema) {
            return '-';
        }
        return this.getSchemaName(this.srcSchemas, document.schema);
    }

    editDocument(doc: any) {
        if (!doc.id) {
            return;
        }
        const editedDoc = this.migrationConfig.editedVCs[doc.id];
        if (!editedDoc && !doc?.document?.credentialSubject) {
            return;
        }
        this._dialogService
            .open(JsonEditorDialogComponent, {
                closable: true,
                modal: true,
                width: '70vw',
                styleClass: 'custom-json-dialog',
                header: 'Edit document',
                data: {
                    data: JSON.stringify(
                        editedDoc || doc.document.credentialSubject[0],
                        null,
                        4
                    ),
                },
            })
            .onClose.subscribe((result: any) => {
                if (!result) {
                    return;
                }
                try {
                    const editedVC = JSON.parse(result);
                    if (
                        JSON.stringify(editedVC) ===
                        JSON.stringify(doc.document.credentialSubject[0])
                    ) {
                        delete this.migrationConfig.editedVCs[doc.id];
                    } else {
                        this.migrationConfig.editedVCs[doc.id] = editedVC;
                    }
                } catch { }
            });
    }

    private _input?: any;
    onUploadData() {
        const handler = () => {
            input.removeEventListener('change', handler);
            this._input = null;
            this.loading = true;
            this._policyEngineService
                .importData(input.files![0])
                .subscribe((result: any) => {
                    this.uploadedPolicy = result;
                    this.migrationConfig.src = result.id;
                    this.loading = false;
                    this.onChange();
                });
        };
        if (this._input) {
            this._input.removeEventListener('change', handler);
            this._input = null;
        }
        const input = document.createElement('input');
        this._input = input;
        input.type = 'file';
        input.accept = '.data';
        input.click();
        input.addEventListener('change', handler);
    }

    onMigrateState() {
        const migrateState = this.migrationConfig.migrateState;
        if (migrateState) {
            if (!this.items.find((item) => item.id === 'blocks')) {
                this.items = [
                    ...this.items,
                    {
                        id: 'blocks',
                        label: 'Blocks',
                    },
                ];
            }
        } else {
            this.items = this.items.filter((item) => item.id !== 'blocks');
        }
    }

    loadMigrationRuns() {
        this.historyLoading = true;
        this.loadRunningMigrationWarning();
        this._policyEngineService
            .getMigrationRuns(this.historyPageIndex, this.historyPageSize)
            .subscribe({
                next: (response) => {
                    this.historyItems = response?.items || [];
                    this.historyTotal = Number(response?.count || 0);
                    this.historyLoading = false;
                },
                error: () => {
                    this.historyItems = [];
                    this.historyTotal = 0;
                    this.historyLoading = false;
                }
            });
    }

    onHistoryPage(event: PageEvent) {
        const state = this.resolvePageState(event, this.historyPageSize);
        this.historyPageIndex = state.pageIndex;
        this.historyPageSize = state.pageSize;
        this.loadMigrationRuns();
    }

    onResume(run: MigrationRunStatusItem) {
        if (!run?.runId || this.isResumeDisabled(run)) {
            return;
        }
        this.closeWithRunAction('resume', run.runId);
    }

    onRetryFailed(run: MigrationRunStatusItem) {
        if (!run?.runId || this.isRetryFailedDisabled(run)) {
            return;
        }
        this.closeWithRunAction('retryFailed', run.runId);
    }

    private closeWithRunAction(
        action: MigrationActionResult['action'],
        runId: string
    ): void {
        const result: MigrationActionResult = {
            action,
            runId
        };
        this.ref.close(result);
    }

    loadPairStatus() {
        this.pairProgressWarning = '';
        this.pairHistoryWarning = '';
        if (!this.migrationConfig.src || !this.migrationConfig.dst) {
            return;
        }
        this._policyEngineService
            .getMigrationStatus(this.migrationConfig.src, this.migrationConfig.dst)
            .subscribe({
                next: (response) => {
                    const latestRun = response?.items?.[0];
                    if (latestRun?.status?.toLowerCase() === this.runningStatus) {
                        this.pairProgressWarning = 'Migration for this source and destination policy pair is already running. Please select another pair.';
                        this.pairHistoryWarning = '';
                    } else if (latestRun) {
                        this.pairProgressWarning = '';
                        this.pairHistoryWarning = 'This policy pair has already been migrated. Starting a new migration will replace the previous run history for this pair. Previously migrated data will remain intact, and duplicate records will not be created.';
                    } else {
                        this.pairProgressWarning = '';
                        this.pairHistoryWarning = '';
                    }
                },
                error: () => {
                    this.pairProgressWarning = '';
                    this.pairHistoryWarning = '';
                }
            });
    }

    loadRunningMigrationWarning() {
        this.hasRunningMigration = false;
        this.runningMigrationWarning = '';
        this._policyEngineService
            .getMigrationRuns(0, this.historyRunningLimit, [this.runningStatus])
            .subscribe({
                next: (response) => {
                    const runs = response?.items || [];
                    const activeRuns = runs.filter((run) => {
                        return run?.status?.toLowerCase() === this.runningStatus;
                    });
                    this.hasRunningMigration = activeRuns.length > 0;
                    if (this.hasRunningMigration) {
                        this.runningMigrationWarning = 'Another migration is already running. Starting a new migration is available only after the current one is finished.';
                    } else {
                        this.runningMigrationWarning = '';
                    }
                },
                error: () => {
                    this.hasRunningMigration = false;
                    this.runningMigrationWarning = '';
                }
            });
    }

    get hasPolicySelectionError(): boolean {
        return !!this.pairProgressWarning || !!this.runningMigrationWarning;
    }

    getFailedPercent(item: MigrationRunStatusItem): string {
        const failed = this.getFailedCount(item);
        const total = this.getRunTotal(item);
        if (!total) {
            return this.zeroPercent;
        }
        return `${Math.round((failed * 100) / total)}%`;
    }

    isResumeDisabled(run: MigrationRunStatusItem): boolean {
        if (this.isRunActionDisabled(run)) {
            return true;
        }
        return this.isRunProcessedToEnd(run);
    }

    isRetryFailedDisabled(run: MigrationRunStatusItem): boolean {
        if (this.isRunActionDisabled(run)) {
            return true;
        }
        return this.getFailedCount(run) <= 0;
    }

    getResumeDisabledTooltip(run: MigrationRunStatusItem): string | undefined {
        return this.getRunActionTooltip(run, 'resume');
    }

    getRetryFailedDisabledTooltip(run: MigrationRunStatusItem): string | undefined {
        return this.getRunActionTooltip(run, 'retryFailed');
    }

    getSucceededPercent(item: MigrationRunStatusItem): string {
        const success = this.getSummaryMetric(item?.summary, 'success');
        const total = this.getRunTotal(item);
        if (!total) {
            return this.zeroPercent;
        }
        return `${Math.round((success * 100) / total)}%`;
    }

    getRunTotal(item: MigrationRunStatusItem): number {
        return this.getSummaryMetric(item?.summary, 'total');
    }

    getFailedCount(item: MigrationRunStatusItem): number {
        return this.getSummaryMetric(item?.summary, 'failed');
    }

    private isRunActionDisabled(run: MigrationRunStatusItem): boolean {
        if (this.hasRunningMigration) {
            return true;
        }
        return this.isPublishRunCompletedSuccessfully(run);
    }

    private getRunActionTooltip(
        run: MigrationRunStatusItem,
        action: 'resume' | 'retryFailed'
    ): string | undefined {
        const isDisabled = action === 'retryFailed'
            ? this.isRetryFailedDisabled(run)
            : this.isResumeDisabled(run);

        if (!isDisabled) {
            return;
        }

        if (this.hasRunningMigration) {
            return 'Another migration is already running. Wait until it is finished.';
        }

        if (action === 'resume' && this.isRunProcessedToEnd(run)) {
            return 'Resume is not available because all source items are already processed.';
        }

        if (this.getFailedCount(run) <= 0) {
            return 'No failed items to retry';
        }

        return 'All items were migrated successfully. No failed items to retry';
    }

    private isPublishRunCompletedSuccessfully(run: MigrationRunStatusItem): boolean {
        const total = this.getRunTotal(run);
        const failed = this.getFailedCount(run);
        const success = this.getSummaryMetric(run?.summary, 'success');

        if (!total) {
            return false;
        }

        return failed === 0 && success >= total;
    }

    private isRunProcessedToEnd(run: MigrationRunStatusItem): boolean {
        const summary = run?.summary;
        if (!summary || typeof summary !== 'object') {
            return false;
        }

        let hasProcessableEntity = false;

        for (const key of Object.keys(summary)) {
            if (key === 'total') {
                continue;
            }
            const metrics = this.normalizeSummaryItem(summary[key]);
            if (!metrics) {
                continue;
            }

            const total = metrics.total;
            if (total <= 0) {
                continue;
            }

            hasProcessableEntity = true;

            const success = metrics.success;
            const failed = metrics.failed;
            const processed = success + failed;

            if (processed < total) {
                return false;
            }
        }

        return hasProcessableEntity;
    }

    private getSummaryMetric(
        summary: MigrationRunSummary | undefined,
        metric: SummaryMetric
    ): number {
        if (!summary || typeof summary !== 'object') {
            return 0;
        }

        let total = 0;
        for (const key of Object.keys(summary)) {
            if (key === 'total') {
                continue;
            }
            const metrics = this.normalizeSummaryItem(summary[key]);
            if (!metrics) {
                continue;
            }
            total += Number(metrics[metric] || 0);
        }

        return total;
    }

    private normalizeSummaryItem(
        value: MigrationSummaryItem | undefined
    ): { total: number; success: number; failed: number } | null {
        if (!value || typeof value !== 'object') {
            return null;
        }

        const total = Number((value as any).total);
        const success = Number((value as any).success);
        const failed = Number((value as any).failed);

        if (!Number.isFinite(total) || !Number.isFinite(success) || !Number.isFinite(failed)) {
            return null;
        }

        return {
            total,
            success,
            failed
        };
    }
}
