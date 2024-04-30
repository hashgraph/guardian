import { ChangeDetectorRef, Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaService } from 'src/app/services/schema.service';
import { JsonEditorDialogComponent } from '../../helpers/json-editor-dialog/json-editor-dialog.component';

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
        '#UserRole',
    ];

    private _vcs: { id: string; schema: string }[] = [];
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
    ) {}

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

    addVC(vc: { id: string; schema: string }) {
        this._vcs.push({
            id: vc.id,
            schema: vc.schema,
        });
        this.updateVcValidity();
        if (
            !this._systemSchemas.includes(vc.schema) &&
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
    selector: 'migrate-data',
    templateUrl: './migrate-data.component.html',
    styleUrls: ['./migrate-data.component.scss'],
})
export class MigrateData {
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

    vps: any[] = [];
    allVPsSelected: boolean = false;
    pageIndexVP: number = 0;
    pageSizeVP: number = 5;
    totalVPs!: number;

    vcs: any[] = [];
    allVCsSelected: boolean = false;
    pageIndexVC: number = 0;
    pageSizeVC: number = 5;
    totalVCs!: number;

    srcRoles: string[] = [];
    dstRoles: string[] = [];

    srcSchemas: any[] = [];
    dstSchemas: any[] = [];

    srcBlocks: any[] = [];
    dstBlocks: any[] = [];

    srcGroups: string[] = [];
    dstGroups: string[] = [];

    srcTokens: string[] = [];
    dstTokens: string[] = [];

    dstTokenMap: string[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private _changeDetector: ChangeDetectorRef,
        private _policyEngineService: PolicyEngineService,
        private _schemaService: SchemaService,
        private _dialogService: DialogService
    ) {
        this.migrationConfig = new MigrationConfig(
            this.config.data?.policy?.id
        );
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
        if (!this.migrationConfig.src) {
            return;
        }
        this.loadings.vcs = true;
        this._policyEngineService
            .documents(
                this.migrationConfig.src,
                true,
                'VC',
                this.pageIndexVC,
                this.pageSizeVC
            )
            .subscribe((response) => {
                this.vcs =
                    response.body?.map((vc) => {
                        vc.selected =
                            this.migrationConfig.vcs.findIndex(
                                (item) => item.id === vc.id
                            ) >= 0;
                        return vc;
                    }) || [];
                const totalCountStr = response.headers.get('X-Total-Count');
                this.totalVCs = totalCountStr
                    ? +totalCountStr
                    : this.vcs.length;
                this.loadings.vcs = false;
            });
    }

    loadVPs() {
        if (!this.migrationConfig.src) {
            return;
        }
        this.loadings.vps = true;
        this._policyEngineService
            .documents(
                this.migrationConfig.src,
                true,
                'VP',
                this.pageIndexVP,
                this.pageSizeVP
            )
            .subscribe((response) => {
                this.vps =
                    response.body?.map((vp) => {
                        vp.selected =
                            this.migrationConfig.vps.findIndex(
                                (item) => item === vp.id
                            ) >= 0;
                        return vp;
                    }) || [];
                const totalCountStr = response.headers.get('X-Total-Count');
                this.totalVPs = totalCountStr
                    ? +totalCountStr
                    : this.vps.length;
                this.loadings.vps = false;
            });
    }

    onClose(): void {
        this.ref.close();
    }

    onSubmit() {
        this.ref.close(this.migrationConfig.value);
    }

    loadSchemas() {
        if (!this.migrationConfig.policiesValidity) {
            return;
        }
        forkJoin([
            this._schemaService.getSchemasByPolicy(this.migrationConfig.src!),
            this._schemaService.getSchemasByPolicy(this.migrationConfig.dst!),
        ]).subscribe((schemas) => {
            this.srcSchemas = schemas[0];
            this.dstSchemas = schemas[1];
        });
    }

    loadBlocks() {
        if (!this.migrationConfig.policiesValidity) {
            return;
        }
        forkJoin([
            this._policyEngineService.getTagBlockMap(this.migrationConfig.src!),
            this._policyEngineService.getTagBlockMap(this.migrationConfig.dst!),
        ]).subscribe((blocks) => {
            const srcBlocks = blocks[0];
            const dstBlocks = blocks[1];
            this.migrationConfig.clearBlocks();
            for (const srcBlockTag of Object.keys(srcBlocks)) {
                this.migrationConfig.blocks[srcBlocks[srcBlockTag]] =
                    dstBlocks[srcBlockTag];
            }
            this.srcBlocks = Object.entries(srcBlocks).map((item) => ({
                tag: item[0],
                id: item[1],
            }));
            this.dstBlocks = Object.entries(dstBlocks).map((item) => ({
                tag: item[0],
                id: item[1],
            }));
        });
    }

