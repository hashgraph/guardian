import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, IPolicyLabelConfig, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { DialogService } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';
import { TreeDragDropService } from 'primeng/api';
import { NavItem } from './components/nav-item';
import { SearchLabelDialog } from '../dialogs/search-label-dialog/search-label-dialog.component';
import { PolicyLabelPreviewDialog } from '../dialogs/policy-label-preview-dialog/policy-label-preview-dialog.component';
import { LabelConfig } from './components/label-config';
import { RulesConfig } from './components/rules-config';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';

@Component({
    selector: 'app-policy-label-configuration',
    templateUrl: './policy-label-configuration.component.html',
    styleUrls: [
        '../../../policy-engine/styles/top-toolbar.scss',
        '../../styles/top-bar-extras.scss',
        './policy-label-configuration.component.scss'
    ],
    standalone: false
})
export class PolicyLabelConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public definitionId: string;
    public item: any | undefined;
    public policy: any;
    public readonly: boolean = false;

    private subscription = new Subscription();

    public readonly labelConfig: LabelConfig;
    public readonly rulesConfig: RulesConfig;

    public labelView: 'imports' | 'navigation' = 'imports';
    private viewInitialized: boolean = false;
    public dirty: boolean = false;
    public readonly EntityStatus = EntityStatus;

    public get showPolicyVersion(): boolean {
        const status = this.policy?.status;
        return !!this.policy?.version && (status === PolicyStatus.PUBLISH || status === PolicyStatus.DISCONTINUED);
    }

    public get importsCount(): number {
        return this.labelConfig.menu.imports.length;
    }

    public get navigationCount(): number {
        return this.labelConfig.navigationTree.data.length;
    }

    @ViewChild('fieldTree', { static: false }) fieldTree: ElementRef;
    @ViewChild('treeTabs', { static: false }) treeTabs: ElementRef;

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyLabelsService: PolicyLabelsService,
        private router: Router,
        private route: ActivatedRoute,
        private ipfs: IPFSService,
        private dialogService: DialogService,
        private dragDropService: TreeDragDropService
    ) {
        this.labelConfig = new LabelConfig(dialogService, dragDropService);
        this.rulesConfig = new RulesConfig(this, dialogService, ipfs);
    }

    ngOnInit() {
        this.subscription.add(
            this.route.params.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
        this.subscription.add(
            this.labelConfig.overviewForm.valueChanges.subscribe(() => {
                if (this.labelConfig.overviewForm.dirty) {
                    this.markDirty();
                }
            })
        );
        this.subscription.add(
            this.labelConfig.changed.subscribe(() => {
                this.markDirty();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

                if (this.isConfirmed) {
                    this.loadData();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            }, (e) => {
                this.loading = false;
            });
    }

    private loadData() {
        this.definitionId = this.route.snapshot.params['definitionId'];
        this.loading = true;
        forkJoin([
            this.schemaService.properties(),
            this.policyLabelsService.getLabel(this.definitionId),
            this.policyLabelsService.getRelationships(this.definitionId),
        ]).subscribe(([properties, item, relationships]) => {
            this.item = item;
            this.readonly = this.item?.status === EntityStatus.PUBLISHED;
            this.policy = relationships?.policy || {};

            this.rulesConfig.setPolicy(relationships);
            this.rulesConfig.setProperties(properties);
            this.rulesConfig.setSchemas(relationships);

            this.labelConfig.setPolicy(relationships);
            this.applyItem(this.item);
            this.labelConfig.show = true;
            if (!this.viewInitialized) {
                this.viewInitialized = true;
                this.labelView = this.labelConfig.navigationTree.data.length ? 'navigation' : 'imports';
            }

            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    public onBack() {
        this.router.navigate(['/policy-labels']);
    }

    private getItem(): any {
        const value = this.labelConfig.overviewForm.value;
        const config: IPolicyLabelConfig = this.labelConfig.toJson();
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        return item;
    }

    private applyItem(item: any) {
        this.item = item;
        this.labelConfig.setData(item);
        this.labelConfig.overviewForm.markAsPristine();
        this.dirty = false;
    }

    private saveRequest(): Observable<any> {
        return this.policyLabelsService.updateLabel(this.getItem());
    }

    public markDirty() {
        if (!this.readonly) {
            this.dirty = true;
        }
    }

    public onSave() {
        this.loading = true;
        this.saveRequest()
            .subscribe((item) => {
                this.applyItem(item);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public onPublish() {
        if (!this.dirty) {
            this.publish();
            return;
        }
        this.loading = true;
        this.saveRequest()
            .subscribe((item) => {
                this.loading = false;
                this.applyItem(item);
                this.publish();
            }, (e) => {
                this.loading = false;
            });
    }

    public onLabelView(view: 'imports' | 'navigation') {
        if (this.labelView === view) {
            return;
        }
        this.labelView = view;
        if (view === 'navigation') {
            this.labelConfig.refreshNavigation();
        }
    }

    public onRulesView(view: 'schemas' | 'rules') {
        this.rulesConfig.setView(view);
    }

    public onPreview() {
        const item = this.getItem();
        const dialogRef = this.dialogService.open(PolicyLabelPreviewDialog, {
            showHeader: false,
            header: 'Preview',
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                item
            }
        })!;
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onImport() {
        const dialogRef = this.dialogService.open(SearchLabelDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                ids: this.labelConfig.menu.getIds()
            },
        })!;
        dialogRef.onClose.subscribe((result: any[]) => {
            if (result) {
                for (const item of result) {
                    if (item._type === 'label') {
                        this.labelConfig.menu.addLabel(item)
                    }
                    if (item._type === 'statistic') {
                        this.labelConfig.menu.addStatistic(item)
                    }
                }
                if (result.length) {
                    this.markDirty();
                }
            }
        });
    }

    public onDeleteImport(item: NavItem) {
        this.labelConfig.menu.delete(item);
        this.markDirty();
    }

    public onEditNavItem(node: NavItem) {
        const item = this.getItem();
        this.rulesConfig.show = true;
        this.rulesConfig.setData(node, item);
        this.rulesConfig.view = this.rulesConfig.variables.variables.length ? 'rules' : 'schemas';
    }

    public onCancelNavItem() {
        this.rulesConfig.show = false;
        this.rulesConfig.onCancel();
        this.labelView = 'navigation';
        this.labelConfig.refreshNavigation();
    }

    public onSaveNavItem() {
        this.loading = true;
        this.rulesConfig.show = false;
        this.rulesConfig.onSave();
        this.labelView = 'navigation';
        this.saveRequest()
            .subscribe((item) => {
                this.applyItem(item);
                this.labelConfig.refreshNavigation();
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    private publish() {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Publish Label',
                text: `Are you sure want to publish label (${this.item.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Publish',
                    class: 'primary'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Publish') {
                this.loading = true;
                this.policyLabelsService.pushPublish(this.item).subscribe(
                    (result) => {
                        const { taskId, expectation } = result;
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href),
                            },
                        });
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
            }
        });
    }
}