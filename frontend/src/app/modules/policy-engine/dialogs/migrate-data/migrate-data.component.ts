import { ChangeDetectorRef, Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { forkJoin } from 'rxjs';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaService } from 'src/app/services/schema.service';

class MigrationConfig {
    private readonly _systemSchemas = ['#MintToken', '#UserRole'];

    private _vcs: { id: string; schema: string }[] = [];
    private _vps: string[] = [];
    private _schemas: { [key: string]: string | undefined } = {};
    private _groups: { [key: string]: string | undefined } = {};
    private _roles: { [key: string]: string | undefined } = {};

    private _policiesValidity: boolean = false;
    private _vcsValidity: boolean = false;
    private _schemasValidity: boolean = true;
    private _rolesValidity: boolean = true;
    private _groupsValidity: boolean = true;

    constructor(
        private _src: string = '',
        private _dst: string = ''
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

    updateRolesValidity() {
        this._rolesValidity = Object.values(this._roles).every((val) => !!val);
    }

    updateGroupsValidity() {
        this._groupsValidity = Object.values(this._groups).every(
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

    setRole(key: string, value?: string) {
        this._roles[key] = value;
        this.updateRolesValidity();
    }

    setGroup(key: string, value?: string) {
        this._groups[key] = value;
        this.updateGroupsValidity();
    }

    clearRoles() {
        this._roles = {};
        this.updateRolesValidity();
    }

    clearGroups() {
        this._groups = {};
        this.updateGroupsValidity();
    }

    clearVCs() {
        this._vcs = [];
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

    set src(value: string) {
        this._src = value;
        this.updatePolicyValidity();
    }

    get dst() {
        return this._dst;
    }

    set dst(value: string) {
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

    get roles() {
        return this._roles;
    }

    get groups() {
        return this._groups;
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

    get rolesValidity() {
        return this._rolesValidity;
    }

    get groupsValidity() {
        return this._groupsValidity;
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
        };
    }

    addVC(vc: { id: string; schema: string }) {
        this._vcs.push({
            id: vc.id,
            schema: vc.schema,
        });
        if (
            !this._systemSchemas.includes(vc.schema) &&
            this._schemas[vc.schema] === undefined
        ) {
            this._schemas[vc.schema] = '';
        }
        this.updateVcValidity();
        this.updateSchemasValidity();
    }

    removeVC(vc: any) {
        this._vcs = this._vcs.filter((_vc) => _vc.id !== vc.id);
        Object.keys(this._schemas)
            .filter(
                (key) => this._vcs.findIndex((_vc) => _vc.schema === key) < 0
            )
            .forEach((key) => {
                delete this._schemas[key];
            });
        this.updateVcValidity();
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
    };

    migrationConfig: MigrationConfig;

    policies: any[];
    pList1: any[];
    pList2: any[];

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

    srcGroups: string[] = [];
    dstGroups: string[] = [];

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
        this.policies = this.config.data.policies || [];
        this.pList1 = this.policies;
        this.pList2 = this.policies;
    }

    ngOnInit() {
        this.loading = false;
        setTimeout(this.onChange.bind(this));
    }

    loadVCs() {
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
            this._schemaService.getSchemasByPolicy(this.migrationConfig.src),
            this._schemaService.getSchemasByPolicy(this.migrationConfig.dst),
        ]).subscribe((schemas) => {
            this.srcSchemas = schemas[0];
            this.dstSchemas = schemas[1];
        });
    }

    onChange() {
        if (this.migrationConfig.src) {
            this.pList2 = this.policies.filter(
                (s) => s.id !== this.migrationConfig.src
            );
            this.loadVCs();
            this.loadVPs();
            this.migrationConfig.clearRoles();
            this.migrationConfig.clearGroups();
            this.srcRoles =
                this.policies.find(
                    (item) => item.id === this.migrationConfig.src
                ).policyRoles || [];
            this.srcRoles?.forEach((role) => {
                this.migrationConfig.setRole(role);
            });
            this.srcGroups =
                this.policies
                    .find((item) => item.id === this.migrationConfig.src)
                    .policyGroups?.map(
                        (group: { name: string }) => group.name
                    ) || [];
            this.srcGroups?.forEach((group) => {
                this.migrationConfig.setGroup(group);
            });
        } else {
            this.migrationConfig.clearGroups();
            this.migrationConfig.clearRoles();
        }
        if (this.migrationConfig.dst) {
            this.pList1 = this.policies.filter(
                (s) => s.id !== this.migrationConfig.dst
            );
            this.dstRoles =
                this.policies.find(
                    (item) => item.id === this.migrationConfig.dst
                ).policyRoles || [];
            this.dstGroups =
                this.policies
                    .find((item) => item.id === this.migrationConfig.dst)
                    .policyGroups?.map(
                        (group: { name: string }) => group.name
                    ) || [];
        } else {
            this.pList1 = this.policies;
        }

        this.loadSchemas();

        if (this.srcGroups.length > 0 && this.dstGroups.length > 0) {
            if (this.items.findIndex((item) => item.id === 'groups') < 0) {
                this.items.push({
                    id: 'groups',
                    label: 'Groups',
                });
            }
        } else {
            this.items = this.items.filter((item) => item.id !== 'groups');
            this.migrationConfig.clearGroups();
        }
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

    viewVP(document: any) {
        this._dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'VP',
            styleClass: 'custom-dialog',
            data: {
                id: document.id,
                dryRun: false,
                viewDocument: true,
                document: document.document,
                title: 'View VP',
                type: 'VP',
            },
        });
    }

    viewVC(document: any) {
        this._dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'VC',
            styleClass: 'custom-dialog',
            data: {
                id: document.id,
                dryRun: false,
                viewDocument: true,
                document: document.document,
                title: 'View VC',
                type: 'VC',
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
            .documents(this.migrationConfig.src, false, 'VC')
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
            .documents(this.migrationConfig.src, false, 'VP')
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
}
