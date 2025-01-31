import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, IPolicyLabelConfig, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
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
    styleUrls: ['./policy-label-configuration.component.scss'],
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
    public readonly statusMenuItems = [{
        label: 'Publish',
        icon: 'publish',
        callback: ($event: any) => {
            this.publish();
        }
    }]

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
            this.route.queryParams.subscribe((queryParams) => {
                const index = queryParams.tab || 0;
                this.labelConfig.goToStep(index).then();
            })
        );
        this.subscription.add(
            this.labelConfig.step.subscribe((index) => {
                this.loading = true;
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: {
                        tab: String(index),
                    },
                    queryParamsHandling: 'merge',
                });
                setTimeout(() => {
                    this.labelConfig.goToStep(index).then(() => {
                        this.loading = false;
                    })
                }, 100);
            })
        );
        this.subscription.add(
            this.rulesConfig.step.subscribe((index) => {
                this.loading = true;
                setTimeout(() => {
                    this.rulesConfig.goToStep(index).then(() => {
                        this.loading = false;
                    })
                }, 100);
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
            this.labelConfig.setData(this.item);
            this.labelConfig.show = true;

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

    public onSave() {
        this.loading = true;
        const item = this.getItem();
        this.policyLabelsService
            .updateLabel(item)
            .subscribe((item) => {
                this.item = item;
                this.labelConfig.setData(this.item);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public onPreview() {
        const item = this.getItem();
        const dialogRef = this.dialogService.open(PolicyLabelPreviewDialog, {
            showHeader: false,
            header: 'Preview',
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                item
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onImport() {
        const dialogRef = this.dialogService.open(SearchLabelDialog, {
            showHeader: false,
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                ids: this.labelConfig.menu.getIds()
            },
        });
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
            }
        });
    }

    public onDeleteImport(item: NavItem) {
        this.labelConfig.menu.delete(item);
    }

    public onEditNavItem(node: NavItem) {
        this.loading = true;
        const item = this.getItem();
        this.rulesConfig.show = true;
        this.rulesConfig.setData(node, item);
        setTimeout(() => {
            this.rulesConfig.goToStep(0).then(() => {
                this.loading = false;
            })
        }, 100);
    }

    public onCancelNavItem() {
        this.loading = true;
        this.rulesConfig.show = false;
        this.rulesConfig.onCancel();
        setTimeout(() => {
            this.labelConfig.goToStep(2).then(() => {
                this.loading = false;
            })
        }, 100);
    }

    public onSaveNavItem() {
        this.loading = true;
        this.rulesConfig.show = false;
        this.rulesConfig.onSave();

        const item = this.getItem();
        this.policyLabelsService
            .updateLabel(item)
            .subscribe((item) => {
                this.item = item;
                this.labelConfig.setData(this.item);
                setTimeout(() => {
                    this.labelConfig.goToStep(2).then(() => {
                        this.loading = false;
                    })
                }, 1000);
            }, (e) => {
                this.loading = false;
            });

        // setTimeout(() => {
        //     this.labelConfig.goToStep(2).then(() => {
        //         this.loading = false;
        //     })
        // }, 100);
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
        });
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