    async onChange() {
        this.migrationConfig.clearTokensMap();
        this.migrationConfig.clearTokens();
        this.migrationConfig.clearGroups();
        this.migrationConfig.clearRoles();
        if (this.migrationConfig.dst) {
            this.pList1 = this.policies.filter(
                (s) => s.id !== this.migrationConfig.dst
            );
            const dstPolicy = await this._policyEngineService
                .policy(this.migrationConfig.dst)
                .toPromise();
            this.dstRoles = dstPolicy.policyRoles || [];
            this.dstGroups =
                dstPolicy.policyGroups?.map(
                    (group: { name: string }) => group.name
                ) || [];
            this.dstTokens = this.dstGroups =
                dstPolicy.policyTokens?.map(
                    (token: { templateTokenTag: string }) =>
                        token.templateTokenTag
                ) || [];
            this.dstTokenMap = findAllEntities(dstPolicy.config, ['tokenId']);
        } else {
            this.pList1 = this.policies;
        }

        if (this.uploadedPolicy) {
            this.pList1 = [this.uploadedPolicy, ...this.pList1];
        }

        if (this.migrationConfig.src) {
            this.pList2 = this.policies.filter(
                (s) => s.id !== this.migrationConfig.src
            );
            this.loadVCs();
            this.loadVPs();

            const srcPolicy =
                this.migrationConfig.src === this.uploadedPolicy?.id
                    ? this.uploadedPolicy
                    : await this._policyEngineService
                          .policy(this.migrationConfig.src)
                          .toPromise();

            this.srcRoles = srcPolicy.policyRoles || [];
            if (this.dstRoles.length > 0) {
                this.srcRoles?.forEach((role) => {
                    this.migrationConfig.setRole(role);
                });
            }

            this.srcGroups =
                srcPolicy.policyGroups?.map(
                    (group: { name: string }) => group.name
                ) || [];
            if (this.dstGroups.length > 0) {
                this.srcGroups?.forEach((group) => {
                    this.migrationConfig.setGroup(group);
                });
            }

            this.srcTokens =
                srcPolicy.policyTokens?.map(
                    (token: { templateTokenTag: string }) =>
                        token.templateTokenTag
                ) || [];
            if (this.dstTokens.length > 0) {
                this.srcTokens?.forEach((token) => {
                    this.migrationConfig.setToken(token);
                });
            }

            const srcTokensMap = findAllEntities(srcPolicy.config, ['tokenId']);
            if (srcTokensMap.length > 0) {
                srcTokensMap?.forEach((token) => {
                    this.migrationConfig.setTokenMap(token);
                });
            }
        } else {
            this.pList2 = this.policies;
        }

        this.loadSchemas();
        this.loadBlocks();

        setTimeout(() => {
            this._changeDetector.detectChanges();
        });
    }

    onActiveIndexChange(event: number) {
        this.activeIndex = event;
    }

    nextStep() {
        if (this.activeIndex + 1 > this.items.length - 1) {
            return;
        }
        this.activeIndex++;
    }

    prevStep() {
        if (this.activeIndex - 1 < 0) {
            return;
        }
        this.activeIndex--;
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
        if (!this.allVCsSelected) {
            this.migrationConfig.clearVCs();
            this.vcs = this.vcs.map((item) => {
                item.selected = false;
                return item;
            });
            return;
        }
        this.loadings.vcs = true;
        this._policyEngineService
            .documents(this.migrationConfig.src!, false, 'VC')
            .subscribe((response) => {
                this.migrationConfig.clearVCs();
                response.body?.forEach(
                    this.migrationConfig.addVC.bind(this.migrationConfig)
                );
                this.vcs = this.vcs.map((vc) => {
                    vc.selected = true;
                    return vc;
                });
                this.loadings.vcs = false;
            });
    }

    selectAllVPs() {
        if (!this.allVPsSelected) {
            this.migrationConfig.clearVPs();
            this.vps = this.vps.map((item) => {
                item.selected = false;
                return item;
            });
            return;
        }
        this.loadings.vps = true;
        this._policyEngineService
            .documents(this.migrationConfig.src!, false, 'VP')
            .subscribe((response) => {
                this.migrationConfig.clearVPs();
                response.body?.forEach(
                    this.migrationConfig.addVP.bind(this.migrationConfig)
                );
                this.vps = this.vps.map((vp) => {
                    vp.selected = true;
                    return vp;
                });
                this.loadings.vps = false;
            });
    }

    selectVC(vc: any) {
        if (vc.selected) {
            this.migrationConfig.addVC(vc);
        } else {
            this.migrationConfig.removeVC(vc);
        }
        this.allVCsSelected = this.migrationConfig.vcs.length === this.totalVCs;
        setTimeout(() => this._changeDetector.detectChanges());
    }

    selectVP(vp: any) {
        if (vp.selected) {
            this.migrationConfig.addVP(vp);
        } else {
            this.migrationConfig.removeVP(vp);
        }
        this.allVPsSelected = this.migrationConfig.vps.length === this.totalVPs;
        setTimeout(() => this._changeDetector.detectChanges());
    }

    onPageVC(event: any) {
        this.pageIndexVC = event.page;
        this.loadVCs();
    }

    onPageVP(event: any) {
        this.pageIndexVP = event.page;
        this.loadVPs();
    }

    getObjectKeys(obj: any): string[] {
        return Object.keys(obj);
    }

    getSchemaName(schemas: { iri: string; name: string }[], iri: string) {
        return schemas.find((item) => item.iri === iri)?.name || iri;
    }

    getBlockName(blocks: { tag: string; id: string }[], id: string) {
        return blocks.find((item) => item.id === id)?.tag || id;
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
                } catch {}
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
            this.items = [
                ...this.items,
                {
                    id: 'blocks',
                    label: 'Blocks',
                },
            ];
        } else {
            this.items = this.items.filter((item) => item.id !== 'blocks');
        }
    }
}
